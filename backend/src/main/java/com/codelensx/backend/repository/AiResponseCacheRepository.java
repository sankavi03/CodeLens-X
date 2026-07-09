package com.codelensx.backend.repository;

import com.codelensx.backend.model.AiResponseCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiResponseCacheRepository extends JpaRepository<AiResponseCache, UUID> {
    Optional<AiResponseCache> findByCacheKey(String cacheKey);
}
