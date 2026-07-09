package com.codelensx.backend.service.analysis;

import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Path;

@Service
public class LanguageDetectorService {

    public String detectLanguage(Path filePath) {
        String fileName = filePath.getFileName().toString().toLowerCase();
        String extension = getExtension(fileName);

        switch (extension) {
            case "java":
                return "Java";
            case "py":
                return "Python";
            case "js":
            case "jsx":
            case "mjs":
            case "cjs":
                return "JavaScript";
            case "ts":
            case "tsx":
                return "TypeScript";
            case "json":
                return "JSON";
            case "xml":
                return "XML";
            case "md":
                return "Markdown";
            case "yml":
            case "yaml":
                return "YAML";
            case "properties":
                return "Properties";
            case "sh":
                return "Shell";
            case "html":
            case "htm":
                return "HTML";
            case "css":
                return "CSS";
            default:
                return detectLanguageFromContent(filePath);
        }
    }

    private String getExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot <= 0 || lastDot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(lastDot + 1);
    }

    private String detectLanguageFromContent(Path filePath) {
        try (BufferedReader reader = new BufferedReader(new FileReader(filePath.toFile()))) {
            String firstLine = reader.readLine();
            if (firstLine != null) {
                if (firstLine.startsWith("#!")) {
                    if (firstLine.contains("python")) {
                        return "Python";
                    } else if (firstLine.contains("node")) {
                        return "JavaScript";
                    } else if (firstLine.contains("sh") || firstLine.contains("bash")) {
                        return "Shell";
                    }
                }
            }

            // Read a few more lines
            StringBuilder contentBuilder = new StringBuilder();
            if (firstLine != null) {
                contentBuilder.append(firstLine).append("\n");
            }
            String line;
            int linesRead = 1;
            while ((line = reader.readLine()) != null && linesRead < 30) {
                contentBuilder.append(line).append("\n");
                linesRead++;
            }
            String content = contentBuilder.toString();

            if (content.contains("public class ") && content.contains("import ")) {
                return "Java";
            }
            if (content.contains("def ") && (content.contains("import ") || content.contains("print("))) {
                return "Python";
            }
            if (content.contains("import ") || content.contains("const ") || content.contains("let ") || content.contains("function ")) {
                if (content.contains("interface ") || content.contains("type ") || content.contains("declare ")) {
                    return "TypeScript";
                }
                return "JavaScript";
            }
            if (content.trim().startsWith("<xml") || content.contains("xmlns=")) {
                return "XML";
            }
            if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
                return "JSON";
            }
        } catch (IOException e) {
            // Ignore and fall back to Unknown
        }
        return "Unknown";
    }
}
