package com.codelensx.backend.service.generator;

import com.codelensx.backend.dto.analysis.DependencyAnalysisResponseDto;
import com.codelensx.backend.dto.analysis.DesignPatternResponseDto;
import com.codelensx.backend.dto.analysis.ProjectStatsResponseDto;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.ai.GeminiClient;
import com.codelensx.backend.service.analysis.DependencyAnalysisService;
import com.codelensx.backend.service.analysis.DesignPatternDetectorService;
import com.codelensx.backend.service.analysis.ProjectStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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

    public String generateArchitectureSummary(UUID workspaceId, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");

        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);

        StringBuilder context = new StringBuilder();
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
                    .limit(15)
                    .forEach(e -> context.append("  - ").append(e.getKey()).append(" depends on: ").append(e.getValue()).append("\n"));
        }

        String prompt = "Create a detailed Software Architecture Document (SAD) for the following project code mapping:\n\n" + context.toString();

        String systemInstruction = "You are CodeLens X AI, a principal software architect. " +
                "Generate a clean, professional software architecture summary in markdown. " +
                "Explain: 1. Core Architectural Style (e.g. Layered, Onion, MVC, Microservice) based on files and naming patterns. " +
                "2. System Flow (how requests flow through components). " +
                "3. Dependency Analysis (highlighting internal coupling and critical modules). " +
                "4. Pattern utilization. Design recommendations for SDE portfolio improvements. " +
                "Use clean headers, bullet points, and mock Mermaid architecture diagrams where helpful.";

        return geminiClient.generateContent(systemInstruction, prompt);
    }
}
