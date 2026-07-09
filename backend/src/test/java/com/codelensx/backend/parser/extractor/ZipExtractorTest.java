package com.codelensx.backend.parser.extractor;

import com.codelensx.backend.parser.exception.ParserException;
import com.codelensx.backend.testutil.ZipTestUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class ZipExtractorTest {

    private final ZipExtractor zipExtractor = new ZipExtractor();

    @TempDir
    Path tempDir;

    @Test
    void extract_PreservesFolderHierarchy() throws IOException {
        byte[] zipBytes = ZipTestUtils.createZip(Map.of(
                "src/main/App.java", "public class App {}",
                "src/main/resources/config.yml", "key: value",
                "README.md", "# Project"
        ));
        Path zipPath = tempDir.resolve("project.zip");
        Files.write(zipPath, zipBytes);

        Path extractDir = zipExtractor.extract(zipPath, tempDir);

        assertTrue(Files.exists(extractDir.resolve("src/main/App.java")));
        assertTrue(Files.exists(extractDir.resolve("src/main/resources/config.yml")));
        assertTrue(Files.exists(extractDir.resolve("README.md")));
        assertEquals("public class App {}", Files.readString(extractDir.resolve("src/main/App.java")));
    }

    @Test
    void extract_RejectsZipSlip() throws IOException {
        Path zipPath = tempDir.resolve("malicious.zip");
        Files.write(zipPath, createZipSlipArchive());

        ParserException exception = assertThrows(ParserException.class,
                () -> zipExtractor.extract(zipPath, tempDir));

        assertTrue(exception.getMessage().contains("Zip Slip"));
    }

    @Test
    void extract_RejectsInvalidZipArchive() {
        Path zipPath = tempDir.resolve("invalid.zip");

        assertThrows(ParserException.class, () -> {
            Files.writeString(zipPath, "not-a-zip");
            zipExtractor.extract(zipPath, tempDir);
        });
    }

    private byte[] createZipSlipArchive() throws IOException {
        java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
        try (ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream)) {
            ZipEntry entry = new ZipEntry("../escape.txt");
            zipOutputStream.putNextEntry(entry);
            zipOutputStream.write("malicious".getBytes());
            zipOutputStream.closeEntry();
        }
        return outputStream.toByteArray();
    }
}
