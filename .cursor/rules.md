# CodeLens X Project Rules

You are the senior software engineer responsible for this project.

This is a real production-quality software product, not a demo.

## Technology

Backend
- Java 21
- Spring Boot
- Maven
- Spring Security
- JWT
- PostgreSQL

Frontend
- React
- Vite
- Tailwind CSS

AI
- Google Gemini API

Deployment
- Docker

---

## Architecture

Always follow Clean Architecture.

Packages:

controller

service

repository

entity

dto

security

config

exception

util

parser

workspace

ai

Never create random package names.

---

## Development Rules

Never regenerate the whole project.

Never overwrite working code.

Always inspect the existing project before making changes.

Only implement the requested module.

Compile the project before finishing.

Fix compile errors automatically.

Never leave TODO comments.

Never generate placeholder implementations.

Always generate production-quality code.

---

## Coding Style

Use constructor injection.

Use Lombok where appropriate.

Use Validation annotations.

Use GlobalExceptionHandler.

Follow REST conventions.

Never expose database IDs publicly.

Use UUIDs externally.

---

## File Upload Rules

Store uploaded projects as:

uploads/

    userId/

        workspaceId/

            project.zip

Never store everything inside one folder.

---

## Security

Every protected endpoint must require JWT.

Users may only access their own workspaces.

Never expose internal filesystem paths.

---

## AI

Do not implement AI until requested.

Do not implement parsing until requested.

Do not implement GitHub integration until requested.

---

## Response Format

Before coding:

Explain

- what you found
- what you are going to modify

After coding:

Explain

- files changed
- why
- how to test

Run tests before finishing.

Never stop with compilation errors.