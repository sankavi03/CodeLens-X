package com.codelensx.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.codelensx.backend.dto.WorkspaceResponseDto;
import com.codelensx.backend.model.Role;
import com.codelensx.backend.model.User;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.repository.WorkspaceRepository;
import com.codelensx.backend.security.JwtTokenProvider;
import com.codelensx.backend.testutil.ZipTestUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class WorkspaceControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private String token;
    private User testUser;

    @BeforeEach
    public void setup() {
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        // Register test user
        testUser = User.builder()
                .username("workspacer")
                .email("workspace@codelensx.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(testUser);

        // Generate JWT Token
        org.springframework.security.core.userdetails.User userDetails = new org.springframework.security.core.userdetails.User(
                testUser.getUsername(),
                testUser.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(testUser.getRole().name()))
        );
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        token = tokenProvider.generateToken(auth);
    }

    @AfterEach
    public void cleanupFiles() throws IOException {
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        Path uploadsPath = Paths.get("uploads").toAbsolutePath().normalize();
        if (Files.exists(uploadsPath)) {
            try (var walk = Files.walk(uploadsPath)) {
                walk.sorted(java.util.Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(java.io.File::delete);
            }
        }
    }

    @Test
    public void uploadWorkspace_Success() throws Exception {
        byte[] zipBytes = ZipTestUtils.createZip(Map.of(
                "src/main/App.java", "public class App {}",
                "README.md", "# My Project"
        ));

        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                "my-project.zip",
                "application/zip",
                zipBytes
        );

        MvcResult result = mockMvc.perform(multipart("/api/workspaces/upload")
                .file(zipFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.workspaceId", notNullValue()))
                .andExpect(jsonPath("$.projectName", is("my-project")))
                .andExpect(jsonPath("$.uploadedFileName", is("my-project.zip")))
                .andExpect(jsonPath("$.status", is("READY")))
                .andReturn();

        String responseStr = result.getResponse().getContentAsString();
        WorkspaceResponseDto responseDto = objectMapper.readValue(responseStr, WorkspaceResponseDto.class);

        Path workspaceDir = Paths.get("uploads")
                .resolve(testUser.getId().toString())
                .resolve(responseDto.getWorkspaceId().toString());

        Path expectedFile = workspaceDir.resolve("my-project.zip");
        Path extractedFile = workspaceDir.resolve("extracted").resolve("src/main/App.java");

        assertTrue(Files.exists(expectedFile));
        assertTrue(Files.exists(extractedFile));
        assertEquals("public class App {}", Files.readString(extractedFile));
    }

    @Test
    public void uploadWorkspace_InvalidFileType() throws Exception {
        MockMultipartFile txtFile = new MockMultipartFile(
                "file",
                "my-project.txt",
                "text/plain",
                "mock text content".getBytes()
        );

        mockMvc.perform(multipart("/api/workspaces/upload")
                .file(txtFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Only ZIP files are allowed")));
    }

    @Test
    public void uploadWorkspace_Duplicate() throws Exception {
        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                "duplicate.zip",
                "application/zip",
                "content".getBytes()
        );

        // Upload first time
        mockMvc.perform(multipart("/api/workspaces/upload")
                .file(zipFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());

        // Upload second time -> expect Conflict
        mockMvc.perform(multipart("/api/workspaces/upload")
                .file(zipFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already uploaded")));
    }

    @Test
    public void getWorkspaces_Success() throws Exception {
        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                "proj.zip",
                "application/zip",
                "content".getBytes()
        );

        // Upload first
        mockMvc.perform(multipart("/api/workspaces/upload")
                .file(zipFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());

        // List
        mockMvc.perform(get("/api/workspaces")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].uploadedFileName", is("proj.zip")));
    }

    @Test
    public void getWorkspaceByUuid_SuccessAndNotFound() throws Exception {
        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                "proj-uuid.zip",
                "application/zip",
                "content".getBytes()
        );

        MvcResult result = mockMvc.perform(multipart("/api/workspaces/upload")
                .file(zipFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();

        WorkspaceResponseDto responseDto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                WorkspaceResponseDto.class
        );

        // Get details (Success)
        mockMvc.perform(get("/api/workspaces/" + responseDto.getWorkspaceId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectName", is("proj-uuid")));

        // Get details (Not Found)
        mockMvc.perform(get("/api/workspaces/" + UUID.randomUUID())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    public void deleteWorkspace_Success() throws Exception {
        byte[] zipBytes = ZipTestUtils.createZip(Map.of(
                "App.java", "class App {}"
        ));

        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                "delete-me.zip",
                "application/zip",
                zipBytes
        );

        MvcResult result = mockMvc.perform(multipart("/api/workspaces/upload")
                .file(zipFile)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();

        WorkspaceResponseDto responseDto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                WorkspaceResponseDto.class
        );

        Path workspaceDir = Paths.get("uploads")
                .resolve(testUser.getId().toString())
                .resolve(responseDto.getWorkspaceId().toString());

        assertTrue(Files.exists(workspaceDir));

        // Delete
        mockMvc.perform(delete("/api/workspaces/" + responseDto.getWorkspaceId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Verify database and workspace directory both deleted
        assertFalse(Files.exists(workspaceDir));
        assertTrue(workspaceRepository.findAll().isEmpty());
    }
}
