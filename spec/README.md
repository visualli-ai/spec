# Visualli Specification

**Status**: Draft (v0.1)  
**Latest Update**: 2026-01-22

## Overview

Visualli is a modern, streamable, and hierarchical format for visualizing complex information structures. It is designed to bridge the gap between structured / unstructured knowledge and human-readable visualizations.

## Core Design Principles

1.  **Streamable**: The format is designed to be parsed and rendered incrementally (JSONL).
2.  **Layered**: Information is organized in independent layers, allowing for lazy loading and focus management.
3.  **Hierarchical**: Supports deeply nested structures while maintaining a flat serialization format.
4.  **Extensible**: Built-in support for extensions and metadata enrichment.

## Specification Documents

*   [**Core Concepts**](./CORE.md): Understanding Layers, Nodes, and Connections.
*   [**Visualli Specification**](./SPEC.md): The technical specification of the .visualli format.
