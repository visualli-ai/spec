# Benchmark results

Headless Chromium (software rendering), 1280x800 canvas, synthetic layer of N ideas (every 10th has 1-3 nested layers, every 5th connected, every 10th connector labelled). Frame rates are requestAnimationFrame rates while driving real mouse / wheel input; median of 2 runs per version (range in brackets). `layer ready` is click -> new layer drawn (layout runs in `@visualli/core` and is unchanged). Reproduce: `node scripts/bench.mjs --label <name> --dpr <1|2>`.

Baseline = `@visualli/react` 0.1.7 source (commit 3c557e4, unchanged rendering); After = this branch.


## devicePixelRatio 1

| nodes | metric | baseline | after |
|---|---|---|---|
| 500 | transition fps | 58.2 [57.7-58.6] | 58.8 [58.6-59.1] |
| 500 | pan fps | 55.0 [54.0-56.0] | 56.2 [56.0-56.3] |
| 500 | zoom fps | 55.7 [55.7-55.7] | 55.3 [54.0-56.7] |
| 500 | layer ready ms | 401 [392-410] | 355 [354-356] |
| 2000 | transition fps | 43.8 [43.6-44.0] | 43.0 [42.4-43.6] |
| 2000 | pan fps | 31.1 [29.8-32.5] | 31.5 [30.0-32.9] |
| 2000 | zoom fps | 40.3 [39.6-41.1] | 41.6 [41.2-41.9] |
| 2000 | layer ready ms | 612 [588-636] | 599 [549-649] |
| 10000 | transition fps | 4.3 [4.3-4.4] | 4.5 [4.4-4.7] |
| 10000 | pan fps | 4.4 [4.2-4.5] | 4.9 [4.7-5.1] |
| 10000 | zoom fps | 52.4 [52.1-52.7] | 52.4 [52.3-52.4] |
| 10000 | layer ready ms | 5063 [5038-5088] | 5049 [4964-5134] |

## devicePixelRatio 2

| nodes | metric | baseline | after |
|---|---|---|---|
| 500 | transition fps | 55.8 [55.8-55.8] | 55.8 [55.4-56.3] |
| 500 | pan fps | 46.7 [46.0-47.3] | 45.7 [45.6-45.8] |
| 500 | zoom fps | 37.7 [37.1-38.2] | 37.5 [37.3-37.7] |
| 500 | layer ready ms | 358 [355-361] | 372 [367-376] |
| 2000 | transition fps | 39.7 [39.4-39.9] | 40.4 [40.1-40.6] |
| 2000 | pan fps | 13.5 [13.5-13.5] | 13.9 [13.9-14.0] |
| 2000 | zoom fps | 14.7 [14.5-14.9] | 15.0 [14.9-15.2] |
| 2000 | layer ready ms | 592 [589-594] | 578 [576-579] |
| 10000 | transition fps | 4.5 [4.4-4.5] | 4.3 [4.3-4.3] |
| 10000 | pan fps | 4.0 [4.0-4.1] | 3.9 [3.6-4.3] |
| 10000 | zoom fps | 46.2 [45.8-46.7] | 45.8 [45.8-45.8] |
| 10000 | layer ready ms | 5032 [5010-5055] | 5083 [5051-5115] |


## With the design system's choreography (arrival, step inside / back out, hover)

Same session and machine, dpr 1, 500 and 2000 ideas, the arrival animation finished before pan / zoom are measured. Before = the commit before the choreography, After = with it.

| nodes | metric | before | after |
|---|---|---|---|
| 500 | transition fps | 58.2 | 56.4 |
| 500 | pan fps | 53.7 | 54.7 |
| 500 | zoom fps | 52.6 | 56.0 |
| 2000 | transition fps | 44.0 | 43.2 |
| 2000 | pan fps | 29.2 | 28.5 |
| 2000 | zoom fps | 41.3 | 40.2 |

Large layers skip the expensive parts (more than 150 ideas: fade in together, hover snaps), because each animated frame repaints the whole layer.
