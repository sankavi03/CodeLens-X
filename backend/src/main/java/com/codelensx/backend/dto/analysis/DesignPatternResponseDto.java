package com.codelensx.backend.dto.analysis;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class DesignPatternResponseDto {
    private List<PatternMatchDto> detectedPatterns;

    @Data
    @Builder
    public static class PatternMatchDto {
        private String patternName; // Singleton, Builder, Factory, Observer, Strategy, Adapter, Facade, Decorator
        private String className;
        private String filePath;
        private String confidence; // High, Medium, Low
        private String description;
    }
}
