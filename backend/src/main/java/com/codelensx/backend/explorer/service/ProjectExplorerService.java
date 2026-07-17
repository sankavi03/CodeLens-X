package com.codelensx.backend.explorer.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.explorer.dto.ExplorerFileNodeResponseDto;
import com.codelensx.backend.explorer.dto.ExplorerFolderNodeResponseDto;
import com.codelensx.backend.explorer.dto.ExplorerTreeResponseDto;
import com.codelensx.backend.explorer.mapper.ProjectExplorerMapper;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import com.codelensx.backend.parser.service.ProjectParserService;
import com.codelensx.backend.parser.util.ProjectTreePathUtils;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectExplorerService {

    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectExplorerMapper projectExplorerMapper;
    private final ProjectParserService projectParserService;

    @Transactional(readOnly = true)
    public ExplorerTreeResponseDto getProjectTree(UUID workspaceId, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
        return projectExplorerMapper.toTreeResponse(projectTree);
    }

    @Transactional(readOnly = true)
    public Object getProjectNode(UUID workspaceId, String path, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);

        String normalizedPath = ProjectTreePathUtils.normalizePath(path);
        ProjectTreePathUtils.validatePathFormat(normalizedPath);

        ProjectTreeNode node = ProjectTreePathUtils.findNodeByPath(projectTree.getRoot(), normalizedPath);
        if (node == null) {
            throw new ApiException("Invalid path: node not found", HttpStatus.BAD_REQUEST);
        }

        if (node.getType() == NodeType.FOLDER) {
            return projectExplorerMapper.toFolderNodeResponse(node);
        }

        return projectExplorerMapper.toFileNodeResponse(node);
    }
}
