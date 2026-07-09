package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.ProjectInsightsResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class ProjectInsightsServiceTest {

    private ProjectInsightsService projectInsightsService;
    private LanguageDetectorService languageDetectorService;
    private DirectoryIgnoreRules ignoreRules;

    @BeforeEach
    void setUp() {
        languageDetectorService = new LanguageDetectorService();
        ignoreRules = new DirectoryIgnoreRules();
        projectInsightsService = new ProjectInsightsService(ignoreRules, languageDetectorService);
    }

    @Test
    void testCalculateInsights(@TempDir Path tempDir) throws IOException {
        Path file = tempDir.resolve("App.java");
        
        // Construct code containing: TODO, high nesting, high complexity
        StringBuilder sb = new StringBuilder();
        sb.append("package com.example;\n");
        sb.append("public class App {\n");
        sb.append("    // TODO: refactor this method\n");
        sb.append("    public void process(int val) {\n");
        sb.append("        if (val > 0) {\n");
        sb.append("            if (val < 100) {\n");
        sb.append("                for (int i=0; i<val; i++) {\n");
        sb.append("                    if (i % 2 == 0) {\n");
        sb.append("                        System.out.println(i);\n");
        sb.append("                    }\n");
        sb.append("                }\n");
        sb.append("            }\n");
        sb.append("        }\n");
        sb.append("    }\n");
        sb.append("}\n");

        Files.writeString(file, sb.toString());

        ProjectInsightsResponseDto result = projectInsightsService.calculateInsights(tempDir);
        
        // Verify TODO is caught
        assertFalse(result.getTodoMarkers().isEmpty());
        assertEquals("TODO", result.getTodoMarkers().get(0).getType());
        assertTrue(result.getTodoMarkers().get(0).getText().contains("refactor this method"));

        // Verify nesting code smell is caught
        assertFalse(result.getCodeSmells().isEmpty());
        assertTrue(result.getCodeSmells().stream().anyMatch(s -> s.getType().equals("Excessive Nesting")));

        // Verify complexity estimation is processed
        assertFalse(result.getFileComplexities().isEmpty());
        assertTrue(result.getFileComplexities().get(0).getEstimatedComplexity() > 1);
    }
}
