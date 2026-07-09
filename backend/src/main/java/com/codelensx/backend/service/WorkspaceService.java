package com.codelensx.backend.service;

import com.codelensx.backend.dto.WorkspaceResponseDto;
import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.model.WorkspaceStatus;
import com.codelensx.backend.parser.service.ProjectParserService;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ProjectParserService projectParserService;

    // Define root uploads path
    private final Path rootUploadsPath = Paths.get("uploads").toAbsolutePath().normalize();

    @Transactional
    public WorkspaceResponseDto uploadProject(MultipartFile file, String username) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".zip")) {
            throw new ApiException("Only ZIP files are allowed", HttpStatus.BAD_REQUEST);
        }

        // File size safety check
        if (file.getSize() > 200 * 1024 * 1024) {
            throw new ApiException("File size exceeds the limit of 200MB", HttpStatus.BAD_REQUEST);
        }

        // Duplicate checks
        if (workspaceRepository.existsByOwnerAndUploadedFileName(owner, filename)) {
            throw new ApiException("You have already uploaded a workspace with the filename: " + filename, HttpStatus.CONFLICT);
        }

        UUID workspaceId = UUID.randomUUID();
        Path targetDir = rootUploadsPath.resolve(owner.getId().toString()).resolve(workspaceId.toString());
        Path targetFilePath = targetDir.resolve(filename);

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), targetFilePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store file: ", e);
            throw new ApiException("Failed to store uploaded file", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        Workspace workspace = Workspace.builder()
                .workspaceId(workspaceId)
                .projectName(getProjectNameFromFileName(filename))
                .uploadedFileName(filename)
                .projectPath(targetFilePath.toString())
                .owner(owner)
                .status(WorkspaceStatus.UPLOADED)
                .build();

        Workspace saved = workspaceRepository.save(workspace);
        projectParserService.parseProject(saved);

        Workspace refreshed = workspaceRepository.findById(saved.getId()).orElse(saved);
        return mapToDto(refreshed);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponseDto> getWorkspaces(String username) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        return workspaceRepository.findByOwner(owner).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorkspaceResponseDto getWorkspaceByUuid(UUID workspaceId, String username) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        Workspace workspace = workspaceRepository.findByWorkspaceIdAndOwner(workspaceId, owner)
                .orElseThrow(() -> new ApiException("Workspace not found", HttpStatus.NOT_FOUND));

        return mapToDto(workspace);
    }

    @Transactional
    public void deleteWorkspace(UUID workspaceId, String username) {
        User owner = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        Workspace workspace = workspaceRepository.findByWorkspaceIdAndOwner(workspaceId, owner)
                .orElseThrow(() -> new ApiException("Workspace not found", HttpStatus.NOT_FOUND));

        // Delete workspace directory including extracted files
        Path workspaceDir = Paths.get(workspace.getProjectPath()).getParent();
        try (var walk = Files.walk(workspaceDir)) {
            walk.sorted(java.util.Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            log.warn("Failed to delete path {}: {}", path, e.getMessage());
                        }
                    });
        } catch (IOException e) {
            log.warn("Failed to delete workspace directory {}: {}", workspaceDir, e.getMessage());
        }

        projectParserService.evictCachedTree(workspaceId);
        workspaceRepository.delete(workspace);
    }

    private String getProjectNameFromFileName(String filename) {
        if (filename == null) return "Unknown";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }

    private WorkspaceResponseDto mapToDto(Workspace workspace) {
        return WorkspaceResponseDto.builder()
                .workspaceId(workspace.getWorkspaceId())
                .projectName(workspace.getProjectName())
                .uploadedFileName(workspace.getUploadedFileName())
                .uploadTime(workspace.getUploadTime())
                .status(workspace.getStatus())
                .build();
    }
}
