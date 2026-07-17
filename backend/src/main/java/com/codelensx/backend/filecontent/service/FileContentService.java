package com.codelensx.backend.filecontent.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.filecontent.dto.FileContentResponseDto;
import com.codelensx.backend.filecontent.mapper.FileContentMapper;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import com.codelensx.backend.parser.service.ProjectParserService;
import com.codelensx.backend.parser.util.ProjectTreePathUtils;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileContentService {

    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final FileContentMapper fileContentMapper;
    private final SecureFileReader secureFileReader;
    private final ProjectParserService projectParserService;

    @Transactional(readOnly = true)
    public FileContentResponseDto getFileContent(UUID workspaceId, String path, String username) {
        long startTime = System.currentTimeMillis();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);

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
            FileContentResponseDto response = fileContentMapper.toResponse(workspaceId, node, readResult.content(), readResult.sizeBytes(), readResult.lastModified());
            
            long duration = System.currentTimeMillis() - startTime;
            log.info("Operation: READ_FILE | WorkspaceId: {} | User: {} | File: {} | Duration: {}ms | Success: true",
                    workspaceId, username, path, duration);
            return response;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Operation: READ_FILE | WorkspaceId: {} | User: {} | File: {} | Duration: {}ms | Success: false | Error: {}",
                    workspaceId, username, path, duration, e.getMessage());
            throw e;
        }
    }

    @Transactional
    public FileContentResponseDto saveFileContent(UUID workspaceId, String path, String content, long clientLastModified, String username) {
        long startTime = System.currentTimeMillis();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);

            com.codelensx.backend.parser.util.ProjectTreePathUtils.validateNotAbsolute(path);
            String normalizedPath = com.codelensx.backend.parser.util.ProjectTreePathUtils.normalizePath(path);
            com.codelensx.backend.parser.util.ProjectTreePathUtils.validatePathFormat(normalizedPath);

            if (normalizedPath.isEmpty()) {
                throw new ApiException("Invalid path: file path is required", HttpStatus.BAD_REQUEST);
            }

            ProjectTreeNode node = com.codelensx.backend.parser.util.ProjectTreePathUtils.findNodeByPath(projectTree.getRoot(), normalizedPath);
            if (node == null) {
                throw new ApiException("File not found", HttpStatus.NOT_FOUND);
            }

            if (node.getType() != NodeType.FILE) {
                throw new ApiException("Invalid path: requested path is not a file", HttpStatus.BAD_REQUEST);
            }

            // Resolve and write securely
            java.nio.file.Path extractRoot = projectTree.getRootPath();
            java.nio.file.Path normalizedRoot = extractRoot.toAbsolutePath().normalize();
            java.nio.file.Path resolved = normalizedRoot.resolve(node.getRelativePath()).normalize();

            if (!resolved.startsWith(normalizedRoot)) {
                throw new ApiException("Invalid path: path traversal is not allowed", HttpStatus.BAD_REQUEST);
            }

            if (!java.nio.file.Files.exists(resolved)) {
                throw new ApiException("File not found", HttpStatus.NOT_FOUND);
            }

            // Check conflict
            long diskLastModified = java.nio.file.Files.getLastModifiedTime(resolved).toMillis();
            if (clientLastModified > 0 && diskLastModified - clientLastModified > 1000) {
                throw new ApiException("Conflict detected: The file has been modified on disk by another process.", HttpStatus.CONFLICT);
            }

            // Write content
            byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            java.nio.file.Files.write(resolved, bytes);

            // Re-parse project to update database metadata, tree cache, statistics etc.
            projectParserService.evictCachedTree(workspaceId);
            projectParserService.parseProject(workspace);

            // Fetch the updated tree to map the returned response
            ProjectTree updatedTree = projectParserService.getOrBuildTree(workspace);
            ProjectTreeNode updatedNode = com.codelensx.backend.parser.util.ProjectTreePathUtils.findNodeByPath(updatedTree.getRoot(), normalizedPath);
            long newSizeBytes = java.nio.file.Files.size(resolved);
            long newLastModified = java.nio.file.Files.getLastModifiedTime(resolved).toMillis();

            FileContentResponseDto response = fileContentMapper.toResponse(workspaceId, updatedNode, content, newSizeBytes, newLastModified);

            long duration = System.currentTimeMillis() - startTime;
            log.info("Operation: WRITE_FILE | WorkspaceId: {} | User: {} | File: {} | Duration: {}ms | Success: true",
                    workspaceId, username, path, duration);
            return response;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Operation: WRITE_FILE | WorkspaceId: {} | User: {} | File: {} | Duration: {}ms | Success: false | Error: {}",
                    workspaceId, username, path, duration, e.getMessage());
            if (e instanceof ApiException) {
                throw (ApiException) e;
            }
            throw new ApiException("Failed to save file: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
