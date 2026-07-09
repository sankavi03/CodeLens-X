package com.codelensx.backend.service.generator;

import com.codelensx.backend.dto.analysis.CodeMetadataDto;
import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.ai.GeminiClient;
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

        String systemInstruction = "You are CodeLens X AI, a professional technical writer and SDE. " +
                "Generate comprehensive markdown documentation for the provided code. Include a summary of purpose, " +
                "detailed API description (classes, methods, parameters, types), usage instructions/examples, and design decisions. " +
                "Format with clean headers and code blocks.";

        return geminiClient.generateContent(systemInstruction, prompt);
    }
}
