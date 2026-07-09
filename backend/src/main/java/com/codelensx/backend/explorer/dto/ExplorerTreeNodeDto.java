package com.codelensx.backend.explorer.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ExplorerTreeNodeDto {

    private String name;
    private String relativePath;
    private String type;
    private String extension;
    private Long sizeBytes;
    private List<ExplorerTreeNodeDto> children;
}
