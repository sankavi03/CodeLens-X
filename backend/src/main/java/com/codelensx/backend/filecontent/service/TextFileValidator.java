package com.codelensx.backend.filecontent.service;

import com.codelensx.backend.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

@Component
public class TextFileValidator {

    static final long MAX_FILE_SIZE_BYTES = 1024 * 1024;

    private static final Set<String> KNOWN_TEXT_EXTENSIONS = Set.of(
            "java", "kt", "py", "js", "ts", "jsx", "tsx", "xml", "yml", "yaml",
            "json", "md", "properties", "gradle", "sql", "html", "css", "txt",
            "env", "gitignore"
    );

    public void validateSize(long sizeBytes) {
        if (sizeBytes > MAX_FILE_SIZE_BYTES) {
            throw new ApiException("File exceeds maximum readable size of 1 MB", HttpStatus.PAYLOAD_TOO_LARGE);
        }
    }

    public void validateTextContent(byte[] content, String fileName, String extension) {
        if (containsNullByte(content)) {
            throw new ApiException("Binary files are not supported", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }

        if (isKnownTextFile(fileName, extension)) {
            validateUtf8(content);
            return;
        }

        validateUtf8(content);
    }

    private boolean isKnownTextFile(String fileName, String extension) {
        if (extension != null && !extension.isBlank()
                && KNOWN_TEXT_EXTENSIONS.contains(extension.toLowerCase(Locale.ROOT))) {
            return true;
        }

        if (fileName != null && fileName.startsWith(".")) {
            String dotFileName = fileName.substring(1).toLowerCase(Locale.ROOT);
            return KNOWN_TEXT_EXTENSIONS.contains(dotFileName);
        }

        return false;
    }

    private void validateUtf8(byte[] content) {
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content));
        } catch (CharacterCodingException e) {
            throw new ApiException("Binary files are not supported", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    private boolean containsNullByte(byte[] content) {
        for (byte b : content) {
            if (b == 0) {
                return true;
            }
        }
        return false;
    }
}
