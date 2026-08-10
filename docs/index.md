# 🏠 Visualli Specification

Welcome to the official specification and SDK documentation for **Visualli** — an open format for interactive, hierarchical, mindmap-style visualizations.

## 📚 What's here

| Section | Description |
|---|---|
| [Core Concepts](core-concepts.md) | The mental model: infinite canvas, layers, nodes, connections, containers |
| [Specification](spec.md) | The `.visualli` file format reference |
| [Visualli SDK](visualli-sdk/index.md) | The official SDK: React renderer and Core |

## 👀 Quick look

```jsonl
{"type":"meta","version":"1.0","title":"Simple Map","created":"2026-01-01T00:00:00Z","lastModified":"2026-01-01T00:00:00Z"}
{"type":"layer","id":"root","level":0,"nodes":[{"id":"node1","position":{"x":0,"y":0},"data":{"label":"Central Idea","summary":"The main concept"}}],"connections":[],"containers":[],"parentLayerId":null,"parentNodeId":null}
```

Render it with one component:

```tsx
import { VisualliRenderer } from '@visualli-sdk/react';

<VisualliRenderer visualliFile="/data/doc.visualli" theme="light" />
```
