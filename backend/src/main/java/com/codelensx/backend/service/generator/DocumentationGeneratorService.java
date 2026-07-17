package com.codelensx.backend.service.generator;

import com.codelensx.backend.dto.analysis.CodeMetadataDto;
import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.ai.GeminiClient;
import com.codelensx.backend.service.ai.AiResponseCacheService;
import com.codelensx.backend.service.analysis.MetadataExtractorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentationGeneratorService {

    private final GeminiClient geminiClient;
    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final MetadataExtractorService metadataExtractorService;
    private final AiResponseCacheService cacheService;

    public String generateFileDocumentation(UUID workspaceId, String relativePath, String username) {
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

        CodeMetadataDto metadata = metadataExtractorService.extractMetadata(filePath);

        StringBuilder context = new StringBuilder();
        context.append("Language: ").append(metadata.getLanguage()).append("\n");
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

        String prompt = "Generate detailed markdown documentation for the following code file:\n\n" +
                "File Path: " + relativePath + "\n" +
                "Structural Meta:\n" + context.toString() + "\n" +
                "Code:\n" +
                "```\n" +
                codeContent + "\n" +
                "```";

        String systemInstruction = "You are CodeLens X AI, a professional technical writer and lead SDE. " +
                "Generate comprehensive technical markdown documentation for the provided code file. " +
                "Your generated documentation MUST include the following 10 sections with clear headers:\n" +
                "1. Purpose (summary of what the class/file does)\n" +
                "2. Responsibilities (bullet points showing class responsibilities)\n" +
                "3. Classes (detailed listing of classes or interfaces defined in this file)\n" +
                "4. Methods (detailed list of methods, parameters, return values, and behavior)\n" +
                "5. Dependencies (imported packages, third-party libraries, and internal links)\n" +
                "6. Design Patterns (any architectural or structural patterns utilized)\n" +
                "7. Code Smells (observations regarding logic depth, duplication, or design flows)\n" +
                "8. Suggestions (actionable refactoring advice and next steps)\n" +
                "9. Complexity (time and space complexity estimate for core methods)\n" +
                "10. Package Relationships (how it interacts with neighboring files/packages).\n\n" +
                "Format with clean headers, markdown tables, and syntax-highlighted code blocks where applicable.";

        return cacheService.get(systemInstruction, prompt)
                .orElseGet(() -> {
                    String generated = geminiClient.generateContent(systemInstruction, prompt);
                    cacheService.put(systemInstruction, prompt, generated);
                    return generated;
                });
    }
}
