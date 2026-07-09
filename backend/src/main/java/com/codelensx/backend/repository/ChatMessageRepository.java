package com.codelensx.backend.repository;

import com.codelensx.backend.model.ChatMessage;
import com.codelensx.backend.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByConversationOrderByCreatedAtAsc(Conversation conversation);
    void deleteByConversation(Conversation conversation);
}
