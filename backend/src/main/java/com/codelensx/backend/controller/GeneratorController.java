package com.codelensx.backend.controller;

import com.codelensx.backend.service.generator.ArchitectureSummaryGeneratorService;
import com.codelensx.backend.service.generator.DocumentationGeneratorService;
import com.codelensx.backend.service.generator.ReadmeGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/generator")
@RequiredArgsConstructor
public class GeneratorController {

    private final DocumentationGeneratorService documentationGeneratorService;
    private final ReadmeGeneratorService readmeGeneratorService;
    private final ArchitectureSummaryGeneratorService architectureSummaryGeneratorService;

    @PostMapping("/docs")
    public ResponseEntity<Map<String, String>> generateDocs(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        String docs = documentationGeneratorService.generateFileDocumentation(workspaceId, path, principal.getName());
        return ResponseEntity.ok(Map.of("documentation", docs));
    }

    @PostMapping("/readme")
    public ResponseEntity<Map<String, String>> generateReadme(
            @PathVariable UUID workspaceId,
            Principal principal) {
        String readme = readmeGeneratorService.generateReadme(workspaceId, principal.getName());
        return ResponseEntity.ok(Map.of("readme", readme));
    }

    @PostMapping("/architecture")
    public ResponseEntity<Map<String, String>> generateArchitecture(
            @PathVariable UUID workspaceId,
            @RequestParam(value = "type", defaultValue = "flowchart") String type,
            Principal principal) {
        String architecture = architectureSummaryGeneratorService.generateArchitectureSummary(workspaceId, principal.getName(), type);
        return ResponseEntity.ok(Map.of("architecture", architecture));
    }
}
