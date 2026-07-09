package com.codelensx.backend.service;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WorkspaceAccessValidator {

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Workspace validateAccess(UUID workspaceId, String username) {
        Workspace workspace = workspaceRepository.findByWorkspaceId(workspaceId)
                .orElseThrow(() -> new ApiException("Workspace not found", HttpStatus.NOT_FOUND));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        if (!workspace.getOwner().getId().equals(user.getId())) {
            throw new ApiException("Access denied to this workspace", HttpStatus.FORBIDDEN);
        }

        return workspace;
    }
}
