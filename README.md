# Visualli Specification

> **A modern, streamable, and hierarchical standard for mind mapping and visualization.**

[![Status](https://img.shields.io/badge/Status-Draft-orange)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()

## What is Visualli?

Visualli is an open specification designed to turn structured/unstructured data into human-readable visualizations. Unlike traditional mind map formats that rely on rigid XML or single-file JSON trees, Visualli is built from the ground up for **streaming**, **infinite scaling**, and **lazy loading**.

## Why Visualli?

*   **Streamable (JSONL)**: Parse and render content line-by-line as it's generated. No need to wait for the full response.
*   **Layered Architecture**: Independent layers allow for "Detail on Demand". Load the high-level summary first, then fetch details as the user explores.
*   **Modern & Extensible**: Built-in support for semantic metadata, visual extensions, and custom payloads.

## The Specification

The core specification is divided into conceptual and technical documents:

*   [**Core Concepts**](spec/CORE.md): Understand the philosophy of Layers, Nodes, and the Infinite Canvas.
*   [**Visualli Specification**](spec/SPEC.md): The technical reference for the `.visualli` interchange format.

## Ecosystem & Tooling

We are building a comprehensive ecosystem around the specification:

*   [**Parsers**](parsers/README.md): Reference implementations for TypeScript, Python, and more.
*   [**Renderers**](renderers/README.md): Specifications for Web and Native renderers.
*   [**Extensions**](extensions/README.md): Integrations for VS Code, Obsidian, and other tools.

## Examples

Check out the [examples/](examples/) directory for sample `.visualli` files.

## Contributing

We welcome contributions from the community! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---
*Maintained by the Visualli AI Team.*
