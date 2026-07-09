package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.ProjectInsightsResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectInsightsService {

    private final DirectoryIgnoreRules ignoreRules;
    private final LanguageDetectorService languageDetectorService;

    public ProjectInsightsResponseDto calculateInsights(Path rootDir) {
        List<Path> allFiles = new ArrayList<>();
        scanDirectory(rootDir, allFiles);

        List<ProjectInsightsResponseDto.CodeSmellDto> smells = new ArrayList<>();
        List<ProjectInsightsResponseDto.TodoMarkerDto> todos = new ArrayList<>();
        List<ProjectInsightsResponseDto.ComplexityMetricDto> complexities = new ArrayList<>();

        for (Path file : allFiles) {
            String language = languageDetectorService.detectLanguage(file);
            if (!language.equals("Java") && !language.equals("Python") && !language.equals("JavaScript") && !language.equals("TypeScript")) {
                continue;
            }

            analyzeFile(file, rootDir, language, smells, todos, complexities);
        }

        return ProjectInsightsResponseDto.builder()
                .codeSmells(smells)
                .todoMarkers(todos)
                .fileComplexities(complexities)
                .build();
    }

    private void scanDirectory(Path currentDir, List<Path> filesList) {
        try (Stream<Path> stream = Files.list(currentDir)) {
            List<Path> entries = stream.toList();
            for (Path entry : entries) {
                String name = entry.getFileName().toString();
                if (Files.isDirectory(entry)) {
                    if (ignoreRules.shouldIgnore(name)) {
                        continue;
                    }
                    scanDirectory(entry, filesList);
                } else if (Files.isRegularFile(entry)) {
                    filesList.add(entry);
                }
            }
        } catch (IOException e) {
            log.warn("Failed to list directory for insights: {}", currentDir, e);
        }
    }

    private void analyzeFile(Path file, Path rootDir, String language,
                             List<ProjectInsightsResponseDto.CodeSmellDto> smells,
                             List<ProjectInsightsResponseDto.TodoMarkerDto> todos,
                             List<ProjectInsightsResponseDto.ComplexityMetricDto> complexities) {
        String relativePath = rootDir.relativize(file).toString().replace('\\', '/');
        String fileName = file.getFileName().toString();

        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(file.toFile()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        } catch (IOException e) {
            log.warn("Failed to read file for insights: {}", file);
            return;
        }

        int fileLinesCount = lines.size();

        // 1. Bloated Class
        if (fileLinesCount > 500) {
            smells.add(ProjectInsightsResponseDto.CodeSmellDto.builder()
                    .filePath(relativePath)
                    .type("Bloated Class")
                    .entityName(fileName.substring(0, fileName.lastIndexOf('.')))
                    .severity("High")
                    .description("Class/File has " + fileLinesCount + " lines. Consider refactoring into smaller, single-responsibility components.")
                    .lineNumber(1)
                    .build());
        }

        int complexityPoints = 1;
        int maxNesting = 0;
        int currentNesting = 0;

        // Method tracking (Java/JS/TS)
        String currentMethodName = null;
        int methodStartLine = 0;
        int methodBraceCount = 0;
        int methodLinesCount = 0;

        // Python indent tracking
        int pythonDefIndent = -1;
        int pythonDefStartLine = -1;
        String pythonDefName = null;

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            String trimmed = line.trim();
            int lineNum = i + 1;

            // 2. TODO/FIXME markers
            if (trimmed.contains("TODO") || trimmed.contains("FIXME")) {
                String type = trimmed.contains("FIXME") ? "FIXME" : "TODO";
                todos.add(ProjectInsightsResponseDto.TodoMarkerDto.builder()
                        .filePath(relativePath)
                        .type(type)
                        .text(trimmed)
                        .lineNumber(lineNum)
                        .build());
            }

            // 3. Complexity calculation
            // Count decisions: if, for, while, catch, &&, ||, case
            if (!trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("#")) {
                complexityPoints += countOccurrences(trimmed, "\\bif\\b|\\bif\\s*\\(|\\bfor\\b|\\bwhile\\b|\\bcatch\\b|\\bcase\\b|&&|\\|\\|");
            }

            // 4. Nesting Level Tracker
            if (language.equals("Java") || language.equals("JavaScript") || language.equals("TypeScript")) {
                for (char c : line.toCharArray()) {
                    if (c == '{') {
                        currentNesting++;
                        if (currentNesting > maxNesting) {
                            maxNesting = currentNesting;
                        }
                    } else if (c == '}') {
                        currentNesting = Math.max(0, currentNesting - 1);
                    }
                }
            } else if (language.equals("Python")) {
                // Approximate nesting by indent level (4 spaces or 1 tab = 1 level)
                if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                    int indentSpaces = getIndentSpaces(line);
                    int nesting = indentSpaces / 4;
                    if (nesting > maxNesting) {
                        maxNesting = nesting;
                    }
                }
            }

            // 5. Long Method Tracker
            if (language.equals("Java") || language.equals("JavaScript") || language.equals("TypeScript")) {
                if (currentMethodName == null) {
                    // Check if line looks like method declaration: returns something, has parenthesis, ends with brace
                    if (trimmed.contains("(") && trimmed.contains(")") && trimmed.endsWith("{") && !trimmed.contains("class ") && !trimmed.contains("interface ")) {
                        // Extract name before '('
                        String beforeParen = trimmed.substring(0, trimmed.indexOf('(')).trim();
                        String[] parts = beforeParen.split("\\s+");
                        currentMethodName = parts[parts.length - 1];
                        methodStartLine = lineNum;
                        methodBraceCount = 1;
                        methodLinesCount = 1;
                    }
                } else {
                    methodLinesCount++;
                    for (char c : line.toCharArray()) {
                        if (c == '{') methodBraceCount++;
                        else if (c == '}') methodBraceCount--;
                    }

                    if (methodBraceCount <= 0) {
                        // Method ended
                        if (methodLinesCount > 50) {
                            smells.add(ProjectInsightsResponseDto.CodeSmellDto.builder()
                                    .filePath(relativePath)
                                    .type("Long Method")
                                    .entityName(currentMethodName)
                                    .severity("Medium")
                                    .description("Method '" + currentMethodName + "' has " + methodLinesCount + " lines. Consider extract method refactoring.")
                                    .lineNumber(methodStartLine)
                                    .build());
                        }
                        currentMethodName = null;
                    }
                }
            } else if (language.equals("Python")) {
                if (trimmed.startsWith("def ")) {
                    // If we were tracking a previous function, close it
                    if (pythonDefName != null) {
                        int length = lineNum - pythonDefStartLine;
                        if (length > 50) {
                            smells.add(ProjectInsightsResponseDto.CodeSmellDto.builder()
                                    .filePath(relativePath)
                                    .type("Long Method")
                                    .entityName(pythonDefName)
                                    .severity("Medium")
                                    .description("Function '" + pythonDefName + "' has " + length + " lines. Consider refactoring.")
                                    .lineNumber(pythonDefStartLine)
                                    .build());
                        }
                    }
                    pythonDefName = trimmed.substring(4, trimmed.indexOf('(')).trim();
                    pythonDefStartLine = lineNum;
                    pythonDefIndent = getIndentSpaces(line);
                } else if (pythonDefName != null && !trimmed.isEmpty()) {
                    int currentIndent = getIndentSpaces(line);
                    if (currentIndent <= pythonDefIndent && !trimmed.startsWith("#")) {
                        // Function ended because indentation returned to def indent
                        int length = lineNum - 1 - pythonDefStartLine;
                        if (length > 50) {
                            smells.add(ProjectInsightsResponseDto.CodeSmellDto.builder()
                                    .filePath(relativePath)
                                    .type("Long Method")
                                    .entityName(pythonDefName)
                                    .severity("Medium")
                                    .description("Function '" + pythonDefName + "' has " + length + " lines. Consider refactoring.")
                                    .lineNumber(pythonDefStartLine)
                                    .build());
                        }
                        pythonDefName = null;
                        pythonDefIndent = -1;
                        pythonDefStartLine = -1;
                    }
                }
            }
        }

        // Final Python function check if file ends
        if (language.equals("Python") && pythonDefName != null) {
            int length = fileLinesCount - pythonDefStartLine;
            if (length > 50) {
                smells.add(ProjectInsightsResponseDto.CodeSmellDto.builder()
                        .filePath(relativePath)
                        .type("Long Method")
                        .entityName(pythonDefName)
                        .severity("Medium")
                        .description("Function '" + pythonDefName + "' has " + length + " lines. Consider refactoring.")
                        .lineNumber(pythonDefStartLine)
                        .build());
            }
        }

        // Excessive Nesting Smell
        if (maxNesting > 4) {
            smells.add(ProjectInsightsResponseDto.CodeSmellDto.builder()
                    .filePath(relativePath)
                    .type("Excessive Nesting")
                    .entityName("Control Flow")
                    .severity("Medium")
                    .description("Nesting level reaches " + maxNesting + ". Consider extracting logic to helper methods to reduce indentation depth.")
                    .lineNumber(1)
                    .build());
        }

        // Complexity rating
        String rating = "Low";
        if (complexityPoints >= 25) {
            rating = "High";
        } else if (complexityPoints >= 10) {
            rating = "Medium";
        }

        complexities.add(ProjectInsightsResponseDto.ComplexityMetricDto.builder()
                .filePath(relativePath)
                .fileName(fileName)
                .estimatedComplexity(complexityPoints)
                .rating(rating)
                .build());
    }

    private int getIndentSpaces(String line) {
        int count = 0;
        for (char c : line.toCharArray()) {
            if (c == ' ') {
                count++;
            } else if (c == '\t') {
                count += 4;
            } else {
                break;
            }
        }
        return count;
    }

    private int countOccurrences(String text, String regex) {
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }
}
