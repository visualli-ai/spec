# Visualli TypeScript Bindings

Official TypeScript definitions for the Visualli specification. These bindings provide type-safe interfaces corresponding to the [JSON Schema](../../visualli.schema.json).

## Installation

```bash
npm install @visualli/bindings
```

## Usage

These types are purely for type-checking and interface implementation. They do not include parsing logic.

```typescript
import { Layer, Node, VisualliFragment } from '@visualli/bindings';

// Create typed objects
const node: Node = {
  id: 'node-1',
  position: { x: 0, y: 0 },
  data: { label: 'Central Idea' }
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

### Accents

A node's `data.color` is either an **accent** - drawn in the reader's palette and theme by every renderer - or any other CSS color, drawn exactly as given. Generators should use accents. They come from the Visualli design system's color rule (never typed out here):

```typescript
import { ACCENTS, type Accent, accentOf } from '@visualli/bindings';

ACCENTS;               // ['teal', 'harbor', 'iris', 'berry', 'coral', 'amber', 'sun', 'stone']
accentOf(' Sun ');     // 'sun'  - names are matched in any case, spaces ignored
accentOf('#b7e7f3');   // null   - a custom color: drawn as given, doesn't follow the reader's palette
```
