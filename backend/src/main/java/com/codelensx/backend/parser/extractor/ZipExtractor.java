package com.codelensx.backend.parser.extractor;

import com.codelensx.backend.parser.exception.ParserException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
@Slf4j
public class ZipExtractor {

    private static final String EXTRACTED_DIR_NAME = "extracted";

    public Path extract(Path zipFilePath, Path workspaceDirectory) {
        validateZipArchive(zipFilePath);

        Path extractDir = workspaceDirectory.resolve(EXTRACTED_DIR_NAME).normalize();

        try {
            Files.createDirectories(extractDir);
        } catch (IOException e) {
            throw new ParserException("Failed to create extraction directory", e);
        }

        try (InputStream inputStream = new BufferedInputStream(Files.newInputStream(zipFilePath));
             ZipInputStream zipInputStream = new ZipInputStream(inputStream)) {

            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                extractEntry(entry, zipInputStream, extractDir);
                zipInputStream.closeEntry();
            }
        } catch (IOException e) {
            log.error("Failed to extract ZIP archive", e);
            throw new ParserException("Failed to extract ZIP archive: " + zipFilePath.getFileName(), e);
        }

        log.debug("Extracted ZIP {} to {}", zipFilePath.getFileName(), extractDir);
        return extractDir;
    }

    private void extractEntry(ZipEntry entry, ZipInputStream zipInputStream, Path extractDir) throws IOException {
        String entryName = entry.getName().replace('\\', '/');
        Path targetPath = extractDir.resolve(entryName).normalize();

        if (!targetPath.startsWith(extractDir)) {
            throw new ParserException("Zip Slip attempt detected: " + entry.getName());
        }

        boolean isDir = entry.isDirectory() || entryName.endsWith("/");
        if (isDir) {
            Files.createDirectories(targetPath);
            return;
        }

        Path parent = targetPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }

        Files.copy(zipInputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
    }

    private void validateZipArchive(Path zipFilePath) {
        byte[] header = new byte[4];

        try (InputStream inputStream = Files.newInputStream(zipFilePath)) {
            if (inputStream.read(header) != 4
                    || header[0] != 'P'
                    || header[1] != 'K') {
                throw new ParserException("Invalid ZIP archive: " + zipFilePath.getFileName());
            }
        } catch (IOException e) {
            throw new ParserException("Failed to read ZIP archive: " + zipFilePath.getFileName(), e);
        }
    }
}
