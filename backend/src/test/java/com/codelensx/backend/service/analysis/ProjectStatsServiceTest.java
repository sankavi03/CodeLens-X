package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.ProjectStatsResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class ProjectStatsServiceTest {

    private ProjectStatsService projectStatsService;
    private LanguageDetectorService languageDetectorService;
    private DirectoryIgnoreRules ignoreRules;

    @BeforeEach
    void setUp() {
        languageDetectorService = new LanguageDetectorService();
        ignoreRules = new DirectoryIgnoreRules();
        projectStatsService = new ProjectStatsService(languageDetectorService, ignoreRules);
    }

    @Test
    void testCalculateStats(@TempDir Path tempDir) throws IOException {
        // Create 2 directories and 3 files
        Path modelDir = Files.createDirectories(tempDir.resolve("model"));
        Path serviceDir = Files.createDirectories(tempDir.resolve("service"));

        Path file1 = modelDir.resolve("User.java");
        Files.writeString(file1, "package com.example.model;\n\n// Basic user class\npublic class User {\n  private String name;\n}"); // 5 lines, 1 comment, 1 blank, 3 code

        Path file2 = serviceDir.resolve("UserService.java");
        Files.writeString(file2, "package com.example.service;\npublic class UserService {}"); // 2 lines

        Path file3 = tempDir.resolve("config.json");
        Files.writeString(file3, "{\n  \"port\": 8080\n}"); // 3 lines

        ProjectStatsResponseDto stats = projectStatsService.calculateStats(tempDir);
        assertEquals(3, stats.getTotalFiles());
        assertEquals(2, stats.getTotalFolders());
        assertEquals(11, stats.getTotalLines());
        
        // Language distribution checks
        assertEquals(2, stats.getFileCountByLanguage().get("Java"));
        assertEquals(1, stats.getFileCountByLanguage().get("JSON"));
        
        // Blank/comment/code check
        assertTrue(stats.getCommentLines() >= 1);
        assertTrue(stats.getBlankLines() >= 1);
        assertTrue(stats.getCodeLines() >= 7);
    }
}
