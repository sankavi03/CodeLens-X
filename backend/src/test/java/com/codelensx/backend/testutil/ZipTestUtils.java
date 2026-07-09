package com.codelensx.backend.testutil;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public final class ZipTestUtils {

    private ZipTestUtils() {
    }

    public static byte[] createZip(Map<String, String> entries) throws IOException {
        Map<String, byte[]> binaryEntries = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : entries.entrySet()) {
            binaryEntries.put(entry.getKey(), entry.getValue().getBytes(StandardCharsets.UTF_8));
        }
        return createZipFromBytes(binaryEntries);
    }

    public static byte[] createZipFromBytes(Map<String, byte[]> entries) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream)) {
            for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
                ZipEntry zipEntry = new ZipEntry(entry.getKey());
                zipOutputStream.putNextEntry(zipEntry);
                zipOutputStream.write(entry.getValue());
                zipOutputStream.closeEntry();
            }
        }
        return outputStream.toByteArray();
    }
}
