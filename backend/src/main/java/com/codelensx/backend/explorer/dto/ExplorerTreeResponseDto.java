package com.codelensx.backend.explorer.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ExplorerTreeResponseDto {

    private UUID workspaceId;
    private int totalFiles;
    private int totalFolders;
    private ExplorerTreeNodeDto root;
}
