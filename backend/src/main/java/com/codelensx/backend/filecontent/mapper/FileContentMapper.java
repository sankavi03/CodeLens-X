package com.codelensx.backend.filecontent.mapper;

import com.codelensx.backend.filecontent.dto.FileContentResponseDto;
import com.codelensx.backend.parser.model.ProjectTreeNode;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class FileContentMapper {

    public FileContentResponseDto toResponse(UUID workspaceId, ProjectTreeNode node, String content, long sizeBytes) {
        return FileContentResponseDto.builder()
                .workspaceId(workspaceId)
                .relativePath(node.getRelativePath())
                .fileName(node.getName())
                .extension(node.getExtension())
                .sizeBytes(sizeBytes)
                .lineCount(countLines(content))
                .content(content)
                .build();
    }

    private long countLines(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }
        return content.lines().count();
    }
}
