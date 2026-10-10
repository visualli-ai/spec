# Visualli spec design system

Everything a `.visualli` viewer needs to look and move **exactly** like Visualli: the spec tokens for all 8 themes, the CSS of the spec components, the node / ring / connector geometry, and the fonts.

> Generated from the Visualli design system (v0.2.2). **Don't edit files here** — changes arrive as pull requests from the design system, so the spec and the Visualli apps can never drift apart.

## Use it

```html
<link rel="stylesheet" href="design-system/index.css">
<html data-theme="light"> <!-- light · dark · focus-light · focus-dark · colorsafe-light · colorsafe-dark · contrast-light · contrast-dark -->
```

Comfort attributes on `<html>`: `data-motion="reduced"`, `data-type="readable"`, `data-scale="lg"`.

| Path | What |
| --- | --- |
| `index.css` | Loads fonts, tokens and component CSS in order |
| `tokens/tokens.css` · `tokens.json` | 70 spec tokens for every theme, plus the canvas type styles (`.vi-text-node-label`, `.vi-text-edge-label`, …) |
| `css/spec.css` | Map, nodes, connectors, peek, term cards, depth trail and canvas controls — every rule scoped to `.vi-*`, so it never restyles the page around a map |
| `css/base.css` | Optional page defaults for a full-page viewer: `body`, one focus ring and reduced motion for the whole page |
| `geometry/` | `blob.ts` (`blobPath`, `drawBlob`, `shapeForLevel`, `RINGS`, `edgePath`, `arrowPath`), the six outlines, `geometry.json`, `container.ts` — container hulls and where their names go (`placeContainerLabel`) — `motion.ts`, and `interaction.ts` — how terms, the peek, the touch sheet, zoom and fit behave (hover 250ms / close 300ms, click pins, Escape, the peek's 180ms grace, sheet drag and height, zoom step and limits), `detail.ts` — level of detail (what an idea draws at its on-screen size, when shadows are skipped), and `color.ts` — which topic an idea is drawn in (`topicFor`: a topic name, else the topics in sibling order when there's no color) — the choreography (layer reveal, step inside, back out, hover, reduced motion) as constants and functions, for renderers that animate in their own loop (e.g. canvas) |
| `fonts/` | Caveat (bundled) and the Google Fonts import for Kalam and Atkinson Hyperlegible |

The rules these implement are the **SPEC** rules of the Visualli canvas language. Licenses: see `LICENSE` and `NOTICE.md`.
