# Visualli Python Bindings

Official [Pydantic](https://docs.pydantic.dev/) models for the Visualli specification. These bindings provide a strict, type-safe implementation of the [JSON Schema](../../visualli.schema.json).

## Installation

### From PyPI (Recommended)

```bash
pip install visualli-bindings
```

### From Source

```bash
pip install .
```

## Usage

Use the validated Pydantic models to build, manipulate, and validate Visualli entities:

```python
from visualli import Layer, Node, load_visualli, dump_visualli

# Load and validate an existing .visualli file
entities = load_visualli("path/to/diagram.visualli")

# Or create valid objects programmatically
layer = Layer(
    type="layer",
    id="layer-123",
    level=0,
    nodes=[
        Node(
            id="node-1",
            position={"x": 0, "y": 0},
            data={"label": "Central Idea", "summary": "Core topic"}
        )
    ]
)

# Dump entities to a JSONL file
dump_visualli([layer], "output.visualli")
```

### Accents

A node's `data.color` is either an **accent** - drawn in the reader's palette and theme by every renderer - or any other CSS color, drawn exactly as given. Generators should use accents. They come from the Visualli design system's color rule (never typed out here):

```python
from visualli import ACCENTS, Accent, accent_of

ACCENTS                 # ('teal', 'harbor', 'iris', 'berry', 'coral', 'amber', 'sun', 'stone')
accent_of(" Sun ")      # 'sun'   - names are matched in any case, spaces ignored
accent_of("#b7e7f3")    # None    - a custom color: drawn as given, doesn't follow the reader's palette

# Validate raw data
raw_data = {
    "type": "meta",
    "version": "0.1",
    "title": "My Map"
}
from visualli import Meta
meta = Meta(**raw_data) # Raises ValidationError if invalid
```
