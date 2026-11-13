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

A map can also be big the other way: **few ideas per layer, but many layers**. For a map of 1,000 layers (8 ideas each,
every idea opening the next layer breadth-first, so most ideas carry rings and the deepest layers are five steps down;
`--layers` takes smaller counts too, never more than 1,000) it measures:

| metric | what it is | better |
|---|---|---|
| **parse the file** | `parseVisualliFile` on the whole map (ms) | lower |
| **step inside** | click on the root's idea → its layer on screen (ms) | lower |
| **step deeper** | click on an idea with a layer inside → that layer on screen, three times, median (ms) | lower |
| **back out** | Escape → the parent layer on screen (ms) | lower |

## Compare, don't collect

Absolute numbers depend on the machine, the browser, whether it renders on the GPU and what else the machine is doing:
the same code can measure twice as fast on a quiet machine as on a busy one. A number on its own means nothing; **only a
before / after pair measured back to back on the same machine does.** So results aren't committed here: run the
comparison and paste its table into the PR.

```bash
npm run bench:compare
```

It checks `origin/main` out into a temporary worktree, builds both sides, runs them alternately (3 runs each by default)
and prints the medians with the change. Options: `--base <git ref>`, `--runs 5`, `--sizes 500,2000`, `--layers 1000` (at most 1,000; `none` skips the many-layers map), `--dpr 2` (a Retina
screen: four times the pixels to paint), `--channel chrome` (the installed Chrome, when Playwright's Chromium isn't
installed). Changes within ±5% are noise; anything flagged *worse* needs a look before merging. `--raw` prints every run's latency numbers: *layer ready* in particular is bimodal (a run lands on one frame boundary or a later one, about 40 ms apart at 500 ideas), so a flag there needs the raw runs, or an A/A run (`--base HEAD`: the same code on both sides) to compare with.

`npm run bench` measures only this checkout (one table, written to `bench/results/<label>.json`, which git ignores).

## When to run it

Any change to rendering, culling, the spatial index, layout, caches, level of detail or the canvas's event handling
(see `CLAUDE.md` › *Checks before pushing*). It isn't a CI check: shared CI machines vary too much to judge frame rates.
