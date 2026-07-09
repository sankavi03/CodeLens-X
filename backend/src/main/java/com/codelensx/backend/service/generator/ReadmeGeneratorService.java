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
public class ReadmeGeneratorService {

    private final GeminiClient geminiClient;
    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectStatsService projectStatsService;
    private final DependencyAnalysisService dependencyAnalysisService;
    private final DesignPatternDetectorService designPatternDetectorService;

    public String generateReadme(UUID workspaceId, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");

        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);

        StringBuilder context = new StringBuilder();
        context.append("Project Name: ").append(workspace.getProjectName()).append("\n");
        context.append("Total Files: ").append(stats.getTotalFiles()).append("\n");
        context.append("Lines of Code: ").append(stats.getCodeLines()).append("\n");
        
        context.append("Languages:\n");
        stats.getPercentageByLanguage().forEach((lang, pct) -> context.append("  - ").append(lang).append(": ").append(pct).append("%\n"));

        if (!deps.getExternalDependencies().isEmpty()) {
            context.append("Key External Dependencies:\n");
            deps.getExternalDependencies().stream().limit(10).forEach(dep -> 
                context.append("  - ").append(dep.getName()).append(" (version: ").append(dep.getVersion()).append(")\n"));
        }

        if (!patterns.getDetectedPatterns().isEmpty()) {
            context.append("Detected Software Design Patterns:\n");
            patterns.getDetectedPatterns().forEach(pat -> 
                context.append("  - ").append(pat.getPatternName()).append(" in ").append(pat.getClassName()).append("\n"));
        }

        String prompt = "Create a comprehensive, professional README.md for a project with the following profile:\n\n" + context.toString();

        String systemInstruction = "You are CodeLens X AI, a lead technical documentation SDE. " +
                "Generate a top-tier GitHub-style README.md. Structure it with: Project Title, Description, " +
                "Technology Stack, Architecture & Layout description (explaining the structural package organization), " +
                "Getting Started/Installation guidelines, and Key Highlights (mentioning detected design patterns and file structure). " +
                "Make it visually polished and structured using clear markdown elements.";

        return geminiClient.generateContent(systemInstruction, prompt);
    }
}
