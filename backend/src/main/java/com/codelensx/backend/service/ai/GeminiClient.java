package com.codelensx.backend.service.ai;

import com.codelensx.backend.exception.ApiException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Component
@Slf4j
public class GeminiClient {

    private final String apiKey;
    private final String modelName;
    private final double temperature;
    private final RestTemplate restTemplate;

    public GeminiClient(
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.model:gemini-3.5-flash}") String modelName,
            @Value("${app.gemini.temperature:0.2}") double temperature,
            @Value("${app.gemini.connect-timeout-ms:15000}") int connectTimeout,
            @Value("${app.gemini.read-timeout-ms:60000}") int readTimeout) {
        
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.temperature = temperature;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        this.restTemplate = new RestTemplate(factory);
    }

    private String getEffectiveApiKey() {
        // Prioritize system environment variable GEMINI_API_KEY
        String envKey = System.getenv("GEMINI_API_KEY");
        if (envKey != null && !envKey.trim().isEmpty()) {
            return envKey.trim();
        }
        if (this.apiKey != null && !this.apiKey.trim().isEmpty()) {
            return this.apiKey.trim();
        }
        return "";
    }

    private boolean isOAuthToken(String key) {
        return key.startsWith("ya29.");
    }

    public String generateContent(String systemInstruction, String prompt) {
        String key = getEffectiveApiKey();
        if (key.isEmpty()) {
            throw new ApiException("GEMINI_API_KEY is not configured. Please set the environment variable or properties file.", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        String url;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        if (isOAuthToken(key)) {
            url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent";
            headers.setBearerAuth(key);
        } else {
            url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + key;
        }

        String maskedUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=HIDDEN";

        // Build requests exactly matching Google Gemini API DTOs
        GeminiRequest request = new GeminiRequest();
        
        GeminiRequest.Part part = new GeminiRequest.Part(prompt);
        GeminiRequest.Content content = new GeminiRequest.Content(Collections.singletonList(part));
        request.setContents(Collections.singletonList(content));

        if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
            GeminiRequest.Part sysPart = new GeminiRequest.Part(systemInstruction);
            GeminiRequest.SystemInstruction sysInst = new GeminiRequest.SystemInstruction(Collections.singletonList(sysPart));
            request.setSystemInstruction(sysInst);
        }

        GeminiRequest.GenerationConfig config = new GeminiRequest.GenerationConfig(temperature);
        request.setGenerationConfig(config);

        HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);

        log.info("Sending Gemini request to model: {}", modelName);
        log.debug("Target endpoint URL: {}", maskedUrl);

        try {
            long start = System.currentTimeMillis();

            ResponseEntity<GeminiResponse> responseEntity =
                    restTemplate.postForEntity(url, entity, GeminiResponse.class);

            long end = System.currentTimeMillis();
            log.info("Gemini API call took {} ms", (end - start));
            GeminiResponse response = responseEntity.getBody();

            if (response == null) {
                throw new ApiException("Gemini returned an empty response.", HttpStatus.BAD_GATEWAY);
            }

            if (response.getCandidates() == null || response.getCandidates().isEmpty()) {
                throw new ApiException("Gemini returned no candidates.", HttpStatus.BAD_GATEWAY);
            }

            GeminiResponse.Candidate candidate = response.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                throw new ApiException("Gemini response is missing content parts.", HttpStatus.BAD_GATEWAY);
            }

            return candidate.getContent().getParts().get(0).getText();

        } catch (HttpStatusCodeException e) {
            log.error("Gemini API call failed with status: {}. Response: {}", e.getStatusCode(), e.getResponseBodyAsString());
            HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
            if (status == null) {
                status = HttpStatus.BAD_GATEWAY;
            }
            throw new ApiException("Gemini API Error: " + e.getResponseBodyAsString(), status);
        } catch (Exception e) {
            log.error("An unexpected error occurred while calling Gemini API: {}", e.getMessage(), e);
            throw new ApiException("Unexpected Gemini API Client Error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Google Gemini API Request DTOs
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeminiRequest {
        private List<Content> contents;
        private SystemInstruction systemInstruction;
        private GenerationConfig generationConfig;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Content {
            private List<Part> parts;
        }

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class SystemInstruction {
            private List<Part> parts;
        }

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Part {
            private String text;
        }

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class GenerationConfig {
            private Double temperature;
        }
    }

    // Google Gemini API Response DTOs
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeminiResponse {
        private List<Candidate> candidates;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Candidate {
            private Content content;
        }

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Content {
            private List<Part> parts;
        }

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Part {
            private String text;
        }
    }
}
