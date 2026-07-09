package com.codelensx.backend.parser.model;

import lombok.Builder;
import lombok.Data;

import java.nio.file.Path;
import java.util.UUID;

@Data
@Builder
public class ProjectTree {

    private UUID workspaceId;
    private Path rootPath;
    private ProjectTreeNode root;
    private int totalFiles;
    private int totalFolders;
}
