package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.DependencyAnalysisResponseDto;
import com.codelensx.backend.parser.scanner.DirectoryIgnoreRules;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class DependencyAnalysisServiceTest {

    private DependencyAnalysisService dependencyAnalysisService;
    private MetadataExtractorService metadataExtractorService;
    private LanguageDetectorService languageDetectorService;
    private DirectoryIgnoreRules ignoreRules;

    @BeforeEach
    void setUp() {
        languageDetectorService = new LanguageDetectorService();
        metadataExtractorService = new MetadataExtractorService(languageDetectorService);
        ignoreRules = new DirectoryIgnoreRules();
        dependencyAnalysisService = new DependencyAnalysisService(metadataExtractorService, ignoreRules);
    }

    @Test
    void testAnalyzeExternalDependencies(@TempDir Path tempDir) throws IOException {
        // Create a pom.xml
        Path pomFile = tempDir.resolve("pom.xml");
        String pomContent = "<project>\n" +
                "  <dependencies>\n" +
                "    <dependency>\n" +
                "      <groupId>org.springframework.boot</groupId>\n" +
                "      <artifactId>spring-boot-starter-web</artifactId>\n" +
                "      <version>3.3.1</version>\n" +
                "    </dependency>\n" +
                "  </dependencies>\n" +
                "</project>";
        Files.writeString(pomFile, pomContent);

        // Create a package.json
        Path packageJsonFile = tempDir.resolve("package.json");
        String packageJsonContent = "{\n" +
                "  \"dependencies\": {\n" +
                "    \"react\": \"^18.2.0\"\n" +
                "  },\n" +
                "  \"devDependencies\": {\n" +
                "    \"typescript\": \"^5.0.4\"\n" +
                "  }\n" +
                "}";
        Files.writeString(packageJsonFile, packageJsonContent);

        // Create requirements.txt
        Path reqFile = tempDir.resolve("requirements.txt");
        String reqContent = "requests==2.28.1\nnumpy>=1.22.0\n";
        Files.writeString(reqFile, reqContent);

        DependencyAnalysisResponseDto result = dependencyAnalysisService.analyzeDependencies(tempDir);
        
        assertNotNull(result.getExternalDependencies());
        assertEquals(5, result.getExternalDependencies().size());

        // Check maven
        assertTrue(result.getExternalDependencies().stream().anyMatch(d -> d.getName().equals("org.springframework.boot:spring-boot-starter-web") && d.getVersion().equals("3.3.1")));
        // Check npm
        assertTrue(result.getExternalDependencies().stream().anyMatch(d -> d.getName().equals("react") && d.getScope().equals("compile")));
        assertTrue(result.getExternalDependencies().stream().anyMatch(d -> d.getName().equals("typescript") && d.getScope().equals("development")));
        // Check pip
        assertTrue(result.getExternalDependencies().stream().anyMatch(d -> d.getName().equals("requests") && d.getVersion().equals("2.28.1")));
    }

    @Test
    void testAnalyzeInternalDependencies(@TempDir Path tempDir) throws IOException {
        Path modelDir = Files.createDirectories(tempDir.resolve("model"));
        Path serviceDir = Files.createDirectories(tempDir.resolve("service"));

        Path userFile = modelDir.resolve("User.java");
        Files.writeString(userFile, "package com.example.model;\npublic class User {}");

        Path serviceFile = serviceDir.resolve("UserService.java");
        Files.writeString(serviceFile, "package com.example.service;\nimport com.example.model.User;\npublic class UserService {}");

        DependencyAnalysisResponseDto result = dependencyAnalysisService.analyzeDependencies(tempDir);
        assertNotNull(result.getInternalDependencyGraph());

        String serviceRel = tempDir.relativize(serviceFile).toString().replace('\\', '/');
        String userRel = tempDir.relativize(userFile).toString().replace('\\', '/');

        assertTrue(result.getInternalDependencyGraph().containsKey(serviceRel));
        assertTrue(result.getInternalDependencyGraph().get(serviceRel).contains(userRel));
    }
}
