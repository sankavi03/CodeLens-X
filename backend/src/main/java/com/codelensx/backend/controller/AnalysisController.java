package com.codelensx.backend.controller;

import com.codelensx.backend.dto.analysis.*;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.analysis.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectStatsService projectStatsService;
    private final MetadataExtractorService metadataExtractorService;
    private final DependencyAnalysisService dependencyAnalysisService;
    private final DesignPatternDetectorService designPatternDetectorService;
    private final ProjectInsightsService projectInsightsService;

    @GetMapping("/stats")
    public ResponseEntity<ProjectStatsResponseDto> getStats(
            @PathVariable UUID workspaceId,
            Principal principal) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, principal.getName());
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        ProjectStatsResponseDto stats = projectStatsService.calculateStats(extractRoot);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/metadata")
    public ResponseEntity<CodeMetadataDto> getMetadata(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, principal.getName());
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        Path filePath = extractRoot.resolve(path).normalize();

        if (!filePath.startsWith(extractRoot)) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        CodeMetadataDto metadata = metadataExtractorService.extractMetadata(filePath);
        return ResponseEntity.ok(metadata);
    }

    @GetMapping("/dependencies")
    public ResponseEntity<DependencyAnalysisResponseDto> getDependencies(
            @PathVariable UUID workspaceId,
            Principal principal) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, principal.getName());
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        DependencyAnalysisResponseDto deps = dependencyAnalysisService.analyzeDependencies(extractRoot);
        return ResponseEntity.ok(deps);
    }

    @GetMapping("/design-patterns")
    public ResponseEntity<DesignPatternResponseDto> getDesignPatterns(
            @PathVariable UUID workspaceId,
            Principal principal) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, principal.getName());
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        DesignPatternResponseDto patterns = designPatternDetectorService.detectPatterns(extractRoot);
        return ResponseEntity.ok(patterns);
    }

    @GetMapping("/insights")
    public ResponseEntity<ProjectInsightsResponseDto> getInsights(
            @PathVariable UUID workspaceId,
            Principal principal) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, principal.getName());
        Path extractRoot = Paths.get(workspace.getProjectPath()).getParent().resolve("extracted");
        ProjectInsightsResponseDto insights = projectInsightsService.calculateInsights(extractRoot);
        return ResponseEntity.ok(insights);
    }
}
