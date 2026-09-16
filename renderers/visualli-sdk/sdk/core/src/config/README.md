# Configuration Module

This module exports all configuration constants and utilities for Visualli.

## Usage

### Import all config (from main package)
```typescript
import { ALL_BLOB_SHAPES, BlobShape, getBlobTypeForLayer, drawBlobPath } from '@visualli/core';
```

### Import from config sub-path (recommended for tree-shaking)
```typescript
import { ALL_BLOB_SHAPES, BlobShape, getBlobTypeForLayer, drawBlobPath } from '@visualli/core/config';
```

### Import specific config file
```typescript
import { 
  ALL_BLOB_SHAPES, 
  BlobShape, 
  BlobPoint,
  ACTIVE_BLOB_TYPES,
  BLOB_LAYER_CONFIG,
  NODE_LAYER_CONFIG,
  BLOB_TEXT_OFFSETS,
  getBlobTypeForLayer,
  drawBlobPath 
} from '@visualli/core/config';
```

## Available Exports

### Blob Shapes (`blobShapes.ts`)
- **`ALL_BLOB_SHAPES`** - Array of 6 predefined blob shapes (Shape 0-5)
- **`ACTIVE_BLOB_TYPES`** - Array of active blob type indices
- **`BLOB_LAYER_CONFIG`** - Configuration for blob rendering layers
- **`NODE_LAYER_CONFIG`** - Configuration for node layer
- **`BLOB_TEXT_OFFSETS`** - Text positioning offsets per shape
- **`getBlobTypeForLayer(level: number)`** - Get blob type for a specific tree level
- **`drawBlobPath(ctx, radiusX, radiusY, blobType)`** - Draw blob path on canvas

### Text Scaling (`textScaling.ts`)
- Text scaling configuration utilities

## Adding New Configuration

To add new configuration modules:

1. Create your config file in `src/config/your-config.ts`
2. Add the export to `src/config/index.ts`:
   ```typescript
   export * from './your-config.js';
   ```
3. The exports will automatically be available via both:
   - `@visualli/core` (main barrel)
   - `@visualli/core/config` (sub-path for better tree-shaking)

No need to update `package.json` or `tsup.config.ts` - they're already configured to handle all config files automatically!
