package com.codelensx.backend.explorer.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ExplorerFolderNodeResponseDto {

    private String name;
    private String relativePath;
    private List<ExplorerChildNodeDto> children;
    private int folderCount;
    private int fileCount;
}
