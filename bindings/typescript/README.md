# Visualli TypeScript Bindings

Official TypeScript definitions for the Visualli specification. These bindings provide type-safe interfaces corresponding to the [JSON Schema](../../visualli.schema.json).

## Installation

```bash
npm install @visualli/models
```

## Usage

These types are purely for type-checking and interface implementation. They do not include parsing logic.

```typescript
import { Layer, Node, VisualliFragment } from '@visualli/models';

// Create typed objects
const node: Node = {
  id: 'node-1',
  position: { x: 0, y: 0 },
  data: { title: 'Central Idea' }
};

const layer: Layer = {
  type: 'layer',
  id: 'layer-1',
  level: 0,
  nodes: [node],
  connections: [],
  containers: []
};

// Type narrowing
function processFragment(fragment: VisualliFragment) {
  if (fragment.type === 'meta') {
    console.log('Version:', fragment.version);
  } else if (fragment.type === 'layer') {
    console.log('Layer Level:', fragment.level);
  }
}
```
