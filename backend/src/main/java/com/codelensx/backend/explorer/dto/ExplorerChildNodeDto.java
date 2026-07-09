package com.codelensx.backend.explorer.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExplorerChildNodeDto {

    private String name;
    private String relativePath;
    private String type;
}
