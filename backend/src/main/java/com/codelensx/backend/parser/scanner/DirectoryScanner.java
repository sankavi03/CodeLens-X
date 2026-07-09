package com.codelensx.backend.parser.scanner;

import com.codelensx.backend.parser.exception.ParserException;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
public class DirectoryScanner {

    private final DirectoryIgnoreRules ignoreRules;

    public ProjectTreeNode scan(Path rootDirectory) {
        if (!Files.isDirectory(rootDirectory)) {
            throw new ParserException("Scan root is not a directory: " + rootDirectory);
        }

        return scanDirectory(rootDirectory, rootDirectory);
    }

    private ProjectTreeNode scanDirectory(Path rootDirectory, Path currentDirectory) {
        String relativePath = toRelativePath(rootDirectory, currentDirectory);
        String name = currentDirectory.getFileName() != null
                ? currentDirectory.getFileName().toString()
                : rootDirectory.getFileName().toString();

        ProjectTreeNode folderNode = ProjectTreeNode.builder()
                .name(name)
                .relativePath(relativePath)
                .type(NodeType.FOLDER)
                .children(new ArrayList<>())
                .build();

        List<Path> entries;
        try (Stream<Path> stream = Files.list(currentDirectory)) {
            entries = stream.sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        } catch (IOException e) {
            throw new ParserException("Failed to list directory: " + currentDirectory, e);
        }

        for (Path entry : entries) {
            String entryName = entry.getFileName().toString();

            if (Files.isDirectory(entry)) {
                if (ignoreRules.shouldIgnore(entryName)) {
                    continue;
                }
                folderNode.getChildren().add(scanDirectory(rootDirectory, entry));
            } else if (Files.isRegularFile(entry)) {
                folderNode.getChildren().add(buildFileNode(rootDirectory, entry));
            }
        }

        return folderNode;
    }

    private ProjectTreeNode buildFileNode(Path rootDirectory, Path filePath) {
        String fileName = filePath.getFileName().toString();
        long sizeBytes;

        try {
            sizeBytes = Files.size(filePath);
        } catch (IOException e) {
            throw new ParserException("Failed to read file size: " + filePath, e);
        }

        return ProjectTreeNode.builder()
                .name(fileName)
                .relativePath(toRelativePath(rootDirectory, filePath))
                .type(NodeType.FILE)
                .extension(extractExtension(fileName))
                .sizeBytes(sizeBytes)
                .build();
    }

    private String toRelativePath(Path rootDirectory, Path path) {
        Path normalizedRoot = rootDirectory.normalize();
        Path normalizedPath = path.normalize();

        if (normalizedPath.equals(normalizedRoot)) {
            return normalizedRoot.getFileName().toString();
        }

        return normalizedRoot.relativize(normalizedPath).toString().replace('\\', '/');
    }

    private String extractExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot <= 0 || lastDot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(lastDot + 1);
    }
}
