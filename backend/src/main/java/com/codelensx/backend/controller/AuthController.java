package com.codelensx.backend.controller;

import com.codelensx.backend.dto.ApiResponse;
import com.codelensx.backend.dto.JwtAuthenticationResponse;
import com.codelensx.backend.dto.LoginRequest;
import com.codelensx.backend.dto.RegisterRequest;
import com.codelensx.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.registerUser(registerRequest);
        return new ResponseEntity<>(new ApiResponse(true, "User registered successfully"), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtAuthenticationResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthenticationResponse jwtResponse = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtAuthenticationResponse> refreshToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7);
            JwtAuthenticationResponse jwtResponse = authService.refreshToken(token);
            return ResponseEntity.ok(jwtResponse);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logoutUser() {
        return ResponseEntity.ok(new ApiResponse(true, "Logout successful"));
    }

    @GetMapping("/check-username")
    public ResponseEntity<ApiResponse> checkUsername(@RequestParam String username) {
        boolean exists = authService.existsByUsername(username);
        return ResponseEntity.ok(new ApiResponse(!exists, exists ? "Username already taken" : "Username available"));
    }

    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse> checkEmail(@RequestParam String email) {
        boolean exists = authService.existsByEmail(email);
        return ResponseEntity.ok(new ApiResponse(!exists, exists ? "Email already registered" : "Email available"));
    }

    @PostMapping("/google")
    public ResponseEntity<JwtAuthenticationResponse> googleLogin(@Valid @RequestBody com.codelensx.backend.dto.GoogleLoginRequest request) {
        JwtAuthenticationResponse jwtResponse = authService.googleLogin(request);
        return ResponseEntity.ok(jwtResponse);
    }
}
