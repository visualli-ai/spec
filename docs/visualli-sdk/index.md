# Visualli SDK

The official SDK for rendering `.visualli` documents. It's split into focused packages so you only use what you need:

| Package | Docs | Purpose |
|---|---|---|
| `@visualli-sdk/react` | [React](react/getting-started.md) | 🎨 Ready-to-use React component — `<VisualliRenderer />` |
| `@visualli-sdk/core` | [Core](core/overview.md) | 🧱 Parsing, types, and document model |

!!! tip "Which one do I need?"
    Building a React app? Install `@visualli-sdk/react` — it brings `@visualli-sdk/core` along automatically. Use Core directly only if you're working without React (e.g., Node.js tooling or another framework).
