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
@RequiredArgsConstructor
@Slf4j
public class AiResponseCacheService {

    private final AiResponseCacheRepository cacheRepository;

    public Optional<String> get(String systemInstruction, String prompt) {
        String cacheKey = calculateHash(systemInstruction, prompt);
        return cacheRepository.findByCacheKey(cacheKey)
                .map(AiResponseCache::getResponseText);
    }

    public void put(String systemInstruction, String prompt, String responseText) {
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
