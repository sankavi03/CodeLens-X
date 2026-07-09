package com.codelensx.backend.controller;

import com.codelensx.backend.dto.ApiResponse;
import com.codelensx.backend.dto.WorkspaceResponseDto;
import com.codelensx.backend.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping("/upload")
    public ResponseEntity<WorkspaceResponseDto> uploadProject(
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        WorkspaceResponseDto dto = workspaceService.uploadProject(file, principal.getName());
        return new ResponseEntity<>(dto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<WorkspaceResponseDto>> getWorkspaces(Principal principal) {
        List<WorkspaceResponseDto> list = workspaceService.getWorkspaces(principal.getName());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{workspaceId}")
    public ResponseEntity<WorkspaceResponseDto> getWorkspace(
            @PathVariable UUID workspaceId,
            Principal principal) {
        WorkspaceResponseDto dto = workspaceService.getWorkspaceByUuid(workspaceId, principal.getName());
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<ApiResponse> deleteWorkspace(
            @PathVariable UUID workspaceId,
            Principal principal) {
        workspaceService.deleteWorkspace(workspaceId, principal.getName());
        return ResponseEntity.ok(new ApiResponse(true, "Workspace deleted successfully"));
    }
}
