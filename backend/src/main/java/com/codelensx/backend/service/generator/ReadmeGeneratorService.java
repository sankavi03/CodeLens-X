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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReadmeGeneratorService {

    private final GeminiClient geminiClient;
    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectStatsService projectStatsService;
    private final DependencyAnalysisService dependencyAnalysisService;
    private final DesignPatternDetectorService designPatternDetectorService;
    private final AiResponseCacheService cacheService;

    public String generateReadme(UUID workspaceId, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");

        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);

        StringBuilder folderStructure = new StringBuilder();
        collectFolderStructure(extractRoot, extractRoot, folderStructure, 0);

        StringBuilder context = new StringBuilder();
        context.append("Project Name: ").append(workspace.getProjectName()).append("\n");
        context.append("Total Files: ").append(stats.getTotalFiles()).append("\n");
        context.append("Lines of Code: ").append(stats.getCodeLines()).append("\n");
        
        context.append("Languages:\n");
        stats.getPercentageByLanguage().forEach((lang, pct) -> context.append("  - ").append(lang).append(": ").append(pct).append("%\n"));

        if (!deps.getExternalDependencies().isEmpty()) {
            context.append("Key External Dependencies:\n");
            deps.getExternalDependencies().stream().limit(15).forEach(dep -> 
                context.append("  - ").append(dep.getName()).append(" (version: ").append(dep.getVersion()).append(")\n"));
        }

        if (!patterns.getDetectedPatterns().isEmpty()) {
            context.append("Detected Software Design Patterns:\n");
            patterns.getDetectedPatterns().forEach(pat -> 
                context.append("  - ").append(pat.getPatternName()).append(" in ").append(pat.getClassName()).append("\n"));
        }

        context.append("\nActual Folder Structure:\n").append(folderStructure.toString());

        String prompt = "Generate a comprehensive, professional README.md for this project. Use the following context profile:\n\n" + context.toString();

        String systemInstruction = "You are CodeLens X AI, a lead technical documentation SDE. " +
                "Generate a top-tier GitHub-style README.md for this workspace. DO NOT hallucinate names, libraries, or files. Use ONLY details from the provided folder structure and context. " +
                "Your generated README.md MUST include exactly the following 15 sections in order:\n" +
                "1. Title (with mock badges for build, license, coverage, etc.)\n" +
                "2. Description (explaining the project's purpose and value)\n" +
                "3. Architecture (high-level structural summary or architecture description)\n" +
                "4. Features (bulleted list of capabilities)\n" +
                "5. Technology Stack (clearly formatted table/list of core languages, tools, frameworks)\n" +
                "6. Installation (concrete step-by-step installation instructions based on detected languages)\n" +
                "7. Running (how to start/run the project locally)\n" +
                "8. Configuration (required environment variables, properties files, or configs)\n" +
                "9. API (summarizing exposed controllers or class methods if present)\n" +
                "10. Folder Structure (displaying the provided folder structure in a clean tree or markdown layout)\n" +
                "11. Design Patterns (highlighting the detected software design patterns)\n" +
                "12. Statistics (total files, code lines count, language percentage table)\n" +
                "13. Screenshots placeholders (image placeholders with descriptive captions)\n" +
                "14. License (state standard open-source license like MIT)\n" +
                "15. Contribution (contribution guidelines and future improvements).\n\n" +
                "Formatting Requirements:\n" +
                "- Write in a clean, professional technical tone.\n" +
                "- Use rich markdown syntax, tables, and callouts (e.g. > [!NOTE]) for premium visuals.";

        return cacheService.get(systemInstruction, prompt)
                .orElseGet(() -> {
                    String generated = geminiClient.generateContent(systemInstruction, prompt);
                    cacheService.put(systemInstruction, prompt, generated);
                    return generated;
                });
    }

    private void collectFolderStructure(Path dir, Path root, StringBuilder sb, int depth) {
        try (Stream<Path> stream = Files.list(dir)) {
            List<Path> paths = stream.sorted().collect(Collectors.toList());
            for (Path path : paths) {
                String name = path.getFileName().toString();
                if (name.startsWith(".") || name.equals("node_modules") || name.equals("target") || name.equals("uploads")) {
                    continue;
                }
                sb.append("  ".repeat(depth)).append("- ").append(name).append(Files.isDirectory(path) ? "/" : "").append("\n");
                if (Files.isDirectory(path) && depth < 2) {
                    collectFolderStructure(path, root, sb, depth + 1);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to collect folder structure in readme generator for directory: {}", dir, e);
        }
    }
}
