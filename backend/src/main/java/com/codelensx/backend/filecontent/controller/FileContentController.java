package com.codelensx.backend.filecontent.controller;

import com.codelensx.backend.filecontent.dto.FileContentResponseDto;
import com.codelensx.backend.filecontent.service.FileContentService;
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
public class FileContentController {

    private final FileContentService fileContentService;

    @GetMapping("/file")
    public ResponseEntity<FileContentResponseDto> getFileContent(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        FileContentResponseDto response = fileContentService.getFileContent(
                workspaceId,
                path,
                principal.getName());
        return ResponseEntity.ok(response);
    }
}
