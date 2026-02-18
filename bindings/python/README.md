# Visualli Python Bindings

Official [Pydantic](https://docs.pydantic.dev/) models for the Visualli specification. These bindings provide a strict, type-safe implementation of the [JSON Schema](../../visualli.schema.json).

## Installation

```bash
pip install .
# OR
pip3 install .
```

## Usage

These models are purely for data validation and structure definition. They do not include file parsing logic.

```python
from visualli import Layer, Node

# Create valid objects
layer = Layer(
    id="layer-123",
    level=0,
    nodes=[
        Node(
            id="node-1",
            position={"x": 0, "y": 0},
            data={"label": "Central Idea"}
        )
    ]
)

print(layer.model_dump_json(indent=2))

# Validate raw data
raw_data = {
    "type": "meta",
    "version": "0.1",
    "title": "My Map"
}
from visualli import Meta
meta = Meta(**raw_data) # Raises ValidationError if invalid
```
