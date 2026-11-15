
from __future__ import annotations

from enum import Enum
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, RootModel


class Meta(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["meta"]
    version: Annotated[str, Field(description="Visualli spec version (e.g. '0.1')")]
    title: str
    created: AwareDatetime | None = None
    lastModified: AwareDatetime | None = None


class Extension(BaseModel):
    type: Literal["extension"]
    id: Annotated[
        str,
        Field(
            description="Unique identifier for the extension (e.g., 'semantic-anchors')"
        ),
    ]
    data: Annotated[
        list[Any] | None, Field(description="Data payload for the extension")
    ] = None


class Layout(Enum):
    """
    Spatial arrangement of the layer's nodes on the canvas. 'radial' arranges nodes in a circle around the parent node, 'linear-horizontal' arranges them along a horizontal axis, 'linear-vertical' arranges them along a vertical axis.
    """

    radial = "radial"
    linear_horizontal = "linear-horizontal"
    linear_vertical = "linear-vertical"


class Position(BaseModel):
    x: float
    y: float


class Data(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    label: Annotated[str, Field(description="Label text for the node")]
    summary: Annotated[
        str, Field(description="A short description or summary of the node content")
    ]
    color: Annotated[
        str | None,
        Field(
            description="The idea's color. Either an accent - one of teal, harbor, iris, berry, coral, amber, sun, stone (any case) - which every renderer draws in the reader's palette and theme (Standard, Focus, Color-safe and High contrast, light and dark), or any other CSS color such as a hex ('#b7e7f3'), drawn exactly as given in every palette. Omit it and renderers give siblings different accents in turn. The accents are exported by the bindings (ACCENTS).",
            examples=["teal", "#b7e7f3"],
        ),
    ] = None


class Node(BaseModel):
    id: str
    position: Position
    data: Data


class Style(Enum):
    dashed = "dashed"
    solid = "solid"


class Data1(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    label: str
    style: Style | None = "solid"


class Connection(BaseModel):
    id: str
    from_: Annotated[str, Field(alias="from", description="Source Node ID")]
    to: Annotated[str, Field(description="Target Node ID")]
    data: Data1


class Formation(Enum):
    """
    Visual arrangement of nodes within the container. Uses the same vocabulary as Layer.layout: 'radial' arranges nodes in a circle, 'linear-horizontal' along a horizontal axis, 'linear-vertical' along a vertical axis.
    """

    radial = "radial"
    linear_horizontal = "linear-horizontal"
    linear_vertical = "linear-vertical"


class Style1(Enum):
    """
    Visual style of the container border
    """

    dashed = "dashed"
    none = "none"


class Data2(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    label: Annotated[str, Field(description="Container Label")]
    formation: Annotated[
        Formation | None,
        Field(
            description="Visual arrangement of nodes within the container. Uses the same vocabulary as Layer.layout: 'radial' arranges nodes in a circle, 'linear-horizontal' along a horizontal axis, 'linear-vertical' along a vertical axis."
        ),
    ] = None
    style: Annotated[
        Style1 | None, Field(description="Visual style of the container border")
    ] = None


class Container(BaseModel):
    id: str
    nodes: Annotated[
        list[str], Field(description="List of Node IDs contained in this group")
    ]
    data: Data2


class Layer(BaseModel):
    type: Literal["layer"]
    id: Annotated[str, Field(description="UUID of the layer")]
    level: Annotated[int, Field(description="Hierarchy level (0 is root)", ge=0)]
    parentLayerId: Annotated[
        str | None, Field(description="UUID of the parent layer")
    ] = None
    parentNodeId: Annotated[
        str | None,
        Field(
            description="UUID of the specific node in the parent layer this layer attaches to"
        ),
    ] = None
    layout: Annotated[
        Layout | None,
        Field(
            description="Spatial arrangement of the layer's nodes on the canvas. 'radial' arranges nodes in a circle around the parent node, 'linear-horizontal' arranges them along a horizontal axis, 'linear-vertical' arranges them along a vertical axis."
        ),
    ] = None
    nodes: Annotated[list[Node] | None, Field(validate_default=True)] = []
    connections: list[Connection] | None = None
    containers: Annotated[list[Container] | None, Field(validate_default=True)] = []


class VisualliSpec(RootModel[Meta | Extension | Layer]):
    root: Annotated[
        Meta | Extension | Layer,
        Field(
            description="Schema for a single line in a .visualli (JSONL) file. Each line must be one of: Meta, Extension, or Layer.",
            discriminator="type",
            title="VisualliSpec",
        ),
    ]


# ── Accents ───────────────────────────────────────────────────────────────────
# Generated by scripts/gen-bindings-accents.mjs from design-system/geometry/color.ts - don't edit.
#
# A node's `data.color` may name one of these accents (any case, surrounding spaces ignored): every renderer draws it
# in the reader's palette and theme. Any other color (e.g. "#b7e7f3") is drawn exactly as given, in every palette.

Accent = Literal["teal", "harbor", "iris", "berry", "coral", "amber", "sun", "stone"]

#: The 8 accents, in the order renderers give them to ideas without a color (by position among siblings).
ACCENTS: tuple[Accent, ...] = ("teal", "harbor", "iris", "berry", "coral", "amber", "sun", "stone")


def accent_of(color: str | None) -> Accent | None:
    """The accent a node color names, or None (no color, or a custom color such as a hex)."""
    if not color:
        return None
    c = color.strip().lower()
    return c if c in ACCENTS else None  # type: ignore[return-value]


# ── JSONL File Helpers ────────────────────────────────────────────────────────
import json
from pathlib import Path
from typing import Sequence, TextIO, Union

VisualliEntity = Union[Meta, Extension, Layer]


def loads_visualli(content: str) -> list[VisualliEntity]:
    """Parse and validate a .visualli JSONL string into a list of Visualli entities."""
    entities: list[VisualliEntity] = []
    for line_num, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError as err:
            raise ValueError(f"Line {line_num} contains invalid JSON: {err}") from err
        item = VisualliSpec.model_validate(data).root
        entities.append(item)
    return entities


def load_visualli(source: Union[str, Path, TextIO]) -> list[VisualliEntity]:
    """Load and validate a .visualli JSONL file from a file path, Path object, or file-like buffer."""
    if isinstance(source, (str, Path)):
        with open(source, "r", encoding="utf-8") as f:
            return loads_visualli(f.read())
    return loads_visualli(source.read())


def dumps_visualli(entities: Sequence[Union[VisualliEntity, BaseModel]]) -> str:
    """Serialize a sequence of Visualli entities to a .visualli JSONL string."""
    lines: list[str] = []
    for entity in entities:
        if isinstance(entity, BaseModel):
            lines.append(entity.model_dump_json(exclude_none=True))
        else:
            lines.append(json.dumps(entity))
    return "\n".join(lines) + ("\n" if lines else "")


def dump_visualli(
    entities: Sequence[Union[VisualliEntity, BaseModel]],
    target: Union[str, Path, TextIO],
) -> None:
    """Write a sequence of Visualli entities to a .visualli JSONL file or file-like buffer."""
    output = dumps_visualli(entities)
    if isinstance(target, (str, Path)):
        with open(target, "w", encoding="utf-8") as f:
            f.write(output)
    else:
        target.write(output)

