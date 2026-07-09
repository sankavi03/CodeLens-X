package com.codelensx.backend.parser.util;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProjectTreePathUtilsTest {

    @Test
    void normalizePath_TrimsAndNormalizesSeparators() {
        assertEquals("src/main/App.java", ProjectTreePathUtils.normalizePath(" /src\\main/App.java/ "));
    }

    @Test
    void validateNotAbsolute_RejectsUnixAbsolutePath() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> ProjectTreePathUtils.validateNotAbsolute("/etc/passwd"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void validateNotAbsolute_RejectsWindowsAbsolutePath() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> ProjectTreePathUtils.validateNotAbsolute("C:\\secret.txt"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void validatePathFormat_RejectsTraversal() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> ProjectTreePathUtils.validatePathFormat("src/../secret.txt"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void findNodeByPath_FindsNestedFile() {
        ProjectTreeNode root = buildSampleTree();

        ProjectTreeNode found = ProjectTreePathUtils.findNodeByPath(root, "src/main/App.java");

        assertNotNull(found);
        assertEquals("App.java", found.getName());
    }

    @Test
    void findNodeByPath_ReturnsNullForMissingNode() {
        ProjectTreeNode root = buildSampleTree();

        assertNull(ProjectTreePathUtils.findNodeByPath(root, "missing.txt"));
    }

    private ProjectTreeNode buildSampleTree() {
        ProjectTreeNode appFile = ProjectTreeNode.builder()
                .name("App.java")
                .relativePath("src/main/App.java")
                .type(NodeType.FILE)
                .build();

        ProjectTreeNode mainFolder = ProjectTreeNode.builder()
                .name("main")
                .relativePath("src/main")
                .type(NodeType.FOLDER)
                .children(List.of(appFile))
                .build();

        ProjectTreeNode srcFolder = ProjectTreeNode.builder()
                .name("src")
                .relativePath("src")
                .type(NodeType.FOLDER)
                .children(List.of(mainFolder))
                .build();

        return ProjectTreeNode.builder()
                .name("extracted")
                .relativePath("extracted")
                .type(NodeType.FOLDER)
                .children(List.of(srcFolder))
                .build();
    }
}
