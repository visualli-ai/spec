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

## Style Guide

- **Accuracy over brevity**: Don't compress to the point of ambiguity, but avoid filler.
- **Example-driven**: Always include a minimal JSONL snippet when introducing a new entity or property.
- **Backwards Compatibility**: Prefer adding optional fields over breaking changes to existing ones.

## Code of Conduct

Please be respectful and constructive in all interactions. Harassment, trolling, or personal attacks will not be tolerated.

