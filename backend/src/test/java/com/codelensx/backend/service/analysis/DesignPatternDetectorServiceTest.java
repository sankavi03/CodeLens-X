package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.DesignPatternResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class DesignPatternDetectorServiceTest {

    private DesignPatternDetectorService designPatternDetectorService;
    private DirectoryIgnoreRules ignoreRules;

    @BeforeEach
    void setUp() {
        ignoreRules = new DirectoryIgnoreRules();
        designPatternDetectorService = new DesignPatternDetectorService(ignoreRules);
    }

    @Test
    void testDetectSingleton(@TempDir Path tempDir) throws IOException {
        Path singletonFile = tempDir.resolve("DbConnection.java");
        String content = "public class DbConnection {\n" +
                "    private static DbConnection instance;\n" +
                "    private DbConnection() {}\n" +
                "    public static DbConnection getInstance() {\n" +
                "        if (instance == null) instance = new DbConnection();\n" +
                "        return instance;\n" +
                "    }\n" +
                "}";
        Files.writeString(singletonFile, content);

        DesignPatternResponseDto result = designPatternDetectorService.detectPatterns(tempDir);
        assertFalse(result.getDetectedPatterns().isEmpty());
        assertTrue(result.getDetectedPatterns().stream().anyMatch(p -> p.getPatternName().equals("Singleton") && p.getClassName().equals("DbConnection")));
    }

    @Test
    void testDetectBuilder(@TempDir Path tempDir) throws IOException {
        Path builderFile = tempDir.resolve("UserBuilder.java");
        String content = "public class UserBuilder {\n" +
                "    public static class Builder {\n" +
                "        public UserBuilder build() {\n" +
                "            return new UserBuilder();\n" +
                "        }\n" +
                "    }\n" +
                "}";
        Files.writeString(builderFile, content);

        DesignPatternResponseDto result = designPatternDetectorService.detectPatterns(tempDir);
        assertFalse(result.getDetectedPatterns().isEmpty());
        assertTrue(result.getDetectedPatterns().stream().anyMatch(p -> p.getPatternName().equals("Builder") && p.getClassName().equals("UserBuilder")));
    }

    @Test
    void testDetectFactory(@TempDir Path tempDir) throws IOException {
        Path factoryFile = tempDir.resolve("ShapeFactory.java");
        String content = "public class ShapeFactory {\n" +
                "    public Shape createShape(String type) {\n" +
                "        return new Circle();\n" +
                "    }\n" +
                "}";
        Files.writeString(factoryFile, content);

        DesignPatternResponseDto result = designPatternDetectorService.detectPatterns(tempDir);
        assertFalse(result.getDetectedPatterns().isEmpty());
        assertTrue(result.getDetectedPatterns().stream().anyMatch(p -> p.getPatternName().equals("Factory") && p.getClassName().equals("ShapeFactory")));
    }
}
