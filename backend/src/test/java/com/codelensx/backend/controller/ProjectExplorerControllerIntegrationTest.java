package com.codelensx.backend.controller;

import com.codelensx.backend.dto.WorkspaceResponseDto;
import com.codelensx.backend.model.Role;
import com.codelensx.backend.model.User;
import com.codelensx.backend.parser.cache.ProjectTreeCache;
import com.codelensx.backend.repository.UserRepository;
import com.codelensx.backend.repository.WorkspaceRepository;
import com.codelensx.backend.security.JwtTokenProvider;
import com.codelensx.backend.testutil.ZipTestUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ProjectExplorerControllerIntegrationTest {

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

    @Autowired
    private ProjectTreeCache projectTreeCache;

    private String ownerToken;
    private String otherUserToken;
    private User ownerUser;
    private UUID workspaceId;

    @BeforeEach
    public void setup() throws Exception {
        workspaceRepository.deleteAll();
        userRepository.deleteAll();

        ownerUser = User.builder()
                .username("explorer")
                .email("explorer@codelensx.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(ownerUser);

        User otherUser = User.builder()
                .username("otheruser")
                .email("other@codelensx.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(otherUser);

        ownerToken = generateToken(ownerUser);
        otherUserToken = generateToken(otherUser);
        workspaceId = uploadSampleWorkspace();
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
    public void getProjectTree_Success() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/tree")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workspaceId", is(workspaceId.toString())))
                .andExpect(jsonPath("$.totalFiles", is(2)))
                .andExpect(jsonPath("$.totalFolders", greaterThan(0)))
                .andExpect(jsonPath("$.root.name", notNullValue()))
                .andExpect(jsonPath("$.root.children", not(empty())));
    }

    @Test
    public void getProjectNode_FolderSuccess() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/node")
                        .param("path", "src")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("src")))
                .andExpect(jsonPath("$.relativePath", is("src")))
                .andExpect(jsonPath("$.children", not(empty())))
                .andExpect(jsonPath("$.folderCount", is(1)))
                .andExpect(jsonPath("$.fileCount", is(1)));
    }

    @Test
    public void getProjectNode_FileSuccess() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/node")
                        .param("path", "README.md")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("README.md")))
                .andExpect(jsonPath("$.relativePath", is("README.md")))
                .andExpect(jsonPath("$.extension", is("md")))
                .andExpect(jsonPath("$.sizeBytes", greaterThan(0)));
    }

    @Test
    public void getProjectNode_InvalidPath() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/node")
                        .param("path", "does/not/exist.txt")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid path")));
    }

    @Test
    public void getProjectNode_PathTraversalRejected() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/node")
                        .param("path", "../secret")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("path traversal")));
    }

    @Test
    public void getProjectTree_UnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/tree"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void getProjectTree_ForbiddenForOtherUser() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/tree")
                        .header("Authorization", "Bearer " + otherUserToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Access denied")));
    }

    @Test
    public void getProjectTree_WorkspaceNotFound() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/api/workspaces/" + randomId + "/tree")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", is("Workspace not found")));
    }

    @Test
    public void getProjectTree_MissingCache() throws Exception {
        projectTreeCache.evict(workspaceId);

        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/tree")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("not available")));
    }

    private UUID uploadSampleWorkspace() throws Exception {
        byte[] zipBytes = ZipTestUtils.createZip(Map.of(
                "src/main/App.java", "public class App {}",
                "README.md", "# Sample Project"
        ));

        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                "sample-project.zip",
                "application/zip",
                zipBytes
        );

        MvcResult result = mockMvc.perform(multipart("/api/workspaces/upload")
                        .file(zipFile)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();

        WorkspaceResponseDto responseDto = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                WorkspaceResponseDto.class
        );

        return responseDto.getWorkspaceId();
    }

    private String generateToken(User user) {
        org.springframework.security.core.userdetails.User userDetails =
                new org.springframework.security.core.userdetails.User(
                        user.getUsername(),
                        user.getPassword(),
                        Collections.singletonList(new SimpleGrantedAuthority(user.getRole().name()))
                );
        Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        return tokenProvider.generateToken(auth);
    }
}
