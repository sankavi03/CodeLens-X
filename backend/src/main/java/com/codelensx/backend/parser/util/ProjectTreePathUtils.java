package com.codelensx.backend.parser.util;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import org.springframework.http.HttpStatus;

public final class ProjectTreePathUtils {

    private ProjectTreePathUtils() {
    }

    public static String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }

        return path.trim()
                .replace('\\', '/')
                .replaceAll("^/+", "")
                .replaceAll("/+$", "");
    }

    public static void validateNotAbsolute(String path) {
        if (path == null || path.isBlank()) {
            return;
        }

        String trimmed = path.trim();
        if (trimmed.startsWith("/") || trimmed.startsWith("\\") || trimmed.matches("^[A-Za-z]:[/\\\\].*")) {
            throw new ApiException("Invalid path: absolute paths are not allowed", HttpStatus.BAD_REQUEST);
        }
    }

    public static void validatePathFormat(String normalizedPath) {
        if (normalizedPath.contains("..")) {
            throw new ApiException("Invalid path: path traversal is not allowed", HttpStatus.BAD_REQUEST);
        }
    }

    public static ProjectTreeNode findNodeByPath(ProjectTreeNode root, String normalizedPath) {
        if (normalizedPath.isEmpty()) {
            return root;
        }

        if (root.getRelativePath().equals(normalizedPath)) {
            return root;
        }

        return findNodeRecursive(root, normalizedPath);
    }

    private static ProjectTreeNode findNodeRecursive(ProjectTreeNode current, String normalizedPath) {
        for (ProjectTreeNode child : current.getChildren()) {
            if (child.getRelativePath().equals(normalizedPath)) {
                return child;
            }

            if (child.getType() == NodeType.FOLDER) {
                ProjectTreeNode found = findNodeRecursive(child, normalizedPath);
                if (found != null) {
                    return found;
                }
            }
        }

        return null;
    }
}
