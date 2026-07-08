package com.codelensx.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.codelensx.backend.dto.LoginRequest;
import com.codelensx.backend.dto.RegisterRequest;
import com.codelensx.backend.model.Role;
import com.codelensx.backend.model.User;
import com.codelensx.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    public void setup() {
        userRepository.deleteAll();
    }

    @Test
    public void registerUser_Success() throws Exception {
        RegisterRequest request = new RegisterRequest("testuser", "test@codelensx.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("registered successfully")));

        assertTrue(userRepository.existsByUsername("testuser"));
        assertTrue(userRepository.existsByEmail("test@codelensx.com"));
    }

    @Test
    public void registerUser_ConflictUsername() throws Exception {
        // Pre-create user
        User existingUser = User.builder()
                .username("testuser")
                .email("old@codelensx.com")
                .password(passwordEncoder.encode("password"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(existingUser);

        RegisterRequest request = new RegisterRequest("testuser", "new@codelensx.com", "password123");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Username is already taken")));
    }

    @Test
    public void loginUser_Success() throws Exception {
        // Pre-create user with hashed password
        User user = User.builder()
                .username("loginuser")
                .email("login@codelensx.com")
                .password(passwordEncoder.encode("secret123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(user);

        LoginRequest request = new LoginRequest("loginuser", "secret123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")));
    }

    @Test
    public void accessProtected_SuccessAndUnauthorized() throws Exception {
        // Pre-create user
        User user = User.builder()
                .username("secureuser")
                .email("secure@codelensx.com")
                .password(passwordEncoder.encode("secret123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(user);

        // 1. Try to access /api/users/me without token -> expect 401
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());

        // 2. Perform login to get token
        LoginRequest loginRequest = new LoginRequest("secureuser", "secret123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseString = loginResult.getResponse().getContentAsString();
        Map<String, String> responseMap = objectMapper.readValue(responseString, Map.class);
        String token = responseMap.get("accessToken");

        // 3. Access protected route with token -> expect 200 and user details
        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("secureuser")))
                .andExpect(jsonPath("$.roles", contains("ROLE_USER")));
    }
}
