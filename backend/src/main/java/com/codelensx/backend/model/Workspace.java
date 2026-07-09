package com.codelensx.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workspaces")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workspace_id", unique = true, nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(name = "project_name", nullable = false, length = 100)
    private String projectName;

    @Column(name = "uploaded_file_name", nullable = false, length = 255)
    private String uploadedFileName;

    @Column(name = "upload_time", nullable = false, updatable = false)
    private LocalDateTime uploadTime;

    @Column(name = "project_path", nullable = false, length = 512)
    private String projectPath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkspaceStatus status;

    @PrePersist
    protected void onCreate() {
        this.uploadTime = LocalDateTime.now();
        if (this.workspaceId == null) {
            this.workspaceId = UUID.randomUUID();
        }
    }
}
