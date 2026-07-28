# Chromatic Immersion & Multi-line Text Features

## Quick Start

### Enable Chromatic Background
```tsx
<VisualliRenderer
  visualliString={data}
  chromaticImmersion={true}
  theme="dark"
/>
```

## Features

### 1. Chromatic Immersion Background
- **Root layer**: Shows base background color
- **Child layers**: Display parent node's color with 15% transparency
- **Effect**: Background color smoothly transitions as you navigate between layers

### 2. Multi-line Text Wrapping
- Long text automatically wraps to multiple lines
- Font size scales intelligently based on text length
- Text wider than 200px gets reduced font size for better wrapping
- No ellipsis truncation - full text is always visible

## API

### Props
```typescript
interface VisualliRendererProps {
  chromaticImmersion?: boolean; // Enable chromatic background (default: false)
  // ... other props
}
```

## Implementation Details

### Chromatic Background Logic
- Root layer (level 0) → base color (`#141412` dark / `#F0EDE6` light)
- Child layers → parent node's `data.color` with 15% opacity overlay
- Automatically updates on layer navigation

### Text Wrapping Logic
- **Short text** (width ≤ 200px): Normal font size (16-32px)
- **Long text** (width > 200px): Aggressive font scaling for 2-line layout
- Min font: 14px, Max font: 32px, Base: 28px
- Formula: `scaleFactor = max(0.5, min(1, 200 / estimatedWidth))`

## Files Modified
- `packages/sdk-react/src/VisualliCanvas.tsx` - Background color logic
- `packages/sdk-react/src/VisualliRenderer.tsx` - Props interface
- `packages/sdk-react/src/components/KonvaNode.tsx` - Text rendering

## Build Status
✅ TypeScript compilation successful  
✅ No errors  
✅ Ready to use
