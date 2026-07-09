package com.codelensx.backend.parser.service;

import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.model.WorkspaceStatus;
import com.codelensx.backend.parser.cache.ProjectTreeCache;
import com.codelensx.backend.parser.extractor.ZipExtractor;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeBuilder;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import com.codelensx.backend.parser.scanner.DirectoryScanner;
import com.codelensx.backend.repository.WorkspaceRepository;
import com.codelensx.backend.testutil.ZipTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectParserServiceTest {

    @Mock
    private WorkspaceRepository workspaceRepository;

    @InjectMocks
    private ProjectParserService projectParserService;

    @TempDir
    Path tempDir;

    @Test
    void parseProject_UpdatesStatusAndCachesTree() throws IOException {
        ZipExtractor zipExtractor = new ZipExtractor();
        DirectoryScanner directoryScanner = new DirectoryScanner(new DirectoryIgnoreRules());
        ProjectTreeCache projectTreeCache = new ProjectTreeCache();
        ProjectTreeBuilder projectTreeBuilder = new ProjectTreeBuilder();

        projectParserService = new ProjectParserService(
                zipExtractor,
                directoryScanner,
                projectTreeBuilder,
                projectTreeCache,
                workspaceRepository
        );

        UUID workspaceId = UUID.randomUUID();
        Path workspaceDir = tempDir.resolve("user").resolve(workspaceId.toString());
        Files.createDirectories(workspaceDir);

        byte[] zipBytes = ZipTestUtils.createZip(Map.of(
                "src/App.java", "class App {}",
                "README.md", "hello"
        ));
        Path zipPath = workspaceDir.resolve("sample.zip");
        Files.write(zipPath, zipBytes);

        User owner = User.builder().id(UUID.randomUUID()).username("dev").build();
        Workspace workspace = Workspace.builder()
                .id(1L)
                .workspaceId(workspaceId)
                .projectPath(zipPath.toString())
                .owner(owner)
                .status(WorkspaceStatus.UPLOADED)
                .build();

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectTree projectTree = projectParserService.parseProject(workspace).orElseThrow();

        assertEquals(WorkspaceStatus.READY, workspace.getStatus());
        assertEquals(2, projectTree.getTotalFiles());
        assertTrue(projectTreeCache.get(workspaceId).isPresent());

        verify(workspaceRepository, atLeast(2)).save(workspace);
    }

    @Test
    void parseProject_MarksWorkspaceFailedForInvalidZip() throws IOException {
        ZipExtractor zipExtractor = new ZipExtractor();
        DirectoryScanner directoryScanner = new DirectoryScanner(new DirectoryIgnoreRules());
        ProjectTreeCache projectTreeCache = new ProjectTreeCache();
        ProjectTreeBuilder projectTreeBuilder = new ProjectTreeBuilder();

        projectParserService = new ProjectParserService(
                zipExtractor,
                directoryScanner,
                projectTreeBuilder,
                projectTreeCache,
                workspaceRepository
        );

        UUID workspaceId = UUID.randomUUID();
        Path workspaceDir = tempDir.resolve("user").resolve(workspaceId.toString());
        Files.createDirectories(workspaceDir);
        Path zipPath = workspaceDir.resolve("broken.zip");
        Files.writeString(zipPath, "not-a-zip");

        Workspace workspace = Workspace.builder()
                .id(2L)
                .workspaceId(workspaceId)
                .projectPath(zipPath.toString())
                .status(WorkspaceStatus.UPLOADED)
                .build();

        when(workspaceRepository.findById(2L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<ProjectTree> result = projectParserService.parseProject(workspace);

        assertTrue(result.isEmpty());
        assertEquals(WorkspaceStatus.FAILED, workspace.getStatus());
        assertTrue(projectTreeCache.get(workspaceId).isEmpty());
    }
}
