package com.codelensx.backend.service.ai;

import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.ChatMessage;
import com.codelensx.backend.model.Conversation;
import com.codelensx.backend.model.User;
import com.codelensx.backend.model.Workspace;
import com.codelensx.backend.repository.ChatMessageRepository;
import com.codelensx.backend.repository.ConversationRepository;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.service.WorkspaceAccessValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final WorkspaceAccessValidator workspaceAccessValidator;
    private final UserRepository userRepository;

    @Transactional
    public Conversation createConversation(UUID workspaceId, String title, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        Conversation conversation = Conversation.builder()
                .title(title)
                .workspace(workspace)
                .user(user)
                .build();

        return conversationRepository.save(conversation);
    }

    @Transactional(readOnly = true)
    public List<Conversation> getConversations(UUID workspaceId, String username) {
        Workspace workspace = workspaceAccessValidator.validateAccess(workspaceId, username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return conversationRepository.findByWorkspaceAndUserOrderByUpdatedAtDesc(workspace, user);
    }

    @Transactional(readOnly = true)
    public Conversation getConversation(UUID conversationId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return conversationRepository.findByIdAndUser(conversationId, user)
                .orElseThrow(() -> new ApiException("Conversation not found", HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public List<ChatMessage> getMessages(UUID conversationId, String username) {
        Conversation conversation = getConversation(conversationId, username);
        return chatMessageRepository.findByConversationOrderByCreatedAtAsc(conversation);
    }

    @Transactional
    public ChatMessage addMessage(UUID conversationId, String role, String content, String username) {
        Conversation conversation = getConversation(conversationId, username);

        ChatMessage message = ChatMessage.builder()
                .conversation(conversation)
                .role(role)
                .content(content)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        // Touch conversation updated time
        conversation.setTitle(conversation.getTitle()); // force update trigger
        conversationRepository.save(conversation);

        return saved;
    }

    @Transactional
    public void deleteConversation(UUID conversationId, String username) {
        Conversation conversation = getConversation(conversationId, username);
        chatMessageRepository.deleteByConversation(conversation);
        conversationRepository.delete(conversation);
    }
}
