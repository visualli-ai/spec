# Generated — do not edit

Everything here is written by `scripts/gen-design-system.mjs` from the repo's root `design-system/` folder (the
Visualli design system, synced from visualli.ai). `npm run build` regenerates it; `npm run check:design` fails if it's
stale. To change anything here, change the design system upstream.

| Here | From | What |
|---|---|---|
| `designSystem.ts` | `design-system/tokens`, `css/spec.css` | Tokens for the 8 themes, metrics, type styles, `CANVAS_STYLE` |
| `geometry/*.ts` | `design-system/geometry/*.ts` | The rule modules, copied verbatim (shapes, motion, sizing, colors, containers, interaction, detail) |

`@visualli/react` has its own `src/generated/specCss.ts` (the spec CSS as strings, injected at runtime).
