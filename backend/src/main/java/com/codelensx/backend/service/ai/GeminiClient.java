package com.codelensx.backend.service.ai;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Component
@Slf4j
public class GeminiClient {

    @Value("${app.gemini.api-key:}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-1.5-flash}")
    private String modelName;

    @Value("${app.gemini.temperature:0.2}")
    private double temperature;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateContent(String systemInstruction, String prompt) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("GEMINI_API_KEY is not configured. Falling back to Mock responses.");
            return generateMockResponse(prompt);
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            GeminiRequest request = new GeminiRequest();
            
            // Build the contents block
            GeminiRequest.Content content = new GeminiRequest.Content();
            GeminiRequest.Part part = new GeminiRequest.Part();
            part.setText(prompt);
            content.setParts(Collections.singletonList(part));
            request.setContents(Collections.singletonList(content));

            // Set system instruction if provided
            if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
                GeminiRequest.SystemInstruction sysInst = new GeminiRequest.SystemInstruction();
                GeminiRequest.Part sysPart = new GeminiRequest.Part();
                sysPart.setText(systemInstruction);
                sysInst.setParts(Collections.singletonList(sysPart));
                request.setSystemInstruction(sysInst);
            }

            // Set generation config
            GeminiRequest.GenerationConfig config = new GeminiRequest.GenerationConfig();
            config.setTemperature(temperature);
            request.setGenerationConfig(config);

            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> responseEntity = restTemplate.postForEntity(url, entity, GeminiResponse.class);

            GeminiResponse body = responseEntity.getBody();
            if (body != null && body.getCandidates() != null && !body.getCandidates().isEmpty()) {
                GeminiResponse.Candidate candidate = body.getCandidates().get(0);
                if (candidate.getContent() != null && candidate.getContent().getParts() != null && !candidate.getContent().getParts().isEmpty()) {
                    return candidate.getContent().getParts().get(0).getText();
                }
            }
            throw new RuntimeException("Empty response received from Gemini API");
        } catch (Exception e) {
            log.error("Error calling Gemini API: {}. Falling back to Mock responses.", e.getMessage());
            return generateMockResponse(prompt);
        }
    }

    private String generateMockResponse(String prompt) {
        String lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.contains("explain file") || lowerPrompt.contains("explain the following file")) {
            return "### Code Explanation (Mock)\n\n" +
                    "This file is a key component of the application. Here's a breakdown of its structure and responsibilities:\n\n" +
                    "1. **Primary Purpose**: It handles business logic, coordination, or resource management.\n" +
                    "2. **Core Dependencies**: It links with related modules in the package to fulfill requests.\n" +
                    "3. **Code Quality**: The implementation is clean, follows modular principles, and has reasonable nesting depth.\n\n" +
                    "> [!NOTE]\n" +
                    "> Configure a valid `GEMINI_API_KEY` to enable real AI-generated code explanations.";
        } else if (lowerPrompt.contains("readme") || lowerPrompt.contains("generate a professional readme")) {
            return "# Project Title (Mock README)\n\n" +
                    "Welcome to your parsed codebase! Here is a structural guide and summary of your workspace.\n\n" +
                    "## Getting Started\n" +
                    "This codebase is organized logically. View directories under the project root.\n\n" +
                    "## Architecture & Flow\n" +
                    "The backend leverages Spring Boot, providing clean controller-to-service structures.\n\n" +
                    "> [!TIP]\n" +
                    "> Set `GEMINI_API_KEY` in environment variables for high-fidelity, real-time AI README generation.";
        } else if (lowerPrompt.contains("summary") || lowerPrompt.contains("summarize the project")) {
            return "### Project Summary (Mock)\n\n" +
                    "This workspace represents an active software project.\n\n" +
                    "- **Structure**: Formatted as a modular package containing source directories and config files.\n" +
                    "- **Stats**: Features multiple source files representing standard patterns.\n" +
                    "- **Insights**: The codebase exhibits robust styling and organization.\n\n" +
                    "Activate `GEMINI_API_KEY` for a deep, dynamic, Gemini-driven summary.";
        } else if (lowerPrompt.contains("documentation") || lowerPrompt.contains("generate api documentation")) {
            return "## API / Class Documentation (Mock)\n\n" +
                    "Detailed technical breakdown of the provided code component:\n\n" +
                    "### Fields\n" +
                    "- **State**: Holds configuration properties and reference mappings.\n\n" +
                    "### Methods\n" +
                    "- **Business Operations**: Processes inputs and coordinates data transfers.\n\n" +
                    "> [!IMPORTANT]\n" +
                    "> Set your Gemini API key to query Gemini for context-aware class documentation.";
        } else if (lowerPrompt.contains("architecture")) {
            return "## Architecture Summary (Mock)\n\n" +
                    "Overview of the system's structural components and organization:\n\n" +
                    "1. **Presentation Layer**: Thin controllers managing HTTP boundaries.\n" +
                    "2. **Service Layer**: Core logic, parsing algorithms, and coordination flows.\n" +
                    "3. **Data/Infrastructure Layer**: Repositories managing domain mappings.\n\n" +
                    "> [!NOTE]\n" +
                    "> Configure `GEMINI_API_KEY` to trigger complete Gemini architectural summaries.";
        } else {
            return "### Assistant response (Mock)\n\n" +
                    "I am the CodeLens X AI Assistant. I can help you understand this project.\n\n" +
                    "Please configure a valid `GEMINI_API_KEY` in environment variables to receive live, intelligent answers relating to your code files, dependencies, and design patterns.";
        }
    }

    // Gemini API Request DTOs
    @Data
    private static class GeminiRequest {
        private List<Content> contents;
        private SystemInstruction systemInstruction;
        private GenerationConfig generationConfig;

        @Data
        public static class Content {
            private List<Part> parts;
        }

        @Data
        public static class SystemInstruction {
            private List<Part> parts;
        }

        @Data
        public static class Part {
            private String text;
        }

        @Data
        public static class GenerationConfig {
            private double temperature;
        }
    }

    // Gemini API Response DTOs
    @Data
    private static class GeminiResponse {
        private List<Candidate> candidates;

        @Data
        public static class Candidate {
            private Content content;
        }

        @Data
        public static class Content {
            private List<Part> parts;
        }

        @Data
        public static class Part {
            private String text;
        }
    }
}
