package com.codelensx.backend.filecontent.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;

@Component
@RequiredArgsConstructor
public class SecureFileReader {

    private final TextFileValidator textFileValidator;

    public ReadResult readTextFile(Path extractRoot, ProjectTreeNode fileNode) {
        Path filePath = resolveSecurePath(extractRoot, fileNode.getRelativePath());

        long sizeBytes;
        try {
            sizeBytes = Files.size(filePath);
        } catch (IOException e) {
            throw new ApiException("File not found", HttpStatus.NOT_FOUND);
        }

        textFileValidator.validateSize(sizeBytes);

        byte[] bytes;
        try {
            bytes = Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new ApiException("Failed to read file content", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        textFileValidator.validateTextContent(bytes, fileNode.getName(), fileNode.getExtension());

        return new ReadResult(new String(bytes, StandardCharsets.UTF_8), sizeBytes);
    }

    private Path resolveSecurePath(Path extractRoot, String relativePath) {
        Path normalizedRoot = extractRoot.toAbsolutePath().normalize();
        Path resolved = normalizedRoot.resolve(relativePath).normalize();

        if (!resolved.startsWith(normalizedRoot)) {
            throw new ApiException("Invalid path: path traversal is not allowed", HttpStatus.BAD_REQUEST);
        }

        if (!Files.exists(resolved, LinkOption.NOFOLLOW_LINKS)) {
            throw new ApiException("File not found", HttpStatus.NOT_FOUND);
        }

        if (Files.isSymbolicLink(resolved)) {
            throw new ApiException("Invalid path: symbolic links are not allowed", HttpStatus.BAD_REQUEST);
        }

        if (!Files.isRegularFile(resolved, LinkOption.NOFOLLOW_LINKS)) {
            throw new ApiException("Invalid path: requested path is a folder, not a file", HttpStatus.BAD_REQUEST);
        }

        try {
            Path realFile = resolved.toRealPath();
            Path realRoot = normalizedRoot.toRealPath();
            if (!realFile.startsWith(realRoot)) {
                throw new ApiException("Invalid path: access outside workspace is not allowed", HttpStatus.BAD_REQUEST);
            }
        } catch (IOException e) {
            throw new ApiException("File not found", HttpStatus.NOT_FOUND);
        }

        return resolved;
    }

    public record ReadResult(String content, long sizeBytes) {
    }
}
