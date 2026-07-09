package com.codelensx.backend.dto.analysis;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DependencyAnalysisResponseDto {
    private List<ExternalDependencyDto> externalDependencies;
    private Map<String, List<String>> internalDependencyGraph;

    @Data
    @Builder
    public static class ExternalDependencyDto {
        private String sourceFile; // pom.xml, package.json, etc.
        private String name;
        private String version;
        private String scope; // test, compile, runtime, dev, etc.
    }
}
