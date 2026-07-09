package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.CodeMetadataDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

public class MetadataExtractorServiceTest {

    private MetadataExtractorService metadataExtractorService;
    private LanguageDetectorService languageDetectorService;

    @BeforeEach
    void setUp() {
        languageDetectorService = new LanguageDetectorService();
        metadataExtractorService = new MetadataExtractorService(languageDetectorService);
    }

    @Test
    void testExtractJavaMetadata(@TempDir Path tempDir) throws IOException {
        Path javaFile = tempDir.resolve("UserService.java");
        String content = "package com.codelensx.backend.service;\n" +
                "import com.codelensx.backend.model.User;\n" +
                "import org.springframework.stereotype.Service;\n" +
                "@Service\n" +
                "public class UserService {\n" +
                "    private final UserRepository repo;\n" +
                "    public UserService(UserRepository repo) {\n" +
                "        this.repo = repo;\n" +
                "    }\n" +
                "    public User getUser(UUID id) {\n" +
                "        return repo.findById(id);\n" +
                "    }\n" +
                "}";
        Files.writeString(javaFile, content);

        CodeMetadataDto metadata = metadataExtractorService.extractMetadata(javaFile);
        assertEquals("Java", metadata.getLanguage());
        assertEquals("com.codelensx.backend.service", metadata.getPackageName());
        assertTrue(metadata.getImports().contains("com.codelensx.backend.model.User"));
        assertTrue(metadata.getClasses().contains("UserService"));
        assertTrue(metadata.getAnnotations().contains("Service"));
        assertTrue(metadata.getConstructors().contains("UserService(UserRepository repo)"));
        assertTrue(metadata.getMethods().contains("User getUser(UUID id)"));
    }

    @Test
    void testExtractPythonMetadata(@TempDir Path tempDir) throws IOException {
        Path pyFile = tempDir.resolve("models.py");
        String content = "import os\n" +
                "from django.db import models\n" +
                "class User(models.Model):\n" +
                "    name = models.CharField(max_length=100)\n" +
                "    def get_name(self):\n" +
                "        return self.name\n";
        Files.writeString(pyFile, content);

        CodeMetadataDto metadata = metadataExtractorService.extractMetadata(pyFile);
        assertEquals("Python", metadata.getLanguage());
        assertTrue(metadata.getImports().contains("os"));
        assertTrue(metadata.getImports().contains("django.db.models"));
        assertTrue(metadata.getClasses().contains("User(models.Model)"));
        assertTrue(metadata.getFunctions().contains("get_name(self)"));
    }

    @Test
    void testExtractJsTsMetadata(@TempDir Path tempDir) throws IOException {
        Path tsFile = tempDir.resolve("utils.ts");
        String content = "import { User } from './types';\n" +
                "export class Helper {\n" +
                "    format(user: User): string {\n" +
                "        return user.name;\n" +
                "    }\n" +
                "}\n" +
                "export function parse(input: string): number {\n" +
                "    return parseInt(input);\n" +
                "}";
        Files.writeString(tsFile, content);

        CodeMetadataDto metadata = metadataExtractorService.extractMetadata(tsFile);
        assertEquals("TypeScript", metadata.getLanguage());
        assertTrue(metadata.getImports().contains("./types"));
        assertTrue(metadata.getClasses().contains("Helper"));
        assertTrue(metadata.getFunctions().contains("parse(input: string)"));
        assertTrue(metadata.getExports().contains("Helper"));
        assertTrue(metadata.getExports().contains("parse"));
    }
}
