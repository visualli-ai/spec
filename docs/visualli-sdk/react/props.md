# ⚙️ Reference

All props accepted by `<VisualliRenderer />`.

## 📥 Data Source

| Prop | Type | Description |
|---|---|---|
| `visualliString` | `string` | Raw JSONL string containing the Visualli document. Pass the string as-is — no preprocessing needed. |
| `visualliFile` | `File \| string` | A `File` object (from `<input type="file">`) or a string path to a `.visualli` file. The component fetches, reads, and parses it automatically. |

!!! warning "One source only"
    You must provide **either** `visualliString` **or** `visualliFile` — not both.

## 🎨 Visual

| Prop | Type | Default | Description |
|---|---|---|---|
| `theme` | `ThemeName \| 'auto' \| 'focus' \| 'colorsafe' \| 'contrast'` | `'light'` | One of the 8 design-system themes: `light`, `dark`, `focus-light`, `focus-dark`, `colorsafe-light`, `colorsafe-dark`, `contrast-light`, `contrast-dark`. A family name (`focus`, `colorsafe`, `contrast`) picks its light or dark member from the reader's color scheme; `'auto'` follows `prefers-color-scheme` live. `'light'`, `'dark'` and `'auto'` are the pre-0.2 values and keep working. |
| `comfort` | `{ readableType?, largerText?, reducedMotion? }` | — | Reader comfort settings. `readableType` swaps the handwritten label faces for Atkinson Hyperlegible, `largerText` enlarges labels and UI text, `reducedMotion` (`true`, `false` or `'system'`) removes transitions and reveal animations. |
| `respectForcedColors` | `boolean` | `true` | Switch to the matching high-contrast theme when the browser forces colors (Windows high contrast and similar). |
| `fontBaseUrl` | `string` | jsDelivr copy of the package | Directory URL that serves `Caveat-Variable.ttf` (shipped in the package's `fonts/` folder). Set it when you self-host. |
| `loadWebFonts` | `boolean` | `true` | Load Kalam and Atkinson Hyperlegible from Google Fonts. Set `false` if your page already loads them. |
| `reveal` | `'gradual' \| 'instant'` | `'gradual'` | How a layer arrives. `gradual`: ideas bloom in one by one, then connectors draw, as the design system's motion describes. `instant`: everything fades in together (what `reducedMotion` does). |
| `controlsPosition` | `'top-right' \| 'bottom-right'` | `'top-right'` | Where the zoom controls (− and +) sit. `top-right` is the design system's placement (`.vi-map__ctrls`, opposite the depth trail); `bottom-right` moves them to the bottom corner, above the touch sheet while it's open. |
| `showControls` | `boolean` | `true` | Show the zoom controls (− and +; there is no Fit button - every layer opens fitted, and ⌘ / Ctrl + 0 fits). `false` hides only the strip, for small embeds where it takes too much room (the design system's inline MCP card has none); wheel, pinch and keyboard zoom keep working. |
| `layout` | `'auto' \| 'touch' \| 'pointer'` | `'auto'` | Interaction layout. `auto` follows the reader's input and the map's size: touch devices get the design system's bottom-sheet peek and larger controls, pointer devices the floating peek on hover. Narrow maps (< 560px) collapse the depth trail. Force one with `touch` or `pointer`. |
| `gestures` | `'page' \| 'cooperative'` | `'page'` | How touch is shared with the page. `page`: the map takes every touch gesture - one finger pans it, two pinch - and the page never scrolls or zooms under it. `cooperative`: for a map inside a scrolling page (an article, docs) - one finger scrolls the page, two fingers move and pinch the map. Before 0.2.14 one finger scrolled the page unless `app` was set; `app` is deprecated (`app={false}` still means `cooperative`). |
| `chromaticImmersion` | `boolean` | `true` | Child layers are tinted with the fill of the idea you stepped into (its accent or custom color, at the design system's `immersion-alpha`), so you always know whose inside you are in. Pass `false` to turn it off. |
| `width` | `string \| number` | `'100%'` | Canvas width. CSS strings (`'100%'`, `'800px'`) or numbers (pixels). |
| `height` | `string \| number` | `'100%'` | Canvas height. CSS strings (`'100vh'`, `'600px'`) or numbers (pixels). |

!!! info "Rendered by the Visualli design system"
    Colors, fonts, outlines, rings and connectors come from the [design system](https://github.com/visualli-ai/spec/tree/main/design-system) vendored in this repository. A node's `color` that names one of the design system's eight accents (teal, harbor, iris, berry, coral, amber, sun, stone) is drawn with that accent's fill and ring in the reader's palette and theme; any other color (e.g. a hex) is drawn exactly as given, with a slightly darker ring, in every theme - it isn't matched to an accent. Ideas without a color take the accents in turn.

## 🧭 Navigation

Step inside an idea by clicking or tapping it (or *Step inside* on its peek). Go back a layer with the depth trail, Escape or Backspace, or by **double-clicking** (mouse) or **double-tapping** (touch) the empty canvas. At the top layer a double-click or double-tap gives a small bump instead. Zooming never changes layer.

| Prop | Type | Default | Description |
|---|---|---|---|
| `layerPath` | `string[]` | — | The layer to show, as the ids of the layers from the root down (the root may be left out). The map follows it whenever it changes - stepping in or out with the usual motion when it's one step away, otherwise going straight there; a path that no longer fits the map stops at the deepest layer that still exists. Leave it out and the map keeps its own place. |
| `onLayerPathChange` | `(path: string[], via) => void` | — | Called after every change of layer (not the layer the map opens on) with the path from the root and how it happened: `'step-in'`, `'trail'`, `'gesture'` (double-click, double-tap, the canvas's Back menu), `'key'` (Escape, Backspace) or `'host'` (`layerPath` changed). Use the two together to keep the browser's history in step with the map. |

## 🚀 Performance

| Prop | Type | Default | Description |
|---|---|---|---|
| `useWorker` | `boolean` | `true` | Offload parsing to a Web Worker to keep the UI responsive. Falls back to the main thread automatically if workers are unavailable. |

## 💅 Styling

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Additional CSS class name(s) for the root container. |
| `style` | `React.CSSProperties` | Inline styles merged onto the root container. |
