package com.codelensx.backend.parser.model;

import org.springframework.stereotype.Component;

@Component
public class ProjectTreeBuilder {

    public ProjectTree build(java.util.UUID workspaceId, java.nio.file.Path rootPath, ProjectTreeNode root) {
        int[] fileCount = {0};
        int[] folderCount = {0};
        countNodes(root, fileCount, folderCount);

        return ProjectTree.builder()
                .workspaceId(workspaceId)
                .rootPath(rootPath)
                .root(root)
                .totalFiles(fileCount[0])
                .totalFolders(folderCount[0])
                .build();
    }

    private void countNodes(ProjectTreeNode node, int[] fileCount, int[] folderCount) {
        if (node.getType() == NodeType.FILE) {
            fileCount[0]++;
            return;
        }

        folderCount[0]++;
        for (ProjectTreeNode child : node.getChildren()) {
            countNodes(child, fileCount, folderCount);
        }
    }
}
