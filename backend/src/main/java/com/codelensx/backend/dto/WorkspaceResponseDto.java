package com.codelensx.backend.dto;

import com.codelensx.backend.model.WorkspaceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceResponseDto {
    private UUID workspaceId;
    private String projectName;
    private String uploadedFileName;
    private LocalDateTime uploadTime;
    private WorkspaceStatus status;
}
