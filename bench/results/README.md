# Performance benchmark

The SDK's benchmark (`scripts/bench.mjs`) opens a synthetic map in headless Chrome at 1280×800 and measures, for layers of
500, 2,000 and 10,000 ideas (every 10th with layers inside, every 5th connected, every 10th connector labelled):

| metric | what it is | better |
|---|---|---|
| **layer ready** | click on an idea → its layer drawn on screen (ms) | lower |
| **arrival (transition)** | frame rate while a layer arrives (the design system's bloom; big layers fade in together) | higher |
| **pan** | frame rate while dragging the map with the mouse | higher |
| **zoom** | frame rate while zooming with the wheel | higher |

Frame rates are `requestAnimationFrame` rates; 60 fps is the display's limit.

## Compare, don't collect

Absolute numbers depend on the machine, the browser, whether it renders on the GPU and what else the machine is doing:
the same code can measure twice as fast on a quiet machine as on a busy one. A number on its own means nothing; **only a
before / after pair measured back to back on the same machine does.** So results aren't committed here: run the
comparison and paste its table into the PR.

```bash
npm run bench:compare
```

It checks `origin/main` out into a temporary worktree, builds both sides, runs them alternately (3 runs each by default)
and prints the medians with the change. Options: `--base <git ref>`, `--runs 5`, `--sizes 500,2000`, `--dpr 2` (a Retina
screen: four times the pixels to paint), `--channel chrome` (the installed Chrome, when Playwright's Chromium isn't
installed). Changes within ±5% are noise; anything flagged *worse* needs a look before merging.

`npm run bench` measures only this checkout (one table, written to `bench/results/<label>.json`, which git ignores).

## When to run it

Any change to rendering, culling, the spatial index, layout, caches, level of detail or the canvas's event handling
(see `CLAUDE.md` › *Checks before pushing*). It isn't a CI check: shared CI machines vary too much to judge frame rates.
