package com.codelensx.backend.dto.ai;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ChatResponseDto {
    private UUID messageId;
    private UUID conversationId;
    private String role;
    private String content;
    private LocalDateTime createdAt;
}
