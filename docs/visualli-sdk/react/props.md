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
| `controlsPosition` | `'top-right' \| 'bottom-right'` | `'top-right'` | Where the zoom / fit controls sit. `top-right` is the SDK's placement (as before 0.2); `bottom-right` is the design system's (`.vi-map__ctrls`). |
| `layout` | `'auto' \| 'touch' \| 'pointer'` | `'auto'` | Interaction layout. `auto` follows the reader's input and the map's size: touch devices get the design system's bottom-sheet peek and larger controls, pointer devices the floating peek on hover. Narrow maps (< 560px) collapse the depth trail. Force one with `touch` or `pointer`. |
| `chromaticImmersion` | `boolean` | `false` | When enabled, child layers are tinted with their parent idea's topic color (at the design system's `immersion-alpha`), creating visual hierarchy. |
| `width` | `string \| number` | `'100%'` | Canvas width. CSS strings (`'100%'`, `'800px'`) or numbers (pixels). |
| `height` | `string \| number` | `'100%'` | Canvas height. CSS strings (`'100vh'`, `'600px'`) or numbers (pixels). |

!!! info "Rendered by the Visualli design system"
    Colors, fonts, outlines, rings and connectors come from the [design system](https://github.com/visualli-ai/spec/tree/main/design-system) vendored in this repository. A `.visualli` file's free-form node colors are matched to the nearest of the design system's eight topics (teal, harbor, iris, berry, coral, amber, sun, stone), so every idea is drawn with its topic's fill and ring color in every theme.

## 🚀 Performance

| Prop | Type | Default | Description |
|---|---|---|---|
| `useWorker` | `boolean` | `true` | Offload parsing to a Web Worker to keep the UI responsive. Falls back to the main thread automatically if workers are unavailable. |

## 💅 Styling

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Additional CSS class name(s) for the root container. |
| `style` | `React.CSSProperties` | Inline styles merged onto the root container. |
