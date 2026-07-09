package com.codelensx.backend.explorer.controller;

import com.codelensx.backend.explorer.dto.ExplorerTreeResponseDto;
import com.codelensx.backend.explorer.service.ProjectExplorerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}")
@RequiredArgsConstructor
public class ProjectExplorerController {

    private final ProjectExplorerService projectExplorerService;

    @GetMapping("/tree")
    public ResponseEntity<ExplorerTreeResponseDto> getProjectTree(
            @PathVariable UUID workspaceId,
            Principal principal) {
        ExplorerTreeResponseDto response = projectExplorerService.getProjectTree(
                workspaceId,
                principal.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/node")
    public ResponseEntity<Object> getProjectNode(
            @PathVariable UUID workspaceId,
            @RequestParam(value = "path", required = false, defaultValue = "") String path,
            Principal principal) {
        Object response = projectExplorerService.getProjectNode(
                workspaceId,
                path,
                principal.getName());
        return ResponseEntity.ok(response);
    }
}
