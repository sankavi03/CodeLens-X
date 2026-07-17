package com.codelensx.backend.filecontent.dto;

import lombok.Data;

@Data
public class FileSaveRequestDto {
    private String content;
    private long lastModified;
}
