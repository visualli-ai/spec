# Core Overview

`@visualli-sdk/core` contains the framework-agnostic heart of the SDK: the parser, the document model, and every TypeScript type that describes a `.visualli` file.

!!! note
    If you're using React, you don't need to install Core directly — `@visualli-sdk/react` depends on it. This page is a reference for what's inside.

## What it provides

- **Parsing** — turns JSONL text into a typed `VisualliDocument`
- **Document model** — layers, nodes, connections, and containers with full hierarchy support
- **Types** — the building blocks you'll see across the SDK:

| Type | Description |
|---|---|
| `VisualliDocument` | A fully parsed `.visualli` document |
| `VisualliLayer` | A single layer with its nodes, connections, and containers |
| `FlatNode` | A node with position and data (`label`, `summary`) |
| `Connection` | A labeled relationship between two nodes |

## File format

Core implements the `.visualli` format.
