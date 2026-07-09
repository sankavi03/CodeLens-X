package com.codelensx.backend.explorer.mapper;

import com.codelensx.backend.explorer.dto.ExplorerChildNodeDto;
import com.codelensx.backend.explorer.dto.ExplorerFileNodeResponseDto;
import com.codelensx.backend.explorer.dto.ExplorerFolderNodeResponseDto;
import com.codelensx.backend.explorer.dto.ExplorerTreeNodeDto;
import com.codelensx.backend.explorer.dto.ExplorerTreeResponseDto;
import com.codelensx.backend.parser.model.NodeType;
import com.codelensx.backend.parser.model.ProjectTree;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ProjectExplorerMapper {

    public ExplorerTreeResponseDto toTreeResponse(ProjectTree projectTree) {
        return ExplorerTreeResponseDto.builder()
                .workspaceId(projectTree.getWorkspaceId())
                .totalFiles(projectTree.getTotalFiles())
                .totalFolders(projectTree.getTotalFolders())
                .root(toTreeNodeDto(projectTree.getRoot()))
                .build();
    }

    public ExplorerFolderNodeResponseDto toFolderNodeResponse(ProjectTreeNode node) {
        int[] counts = countDescendants(node);

        return ExplorerFolderNodeResponseDto.builder()
                .name(node.getName())
                .relativePath(node.getRelativePath())
                .children(node.getChildren().stream()
                        .map(this::toChildNodeDto)
                        .collect(Collectors.toList()))
                .folderCount(counts[0])
                .fileCount(counts[1])
                .build();
    }

    public ExplorerFileNodeResponseDto toFileNodeResponse(ProjectTreeNode node) {
        return ExplorerFileNodeResponseDto.builder()
                .name(node.getName())
                .relativePath(node.getRelativePath())
                .extension(node.getExtension())
                .sizeBytes(node.getSizeBytes())
                .build();
    }

    private ExplorerTreeNodeDto toTreeNodeDto(ProjectTreeNode node) {
        ExplorerTreeNodeDto.ExplorerTreeNodeDtoBuilder builder = ExplorerTreeNodeDto.builder()
                .name(node.getName())
                .relativePath(node.getRelativePath())
                .type(node.getType().name());

        if (node.getType() == NodeType.FILE) {
            builder.extension(node.getExtension())
                    .sizeBytes(node.getSizeBytes());
        } else {
            builder.children(node.getChildren().stream()
                    .map(this::toTreeNodeDto)
                    .collect(Collectors.toList()));
        }

        return builder.build();
    }

    private ExplorerChildNodeDto toChildNodeDto(ProjectTreeNode node) {
        return ExplorerChildNodeDto.builder()
                .name(node.getName())
                .relativePath(node.getRelativePath())
                .type(node.getType().name())
                .build();
    }

    private int[] countDescendants(ProjectTreeNode folderNode) {
        int folderCount = 0;
        int fileCount = 0;

        for (ProjectTreeNode child : folderNode.getChildren()) {
            if (child.getType() == NodeType.FILE) {
                fileCount++;
            } else {
                folderCount++;
                int[] nested = countDescendants(child);
                folderCount += nested[0];
                fileCount += nested[1];
            }
        }

        return new int[]{folderCount, fileCount};
    }
}
