package com.codelensx.backend.filecontent.service;

import com.codelensx.backend.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TextFileValidatorTest {

    private TextFileValidator validator;

    @BeforeEach
    void setUp() {
        validator = new TextFileValidator();
    }

    @Test
    void validateSize_AcceptsFileWithinLimit() {
        assertDoesNotThrow(() -> validator.validateSize(TextFileValidator.MAX_FILE_SIZE_BYTES));
    }

    @Test
    void validateSize_RejectsOversizedFile() {
        ApiException exception = assertThrows(
                ApiException.class,
                () -> validator.validateSize(TextFileValidator.MAX_FILE_SIZE_BYTES + 1));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, exception.getStatus());
    }

    @Test
    void validateTextContent_AcceptsKnownExtension() {
        byte[] content = "public class App {}".getBytes(StandardCharsets.UTF_8);

        assertDoesNotThrow(() -> validator.validateTextContent(content, "App.java", "java"));
    }

    @Test
    void validateTextContent_AcceptsUnknownExtensionWithValidUtf8() {
        byte[] content = "plain text without extension".getBytes(StandardCharsets.UTF_8);

        assertDoesNotThrow(() -> validator.validateTextContent(content, "customfile", ""));
    }

    @Test
    void validateTextContent_AcceptsDotEnvFile() {
        byte[] content = "API_KEY=test".getBytes(StandardCharsets.UTF_8);

        assertDoesNotThrow(() -> validator.validateTextContent(content, ".env", ""));
    }

    @Test
    void validateTextContent_AcceptsGitignoreFile() {
        byte[] content = "node_modules/".getBytes(StandardCharsets.UTF_8);

        assertDoesNotThrow(() -> validator.validateTextContent(content, ".gitignore", ""));
    }

    @Test
    void validateTextContent_RejectsBinaryWithNullByte() {
        byte[] content = new byte[]{0x48, 0x00, 0x65};

        ApiException exception = assertThrows(
                ApiException.class,
                () -> validator.validateTextContent(content, "data.bin", "bin"));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, exception.getStatus());
    }

    @Test
    void validateTextContent_RejectsInvalidUtf8() {
        byte[] content = new byte[]{(byte) 0xC3, (byte) 0x28};

        ApiException exception = assertThrows(
                ApiException.class,
                () -> validator.validateTextContent(content, "customfile", ""));

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, exception.getStatus());
    }
}
