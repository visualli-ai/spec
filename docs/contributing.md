# Contributing

Thank you for your interest in improving Visualli! Whether you're fixing a bug, proposing a schema change, or improving the SDK, this guide will help you get started.

## Proposing Changes

Before investing time in code, please open a [GitHub issue](https://github.com/visualli-ai/spec/issues) to discuss your proposal. This ensures alignment and avoids duplicated effort.

**Good topics for proposals:**  
- New entity types or schema properties.  
- New extensions (themes, semantic metadata, rendering hints).  
- Renderer capabilities or standardization.  
- Clarifications and fixes to the specification text.  

## Development Setup

The repository uses a `Makefile` to automate environment setup.

### Prerequisites
- **Python ≥ 3.11** (for Pydantic binding generation)
- **Node.js ≥ 22 & npm** (for TypeScript binding generation)

### Installation
Run the following command to set up your local environment:
```bash
make install
```
This creates a `.venv/`, installs MkDocs tools, and sets up the TypeScript toolchain in `bindings/typescript/`. If your environment gets out of sync, run `make clean-venv && make install`.

## Technical Workflow

### 1. Updating the Spec
`visualli.schema.json` is the **Single Source of Truth**. Any change to the format must be made there first.

1. **Edit the Schema**: Modify `visualli.schema.json`.
2. **Regenerate Bindings**: Run `make generate`. This updates both Python (`visualli.py`) and TypeScript (`types.ts`) bindings automatically.
3. **Update Docs**: Reflect the changes in `docs/spec.md` and `docs/concepts.md`.
4. **Add an Example**: Place a valid `.visualli` file in `examples/` to demonstrate the new feature.

### 2. Bumping Versions
The `VERSION` file at the root is the authoritative version string. To update the version across the entire repo (schema, bindings, and README):
1. Edit the `VERSION` file.
2. Run `make update-version`.

### 3. Previewing Documentation
To verify your documentation changes locally:
```bash
make docs-serve
```

### 4. Changing the SDK: measure performance
Every change to the SDK's performance or visuals must be measured before it's merged. That covers anything in
`@visualli/core` or `@visualli/react` that affects rendering or how a map looks or moves (including design-system
updates), layout, culling, the spatial index, caches, level of detail or the canvas's event handling.

1. **Run the comparison** on your branch:
   ```bash
   npm run bench:compare
   ```
   It builds `origin/main` and your branch, measures both back to back on the same machine (alternating, 3 runs
   each) and prints one before / after table. Compare against another ref with `--base <ref>`; add `--channel chrome`
   if Playwright's Chromium isn't installed.
2. **Decide for yourself how the change performs.** Lower *layer ready* and higher frame rates are better, and 60 fps
   is the display's limit. Changes within ±5% are noise. Explain or fix every row marked *worse*: a slower result can be
   an accepted cost of a visible improvement, but it must be a deliberate decision, never an unnoticed one.
   [`bench/results/README.md`](https://github.com/visualli-ai/spec/blob/main/bench/results/README.md) explains each
   metric.
3. **Put the results in your pull request.** Paste the table into the PR description under a *Performance* heading,
   with a line on each row marked *worse*. Reviewers rely on it to judge the change, and later PRs can refer back to
   it. A PR that changes the SDK's performance or visuals without these results isn't ready for review.

Benchmark numbers only mean something as a pair from the same session on the same machine. Never compare runs from
different days or machines, and don't commit result files (they're git-ignored). The comparison isn't a CI check,
because shared CI machines vary too much to judge frame rates; that's why each PR carries its own measurement.

## Style Guide

- **Accuracy over brevity**: Don't compress to the point of ambiguity, but avoid filler.
- **Example-driven**: Always include a minimal JSONL snippet when introducing a new entity or property.
- **Backwards Compatibility**: Prefer adding optional fields over breaking changes to existing ones.

## Code of Conduct

Please be respectful and constructive in all interactions. Harassment, trolling, or personal attacks will not be tolerated.

