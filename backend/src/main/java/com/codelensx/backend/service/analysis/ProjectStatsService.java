package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.ProjectStatsResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectStatsService {

    private final LanguageDetectorService languageDetectorService;
    private final DirectoryIgnoreRules ignoreRules;

    public ProjectStatsResponseDto calculateStats(Path rootDir) {
        List<Path> allFiles = new ArrayList<>();
        int[] folderCount = {0};

        scanDirectory(rootDir, allFiles, folderCount);

        int totalFiles = allFiles.size();
        int totalFolders = folderCount[0];

        Map<String, Integer> fileCountByLanguage = new HashMap<>();
        Map<String, Long> linesByFile = new HashMap<>();
        Map<String, String> languageByFile = new HashMap<>();

        long totalLines = 0;
        long codeLines = 0;
        long commentLines = 0;
        long blankLines = 0;

        List<ProjectStatsResponseDto.FileStatsDto> fileStatsList = new ArrayList<>();

        int sizeUnder1Kb = 0;
        int size1To10Kb = 0;
        int size10To100Kb = 0;
        int size100KbTo1Mb = 0;
        int sizeOver1Mb = 0;

        for (Path file : allFiles) {
            String language = languageDetectorService.detectLanguage(file);
            fileCountByLanguage.put(language, fileCountByLanguage.getOrDefault(language, 0) + 1);

            long sizeBytes = 0;
            try {
                sizeBytes = Files.size(file);
            } catch (IOException e) {
                // Ignore size read failure
            }

            // Size distribution
            if (sizeBytes < 1024) {
                sizeUnder1Kb++;
            } else if (sizeBytes < 10 * 1024) {
                size1To10Kb++;
            } else if (sizeBytes < 100 * 1024) {
                size10To100Kb++;
            } else if (sizeBytes < 1024 * 1024) {
                size100KbTo1Mb++;
            } else {
                sizeOver1Mb++;
            }

            // Line details
            LineStats fileLineStats = countLinesForFile(file, language);
            totalLines += fileLineStats.total;
            codeLines += fileLineStats.code;
            commentLines += fileLineStats.comment;
            blankLines += fileLineStats.blank;

            String relativePath = rootDir.relativize(file).toString().replace('\\', '/');

            fileStatsList.add(ProjectStatsResponseDto.FileStatsDto.builder()
                    .name(file.getFileName().toString())
                    .path(relativePath)
                    .language(language)
                    .sizeBytes(sizeBytes)
                    .lines(fileLineStats.total)
                    .build());
        }

        // Percentage breakdown
        Map<String, Double> percentageByLanguage = new HashMap<>();
        for (Map.Entry<String, Integer> entry : fileCountByLanguage.entrySet()) {
            double percent = totalFiles > 0 ? (entry.getValue() * 100.0) / totalFiles : 0.0;
            percentageByLanguage.put(entry.getKey(), Math.round(percent * 100.0) / 100.0);
        }

        // Top 10 largest files
        List<ProjectStatsResponseDto.FileStatsDto> largestFiles = fileStatsList.stream()
                .sorted(Comparator.comparingLong(ProjectStatsResponseDto.FileStatsDto::getSizeBytes).reversed())
                .limit(10)
                .collect(Collectors.toList());

        Map<String, Integer> fileSizeDistribution = new LinkedHashMap<>();
        fileSizeDistribution.put("< 1KB", sizeUnder1Kb);
        fileSizeDistribution.put("1KB - 10KB", size1To10Kb);
        fileSizeDistribution.put("10KB - 100KB", size10To100Kb);
        fileSizeDistribution.put("100KB - 1MB", size100KbTo1Mb);
        fileSizeDistribution.put("> 1MB", sizeOver1Mb);

        return ProjectStatsResponseDto.builder()
                .totalFiles(totalFiles)
                .totalFolders(totalFolders)
                .fileCountByLanguage(fileCountByLanguage)
                .percentageByLanguage(percentageByLanguage)
                .totalLines(totalLines)
                .codeLines(codeLines)
                .commentLines(commentLines)
                .blankLines(blankLines)
                .largestFiles(largestFiles)
                .fileSizeDistribution(fileSizeDistribution)
                .build();
    }

    private void scanDirectory(Path currentDir, List<Path> filesList, int[] folderCount) {
        try (Stream<Path> stream = Files.list(currentDir)) {
            List<Path> entries = stream.toList();
            for (Path entry : entries) {
                String name = entry.getFileName().toString();
                if (Files.isDirectory(entry)) {
                    if (ignoreRules.shouldIgnore(name)) {
                        continue;
                    }
                    folderCount[0]++;
                    scanDirectory(entry, filesList, folderCount);
                } else if (Files.isRegularFile(entry)) {
                    filesList.add(entry);
                }
            }
        } catch (IOException e) {
            log.warn("Failed to list directory for stats: {}", currentDir, e);
        }
    }

    private LineStats countLinesForFile(Path filePath, String language) {
        LineStats stats = new LineStats();
        try (BufferedReader reader = new BufferedReader(new FileReader(filePath.toFile()))) {
            String line;
            boolean inMultiComment = false;

            while ((line = reader.readLine()) != null) {
                stats.total++;
                String trimmed = line.trim();

                if (trimmed.isEmpty()) {
                    stats.blank++;
                    continue;
                }

                if (language.equals("Java") || language.equals("JavaScript") || language.equals("TypeScript")) {
                    if (inMultiComment) {
                        stats.comment++;
                        if (trimmed.contains("*/")) {
                            inMultiComment = false;
                        }
                    } else {
                        if (trimmed.startsWith("/*")) {
                            stats.comment++;
                            if (!trimmed.contains("*/")) {
                                inMultiComment = true;
                            }
                        } else if (trimmed.startsWith("//")) {
                            stats.comment++;
                        } else {
                            stats.code++;
                        }
                    }
                } else if (language.equals("Python")) {
                    if (inMultiComment) {
                        stats.comment++;
                        if (trimmed.contains("\"\"\"") || trimmed.contains("'''")) {
                            inMultiComment = false;
                        }
                    } else {
                        if (trimmed.startsWith("\"\"\"") || trimmed.startsWith("'''")) {
                            stats.comment++;
                            if (!trimmed.endsWith("\"\"\"") && !trimmed.endsWith("'''")) {
                                inMultiComment = true;
                            }
                        } else if (trimmed.startsWith("#")) {
                            stats.comment++;
                        } else {
                            stats.code++;
                        }
                    }
                } else {
                    // Default to code for other extension types
                    if (trimmed.startsWith("#") || trimmed.startsWith("<!--") || trimmed.startsWith("/*")) {
                        stats.comment++;
                    } else {
                        stats.code++;
                    }
                }
            }
        } catch (IOException e) {
            // Treat as empty or code
        }
        return stats;
    }

    private static class LineStats {
        long total = 0;
        long code = 0;
        long comment = 0;
        long blank = 0;
    }
}
