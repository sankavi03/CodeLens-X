package com.codelensx.backend.controller;

import com.codelensx.backend.dto.ApiResponse;
import com.codelensx.backend.dto.ai.ConversationResponseDto;
import com.codelensx.backend.dto.ai.ChatResponseDto;
import com.codelensx.backend.model.ChatMessage;
import com.codelensx.backend.model.Conversation;
import com.codelensx.backend.service.ai.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    public ResponseEntity<ConversationResponseDto> createConversation(
            @PathVariable UUID workspaceId,
            @RequestBody Map<String, String> body,
            Principal principal) {
        String title = body.getOrDefault("title", "New Conversation");
        Conversation conversation = conversationService.createConversation(workspaceId, title, principal.getName());
        return new ResponseEntity<>(mapToDto(conversation), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<ConversationResponseDto>> getConversations(
            @PathVariable UUID workspaceId,
            Principal principal) {
        List<Conversation> list = conversationService.getConversations(workspaceId, principal.getName());
        List<ConversationResponseDto> dtos = list.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<List<ChatResponseDto>> getConversationMessages(
            @PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,
            Principal principal) {
        List<ChatMessage> list = conversationService.getMessages(conversationId, principal.getName());
        List<ChatResponseDto> dtos = list.stream()
                .map(msg -> ChatResponseDto.builder()
                        .messageId(msg.getId())
                        .conversationId(conversationId)
                        .role(msg.getRole())
                        .content(msg.getContent())
                        .createdAt(msg.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<ApiResponse> deleteConversation(
            @PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,
            Principal principal) {
        conversationService.deleteConversation(conversationId, principal.getName());
        return ResponseEntity.ok(new ApiResponse(true, "Conversation deleted successfully"));
    }

    private ConversationResponseDto mapToDto(Conversation c) {
        return ConversationResponseDto.builder()
                .id(c.getId())
                .title(c.getTitle())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
