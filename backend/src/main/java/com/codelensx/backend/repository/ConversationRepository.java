package com.codelensx.backend.repository;

import com.codelensx.backend.model.Conversation;
import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    List<Conversation> findByWorkspaceAndUserOrderByUpdatedAtDesc(Workspace workspace, User user);
    Optional<Conversation> findByIdAndUser(UUID id, User user);
}
