package com.codelensx.backend.dto.analysis;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ProjectInsightsResponseDto {
    private List<CodeSmellDto> codeSmells;
    private List<TodoMarkerDto> todoMarkers;
    private List<ComplexityMetricDto> fileComplexities;

    @Data
    @Builder
    public static class CodeSmellDto {
        private String filePath;
        private String type; // Bloated Class, Long Method, Excessive Nesting
        private String entityName; // class or method name
        private String severity; // High, Medium, Low
        private String description;
        private int lineNumber;
    }

    @Data
    @Builder
    public static class TodoMarkerDto {
        private String filePath;
        private String type; // TODO or FIXME
        private String text;
        private int lineNumber;
    }

    @Data
    @Builder
    public static class ComplexityMetricDto {
        private String filePath;
        private String fileName;
        private int estimatedComplexity;
        private String rating; // High (>=25), Medium (10-24), Low (<10)
    }
}
