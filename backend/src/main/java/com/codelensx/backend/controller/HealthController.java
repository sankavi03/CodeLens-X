package com.codelensx.backend.controller;

import com.codelensx.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final WorkspaceRepository workspaceRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        Map<String, Object> components = new HashMap<>();

        boolean isDbUp = false;
        try {
            workspaceRepository.count();
            isDbUp = true;
        } catch (Exception e) {
            log.error("Health check failed for database: {}", e.getMessage());
        }

        Map<String, Object> dbDetails = new HashMap<>();
        dbDetails.put("status", isDbUp ? "UP" : "DOWN");
        dbDetails.put("type", "Relational Database");
        components.put("db", dbDetails);

        // Disk space check
        boolean isDiskUp = false;
        Map<String, Object> diskDetails = new HashMap<>();
        try {
            File root = new File(".");
            long freeSpace = root.getFreeSpace();
            long totalSpace = root.getTotalSpace();
            diskDetails.put("status", "UP");
            diskDetails.put("freeSpaceMb", freeSpace / (1024 * 1024));
            diskDetails.put("totalSpaceMb", totalSpace / (1024 * 1024));
            isDiskUp = true;
        } catch (Exception e) {
            log.error("Health check failed for disk space: {}", e.getMessage());
            diskDetails.put("status", "DOWN");
        }
        components.put("disk", diskDetails);

        // Uploads directory check
        boolean isUploadsWritable = false;
        Map<String, Object> uploadsDetails = new HashMap<>();
        try {
            Path uploadsPath = Paths.get("uploads").toAbsolutePath().normalize();
            if (!Files.exists(uploadsPath)) {
                Files.createDirectories(uploadsPath);
            }
            isUploadsWritable = Files.isWritable(uploadsPath);
            uploadsDetails.put("status", isUploadsWritable ? "UP" : "DOWN");
            uploadsDetails.put("path", uploadsPath.toString());
            uploadsDetails.put("writable", isUploadsWritable);
        } catch (Exception e) {
            log.error("Health check failed for uploads directory: {}", e.getMessage());
            uploadsDetails.put("status", "DOWN");
        }
        components.put("uploadsDirectory", uploadsDetails);

        boolean overallUp = isDbUp && isDiskUp && isUploadsWritable;
        health.put("status", overallUp ? "UP" : "DEGRADED");
        health.put("components", components);

        return overallUp 
                ? ResponseEntity.ok(health)
                : new ResponseEntity<>(health, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
