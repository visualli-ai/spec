# 🐍 Python Bindings

Official [Pydantic v2](https://docs.pydantic.dev/) models for the Visualli specification. These bindings provide a strict, type-safe implementation of the [JSON Schema](https://github.com/visualli-ai/spec/blob/main/visualli.schema.json). Use them to validate, create, and serialize valid `.visualli` data programmatically.

## Installation

Install from [PyPI](https://pypi.org/project/visualli-bindings/) (Python ≥ 3.11):

```bash
pip install visualli-bindings
```

Or, install directly from the repository:

```bash
pip install "git+https://github.com/visualli-ai/spec.git@main#subdirectory=bindings/python"
```

Import as:

```python
from visualli import Meta, Layer, Node, Connection, Container, VisualliSpec011
```

## Usage

The models are purely for data validation and structure definition — they do not include file parsing logic.

### Creating valid objects

```python
from visualli import Layer, Node, Position, Data

layer = Layer(
    id="layer-123",
    level=0,
    nodes=[
        Node(
            id="node-1",
            position=Position(x=0, y=0),
            data=Data(label="Central Idea", summary="The starting point"),
        )
    ],
    connections=[],
    containers=[],
)

print(layer.model_dump_json(indent=2))
```

### Validating raw data

```python
from pydantic import ValidationError
from visualli import Meta

raw_data = {"type": "meta", "version": "0.1", "title": "My Map"}

try:
    meta = Meta(**raw_data)
    print("Valid:", meta.title)
except ValidationError as e:
    print("Invalid:", e.errors())
```

### Parsing a full .visualli file

```python
import json
from visualli import VisualliSpec011

entities = []
with open("document.visualli") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        entities.append(VisualliSpec011.model_validate(obj))

print("Parsed", len(entities), "entities")
```

Source: [`bindings/python/visualli.py`](https://github.com/visualli-ai/spec/blob/main/bindings/python/visualli.py)
