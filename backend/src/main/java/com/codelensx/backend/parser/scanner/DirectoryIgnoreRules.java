package com.codelensx.backend.parser.scanner;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DirectoryIgnoreRules {

    private static final Set<String> IGNORED_DIRECTORY_NAMES = Set.of(
            "node_modules",
            "target",
            "build",
            ".git",
            ".idea",
            ".gradle",
            "dist"
    );

    public boolean shouldIgnore(String directoryName) {
        return IGNORED_DIRECTORY_NAMES.contains(directoryName);
    }
}
