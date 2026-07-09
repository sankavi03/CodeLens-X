package com.codelensx.backend.filecontent.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SecureFileReaderTest {

    @TempDir
    Path tempDir;

    private SecureFileReader secureFileReader;

    @BeforeEach
    void setUp() {
        secureFileReader = new SecureFileReader(new TextFileValidator());
    }

    @Test
    void readTextFile_Success() throws IOException {
        Path filePath = tempDir.resolve("src/main/App.java");
        Files.createDirectories(filePath.getParent());
        Files.writeString(filePath, "public class App {}");

        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("App.java")
                .relativePath("src/main/App.java")
                .type(NodeType.FILE)
                .extension("java")
                .build();

        SecureFileReader.ReadResult result = secureFileReader.readTextFile(tempDir, node);

        assertEquals("public class App {}", result.content());
        assertEquals(Files.size(filePath), result.sizeBytes());
    }

    @Test
    void readTextFile_RejectsPathTraversal() {
        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("secret.txt")
                .relativePath("../secret.txt")
                .type(NodeType.FILE)
                .extension("txt")
                .build();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> secureFileReader.readTextFile(tempDir, node));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void readTextFile_RejectsMissingFile() {
        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("missing.txt")
                .relativePath("missing.txt")
                .type(NodeType.FILE)
                .extension("txt")
                .build();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> secureFileReader.readTextFile(tempDir, node));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    }

    @Test
    void readTextFile_RejectsFolder() throws IOException {
        Path folderPath = tempDir.resolve("src");
        Files.createDirectories(folderPath);

        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("src")
                .relativePath("src")
                .type(NodeType.FILE)
                .extension("")
                .build();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> secureFileReader.readTextFile(tempDir, node));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void readTextFile_RejectsSymbolicLink() throws IOException {
        Path targetFile = tempDir.resolve("outside.txt");
        Files.writeString(targetFile, "outside content");

        Path linkPath = tempDir.resolve("linked.txt");
        try {
            Files.createSymbolicLink(linkPath, targetFile);
        } catch (IOException | UnsupportedOperationException e) {
            org.junit.jupiter.api.Assumptions.assumeTrue(false, "Skipping test because symbolic links are not supported or permitted on this machine: " + e.getMessage());
        }

        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("linked.txt")
                .relativePath("linked.txt")
                .type(NodeType.FILE)
                .extension("txt")
                .build();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> secureFileReader.readTextFile(tempDir, node));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void readTextFile_RejectsOversizedFile() throws IOException {
        Path filePath = tempDir.resolve("large.txt");
        byte[] content = new byte[(int) TextFileValidator.MAX_FILE_SIZE_BYTES + 1];
        content[0] = 'a';
        Files.write(filePath, content);

        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("large.txt")
                .relativePath("large.txt")
                .type(NodeType.FILE)
                .extension("txt")
                .build();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> secureFileReader.readTextFile(tempDir, node));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, exception.getStatus());
    }

    @Test
    void readTextFile_RejectsBinaryFile() throws IOException {
        Path filePath = tempDir.resolve("binary.bin");
        Files.write(filePath, new byte[]{0x00, 0x01, 0x02});

        ProjectTreeNode node = ProjectTreeNode.builder()
                .name("binary.bin")
                .relativePath("binary.bin")
                .type(NodeType.FILE)
                .extension("bin")
                .build();

        ApiException exception = assertThrows(
                ApiException.class,
                () -> secureFileReader.readTextFile(tempDir, node));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, exception.getStatus());
    }
}
