# 📖 Concepts

The core mental model of Visualli. The Specification page covers the exact JSONL format; this page explains *what* the pieces are and *why* they exist.

## The Infinite Canvas

Visualli treats information as living on an infinite 2D canvas. Content is not forced into a rigid tree — positions are free-form, but hierarchical relationships between layers and nodes are always preserved.

## Layers and Levels

### Layers

The fundamental unit of organization is the **Layer**. A layer is a self-contained collection of nodes, connections, and containers:

- **Self-contained.** Everything a layer needs to render its content lives inside it.
- **Independent.** Layers can be loaded, shown, or hidden individually — enabling "detail on demand": show the summary first, fetch deeper layers only as the user zooms or expands.
- **Hierarchical.** A layer can be a child of another layer, attached to a specific node in the parent layer.

### Levels

Multiple layers can sit at the same **Level**. Think of a level as a "floor" in a building:

- **Depth.** Level 0 is the root summary, Level 1 is the next drill-down, and so on.
- **Grouping.** Several independent layers can share one level; the user switches between them (like apartments on one floor), but only one is visible at a time.
- **Navigation.** Users progress from lower levels (overview) to higher levels (detail).

### How Layers and Levels relate

```mermaid
graph TD
    %% LEVEL 0: THE FOUNDATION
    subgraph L0 [**LEVEL 0**]
        direction LR
        subgraph LA [Layer A]
            direction LR
            A1((N)) 
            A2((N))
        end
    end

    %% LEVEL 1: LAYER B ON LEFT, LAYER C ON RIGHT
    subgraph L1 [**LEVEL 1**]
        direction LR
        subgraph LB [Layer B]
            direction LR
            B1((N)) --> B2((N)) --> B3((N))
        end
        subgraph LC [Layer C]
            direction LR
            C1((N)) --> C2((N))
        end
    end

    %% LEVEL 2: LAYER D -> LAYER E -> LAYER F
    subgraph L2 [**LEVEL 2**]
        direction LR
        subgraph LD [Layer D]
            direction LR
            D1((N)) --> D2((N)) --> D3((N)) --> D4((N))
        end
        subgraph LE [Layer E]
            direction LR
            E1((N))
        end
        subgraph LF [Layer F]
            direction LR
            F1((N)) --> F2((N))
        end
    end

    %% CONNECTIONS
    A1 -.-> LB
    A2 -.-> LC
    
    B1 -.-> LD
    B2 -.-> LE
    B3 -.-> LF

    %% STYLING
    style L0 stroke-dasharray: 5 5
    style L1 stroke-dasharray: 5 5
    style L2 stroke-dasharray: 5 5
```

## Entities (mental model)

These are the building blocks. See the Specification page for exact JSONL fields and validation rules.

| Entity | What it represents | Key properties |
|---|---|---|
| **Node** | A single piece of information (an idea, a fact, a term). | ID, position `(x, y)`, payload (`label`, `summary`, `color`, …) |
| **Connection** | A directed relationship between two nodes in the same layer. | `from` → `to` node IDs, label and style (solid / dashed) |
| **Container** | A visual grouping of nodes in the same layer. | List of node IDs, label, formation (radial / linear / …), border style |
| **Extension** | An optional payload for behavior or metadata that isn't in the core schema. | String ID + free-form `data[]` — examples: semantic anchors, themes, visual effects |

### Extension example

Extensions are identified by ID, and their payload shape is up to the extension's contract. For instance, a `semantic-anchors` extension links terms to descriptions:

```json
{
  "type": "extension",
  "id": "semantic-anchors",
  "data": [
    {
      "word": "atmosphere",
      "description": "The envelope of gases surrounding the earth or another planet.",
      "knowMoreUrl": null
    },
    {
      "word": "water circulation",
      "description": "The continuous movement of water on, above and below the surface of the Earth.",
      "knowMoreUrl": null
    }
  ]
}
```
