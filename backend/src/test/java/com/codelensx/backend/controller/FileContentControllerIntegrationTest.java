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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class FileContentControllerIntegrationTest {

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
                .username("filecontent")
                .email("filecontent@codelensx.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(ownerUser);

        User otherUser = User.builder()
                .username("otherfileuser")
                .email("otherfile@codelensx.com")
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
    public void getFileContent_Success() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "src/main/App.java")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workspaceId", is(workspaceId.toString())))
                .andExpect(jsonPath("$.relativePath", is("src/main/App.java")))
                .andExpect(jsonPath("$.fileName", is("App.java")))
                .andExpect(jsonPath("$.extension", is("java")))
                .andExpect(jsonPath("$.sizeBytes").exists())
                .andExpect(jsonPath("$.lineCount", is(1)))
                .andExpect(jsonPath("$.content", is("public class App {}")));
    }

    @Test
    public void getFileContent_UnknownExtensionWithValidUtf8() throws Exception {
        UUID customWorkspaceId = uploadWorkspace(Map.of(
                "notes/customfile", "valid utf-8 text"
        ));

        mockMvc.perform(get("/api/workspaces/" + customWorkspaceId + "/file")
                        .param("path", "notes/customfile")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", is("valid utf-8 text")));
    }

    @Test
    public void getFileContent_FolderRequested() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "src")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("folder")));
    }

    @Test
    public void getFileContent_MissingFile() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "does/not/exist.java")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", is("File not found")));
    }

    @Test
    public void getFileContent_MissingWorkspace() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/api/workspaces/" + randomId + "/file")
                        .param("path", "README.md")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", is("Workspace not found")));
    }

    @Test
    public void getFileContent_UnauthorizedWorkspace() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "README.md")
                        .header("Authorization", "Bearer " + otherUserToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Access denied")));
    }

    @Test
    public void getFileContent_UnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "README.md"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void getFileContent_InvalidPathTraversal() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "../secret.txt")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("path traversal")));
    }

    @Test
    public void getFileContent_InvalidAbsolutePath() throws Exception {
        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "/etc/passwd")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("absolute paths")));
    }

    @Test
    public void getFileContent_BinaryFileRejected() throws Exception {
        UUID binaryWorkspaceId = uploadWorkspaceFromBytes(Map.of(
                "data/binary.bin", new byte[]{0x00, 0x01, 0x02, 0x03}
        ));

        mockMvc.perform(get("/api/workspaces/" + binaryWorkspaceId + "/file")
                        .param("path", "data/binary.bin")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.message", containsString("Binary files")));
    }

    @Test
    public void getFileContent_OversizedFileRejected() throws Exception {
        byte[] oversizedContent = new byte[1024 * 1024 + 1];
        oversizedContent[0] = 'a';

        UUID oversizedWorkspaceId = uploadWorkspaceFromBytes(Map.of(
                "large.txt", oversizedContent
        ));

        mockMvc.perform(get("/api/workspaces/" + oversizedWorkspaceId + "/file")
                        .param("path", "large.txt")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message", containsString("1 MB")));
    }

    @Test
    public void getFileContent_MissingCache() throws Exception {
        projectTreeCache.evict(workspaceId);

        mockMvc.perform(get("/api/workspaces/" + workspaceId + "/file")
                        .param("path", "README.md")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("not available")));
    }

    private UUID uploadSampleWorkspace() throws Exception {
        return uploadWorkspace(Map.of(
                "src/main/App.java", "public class App {}",
                "README.md", "# Sample Project"
        ));
    }

    private UUID uploadWorkspace(Map<String, String> entries) throws Exception {
        return uploadWorkspaceFromBytes(toByteEntries(entries));
    }

    private UUID uploadWorkspaceFromBytes(Map<String, byte[]> entries) throws Exception {
        byte[] zipBytes = ZipTestUtils.createZipFromBytes(entries);

        MockMultipartFile zipFile = new MockMultipartFile(
                "file",
                UUID.randomUUID().toString() + ".zip",
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

    private Map<String, byte[]> toByteEntries(Map<String, String> entries) {
        Map<String, byte[]> byteEntries = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : entries.entrySet()) {
            byteEntries.put(entry.getKey(), entry.getValue().getBytes(StandardCharsets.UTF_8));
        }
        return byteEntries;
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
