# ⚙️ Props Reference

All props accepted by `<VisualliRenderer />`.

## 📥 Data Source

| Prop | Type | Description |
|---|---|---|
| `visualliString` | `string` | Raw JSONL string containing the Visualli document. Pass the string as-is — no preprocessing needed. |
| `visualliFile` | `File \| string` | A `File` object (from `<input type="file">`) or a string path to a `.visualli` file. The component fetches, reads, and parses it automatically. |

!!! warning "One source only"
    You must provide **either** `visualliString` **or** `visualliFile` — not both.

## 🎨 Visual Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Color theme. `'auto'` follows the system preference via `prefers-color-scheme` and updates live when it changes. |
| `chromaticImmersion` | `boolean` | `false` | When enabled, child layers display their parent node's color as a semi-transparent background, creating visual hierarchy. |
| `width` | `string \| number` | `'100%'` | Canvas width. CSS strings (`'100%'`, `'800px'`) or numbers (pixels). |
| `height` | `string \| number` | `'100%'` | Canvas height. CSS strings (`'100vh'`, `'600px'`) or numbers (pixels). |

## 🚀 Performance

| Prop | Type | Default | Description |
|---|---|---|---|
| `useWorker` | `boolean` | `true` | Offload parsing to a Web Worker to keep the UI responsive. Falls back to the main thread automatically if workers are unavailable. |

## 💅 Styling

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Additional CSS class name(s) for the root container. |
| `style` | `React.CSSProperties` | Inline styles merged onto the root container. |
