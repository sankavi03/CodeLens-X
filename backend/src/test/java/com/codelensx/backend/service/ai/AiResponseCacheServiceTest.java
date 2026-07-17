package com.codelensx.backend.service.ai;

import com.codelensx.backend.model.AiResponseCache;
import com.codelensx.backend.repository.AiResponseCacheRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AiResponseCacheServiceTest {

    @Mock
    private AiResponseCacheRepository cacheRepository;

    private AiResponseCacheService cacheService;

    private String systemInstruction = "system instructions";
    private String prompt = "prompt";

    @BeforeEach
    public void setUp() {
        cacheService = new AiResponseCacheService(cacheRepository, 7);
    }

    @Test
    public void get_RealResponse_ReturnsContent() {
        String expectedResponse = "This is a real Gemini response";
        
        when(cacheRepository.findByCacheKey(anyString()))
                .thenReturn(Optional.of(AiResponseCache.builder()
                        .cacheKey("hash")
                        .responseText(expectedResponse)
                        .build()));

        Optional<String> result = cacheService.get(systemInstruction, prompt);
        assertTrue(result.isPresent());
        assertEquals(expectedResponse, result.get());
        verify(cacheRepository, never()).delete(any());
    }

    @Test
    public void get_MockResponse_EvictsAndReturnsEmpty() {
        String mockResponse = "Configure a valid GEMINI_API_KEY in environment variables";
        AiResponseCache cacheEntry = AiResponseCache.builder()
                .cacheKey("hash")
                .responseText(mockResponse)
                .build();

        when(cacheRepository.findByCacheKey(anyString())).thenReturn(Optional.of(cacheEntry));

        Optional<String> result = cacheService.get(systemInstruction, prompt);
        assertFalse(result.isPresent());
        verify(cacheRepository, times(1)).delete(cacheEntry);
    }

    @Test
    public void put_RealResponse_SavesToRepository() {
        String realResponse = "This is a real Gemini response";
        when(cacheRepository.findByCacheKey(anyString())).thenReturn(Optional.empty());

        cacheService.put(systemInstruction, prompt, realResponse);

        verify(cacheRepository, times(1)).save(any(AiResponseCache.class));
    }

    @Test
    public void put_MockResponse_DoesNotSaveToRepository() {
        String mockResponse = "### Assistant response (Mock)";

        cacheService.put(systemInstruction, prompt, mockResponse);

        verify(cacheRepository, never()).save(any(AiResponseCache.class));
    }
}
