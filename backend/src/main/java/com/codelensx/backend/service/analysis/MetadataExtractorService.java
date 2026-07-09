package com.codelensx.backend.service.analysis;

import com.codelensx.backend.dto.analysis.CodeMetadataDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetadataExtractorService {

    private final LanguageDetectorService languageDetectorService;

    // Pattern definitions for Java
    private static final Pattern JAVA_PACKAGE = Pattern.compile("^\\s*package\\s+([a-zA-Z0-9._]+);");
    private static final Pattern JAVA_IMPORT = Pattern.compile("^\\s*import\\s+(?:static\\s+)?([a-zA-Z0-9._*]+);");
    private static final Pattern JAVA_CLASS = Pattern.compile("(?:public|protected|private|static|final|abstract|\\s)*\\bclass\\s+([a-zA-Z0-9_<>]+)");
    private static final Pattern JAVA_INTERFACE = Pattern.compile("(?:public|protected|private|static|final|abstract|\\s)*\\binterface\\s+([a-zA-Z0-9_<>]+)");
    private static final Pattern JAVA_ENUM = Pattern.compile("(?:public|protected|private|static|final|\\s)*\\benum\\s+([a-zA-Z0-9_]+)");
    private static final Pattern JAVA_RECORD = Pattern.compile("(?:public|protected|private|static|final|\\s)*\\brecord\\s+([a-zA-Z0-9_<>]+)");
    private static final Pattern JAVA_ANNOTATION = Pattern.compile("@([a-zA-Z0-9_]+)");

    // Pattern definitions for Python
    private static final Pattern PY_IMPORT_DIRECT = Pattern.compile("^\\s*import\\s+([a-zA-Z0-9_,\\s.]+)");
    private static final Pattern PY_IMPORT_FROM = Pattern.compile("^\\s*from\\s+([a-zA-Z0-9_.]+)\\s+import\\s+([a-zA-Z0-9_,*\\s.]+)");
    private static final Pattern PY_CLASS = Pattern.compile("^\\s*class\\s+([a-zA-Z0-9_]+)(?:\\(([^)]*)\\))?:");
    private static final Pattern PY_DEF = Pattern.compile("^\\s*def\\s+([a-zA-Z0-9_]+)\\s*\\(([^)]*)\\)\\s*(?:->\\s*[^:]+)?:");

    // Pattern definitions for JS/TS
    private static final Pattern JS_IMPORT_ES6 = Pattern.compile("(?:import\\s+(?:.*?\\s+from\\s+)?['\"]([^'\"]+)['\"])");
    private static final Pattern JS_IMPORT_REQUIRE = Pattern.compile("(?:const|let|var)\\s+.*?\\s*=\\s*require\\(['\"]([^'\"]+)['\"]\\)");
    private static final Pattern JS_CLASS = Pattern.compile("\\bclass\\s+([a-zA-Z0-9_]+)");
    private static final Pattern JS_FUNCTION = Pattern.compile("\\bfunction\\s+([a-zA-Z0-9_]+)\\s*\\(([^)]*)\\)");
    private static final Pattern JS_ARROW_FUNCTION = Pattern.compile("(?:const|let|var)\\s+([a-zA-Z0-9_]+)\\s*=\\s*\\(([^)]*)\\)\\s*=>");
    private static final Pattern JS_EXPORT_NAMED = Pattern.compile("\\bexport\\s+(?:default\\s+)?(?:class|function|const|let|var|interface|type)\\s+([a-zA-Z0-9_]+)");

    public CodeMetadataDto extractMetadata(Path filePath) {
        String language = languageDetectorService.detectLanguage(filePath);
        List<String> fileLines = readFileLines(filePath);

        CodeMetadataDto.CodeMetadataDtoBuilder builder = CodeMetadataDto.builder()
                .language(language)
                .imports(new ArrayList<>())
                .exports(new ArrayList<>())
                .classes(new ArrayList<>())
                .interfaces(new ArrayList<>())
                .enums(new ArrayList<>())
                .records(new ArrayList<>())
                .constructors(new ArrayList<>())
                .methods(new ArrayList<>())
                .functions(new ArrayList<>())
                .annotations(new ArrayList<>());

        if (fileLines.isEmpty()) {
            return builder.build();
        }

        switch (language) {
            case "Java":
                extractJavaMetadata(fileLines, builder);
                break;
            case "Python":
                extractPythonMetadata(fileLines, builder);
                break;
            case "JavaScript":
            case "TypeScript":
                extractJsTsMetadata(fileLines, builder);
                break;
            default:
                // No specific parser, basic extraction
                break;
        }

        return builder.build();
    }

    private List<String> readFileLines(Path filePath) {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(filePath.toFile()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        } catch (IOException e) {
            log.warn("Failed to read file lines for metadata extraction: {}", filePath, e);
        }
        return lines;
    }

    private void extractJavaMetadata(List<String> lines, CodeMetadataDto.CodeMetadataDtoBuilder builder) {
        List<String> imports = new ArrayList<>();
        List<String> classes = new ArrayList<>();
        List<String> interfaces = new ArrayList<>();
        List<String> enums = new ArrayList<>();
        List<String> records = new ArrayList<>();
        List<String> constructors = new ArrayList<>();
        List<String> methods = new ArrayList<>();
        Set<String> annotations = new HashSet<>();
        String packageName = null;

        Set<String> declaredTypes = new HashSet<>();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            // Package
            if (packageName == null) {
                Matcher m = JAVA_PACKAGE.matcher(trimmed);
                if (m.find()) {
                    packageName = m.group(1);
                    continue;
                }
            }

            // Imports
            Matcher mImport = JAVA_IMPORT.matcher(trimmed);
            if (mImport.find()) {
                imports.add(mImport.group(1));
                continue;
            }

            // Annotations (exclude inside string literals)
            if (trimmed.startsWith("@")) {
                Matcher mAnn = JAVA_ANNOTATION.matcher(trimmed);
                while (mAnn.find()) {
                    String ann = mAnn.group(1);
                    if (!ann.equals("Override") && !ann.equals("Deprecated") && !ann.equals("SuppressWarnings")) {
                        annotations.add(ann);
                    }
                }
            }

            // Classes, Interfaces, Enums, Records
            Matcher mClass = JAVA_CLASS.matcher(trimmed);
            if (mClass.find()) {
                String className = mClass.group(1);
                classes.add(className);
                declaredTypes.add(className.split("<")[0]); // strip generics
                continue;
            }

            Matcher mInter = JAVA_INTERFACE.matcher(trimmed);
            if (mInter.find()) {
                String interName = mInter.group(1);
                interfaces.add(interName);
                declaredTypes.add(interName.split("<")[0]);
                continue;
            }

            Matcher mEnum = JAVA_ENUM.matcher(trimmed);
            if (mEnum.find()) {
                String enumName = mEnum.group(1);
                enums.add(enumName);
                declaredTypes.add(enumName);
                continue;
            }

            Matcher mRec = JAVA_RECORD.matcher(trimmed);
            if (mRec.find()) {
                String recName = mRec.group(1);
                records.add(recName);
                declaredTypes.add(recName.split("<")[0]);
                continue;
            }
        }

        // Second pass for constructors and methods to avoid false positives and resolve constructor names
        // Pattern for methods: returnType name(params)
        // Skip control statement keywords
        Pattern methodPattern = Pattern.compile(
                "(?:public|protected|private|static|final|synchronized|abstract|default|\\s)+\\b([a-zA-Z0-9_<>|\\[\\]?.,]+)\\s+([a-zA-Z0-9_]+)\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[a-zA-Z0-9_,\\s]+)?\\s*[{;]"
        );

        for (String line : lines) {
            String trimmed = line.trim();

            // Match methods
            Matcher mMethod = methodPattern.matcher(trimmed);
            if (mMethod.find()) {
                String returnType = mMethod.group(1);
                String methodName = mMethod.group(2);
                String params = mMethod.group(3);

                // Filter out common control statements
                if (!methodName.equals("if") && !methodName.equals("for") && !methodName.equals("while") 
                        && !methodName.equals("switch") && !methodName.equals("catch") && !methodName.equals("synchronized")) {
                    methods.add(returnType + " " + methodName + "(" + params.trim() + ")");
                }
                continue;
            }

            // Match constructors: e.g. "public ClassName(" or "ClassName("
            for (String type : declaredTypes) {
                Pattern constructorPattern = Pattern.compile(
                        "(?:public|protected|private|\\s)*\\b" + Pattern.quote(type) + "\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[a-zA-Z0-9_,\\s]+)?\\s*\\{"
                );
                Matcher mConstructor = constructorPattern.matcher(trimmed);
                if (mConstructor.find()) {
                    constructors.add(type + "(" + mConstructor.group(1).trim() + ")");
                }
            }
        }

        builder.packageName(packageName)
                .imports(imports)
                .classes(classes)
                .interfaces(interfaces)
                .enums(enums)
                .records(records)
                .constructors(constructors)
                .methods(methods)
                .annotations(new ArrayList<>(annotations));
    }

    private void extractPythonMetadata(List<String> lines, CodeMetadataDto.CodeMetadataDtoBuilder builder) {
        List<String> imports = new ArrayList<>();
        List<String> classes = new ArrayList<>();
        List<String> functions = new ArrayList<>();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;

            // Direct imports
            Matcher mImportDirect = PY_IMPORT_DIRECT.matcher(trimmed);
            if (mImportDirect.find()) {
                String[] parts = mImportDirect.group(1).split(",");
                for (String part : parts) {
                    imports.add(part.trim());
                }
                continue;
            }

            // From imports
            Matcher mImportFrom = PY_IMPORT_FROM.matcher(trimmed);
            if (mImportFrom.find()) {
                String fromModule = mImportFrom.group(1);
                String[] imported = mImportFrom.group(2).split(",");
                for (String imp : imported) {
                    imports.add(fromModule + "." + imp.trim());
                }
                continue;
            }

            // Class
            Matcher mClass = PY_CLASS.matcher(line); // use line to check indentation if needed, but match is fine
            if (mClass.find()) {
                String className = mClass.group(1);
                String inherits = mClass.group(2);
                classes.add(className + (inherits != null ? "(" + inherits + ")" : ""));
                continue;
            }

            // Def
            Matcher mDef = PY_DEF.matcher(line);
            if (mDef.find()) {
                String funcName = mDef.group(1);
                String params = mDef.group(2);
                functions.add(funcName + "(" + params.trim() + ")");
            }
        }

        builder.imports(imports)
                .classes(classes)
                .functions(functions);
    }

    private void extractJsTsMetadata(List<String> lines, CodeMetadataDto.CodeMetadataDtoBuilder builder) {
        List<String> imports = new ArrayList<>();
        List<String> exports = new ArrayList<>();
        List<String> classes = new ArrayList<>();
        List<String> functions = new ArrayList<>();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

            // ES6 Import
            Matcher mEs6 = JS_IMPORT_ES6.matcher(trimmed);
            if (mEs6.find()) {
                imports.add(mEs6.group(1));
                continue;
            }

            // Require Import
            Matcher mReq = JS_IMPORT_REQUIRE.matcher(trimmed);
            if (mReq.find()) {
                imports.add(mReq.group(1));
                continue;
            }

            // Export Named
            Matcher mExp = JS_EXPORT_NAMED.matcher(trimmed);
            if (mExp.find()) {
                exports.add(mExp.group(1));
            }

            // Class
            Matcher mClass = JS_CLASS.matcher(trimmed);
            if (mClass.find()) {
                classes.add(mClass.group(1));
                continue;
            }

            // Function
            Matcher mFunc = JS_FUNCTION.matcher(trimmed);
            if (mFunc.find()) {
                functions.add(mFunc.group(1) + "(" + mFunc.group(2).trim() + ")");
                continue;
            }

            // Arrow Function
            Matcher mArrow = JS_ARROW_FUNCTION.matcher(trimmed);
            if (mArrow.find()) {
                functions.add(mArrow.group(1) + "(" + mArrow.group(2).trim() + ")");
            }
        }

        builder.imports(imports)
                .exports(exports)
                .classes(classes)
                .functions(functions);
    }
}
