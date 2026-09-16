# Blob Shapes Usage Examples

## Import Options

### Option 1: Import from main package
```typescript
import { ALL_BLOB_SHAPES, BlobShape, getBlobTypeForLayer } from '@visualli/core';
```

### Option 2: Import from config sub-path (recommended)
```typescript
import { ALL_BLOB_SHAPES, BlobShape, getBlobTypeForLayer } from '@visualli/core/config';
```

## Usage Examples

### Example 1: Access All Shapes
```typescript
import { ALL_BLOB_SHAPES, BlobShape } from '@visualli/core/config';

// Get total number of available shapes
console.log(`Available shapes: ${ALL_BLOB_SHAPES.length}`); // 6

// Access a specific shape
const shape0: BlobShape = ALL_BLOB_SHAPES[0];
console.log(`Shape 0 has ${shape0.length} points`); // 10 points

// Iterate through all shapes
ALL_BLOB_SHAPES.forEach((shape, index) => {
  console.log(`Shape ${index}: ${shape.length} points`);
});
```

### Example 2: Use Shape Points
```typescript
import { ALL_BLOB_SHAPES, BlobPoint } from '@visualli/core/config';

const shape = ALL_BLOB_SHAPES[1]; // Use Shape 1 (Blob 2)

// Access individual points
shape.forEach((point: BlobPoint) => {
  console.log(`Point: (${point.x}, ${point.y})`);
});

// Scale the shape to your desired size
const radiusX = 100;
const radiusY = 80;
const scaledPoints = shape.map(p => ({
  x: p.x * radiusX,
  y: p.y * radiusY
}));
```

### Example 3: Render to Canvas
```typescript
import { drawBlobPath } from '@visualli/core/config';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

// Center the canvas context
ctx.translate(canvas.width / 2, canvas.height / 2);

// Draw blob shape 2 with custom radius
const radiusX = 150;
const radiusY = 120;
const blobType = 2;

drawBlobPath(ctx, radiusX, radiusY, blobType);

// Style and render
ctx.fillStyle = '#4CAF50';
ctx.fill();
ctx.strokeStyle = '#2E7D32';
ctx.lineWidth = 3;
ctx.stroke();
```

### Example 4: Render to SVG
```typescript
import { ALL_BLOB_SHAPES } from '@visualli/core/config';

function blobShapeToSVGPath(
  shape: BlobShape, 
  radiusX: number, 
  radiusY: number
): string {
  const points = shape.map(p => ({
    x: p.x * radiusX,
    y: p.y * radiusY
  }));

  let path = '';
  const last = points[points.length - 1];
  const first = points[0];
  
  // Start at midpoint between last and first
  path += `M ${(last.x + first.x) / 2} ${(last.y + first.y) / 2}`;
  
  // Quadratic bezier curves through each control point
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    path += ` Q ${curr.x} ${curr.y} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
  }
  
  path += ' Z'; // Close path
  return path;
}

// Use it
const shape = ALL_BLOB_SHAPES[3];
const pathData = blobShapeToSVGPath(shape, 100, 100);

const svg = `
  <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(150, 150)">
      <path d="${pathData}" fill="#4CAF50" stroke="#2E7D32" stroke-width="3"/>
    </g>
  </svg>
`;
```

### Example 5: Render to PDF (using pdf-lib)
```typescript
import { PDFDocument, rgb } from 'pdf-lib';
import { ALL_BLOB_SHAPES } from '@visualli/core/config';

async function addBlobToPDF(blobType: number) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  
  const shape = ALL_BLOB_SHAPES[blobType];
  const radiusX = 80;
  const radiusY = 60;
  const centerX = 300;
  const centerY = 200;
  
  // Scale points
  const points = shape.map(p => ({
    x: centerX + p.x * radiusX,
    y: centerY + p.y * radiusY
  }));
  
  // Draw path using quadratic bezier curves
  const last = points[points.length - 1];
  const first = points[0];
  
  page.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    
    // Note: pdf-lib uses quadraticCurveTo
    page.drawQuadraticCurve({
      controlPoint: { x: curr.x, y: curr.y },
      endPoint: { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 },
      color: rgb(0.3, 0.69, 0.31),
      thickness: 3,
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
```

### Example 6: Dynamic Level-based Shape Selection
```typescript
import { getBlobTypeForLayer, ALL_BLOB_SHAPES } from '@visualli/core/config';

// Get appropriate shape for different tree levels
function renderNodeAtLevel(level: number) {
  const blobType = getBlobTypeForLayer(level);
  const shape = ALL_BLOB_SHAPES[blobType];
  
  console.log(`Level ${level} uses shape ${blobType} with ${shape.length} points`);
  
  // Render the shape...
  return shape;
}

// Example: render a tree
for (let level = 0; level < 5; level++) {
  renderNodeAtLevel(level);
}
```

### Example 7: Custom Shape Processor
```typescript
import { ALL_BLOB_SHAPES, BlobShape, BlobPoint } from '@visualli/core/config';

class BlobShapeRenderer {
  private shapes: ReadonlyArray<BlobShape>;
  
  constructor() {
    this.shapes = ALL_BLOB_SHAPES;
  }
  
  getShape(index: number): BlobShape {
    return this.shapes[index] || this.shapes[0];
  }
  
  getAllShapes(): ReadonlyArray<BlobShape> {
    return this.shapes;
  }
  
  getShapeCount(): number {
    return this.shapes.length;
  }
  
  getScaledPoints(
    shapeIndex: number, 
    scaleX: number, 
    scaleY: number
  ): BlobPoint[] {
    const shape = this.getShape(shapeIndex);
    return shape.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY
    }));
  }
  
  getBoundingBox(shapeIndex: number): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const shape = this.getShape(shapeIndex);
    
    return shape.reduce((bbox, point) => ({
      minX: Math.min(bbox.minX, point.x),
      maxX: Math.max(bbox.maxX, point.x),
      minY: Math.min(bbox.minY, point.y),
      maxY: Math.max(bbox.maxY, point.y)
    }), {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity
    });
  }
}

// Usage
const renderer = new BlobShapeRenderer();
console.log(`Total shapes available: ${renderer.getShapeCount()}`);

const bbox = renderer.getBoundingBox(0);
console.log('Shape 0 bounding box:', bbox);
```

## Available Shape Types

- **Shape 0 (Blob 1)**: 10 points - Simple, rounded blob
- **Shape 1 (Blob 2)**: 62 points - Complex, highly detailed organic shape
- **Shape 2 (Blob 3)**: 40 points - Moderate complexity
- **Shape 3 (Blob 4)**: 40 points - Moderate complexity
- **Shape 4 (Blob 5)**: 40 points - Vertically flipped version of Shape 3
- **Shape 5 (Blob 6)**: 44 points - Complex with specific offset

## Configuration Constants

```typescript
import { 
  BLOB_LAYER_CONFIG, 
  NODE_LAYER_CONFIG,
  BLOB_TEXT_OFFSETS,
  ACTIVE_BLOB_TYPES 
} from '@visualli/core/config';

// Layer configurations for rendering multiple blob layers
console.log(BLOB_LAYER_CONFIG); // 3 layers with opacity, rotation, scale, etc.

// Node layer configuration
console.log(NODE_LAYER_CONFIG); // Main node rendering config

// Text offsets for each shape
console.log(BLOB_TEXT_OFFSETS); // [0, 0, 0, 0, 0, -0.10]

// Active shape indices
console.log(ACTIVE_BLOB_TYPES); // [0, 1, 2, 3, 4, 5]
```
