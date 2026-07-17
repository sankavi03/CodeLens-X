package com.codelensx.backend.service.generator;

import com.codelensx.backend.dto.analysis.DependencyAnalysisResponseDto;
import com.codelensx.backend.dto.analysis.DesignPatternResponseDto;
import com.codelensx.backend.dto.analysis.ProjectStatsResponseDto;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.ai.GeminiClient;
import com.codelensx.backend.service.ai.AiResponseCacheService;
import com.codelensx.backend.service.analysis.DependencyAnalysisService;
import com.codelensx.backend.service.analysis.DesignPatternDetectorService;
import com.codelensx.backend.service.analysis.ProjectStatsService;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.codelensx.backend.parser.service.ProjectParserService;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArchitectureSummaryGeneratorService {

    private final GeminiClient geminiClient;
    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectStatsService projectStatsService;
    private final DependencyAnalysisService dependencyAnalysisService;
    private final DesignPatternDetectorService designPatternDetectorService;
    private final ProjectParserService projectParserService;
    private final AiResponseCacheService cacheService;

    public String generateArchitectureSummary(UUID workspaceId, String username, String type) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);

        StringBuilder context = new StringBuilder();
        appendProjectTree(context, projectTree.getRoot(), "");
        context.append("Project Name: ").append(workspace.getProjectName()).append("\n");
        context.append("Languages Used: ").append(stats.getFileCountByLanguage().keySet()).append("\n");
        
        if (!patterns.getDetectedPatterns().isEmpty()) {
            context.append("\nDetected Architectural/Design Patterns:\n");
            patterns.getDetectedPatterns().forEach(p -> 
                context.append("  - ").append(p.getPatternName()).append(": ").append(p.getClassName()).append(" (").append(p.getDescription()).append(")\n"));
        }

        if (!deps.getInternalDependencyGraph().isEmpty()) {
            context.append("\nInternal Modules/Imports Mapping Sample:\n");
            deps.getInternalDependencyGraph().entrySet().stream()
                    .filter(e -> !e.getValue().isEmpty())
                    .limit(20)
                    .forEach(e -> context.append("  - ").append(e.getKey()).append(" depends on: ").append(e.getValue()).append("\n"));
        }

        String systemInstruction = "You are CodeLens X AI, a principal software architect. " +
                "Generate a clean, valid Mermaid software diagram using ONLY valid Mermaid syntax. " +
                "Do NOT include any markdown formatting, headers, paragraphs, or explanations outside the Mermaid block. " +
                "Your entire response MUST be valid raw Mermaid diagram syntax. Make sure all node labels containing spaces, quotes, or brackets " +
                "are correctly escaped inside double quotes (e.g. `nodeId[\"Label Text\"]`). Ensure all node IDs are alphanumeric and contain no periods or slashes.";

        String typePrompt = "";
        switch (type.toLowerCase()) {
            case "class_diagram":
                typePrompt = "Generate a valid Mermaid class diagram (`classDiagram`) illustrating the key classes, interfaces, inheritance, and relations in the project.";
                break;
            case "sequence_diagram":
                typePrompt = "Generate a valid Mermaid sequence diagram (`sequenceDiagram`) representing request/data flows through controllers, services, database operations, and third-party API clients.";
                break;
            case "dependency_graph":
                typePrompt = "Generate a valid Mermaid dependency graph (`graph TD`) representing links and couplings between the main internal files/modules.";
                break;
            case "package_diagram":
                typePrompt = "Generate a valid Mermaid package diagram (`graph TD` with `subgraph` blocks) displaying package directories, nesting, and structural layers of this codebase.";
                break;
            case "component_diagram":
                typePrompt = "Generate a valid Mermaid component diagram (`graph TD`) showing components, services, database, and APIs and how they interface.";
                break;
            case "deployment_diagram":
                typePrompt = "Generate a valid Mermaid deployment diagram (`graph TD` or `graph LR`) detailing infrastructure, local server deployments, client browsers, and database nodes.";
                break;
            case "flowchart":
            default:
                typePrompt = "Generate a valid Mermaid flowchart (`graph TD`) of request/response flows between controllers, services, database operations, and view layers.";
                break;
        }

        String prompt = """
        Generate the architecture STRICTLY from the project information below.

        IMPORTANT RULES:
        1. NEVER invent controllers, services, repositories, entities or packages.
        2. ONLY use classes and folders present in the project tree.
        3. If a class does not exist, DO NOT mention it.
        4. Do NOT assume MVC layers that are not present.
        5. Do NOT invent design patterns.
        6. Produce ONLY valid Mermaid syntax.
        7. Do NOT wrap the answer in ```mermaid blocks.
        8. Every node used in an edge must be defined.
        9. Do not create orphan nodes.
        10. Use the project tree as the source of truth.

        ======================
        PROJECT INFORMATION
        ======================

        """
        + context.toString()
        + "\n\n"
        + typePrompt;

        String result = cacheService.get(systemInstruction + ":" + type, prompt)
                .orElseGet(() -> {
                    String generated = geminiClient.generateContent(systemInstruction, prompt);
                    // Strip code blocks if returned
                    if (generated.contains("```mermaid")) {
                        generated = generated.replaceAll("(?s)```mermaid\\s*(.*?)\\s*```", "$1");
                    } else if (generated.contains("```")) {
                        generated = generated.replaceAll("(?s)```\\s*(.*?)\\s*```", "$1");
                    }
                    generated = generated.trim();
                    cacheService.put(systemInstruction + ":" + type, prompt, generated);
                    return generated;
                });

        validateMermaidSyntax(result, type);
        return result;
    }
    private void appendProjectTree(StringBuilder context, ProjectTreeNode node, String indent) {

        context.append(indent)
                .append("- ")
                .append(node.getName())
                .append("\n");

        if (node.getChildren() != null) {
            for (ProjectTreeNode child : node.getChildren()) {
                appendProjectTree(context, child, indent + "  ");
            }
        }
    }
    private void validateMermaidSyntax(String content, String type) {
        if (content == null || content.trim().isEmpty()) {
            throw new com.codelensx.backend.exception.ApiException("Mermaid syntax validation failed: Content is empty.", org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        
        String clean = content.trim().replaceAll("\\s+", " ");
        String lower = clean.toLowerCase();
        
        // Basic check for diagram type declaration
        boolean hasPrefix = lower.startsWith("graph") 
                || lower.startsWith("flowchart")
                || lower.startsWith("classdiagram")
                || lower.startsWith("sequencediagram")
                || lower.startsWith("statediagram")
                || lower.startsWith("erdiagram")
                || lower.startsWith("gantt")
                || lower.startsWith("pie")
                || lower.startsWith("gitgraph");
                
        if (!hasPrefix) {
            throw new com.codelensx.backend.exception.ApiException("Mermaid syntax validation failed: Missing diagram type declaration prefix.", org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        
        // Check for basic syntax anomalies (like unbalanced delimiters)
        if (lower.startsWith("graph") || lower.startsWith("flowchart")) {
            int squareBrackets = 0;
            int curlyBraces = 0;
            int parentheses = 0;
            boolean insideQuotes = false;
            
            for (int i = 0; i < content.length(); i++) {
                char c = content.charAt(i);
                if (c == '"') {
                    insideQuotes = !insideQuotes;
                }
                if (!insideQuotes) {
                    if (c == '[') squareBrackets++;
                    else if (c == ']') squareBrackets--;
                    else if (c == '{') curlyBraces++;
                    else if (c == '}') curlyBraces--;
                    else if (c == '(') parentheses++;
                    else if (c == ')') parentheses--;
                    
                    if (squareBrackets < 0 || curlyBraces < 0 || parentheses < 0) {
                        throw new com.codelensx.backend.exception.ApiException("Mermaid syntax validation failed: Unbalanced brackets/braces/parentheses.", org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR);
                    }
                }
            }
            if (squareBrackets != 0 || curlyBraces != 0 || parentheses != 0) {
                throw new com.codelensx.backend.exception.ApiException("Mermaid syntax validation failed: Unbalanced brackets/braces/parentheses.", org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }
}
