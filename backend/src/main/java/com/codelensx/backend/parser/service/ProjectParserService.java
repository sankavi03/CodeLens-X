package com.codelensx.backend.parser.service;

import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.model.WorkspaceStatus;
import com.codelensx.backend.parser.cache.ProjectTreeCache;
import com.codelensx.backend.parser.exception.ParserException;
import com.codelensx.backend.parser.extractor.ZipExtractor;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeBuilder;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import com.codelensx.backend.parser.scanner.DirectoryScanner;
import com.codelensx.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectParserService {

    private final ZipExtractor zipExtractor;
    private final DirectoryScanner directoryScanner;
    private final ProjectTreeBuilder projectTreeBuilder;
    private final ProjectTreeCache projectTreeCache;
    private final WorkspaceRepository workspaceRepository;

    @Transactional
    public ProjectTree getOrBuildTree(Workspace workspace) {
        return projectTreeCache.get(workspace.getWorkspaceId())
                .orElseGet(() -> {
                    Path zipPath = Paths.get(workspace.getProjectPath());
                    Path workspaceDirectory = zipPath.getParent();
                    Path extractedRoot = workspaceDirectory.resolve("extracted").normalize();
                    
                    if (!Files.exists(extractedRoot)) {
                        extractedRoot = zipExtractor.extract(zipPath, workspaceDirectory);
                    }
                    
                    ProjectTreeNode rootNode = directoryScanner.scan(extractedRoot);
                    ProjectTree projectTree = projectTreeBuilder.build(
                            workspace.getWorkspaceId(),
                            extractedRoot,
                            rootNode
                    );
                    projectTreeCache.put(workspace.getWorkspaceId(), projectTree);
                    
                    log.info("Self-healing: Rebuilt project tree cache for workspace {}", workspace.getWorkspaceId());
                    return projectTree;
                });
    }

    @Transactional
    public Optional<ProjectTree> parseProject(Workspace workspace) {
        long startTime = System.currentTimeMillis();
        Workspace managedWorkspace = workspaceRepository.findById(workspace.getId())
                .orElseThrow(() -> new ParserException("Workspace not found for parsing"));

        managedWorkspace.setStatus(WorkspaceStatus.PARSING);
        workspaceRepository.save(managedWorkspace);

        String username = managedWorkspace.getOwner() != null ? managedWorkspace.getOwner().getUsername() : "unknown";
        String uploadedFileName = managedWorkspace.getUploadedFileName();
        java.util.UUID workspaceId = managedWorkspace.getWorkspaceId();

        try {
            Path zipPath = Paths.get(managedWorkspace.getProjectPath());
            Path workspaceDirectory = zipPath.getParent();

            Path extractedRoot = zipExtractor.extract(zipPath, workspaceDirectory);
            ProjectTreeNode rootNode = directoryScanner.scan(extractedRoot);
            ProjectTree projectTree = projectTreeBuilder.build(
                    workspaceId,
                    extractedRoot,
                    rootNode
            );

            projectTreeCache.put(workspaceId, projectTree);

            managedWorkspace.setStatus(WorkspaceStatus.READY);
            workspaceRepository.save(managedWorkspace);

            long duration = System.currentTimeMillis() - startTime;
            log.info("Operation: PARSE_WORKSPACE | WorkspaceId: {} | User: {} | File: {} | Duration: {}ms | Success: true | Files: {} | Folders: {}",
                    workspaceId, username, uploadedFileName, duration, projectTree.getTotalFiles(), projectTree.getTotalFolders());

            return Optional.of(projectTree);
        } catch (Exception e) {
            markFailed(managedWorkspace);
            long duration = System.currentTimeMillis() - startTime;
            log.error("Operation: PARSE_WORKSPACE | WorkspaceId: {} | User: {} | File: {} | Duration: {}ms | Success: false | Error: {}",
                    workspaceId, username, uploadedFileName, duration, e.getMessage());
            return Optional.empty();
        }
    }

    public void evictCachedTree(java.util.UUID workspaceId) {
        projectTreeCache.evict(workspaceId);
    }

    private void markFailed(Workspace workspace) {
        workspace.setStatus(WorkspaceStatus.FAILED);
        workspaceRepository.save(workspace);
    }
}
