package com.codelensx.backend.filecontent.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class FileContentResponseDto {

    private UUID workspaceId;
    private String relativePath;
    private String fileName;
    private String extension;
    private long sizeBytes;
    private long lineCount;
    private String content;
}
