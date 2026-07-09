package com.codelensx.backend.explorer.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.explorer.dto.ExplorerFileNodeResponseDto;
import com.codelensx.backend.explorer.dto.ExplorerFolderNodeResponseDto;
import com.codelensx.backend.explorer.dto.ExplorerTreeResponseDto;
import com.codelensx.backend.explorer.mapper.ProjectExplorerMapper;
import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.parser.cache.ProjectTreeCache;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectExplorerService {

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ProjectTreeCache projectTreeCache;
    private final ProjectExplorerMapper projectExplorerMapper;

    @Transactional(readOnly = true)
    public ExplorerTreeResponseDto getProjectTree(UUID workspaceId, String username) {
        validateWorkspaceAccess(workspaceId, username);
        ProjectTree projectTree = getCachedTree(workspaceId);
        return projectExplorerMapper.toTreeResponse(projectTree);
    }

    @Transactional(readOnly = true)
    public Object getProjectNode(UUID workspaceId, String path, String username) {
        validateWorkspaceAccess(workspaceId, username);
        ProjectTree projectTree = getCachedTree(workspaceId);

        String normalizedPath = normalizePath(path);
        validatePathFormat(normalizedPath);

        ProjectTreeNode node = findNodeByPath(projectTree.getRoot(), normalizedPath);
        if (node == null) {
            throw new ApiException("Invalid path: node not found", HttpStatus.BAD_REQUEST);
        }

        if (node.getType() == NodeType.FOLDER) {
            return projectExplorerMapper.toFolderNodeResponse(node);
        }

        return projectExplorerMapper.toFileNodeResponse(node);
    }

    private void validateWorkspaceAccess(UUID workspaceId, String username) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new ApiException("Workspace not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        if (!workspace.getOwner().getId().equals(user.getId())) {
            throw new ApiException("Access denied to this workspace", HttpStatus.FORBIDDEN);
        }
    }

    private ProjectTree getCachedTree(UUID workspaceId) {
        return projectTreeCache.get(workspaceId)
                .orElseThrow(() -> new ApiException(
                        "Parsed project tree is not available for this workspace",
                        HttpStatus.CONFLICT));
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }

        return path.trim()
                .replace('\\', '/')
                .replaceAll("^/+", "")
                .replaceAll("/+$", "");
    }

    private void validatePathFormat(String normalizedPath) {
        if (normalizedPath.contains("..")) {
            throw new ApiException("Invalid path: path traversal is not allowed", HttpStatus.BAD_REQUEST);
        }
    }

    private ProjectTreeNode findNodeByPath(ProjectTreeNode root, String normalizedPath) {
        if (normalizedPath.isEmpty()) {
            return root;
        }

        if (root.getRelativePath().equals(normalizedPath)) {
            return root;
        }

        return findNodeRecursive(root, normalizedPath);
    }

    private ProjectTreeNode findNodeRecursive(ProjectTreeNode current, String normalizedPath) {
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
