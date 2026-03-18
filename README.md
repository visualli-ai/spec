<table border="0">
  <tr>
    <td width="200" style="border: none;">
      <img src=".github/assets/V-spec-logo.png" alt="Visualli Logo" width="200">
    </td>
    <td style="border: none; vertical-align: middle;">
      <h1>Visualli Specification</h1>
      <p><b>A modern, streamable, and hierarchical standard for mind mapping and visualization.</b></p>
      <p>
        <a href="#"><img src="https://img.shields.io/badge/Version-0.1.1-orange?style=for-the-badge" alt="Version"></a></br>
        <a href="#"><img src="https://img.shields.io/badge/License-MIT-blue" alt="License"></a>
        <a href="https://github.com/visualli-ai/spec/actions/workflows/ci-cd.yml"><img src="https://github.com/visualli-ai/spec/actions/workflows/ci-cd.yml/badge.svg" alt="CI/CD"></a>
      </p>
    </td>
  </tr>
</table>

## What is Visualli?

Visualli is an open standard designed to turn structured/unstructured data into human-readable visualizations. Unlike traditional mind map formats that rely on rigid XML or single-file JSON trees, Visualli is built from the ground up for **streaming**, **infinite scaling**, and **lazy loading**.

## Why Visualli?

-  **Streamable (JSONL)**: Parse and render content line-by-line as it's generated. No need to wait for the full response.
-  **Layered Architecture**: Independent layers allow for "Detail on Demand". Load the high-level summary first, then fetch details as the user explores.
-  **Hierarchical**: Supports deeply nested structures while maintaining a flat serialization format.
-  **Modern & Extensible**: Built-in support for semantic metadata, visual extensions, and custom payloads.

## The Specification

The **Single Source of Truth** for the format is the JSON Schema:
*   [**visualli.schema.json**](visualli.schema.json)

The documentation is available at:

*   [**Visualli Specification**](docs/spec.md): The comprehensive guide to Visualli concepts and the interchange format.

## Ecosystem & Tooling

We are building a comprehensive ecosystem around the specification:

*   **Bindings**: Reference implementations for [TypeScript](bindings/typescript/README.md) and [Python](bindings/python/README.md).
*   [**Renderers**](renderers/README.md): Specifications for Web and Native renderers.
*   [**Extensions**](extensions/README.md): Integrations for VS Code, Obsidian, and other tools.

## Examples

Check out the [examples/](examples/) directory for sample `.visualli` files.

## Development

This repository includes a `Makefile` to automate common tasks:

*   `make install`: Install development dependencies (Python & Node.js).
*   `make generate`: Regenerate Python and TypeScript bindings from the schema.
*   `make update-version`: Propagate the version from `VERSION` file to all files and regenerate bindings.


## Importing Bindings

You can import the Visualli bindings by installing them directly from this repository via Git (for now) and via Package Managers (in future).

### Python

1. Install directly via `pip` (requires Python 3.11+):

```bash
pip install "git+https://github.com/visualli-ai/spec.git@main#subdirectory=bindings/python"
```
> For usage, refer to [bindings/python/README.md](bindings/python/README.md)

### TypeScript

1. Clone the repository:
   ```bash
   git clone https://github.com/visualli-ai/spec.git
   ```
2. Install the bindings package from the local path:
   ```bash
   npm install ./spec/bindings/typescript
   ```
> For usage, refer to [bindings/typescript/README.md](bindings/typescript/README.md)

## Contributing

We welcome contributions from the community! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---
*Maintained by the Visualli Crew.*
