package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.CodeMetadataDto;
import com.codelensx.backend.dto.analysis.DependencyAnalysisResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class DependencyAnalysisService {

    private final MetadataExtractorService metadataExtractorService;
    private final DirectoryIgnoreRules ignoreRules;

    public DependencyAnalysisResponseDto analyzeDependencies(Path rootDir) {
        List<Path> allFiles = new ArrayList<>();
        scanDirectory(rootDir, allFiles);

        List<DependencyAnalysisResponseDto.ExternalDependencyDto> externalDeps = new ArrayList<>();
        Map<String, List<String>> internalGraph = new HashMap<>();

        // 1. Process External Dependencies
        for (Path file : allFiles) {
            String name = file.getFileName().toString();
            if (name.equals("pom.xml")) {
                externalDeps.addAll(parsePomXml(file, rootDir));
            } else if (name.equals("package.json")) {
                externalDeps.addAll(parsePackageJson(file, rootDir));
            } else if (name.equals("requirements.txt")) {
                externalDeps.addAll(parseRequirementsTxt(file, rootDir));
            }
        }

        // 2. Process Internal Dependencies
        buildInternalDependencyGraph(allFiles, rootDir, internalGraph);

        return DependencyAnalysisResponseDto.builder()
                .externalDependencies(externalDeps)
                .internalDependencyGraph(internalGraph)
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
            log.warn("Failed to list directory for dependencies: {}", currentDir, e);
        }
    }

    private List<DependencyAnalysisResponseDto.ExternalDependencyDto> parsePomXml(Path pomFile, Path rootDir) {
        List<DependencyAnalysisResponseDto.ExternalDependencyDto> list = new ArrayList<>();
        String relativePath = rootDir.relativize(pomFile).toString().replace('\\', '/');
        try {
            String content = Files.readString(pomFile);
            // Match <dependency>...</dependency> blocks
            Pattern depBlockPattern = Pattern.compile("<dependency>([\\s\\S]*?)</dependency>");
            Matcher matcher = depBlockPattern.matcher(content);

            Pattern groupPat = Pattern.compile("<groupId>([^<]+)</groupId>");
            Pattern artPat = Pattern.compile("<artifactId>([^<]+)</artifactId>");
            Pattern verPat = Pattern.compile("<version>([^<]+)</version>");
            Pattern scopePat = Pattern.compile("<scope>([^<]+)</scope>");

            while (matcher.find()) {
                String block = matcher.group(1);
                Matcher mGroup = groupPat.matcher(block);
                Matcher mArt = artPat.matcher(block);
                Matcher mVer = verPat.matcher(block);
                Matcher mScope = scopePat.matcher(block);

                if (mGroup.find() && mArt.find()) {
                    String groupId = mGroup.group(1).trim();
                    String artifactId = mArt.group(1).trim();
                    String version = mVer.find() ? mVer.group(1).trim() : "inherited/managed";
                    String scope = mScope.find() ? mScope.group(1).trim() : "compile";

                    list.add(DependencyAnalysisResponseDto.ExternalDependencyDto.builder()
                            .sourceFile(relativePath)
                            .name(groupId + ":" + artifactId)
                            .version(version)
                            .scope(scope)
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse pom.xml: {}", pomFile, e);
        }
        return list;
    }

    private List<DependencyAnalysisResponseDto.ExternalDependencyDto> parsePackageJson(Path packageJsonFile, Path rootDir) {
        List<DependencyAnalysisResponseDto.ExternalDependencyDto> list = new ArrayList<>();
        String relativePath = rootDir.relativize(packageJsonFile).toString().replace('\\', '/');
        try {
            String content = Files.readString(packageJsonFile);
            // Search dependencies and devDependencies blocks
            Pattern depPattern = Pattern.compile("\"(dependencies|devDependencies)\"\\s*:\\s*\\{([^}]+)\\}");
            Matcher matcher = depPattern.matcher(content);

            while (matcher.find()) {
                String scopeType = matcher.group(1); // dependencies or devDependencies
                String block = matcher.group(2);
                String scope = scopeType.equals("dependencies") ? "compile" : "development";

                Pattern entryPattern = Pattern.compile("\"([^\"]+)\"\\s*:\\s*\"([^\"]+)\"");
                Matcher entryMatcher = entryPattern.matcher(block);
                while (entryMatcher.find()) {
                    list.add(DependencyAnalysisResponseDto.ExternalDependencyDto.builder()
                            .sourceFile(relativePath)
                            .name(entryMatcher.group(1).trim())
                            .version(entryMatcher.group(2).trim())
                            .scope(scope)
                            .build());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse package.json: {}", packageJsonFile, e);
        }
        return list;
    }

    private List<DependencyAnalysisResponseDto.ExternalDependencyDto> parseRequirementsTxt(Path reqFile, Path rootDir) {
        List<DependencyAnalysisResponseDto.ExternalDependencyDto> list = new ArrayList<>();
        String relativePath = rootDir.relativize(reqFile).toString().replace('\\', '/');
        try {
            List<String> lines = Files.readAllLines(reqFile);
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }

                // e.g. requests==2.28.1 or requests>=2.20.0 or just requests
                String name = trimmed;
                String version = "latest";
                if (trimmed.contains("==")) {
                    String[] parts = trimmed.split("==");
                    name = parts[0].trim();
                    version = parts[1].trim();
                } else if (trimmed.contains(">=")) {
                    String[] parts = trimmed.split(">=");
                    name = parts[0].trim();
                    version = ">=" + parts[1].trim();
                } else if (trimmed.contains("~=")) {
                    String[] parts = trimmed.split("~=");
                    name = parts[0].trim();
                    version = "~=" + parts[1].trim();
                }

                list.add(DependencyAnalysisResponseDto.ExternalDependencyDto.builder()
                        .sourceFile(relativePath)
                        .name(name)
                        .version(version)
                        .scope("compile")
                        .build());
            }
        } catch (Exception e) {
            log.warn("Failed to parse requirements.txt: {}", reqFile, e);
        }
        return list;
    }

    private void buildInternalDependencyGraph(List<Path> files, Path rootDir, Map<String, List<String>> graph) {
        Map<Path, CodeMetadataDto> metadataMap = new HashMap<>();
        Map<String, String> javaClassToFile = new HashMap<>(); // className -> relativePath
        Map<String, String> pythonModuleToFile = new HashMap<>(); // modulePath -> relativePath

        // First pass: extract metadata and build mapping directories
        for (Path file : files) {
            String relativePath = rootDir.relativize(file).toString().replace('\\', '/');
            CodeMetadataDto meta = metadataExtractorService.extractMetadata(file);
            metadataMap.put(file, meta);

            if (meta.getLanguage().equals("Java")) {
                String pkg = meta.getPackageName();
                for (String cls : meta.getClasses()) {
                    String cleanCls = cls.split("<")[0].trim();
                    String fullPath = (pkg != null ? pkg + "." : "") + cleanCls;
                    javaClassToFile.put(fullPath, relativePath);
                    javaClassToFile.put(cleanCls, relativePath); // mapping for same-package class references
                }
                for (String cls : meta.getInterfaces()) {
                    String cleanCls = cls.split("<")[0].trim();
                    String fullPath = (pkg != null ? pkg + "." : "") + cleanCls;
                    javaClassToFile.put(fullPath, relativePath);
                    javaClassToFile.put(cleanCls, relativePath);
                }
            } else if (meta.getLanguage().equals("Python")) {
                // e.g. path = "app/models/user.py" -> module path = "app.models.user"
                String modPath = relativePath;
                if (modPath.endsWith(".py")) {
                    modPath = modPath.substring(0, modPath.length() - 3);
                }
                modPath = modPath.replace('/', '.');
                pythonModuleToFile.put(modPath, relativePath);
            }
        }

        // Second pass: resolve imports to internal files
        for (Path file : files) {
            String relativePath = rootDir.relativize(file).toString().replace('\\', '/');
            CodeMetadataDto meta = metadataMap.get(file);
            if (meta == null) continue;

            List<String> dependents = new ArrayList<>();

            if (meta.getLanguage().equals("Java")) {
                for (String imp : meta.getImports()) {
                    // direct class match
                    if (javaClassToFile.containsKey(imp)) {
                        dependents.add(javaClassToFile.get(imp));
                    } else if (imp.endsWith(".*")) {
                        // wildcard match: match all classes that start with the prefix before .*
                        String prefix = imp.substring(0, imp.length() - 2);
                        for (Map.Entry<String, String> entry : javaClassToFile.entrySet()) {
                            if (entry.getKey().startsWith(prefix) && !entry.getKey().substring(prefix.length() + 1).contains(".")) {
                                dependents.add(entry.getValue());
                            }
                        }
                    }
                }
            } else if (meta.getLanguage().equals("Python")) {
                for (String imp : meta.getImports()) {
                    if (pythonModuleToFile.containsKey(imp)) {
                        dependents.add(pythonModuleToFile.get(imp));
                    } else {
                        // Check submodules or class names within modules
                        // e.g. "app.models.user.User" -> module is "app.models.user"
                        int lastDot = imp.lastIndexOf('.');
                        if (lastDot > 0) {
                            String parentMod = imp.substring(0, lastDot);
                            if (pythonModuleToFile.containsKey(parentMod)) {
                                dependents.add(pythonModuleToFile.get(parentMod));
                            }
                        }
                    }
                }
            } else if (meta.getLanguage().equals("JavaScript") || meta.getLanguage().equals("TypeScript")) {
                for (String imp : meta.getImports()) {
                    // Typically ES6 relative imports: "./User", "../models/db"
                    if (imp.startsWith(".")) {
                        Path fileDir = file.getParent();
                        Path resolvedPath = fileDir.resolve(imp).normalize();
                        
                        // Check common file extensions
                        Path matched = findJsTsFile(resolvedPath);
                        if (matched != null && Files.exists(matched)) {
                            String rel = rootDir.relativize(matched).toString().replace('\\', '/');
                            dependents.add(rel);
                        }
                    }
                }
            }

            // Deduplicate and filter out self-dependencies
            List<String> uniqueDeps = dependents.stream()
                    .distinct()
                    .filter(dep -> !dep.equals(relativePath))
                    .collect(Collectors.toList());

            graph.put(relativePath, uniqueDeps);
        }
    }

    private Path findJsTsFile(Path resolvedBase) {
        String[] extensions = {".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"};
        for (String ext : extensions) {
            Path target = resolvedBase.resolveSibling(resolvedBase.getFileName().toString() + ext);
            if (ext.startsWith("/")) {
                target = resolvedBase.resolve(ext.substring(1));
            }
            if (Files.exists(target) && Files.isRegularFile(target)) {
                return target;
            }
        }
        return null;
    }
}
