package com.codelensx.backend.dto.analysis;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class ProjectStatsResponseDto {
    private int totalFiles;
    private int totalFolders;
    private Map<String, Integer> fileCountByLanguage;
    private Map<String, Double> percentageByLanguage;
    private long totalLines;
    private long codeLines;
    private long commentLines;
    private long blankLines;
    private List<FileStatsDto> largestFiles;
    private Map<String, Integer> fileSizeDistribution;

    @Data
    @Builder
    public static class FileStatsDto {
        private String name;
        private String path;
        private String language;
        private long sizeBytes;
        private long lines;
    }
}
