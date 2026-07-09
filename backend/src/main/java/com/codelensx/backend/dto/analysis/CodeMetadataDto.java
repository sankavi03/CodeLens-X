package com.codelensx.backend.dto.analysis;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CodeMetadataDto {
    private String language;
    private String packageName;
    private List<String> imports;
    private List<String> exports;
    private List<String> classes;
    private List<String> interfaces;
    private List<String> enums;
    private List<String> records;
    private List<String> constructors;
    private List<String> methods;
    private List<String> functions;
    private List<String> annotations;
}
