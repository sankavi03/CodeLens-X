package com.codelensx.backend.dto.ai;

import lombok.Data;
import java.util.UUID;

@Data
public class ChatRequestDto {
    private String message;
    private UUID conversationId; // Null if new conversation
}
