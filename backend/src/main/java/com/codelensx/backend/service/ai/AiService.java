package com.codelensx.backend.service.ai;

import com.codelensx.backend.dto.analysis.*;
import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.ChatMessage;
import com.codelensx.backend.model.Conversation;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.repository.WorkspaceRepository;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.analysis.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    private final GeminiClient geminiClient;
    private final AiResponseCacheService cacheService;
    private final ConversationService conversationService;
    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final WorkspaceRepository workspaceRepository;

    private final LanguageDetectorService languageDetectorService;
    private final MetadataExtractorService metadataExtractorService;
    private final ProjectStatsService projectStatsService;
    private final DependencyAnalysisService dependencyAnalysisService;
    private final DesignPatternDetectorService designPatternDetectorService;
    private final ProjectInsightsService projectInsightsService;

    public String explainFile(UUID workspaceId, String relativePath, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        Path filePath = extractRoot.resolve(relativePath).normalize();

        if (!filePath.startsWith(extractRoot) || !Files.exists(filePath) || Files.isDirectory(filePath)) {
            throw new ApiException("Invalid file path", HttpStatus.BAD_REQUEST);
        }

        String codeContent;
        try {
            codeContent = Files.readString(filePath);
        } catch (IOException e) {
            throw new ApiException("Failed to read file", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Generate context
        CodeMetadataDto metadata = metadataExtractorService.extractMetadata(filePath);
        
        StringBuilder context = new StringBuilder();
        context.append("Language: ").append(metadata.getLanguage()).append("\n");
        if (metadata.getPackageName() != null) {
            context.append("Package: ").append(metadata.getPackageName()).append("\n");
        }
        if (!metadata.getImports().isEmpty()) {
            context.append("Imports:\n");
            metadata.getImports().forEach(imp -> context.append("  - ").append(imp).append("\n"));
        }
        if (!metadata.getClasses().isEmpty()) {
            context.append("Classes: ").append(String.join(", ", metadata.getClasses())).append("\n");
        }
        if (!metadata.getInterfaces().isEmpty()) {
            context.append("Interfaces: ").append(String.join(", ", metadata.getInterfaces())).append("\n");
        }
        if (!metadata.getMethods().isEmpty()) {
            context.append("Methods:\n");
            metadata.getMethods().forEach(m -> context.append("  - ").append(m).append("\n"));
        }

        String prompt = "File Path: " + relativePath + "\n\n" +
                "### Structural Context:\n" + context.toString() + "\n" +
                "### Source Code:\n" +
                "```" + metadata.getLanguage().toLowerCase() + "\n" +
                codeContent + "\n" +
                "```\n";

        String systemInstruction = "You are CodeLens X AI, a helpful software engineer assistant. Explain the following source code file. " +
                "Provide a clear, detailed breakdown of its primary purpose, inner class designs, key methods, and package associations. " +
                "Point out any potential code smells or design issues if present. Maintain a professional tone.";

        // Cache check
        return getOrGenerateContent(systemInstruction, prompt);
    }

    public String getProjectSummary(UUID workspaceId, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");

        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);

        StringBuilder context = new StringBuilder();
        context.append("Project Name: ").append(workspace.getProjectName()).append("\n");
        context.append("Total Files: ").append(stats.getTotalFiles()).append("\n");
        context.append("Total Folders: ").append(stats.getTotalFolders()).append("\n");
        context.append("Lines of Code: ").append(stats.getCodeLines()).append("\n");
        context.append("Lines of Comments: ").append(stats.getCommentLines()).append("\n");
        
        context.append("Language Breakdown:\n");
        stats.getPercentageByLanguage().forEach((lang, pct) -> context.append("  - ").append(lang).append(": ").append(pct).append("%\n"));

        if (!deps.getExternalDependencies().isEmpty()) {
            context.append("\nExternal Dependencies:\n");
            deps.getExternalDependencies().stream().limit(15).forEach(dep -> 
                context.append("  - ").append(dep.getName()).append(" (version: ").append(dep.getVersion()).append(")\n"));
        }

        if (!patterns.getDetectedPatterns().isEmpty()) {
            context.append("\nDetected Design Patterns:\n");
            patterns.getDetectedPatterns().forEach(pat -> 
                context.append("  - ").append(pat.getPatternName()).append(" in ").append(pat.getClassName()).append(" (Confidence: ").append(pat.getConfidence()).append(")\n"));
        }

        String prompt = "Generate a high-level project summary for the following project metrics and dependencies:\n\n" + context.toString();
        String systemInstruction = "You are CodeLens X AI, a lead software architect. Analyze the provided project statistics, external dependencies, and design patterns " +
                "to write a comprehensive summary of the project. Explain what the project represents, its tech stack, architecture layout, and core structural overview. " +
                "Keep the tone clean and highly informative.";

        return getOrGenerateContent(systemInstruction, prompt);
    }

    public ChatMessage projectChat(UUID workspaceId, UUID conversationId, String userMessage, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");

        // 1. Get project details for general context
        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);
        ProjectInsightsResponseDto insights = projectInsightsService.calculateInsights(extractRoot);

        StringBuilder projectContext = new StringBuilder();
        projectContext.append("### Project Context:\n");
        projectContext.append("Project Name: ").append(workspace.getProjectName()).append("\n");
        projectContext.append("Total Files: ").append(stats.getTotalFiles()).append("\n");
        projectContext.append("Languages: ").append(stats.getFileCountByLanguage().keySet()).append("\n");
        
        if (!patterns.getDetectedPatterns().isEmpty()) {
            projectContext.append("Patterns: ").append(
                patterns.getDetectedPatterns().stream().map(DesignPatternResponseDto.PatternMatchDto::getPatternName).distinct().collect(Collectors.toList())
            ).append("\n");
        }
        
        projectContext.append("Code Smells Count: ").append(insights.getCodeSmells().size()).append("\n");
        projectContext.append("TODO/FIXME count: ").append(insights.getTodoMarkers().size()).append("\n\n");

        // 2. Fetch conversation history
        List<ChatMessage> history = conversationService.getMessages(conversationId, username);

        // 3. Save User Message in DB
        conversationService.addMessage(conversationId, "USER", userMessage, username);

        // 4. Construct historical prompt block
        StringBuilder chatPrompt = new StringBuilder();
        chatPrompt.append(projectContext);
        chatPrompt.append("### Conversation History:\n");
        for (ChatMessage msg : history) {
            chatPrompt.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
        }
        chatPrompt.append("USER: ").append(userMessage).append("\n");
        chatPrompt.append("ASSISTANT: ");

        String systemInstruction = "You are CodeLens X AI, a coding assistant that helps developers understand their project. " +
                "Use the provided project context (statistics, patterns, smells) and conversation history to answer the user's questions in a clear, context-aware format. " +
                "Reference project patterns or files if relevant. Be helpful, concise, and provide code blocks when requested.";

        // Run Gemini
        String aiResponse = geminiClient.generateContent(systemInstruction, chatPrompt.toString());

        // 5. Save and Return Assistant Message
        return conversationService.addMessage(conversationId, "ASSISTANT", aiResponse, username);
    }

    private String getOrGenerateContent(String systemInstruction, String prompt) {
        return cacheService.get(systemInstruction, prompt)
                .orElseGet(() -> {
                    String generated = geminiClient.generateContent(systemInstruction, prompt);
                    cacheService.put(systemInstruction, prompt, generated);
                    return generated;
                });
    }
}
