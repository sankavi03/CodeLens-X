package com.codelensx.backend.repository;

import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    List<Workspace> findByOwner(User owner);

    Optional<Workspace> findByWorkspaceIdAndOwner(UUID workspaceId, User owner);

    Optional<Workspace> findByWorkspaceId(UUID workspaceId);

    boolean existsByOwnerAndUploadedFileName(User owner, String uploadedFileName);
}
