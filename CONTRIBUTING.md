# Contributing to Visualli Spec

Thank you for your interest in improving the Visualli Specification! We aim to create a modern, flexible standard for creating visuallis that are natural to the brain.

## How to Contribute

### 1. Proposing Changes
*   **Issues**: Start by opening an issue to discuss your proposal.

### 2. Updating the Spec
*   The **Single Source of Truth** is `visualli.schema.json` at the root of the repository.
*   Please ensure any changes to the schema are reflected in `docs/spec.md`.  
*   We love examples! Please add valid `.visualli` files to the `examples/` directory to demonstrate new features or edge cases.  
*   If you are adding a new concept, consider creating a new file in `docs/` or updating `docs/core.md`.  

## Style Guide
*   **Clarity**: Keep language simple and unambiguous.
*   **Examples**: Always provide JSONL examples for new schema definitions.

## Code of Conduct
Please be respectful and constructive in all interactions.

## Development Workflow

We provide tools to automate the generation of bindings and manage versioning.

### Prerequisites

- Python 3.11.0+
- Node.js 22 & npm

### Setup

Use the Makefile to create a Python 3.11 virtual environment and install all dependencies:
```bash
make install
```
This command will:
*   Check for Python 3.11.
*   Create a local `.venv` using Python 3.11.
*   Install Python and Node.js dependencies.

> **Note**: If you encounter issues with an existing environment, run `make clean-venv` first.

### Generating Bindings

When you modify `visualli.schema.json`, you must regenerate the Python and TypeScript bindings.

```bash
make generate
```

### Releasing a New Version

To bump the version (e.g., from 0.1.0 to 0.1.1):

1.  Update the `VERSION` file in the root.
2.  Run the update script:
    ```bash
    make update-version
    ```
3.  Commit the changes.
