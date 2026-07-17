package com.codelensx.backend.filecontent.controller;

import com.codelensx.backend.dto.analysis.CodeMetadataDto;
import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.service.ProjectParserService;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import com.codelensx.backend.service.analysis.MetadataExtractorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/outline")
@RequiredArgsConstructor
@Slf4j
public class ProjectOutlineController {

    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final ProjectParserService projectParserService;
    private final MetadataExtractorService metadataExtractorService;

    @GetMapping
    public ResponseEntity<CodeMetadataDto> getFileOutline(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        String username = principal.getName();
        try {
            Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
            ProjectTree projectTree = projectParserService.getOrBuildTree(workspace);
            
            Path resolved = projectTree.getRootPath().resolve(path).normalize();
            if (!resolved.startsWith(projectTree.getRootPath().normalize()) || !Files.exists(resolved) || Files.isDirectory(resolved)) {
                throw new ApiException("Invalid file path", HttpStatus.BAD_REQUEST);
            }
            
            CodeMetadataDto outline = metadataExtractorService.extractMetadata(resolved);
            return ResponseEntity.ok(outline);
        } catch (Exception e) {
            log.error("Failed to extract outline for path: {}", path, e);
            if (e instanceof ApiException) throw (ApiException) e;
            throw new ApiException("Failed to extract outline: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
