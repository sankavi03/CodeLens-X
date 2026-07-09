package com.codelensx.backend.parser.cache;

import com.codelensx.backend.parser.model.ProjectTree;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ProjectTreeCache {

    private final ConcurrentHashMap<UUID, ProjectTree> cache = new ConcurrentHashMap<>();

    public void put(UUID workspaceId, ProjectTree projectTree) {
        cache.put(workspaceId, projectTree);
    }

    public Optional<ProjectTree> get(UUID workspaceId) {
        return Optional.ofNullable(cache.get(workspaceId));
    }

    public void evict(UUID workspaceId) {
        cache.remove(workspaceId);
    }
}
