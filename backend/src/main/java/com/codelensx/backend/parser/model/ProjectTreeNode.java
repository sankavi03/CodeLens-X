package com.codelensx.backend.parser.model;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class ProjectTreeNode {

    private String name;
    private String relativePath;
    private NodeType type;
    private String extension;
    private Long sizeBytes;

    @Builder.Default
    private List<ProjectTreeNode> children = new ArrayList<>();
}
