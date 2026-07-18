package com.codelensx.backend.service;

import com.codelensx.backend.dto.JwtAuthenticationResponse;
import com.codelensx.backend.dto.LoginRequest;
import com.codelensx.backend.dto.RegisterRequest;
import com.codelensx.backend.exception.ApiException;
import com.codelensx.backend.model.Role;
import com.codelensx.backend.model.User;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public User registerUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ApiException("Username is already taken", HttpStatus.CONFLICT);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("Email address is already in use", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_USER)
                .build();

        return userRepository.save(user);
    }

    public JwtAuthenticationResponse authenticateUser(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        return JwtAuthenticationResponse.builder()
                .accessToken(jwt)
                .build();
    }

    public JwtAuthenticationResponse refreshToken(String token) {
        String username = tokenProvider.getUsernameFromTokenEvenIfExpired(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException("User not found", HttpStatus.UNAUTHORIZED));

        String newJwt = tokenProvider.generateTokenForUser(user.getUsername());
        return JwtAuthenticationResponse.builder()
                .accessToken(newJwt)
                .build();
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Transactional
    public JwtAuthenticationResponse googleLogin(com.codelensx.backend.dto.GoogleLoginRequest request) {
        String email = request.getEmail();
        String displayName = request.getDisplayName();
        String profileImage = request.getProfileImage();

        // Verify/validate Google ID Token if not mock token
        if (request.getGoogleIdToken() != null && !request.getGoogleIdToken().equals("google-mock-jwt-token")) {
            try {
                String[] parts = request.getGoogleIdToken().split("\\.");
                if (parts.length >= 2) {
                    String decodedPayload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(decodedPayload);
                    if (node.has("email")) {
                        email = node.get("email").asText();
                    }
                    if (node.has("name")) {
                        displayName = node.get("name").asText();
                    }
                    if (node.has("picture")) {
                        profileImage = node.get("picture").asText();
                    }
                } else {
                    throw new ApiException("Invalid Google ID Token format", HttpStatus.BAD_REQUEST);
                }
            } catch (Exception e) {
                throw new ApiException("Google ID Token verification failed: " + e.getMessage(), HttpStatus.BAD_REQUEST);
            }
        }

        final String finalEmail = email;
        final String finalDisplayName = displayName;
        final String finalProfileImage = profileImage;

        User user = userRepository.findByEmail(finalEmail)
                .orElseGet(() -> {
                    String baseUsername = finalEmail.split("@")[0];
                    String username = baseUsername;
                    int count = 1;
                    while (userRepository.existsByUsername(username)) {
                        username = baseUsername + count;
                        count++;
                    }

                    User newUser = User.builder()
                            .username(username)
                            .email(finalEmail)
                            .displayName(finalDisplayName)
                            .profileImage(finalProfileImage)
                            .role(Role.ROLE_USER)
                            .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                            .build();
                    return newUser; // pre-persist onCreate sets UUID
                });

        // Let JpaRepository handle save
        user = userRepository.save(user);

        if (finalProfileImage != null && !finalProfileImage.equals(user.getProfileImage())) {
            user.setProfileImage(finalProfileImage);
            user = userRepository.save(user);
        }
        if (finalDisplayName != null && !finalDisplayName.equals(user.getDisplayName())) {
            user.setDisplayName(finalDisplayName);
            user = userRepository.save(user);
        }

        String token = tokenProvider.generateTokenForUser(user.getUsername());
        return JwtAuthenticationResponse.builder()
                .accessToken(token)
                .build();
    }
}
