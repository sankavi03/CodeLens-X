package com.codelensx.backend.parser.scanner;

import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class DirectoryScannerTest {

    @TempDir
    Path tempDir;

    private DirectoryScanner directoryScanner;

    @BeforeEach
    void setUp() {
        directoryScanner = new DirectoryScanner(new DirectoryIgnoreRules());
    }

    @Test
    void scan_CollectsFileMetadataAndIgnoresExcludedDirectories() throws IOException {
        Path root = tempDir.resolve("project");
        Files.createDirectories(root.resolve("src/main"));
        Files.createDirectories(root.resolve("node_modules/pkg"));
        Files.createDirectories(root.resolve("target/classes"));
        Files.createDirectories(root.resolve(".git/objects"));
        Files.writeString(root.resolve("src/main/App.java"), "class App {}");
        Files.writeString(root.resolve("node_modules/pkg/index.js"), "ignored");
        Files.writeString(root.resolve("target/classes/App.class"), "ignored");
        Files.writeString(root.resolve(".git/config"), "ignored");
        Files.writeString(root.resolve("README.md"), "readme");

        ProjectTreeNode rootNode = directoryScanner.scan(root);

        assertEquals(NodeType.FOLDER, rootNode.getType());
        assertEquals("project", rootNode.getName());
        assertTrue(findChild(rootNode, "src").isPresent());
        assertTrue(findChild(rootNode, "README.md").isPresent());
        assertFalse(findChild(rootNode, "node_modules").isPresent());
        assertFalse(findChild(rootNode, "target").isPresent());
        assertFalse(findChild(rootNode, ".git").isPresent());

        ProjectTreeNode appFile = findChild(findChild(rootNode, "src").get(), "main")
                .flatMap(main -> findChild(main, "App.java"))
                .orElseThrow();

        assertEquals(NodeType.FILE, appFile.getType());
        assertEquals("java", appFile.getExtension());
        assertEquals("src/main/App.java", appFile.getRelativePath());
        assertTrue(appFile.getSizeBytes() > 0);
    }

    private java.util.Optional<ProjectTreeNode> findChild(ProjectTreeNode parent, String name) {
        return parent.getChildren().stream()
                .filter(child -> child.getName().equals(name))
                .findFirst();
    }
}
