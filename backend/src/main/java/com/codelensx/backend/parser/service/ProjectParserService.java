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
    public Optional<ProjectTree> parseProject(Workspace workspace) {
        Workspace managedWorkspace = workspaceRepository.findById(workspace.getId())
                .orElseThrow(() -> new ParserException("Workspace not found for parsing"));

        managedWorkspace.setStatus(WorkspaceStatus.PARSING);
        workspaceRepository.save(managedWorkspace);

        try {
            Path zipPath = Paths.get(managedWorkspace.getProjectPath());
            Path workspaceDirectory = zipPath.getParent();

            Path extractedRoot = zipExtractor.extract(zipPath, workspaceDirectory);
            ProjectTreeNode rootNode = directoryScanner.scan(extractedRoot);
            ProjectTree projectTree = projectTreeBuilder.build(
                    managedWorkspace.getWorkspaceId(),
                    extractedRoot,
                    rootNode
            );

            projectTreeCache.put(managedWorkspace.getWorkspaceId(), projectTree);

            managedWorkspace.setStatus(WorkspaceStatus.READY);
            workspaceRepository.save(managedWorkspace);

            log.info("Parsed workspace {}: {} files, {} folders",
                    managedWorkspace.getWorkspaceId(),
                    projectTree.getTotalFiles(),
                    projectTree.getTotalFolders());

            return Optional.of(projectTree);
        } catch (ParserException e) {
            markFailed(managedWorkspace);
            log.error("Parsing failed for workspace {}: {}", managedWorkspace.getWorkspaceId(), e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            markFailed(managedWorkspace);
            log.error("Unexpected parsing failure for workspace {}", managedWorkspace.getWorkspaceId(), e);
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
