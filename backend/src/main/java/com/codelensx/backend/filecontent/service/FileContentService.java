package com.codelensx.backend.filecontent.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.filecontent.dto.FileContentResponseDto;
import com.codelensx.backend.filecontent.mapper.FileContentMapper;
import com.codelensx.backend.parser.cache.ProjectTreeCache;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import com.codelensx.backend.parser.util.ProjectTreePathUtils;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileContentService {

    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectTreeCache projectTreeCache;
    private final FileContentMapper fileContentMapper;
    private final SecureFileReader secureFileReader;

    @Transactional(readOnly = true)
    public FileContentResponseDto getFileContent(UUID workspaceId, String path, String username) {
        workspaceAccessValidator.validateAccess(workspaceId, username);
        ProjectTree projectTree = getCachedTree(workspaceId);

        ProjectTreePathUtils.validateNotAbsolute(path);
        String normalizedPath = ProjectTreePathUtils.normalizePath(path);
        ProjectTreePathUtils.validatePathFormat(normalizedPath);

        if (normalizedPath.isEmpty()) {
            throw new ApiException("Invalid path: file path is required", HttpStatus.BAD_REQUEST);
        }

        ProjectTreeNode node = ProjectTreePathUtils.findNodeByPath(projectTree.getRoot(), normalizedPath);
        if (node == null) {
            throw new ApiException("File not found", HttpStatus.NOT_FOUND);
        }

        if (node.getType() == NodeType.FOLDER) {
            throw new ApiException("Invalid path: requested path is a folder, not a file", HttpStatus.BAD_REQUEST);
        }

        SecureFileReader.ReadResult readResult = secureFileReader.readTextFile(projectTree.getRootPath(), node);
        return fileContentMapper.toResponse(workspaceId, node, readResult.content(), readResult.sizeBytes());
    }

    private ProjectTree getCachedTree(UUID workspaceId) {
        return projectTreeCache.get(workspaceId)
                .orElseThrow(() -> new ApiException(
                        "Parsed project tree is not available for this workspace",
                        HttpStatus.CONFLICT));
    }
}
