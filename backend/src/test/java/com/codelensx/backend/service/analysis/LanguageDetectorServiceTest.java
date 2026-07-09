package com.codelensx.backend.service.analysis;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class LanguageDetectorServiceTest {

    private LanguageDetectorService languageDetectorService;

    @BeforeEach
    void setUp() {
        languageDetectorService = new LanguageDetectorService();
    }

    @Test
    void testDetectLanguageByExtension() {
        assertEquals("Java", languageDetectorService.detectLanguage(Path.of("Test.java")));
        assertEquals("Python", languageDetectorService.detectLanguage(Path.of("test.py")));
        assertEquals("JavaScript", languageDetectorService.detectLanguage(Path.of("index.js")));
        assertEquals("TypeScript", languageDetectorService.detectLanguage(Path.of("app.ts")));
        assertEquals("JSON", languageDetectorService.detectLanguage(Path.of("config.json")));
        assertEquals("XML", languageDetectorService.detectLanguage(Path.of("pom.xml")));
        assertEquals("Markdown", languageDetectorService.detectLanguage(Path.of("README.md")));
    }

    @Test
    void testDetectLanguageFromContent(@TempDir Path tempDir) throws IOException {
        Path scriptFile = tempDir.resolve("script");
        Files.writeString(scriptFile, "#!/usr/bin/env python\nprint('hello')\n");
        assertEquals("Python", languageDetectorService.detectLanguage(scriptFile));

        Path javaFile = tempDir.resolve("JavaApp");
        Files.writeString(javaFile, "package com.example;\nimport java.util.List;\npublic class JavaApp {}");
        assertEquals("Java", languageDetectorService.detectLanguage(javaFile));

        Path jsFile = tempDir.resolve("nodeApp");
        Files.writeString(jsFile, "const express = require('express');\nconst app = express();");
        assertEquals("JavaScript", languageDetectorService.detectLanguage(jsFile));
    }
}
