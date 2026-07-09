package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.DesignPatternResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class DesignPatternDetectorService {

    private final DirectoryIgnoreRules ignoreRules;

    public DesignPatternResponseDto detectPatterns(Path rootDir) {
        List<Path> allFiles = new ArrayList<>();
        scanDirectory(rootDir, allFiles);

        List<DesignPatternResponseDto.PatternMatchDto> matches = new ArrayList<>();

        for (Path file : allFiles) {
            String fileName = file.getFileName().toString();
            String relativePath = rootDir.relativize(file).toString().replace('\\', '/');

            // Skip files that aren't source code
            if (!fileName.endsWith(".java") && !fileName.endsWith(".py") && !fileName.endsWith(".js") && !fileName.endsWith(".ts")) {
                continue;
            }

            try {
                String content = Files.readString(file);
                detectPatternInFile(content, fileName, relativePath, matches);
            } catch (Exception e) {
                log.warn("Failed to read file for design patterns: {}", file, e);
            }
        }

        return DesignPatternResponseDto.builder()
                .detectedPatterns(matches)
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
            log.warn("Failed to list directory for patterns: {}", currentDir, e);
        }
    }

    private void detectPatternInFile(String content, String fileName, String relativePath, List<DesignPatternResponseDto.PatternMatchDto> matches) {
        String baseName = fileName.substring(0, fileName.lastIndexOf('.'));

        // 1. Singleton Check
        if (content.contains("private " + baseName + "(") || content.contains("protected " + baseName + "(")) {
            if (content.contains("static " + baseName) || content.contains("getInstance(")) {
                matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                        .patternName("Singleton")
                        .className(baseName)
                        .filePath(relativePath)
                        .confidence("High")
                        .description("Detected private/protected constructor combined with static instance field or getInstance method.")
                        .build());
            }
        } else if (baseName.endsWith("Singleton") || (fileName.endsWith(".py") && content.contains("__new__") && content.contains("_instance"))) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Singleton")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("Medium")
                    .description("Detected class name ending with 'Singleton' or Python-style instance checking.")
                    .build());
        }

        // 2. Builder Check
        if (content.contains("static class ") && content.contains("Builder") && content.contains("build(")) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Builder")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("High")
                    .description("Detected nested Builder class with a terminal build() construction method.")
                    .build());
        } else if (baseName.endsWith("Builder") || content.contains(".builder()")) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Builder")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("Medium")
                    .description("Detected class naming conventions or Lombok builder instantiation.")
                    .build());
        }

        // 3. Factory Check
        if (baseName.endsWith("Factory") || content.contains("class " + baseName + "Factory") || content.contains("interface " + baseName + "Factory")) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Factory")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("High")
                    .description("Class or interface named Factory, indicating object creation abstraction.")
                    .build());
        } else if (content.contains("create") && (content.contains("new ") || content.contains("return new"))) {
            if (content.contains("factory") || content.contains("Factory")) {
                matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                        .patternName("Factory")
                        .className(baseName)
                        .filePath(relativePath)
                        .confidence("Medium")
                        .description("Detected create methods that return new instantiations, matching Factory patterns.")
                        .build());
            }
        }

        // 4. Observer Check
        if (content.contains("Observer") || content.contains("Listener") || content.contains("Subject")) {
            if (content.contains("registerObserver") || content.contains("notifyObservers") || content.contains("addListener") || content.contains("removeListener")) {
                matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                        .patternName("Observer")
                        .className(baseName)
                        .filePath(relativePath)
                        .confidence("High")
                        .description("Detected callback registration methods (addListener, notifyObservers) signifying the Observer pattern.")
                        .build());
            } else if (baseName.endsWith("Observer") || baseName.endsWith("Listener")) {
                matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                        .patternName("Observer")
                        .className(baseName)
                        .filePath(relativePath)
                        .confidence("Medium")
                        .description("Detected suffix naming matching Observer/Listener pattern.")
                        .build());
            }
        }

        // 5. Strategy Check
        if (baseName.endsWith("Strategy") || content.contains("implements " + baseName + "Strategy")) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Strategy")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("High")
                    .description("Detected interchangeable algorithm abstraction via Strategy naming pattern.")
                    .build());
        }

        // 6. Adapter Check
        if (baseName.endsWith("Adapter") || (content.contains("implements") && content.contains("interface") && content.contains("Adapter"))) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Adapter")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("High")
                    .description("Detected interface adaptation wrapper matching Adapter suffix.")
                    .build());
        }

        // 7. Facade Check
        if (baseName.endsWith("Facade") || content.contains("Facade")) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Facade")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("Medium")
                    .description("Detected simplified entry point facade class coordination.")
                    .build());
        }

        // 8. Decorator Check
        if (baseName.endsWith("Decorator") || content.contains("extends " + baseName + "Decorator")) {
            matches.add(DesignPatternResponseDto.PatternMatchDto.builder()
                    .patternName("Decorator")
                    .className(baseName)
                    .filePath(relativePath)
                    .confidence("Medium")
                    .description("Detected runtime structural extension pattern wrapper.")
                    .build());
        }
    }
}
