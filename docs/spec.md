# Visualli Specification

Visualli uses **JSONL (JSON Lines)** as its primary interchange format. 
Each line in a `.visualli` file represents a distinct entity (`Meta`, `Extension`, or `Layer`).

> **Source of Truth**: The formal validation rules are defined in [visualli.schema.json](../visualli.schema.json).

## File Structure

A valid `.visualli` file consists of a sequence of JSON objects, separated by newlines (`\n`).

```jsonl
{"type": "meta", ...}
{"type": "extension", ...}
{"type": "layer", ...}
{"type": "layer", ...}
```

## Schema Definitions

### 1. Meta Object
Must be the first line of the file.

```typescript
interface Meta {
  type: "meta";
  version: string;       // e.g., "2.0"
  title: string;         // Project Title
  created: string;       // ISO 8601 Date
  lastModified: string;  // ISO 8601 Date
}
```

### 2. Extension Object
Optional. Defines enabled extensions or configurations.

```typescript
interface Extension {
  type: "extension";
  id: string;            // Extension ID (e.g., "semantic-anchors")
  config?: object;       // Configuration object
  data?: any[];          // Extension-specific data
}
```

### 3. Layer Object
The core content unit.

```typescript
interface Layer {
  type: "layer";
  id: string;            // UUID
  level: number;         // Depth level (0 = root)
  parentLayerId?: string; // UUID of parent layer (optional for root)
  parentNodeId?: string; // UUID of parent node in parent layer (optional)
  description?: string;
  nodes?: Node[];
  connections?: Connection[];
  containers?: Container[];
}

interface Node {
  id: string;            // UUID
  position: { x: number; y: number };
  data: {
    label: string;       // Label text
    summary: string;     // Short description/summary
    color?: string;
  };
}

interface Connection {
  id: string;            // UUID
  from: string;          // Source Node ID
  to: string;            // Target Node ID
  data: {
    label: string;
    style?: 'dashed' | 'solid';
  };
}

interface Container {
  id: string;            // UUID
  nodes: string[];       // Array of Node IDs
  data: {
    label: string;       // Container Label
    formation?: 'natural' | 'linear' | 'circular' | 'tree';
    style?: 'dashed' | 'none';
  };
}
```

## Example

```jsonl
{"type": "meta", "version": "2.0", "title": "Example Map", "created": "2024-05-21T10:00:00Z", "lastModified": "2024-05-22T15:30:00Z"}
{"type": "layer", "id": "layer-1", "level": 0, "description": "Root", "nodes": [{"id": "n1", "position": {"x":0,"y":0}, "data": {"label": "Root Node", "summary": "The starting point"}}]}
```
