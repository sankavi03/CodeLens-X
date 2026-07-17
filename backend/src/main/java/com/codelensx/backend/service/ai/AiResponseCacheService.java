package com.codelensx.backend.service.ai;

import com.codelensx.backend.model.AiResponseCache;
import com.codelensx.backend.repository.AiResponseCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Service
@Slf4j
public class AiResponseCacheService {

    private final AiResponseCacheRepository cacheRepository;
    private final int cacheTtlDays;

    public AiResponseCacheService(
            AiResponseCacheRepository cacheRepository,
            @org.springframework.beans.factory.annotation.Value("${app.gemini.cache-ttl-days:7}") int cacheTtlDays) {
        this.cacheRepository = cacheRepository;
        this.cacheTtlDays = cacheTtlDays;
    }

    public Optional<String> get(String systemInstruction, String prompt) {
        String cacheKey = calculateHash(systemInstruction, prompt);
        Optional<AiResponseCache> cached = cacheRepository.findByCacheKey(cacheKey);
        if (cached.isPresent()) {
            AiResponseCache entry = cached.get();
            
            // Check if stale
            if (entry.getCreatedAt() != null && entry.getCreatedAt().plusDays(cacheTtlDays).isBefore(java.time.LocalDateTime.now())) {
                log.info("Detected stale cached response (created at {}). Evicting from cache key {}", entry.getCreatedAt(), cacheKey);
                try {
                    cacheRepository.delete(entry);
                } catch (Exception e) {
                    log.warn("Failed to evict stale response from cache: {}", e.getMessage());
                }
                return Optional.empty();
            }

            String text = entry.getResponseText();
            if (isMockResponse(text)) {
                log.info("Detected cached mock response. Evicting from cache key {}", cacheKey);
                try {
                    cacheRepository.delete(entry);
                } catch (Exception e) {
                    log.warn("Failed to evict mock response from cache: {}", e.getMessage());
                }
                return Optional.empty();
            }
            return Optional.of(text);
        }
        return Optional.empty();
    }

    public void put(String systemInstruction, String prompt, String responseText) {
        if (isMockResponse(responseText)) {
            log.debug("Skipping caching of mock response");
            return;
        }
        String cacheKey = calculateHash(systemInstruction, prompt);
        // Avoid duplicate entry issue
        if (cacheRepository.findByCacheKey(cacheKey).isPresent()) {
            return;
        }

        AiResponseCache cacheEntry = AiResponseCache.builder()
                .cacheKey(cacheKey)
                .responseText(responseText)
                .build();
        try {
            cacheRepository.save(cacheEntry);
        } catch (Exception e) {
            log.warn("Failed to save AI response in cache: {}", e.getMessage());
        }
    }

    private boolean isMockResponse(String text) {
        if (text == null) return false;
        String lower = text.toLowerCase();
        return lower.contains("gemini_api_key") || lower.contains("(mock)") || lower.contains("mock response") || lower.contains("assistant response");
    }

    private String calculateHash(String systemInstruction, String prompt) {
        String combined = (systemInstruction != null ? systemInstruction : "") + "||" + (prompt != null ? prompt : "");
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(combined.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            // Fallback to simple hashcode hex if MD5/SHA256 fails somehow
            return Integer.toHexString(combined.hashCode());
        }
    }
}
