package com.codelensx.backend.filecontent.controller;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.service.ProjectParserService;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/explorer")
@RequiredArgsConstructor
@Slf4j
public class WorkspaceExplorerController {

    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectParserService projectParserService;

    @PostMapping("/file")
    public ResponseEntity<Void> createFile(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        long startTime = System.currentTimeMillis();
        String username = principal.getName();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
            
            Path resolved = resolveSecurePath(projectTree.getRootPath(), path);
            if (Files.exists(resolved)) {
                throw new ApiException("File already exists", HttpStatus.BAD_REQUEST);
            }
            
            Files.createDirectories(resolved.getParent());
            Files.createFile(resolved);
            
            reparse(workspaceId, workspace);
            
            log.info("Operation: CREATE_FILE | WorkspaceId: {} | User: {} | Path: {} | Duration: {}ms | Success: true",
                    workspaceId, username, path, System.currentTimeMillis() - startTime);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            log.error("Operation: CREATE_FILE | WorkspaceId: {} | User: {} | Path: {} | Success: false | Error: {}",
                    workspaceId, username, path, e.getMessage());
            if (e instanceof ApiException) throw (ApiException) e;
            throw new ApiException("Failed to create file: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/folder")
    public ResponseEntity<Void> createFolder(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        long startTime = System.currentTimeMillis();
        String username = principal.getName();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
            
            Path resolved = resolveSecurePath(projectTree.getRootPath(), path);
            if (Files.exists(resolved)) {
                throw new ApiException("Directory already exists", HttpStatus.BAD_REQUEST);
            }
            
            Files.createDirectories(resolved);
            
            reparse(workspaceId, workspace);
            
            log.info("Operation: CREATE_FOLDER | WorkspaceId: {} | User: {} | Path: {} | Duration: {}ms | Success: true",
                    workspaceId, username, path, System.currentTimeMillis() - startTime);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            log.error("Operation: CREATE_FOLDER | WorkspaceId: {} | User: {} | Path: {} | Success: false | Error: {}",
                    workspaceId, username, path, e.getMessage());
            if (e instanceof ApiException) throw (ApiException) e;
            throw new ApiException("Failed to create folder: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/rename")
    public ResponseEntity<Void> renamePath(
            @PathVariable UUID workspaceId,
            @RequestParam("oldPath") String oldPath,
            @RequestParam("newPath") String newPath,
            Principal principal) {
        long startTime = System.currentTimeMillis();
        String username = principal.getName();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
            
            Path oldResolved = resolveSecurePath(projectTree.getRootPath(), oldPath);
            Path newResolved = resolveSecurePath(projectTree.getRootPath(), newPath);
            
            if (!Files.exists(oldResolved)) {
                throw new ApiException("Source path not found", HttpStatus.NOT_FOUND);
            }
            if (Files.exists(newResolved)) {
                throw new ApiException("Destination path already exists", HttpStatus.BAD_REQUEST);
            }
            
            Files.createDirectories(newResolved.getParent());
            Files.move(oldResolved, newResolved);
            
            reparse(workspaceId, workspace);
            
            log.info("Operation: RENAME_PATH | WorkspaceId: {} | User: {} | Old: {} | New: {} | Duration: {}ms | Success: true",
                    workspaceId, username, oldPath, newPath, System.currentTimeMillis() - startTime);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Operation: RENAME_PATH | WorkspaceId: {} | User: {} | Old: {} | New: {} | Success: false | Error: {}",
                    workspaceId, username, oldPath, newPath, e.getMessage());
            if (e instanceof ApiException) throw (ApiException) e;
            throw new ApiException("Failed to rename path: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping
    public ResponseEntity<Void> deletePath(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        long startTime = System.currentTimeMillis();
        String username = principal.getName();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
            
            Path resolved = resolveSecurePath(projectTree.getRootPath(), path);
            if (!Files.exists(resolved)) {
                throw new ApiException("Path not found", HttpStatus.NOT_FOUND);
            }
            
            deleteRecursively(resolved);
            
            reparse(workspaceId, workspace);
            
            log.info("Operation: DELETE_PATH | WorkspaceId: {} | User: {} | Path: {} | Duration: {}ms | Success: true",
                    workspaceId, username, path, System.currentTimeMillis() - startTime);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Operation: DELETE_PATH | WorkspaceId: {} | User: {} | Path: {} | Success: false | Error: {}",
                    workspaceId, username, path, e.getMessage());
            if (e instanceof ApiException) throw (ApiException) e;
            throw new ApiException("Failed to delete path: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Path resolveSecurePath(Path extractRoot, String relativePath) {
        Path normalizedRoot = extractRoot.toAbsolutePath().normalize();
        Path resolved = normalizedRoot.resolve(relativePath).normalize();

        if (!resolved.startsWith(normalizedRoot)) {
            throw new ApiException("Invalid path: path traversal is not allowed", HttpStatus.BAD_REQUEST);
        }
        return resolved;
    }

    private void deleteRecursively(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            try (var stream = Files.list(path)) {
                for (Path child : stream.toList()) {
                    deleteRecursively(child);
                }
            }
        }
        Files.delete(path);
    }

    private void reparse(UUID workspaceId, Workspace workspace) {
        projectParserService.evictCachedTree(workspaceId);
        projectParserService.parseProject(workspace);
    }
}
