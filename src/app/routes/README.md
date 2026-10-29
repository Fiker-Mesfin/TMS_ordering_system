# Routes

This directory contains TanStack file-based route definitions. Keep route files
focused on URL parameters, metadata, guards, and composing the corresponding
feature page from `src/features`.

Feature-specific page behavior belongs in its feature module. Shared UI and
layout components live in `src/shared`.

`src/routeTree.gen.ts` is generated from these files. Do not edit it manually.
