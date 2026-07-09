package com.codelensx.backend.controller;

import com.codelensx.backend.dto.ai.ChatRequestDto;
import com.codelensx.backend.dto.ai.ChatResponseDto;
import com.codelensx.backend.model.ChatMessage;
import com.codelensx.backend.service.ai.AiService;
import com.codelensx.backend.service.ai.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final ConversationService conversationService;

    @PostMapping("/explain-file")
    public ResponseEntity<Map<String, String>> explainFile(
            @PathVariable UUID workspaceId,
            @RequestParam("path") String path,
            Principal principal) {
        String explanation = aiService.explainFile(workspaceId, path, principal.getName());
        return ResponseEntity.ok(Map.of("explanation", explanation));
    }

    @PostMapping("/project-summary")
    public ResponseEntity<Map<String, String>> getProjectSummary(
            @PathVariable UUID workspaceId,
            Principal principal) {
        String summary = aiService.getProjectSummary(workspaceId, principal.getName());
        return ResponseEntity.ok(Map.of("summary", summary));
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponseDto> chat(
            @PathVariable UUID workspaceId,
            @RequestBody ChatRequestDto request,
            Principal principal) {
        
        UUID convId = request.getConversationId();
        if (convId == null) {
            // Create a default new conversation session if missing
            var conv = conversationService.createConversation(workspaceId, "Chat " + UUID.randomUUID().toString().substring(0, 8), principal.getName());
            convId = conv.getId();
        }

        ChatMessage responseMessage = aiService.projectChat(workspaceId, convId, request.getMessage(), principal.getName());

        return ResponseEntity.ok(ChatResponseDto.builder()
                .messageId(responseMessage.getId())
                .conversationId(convId)
                .role(responseMessage.getRole())
                .content(responseMessage.getContent())
                .createdAt(responseMessage.getCreatedAt())
                .build());
    }
}
