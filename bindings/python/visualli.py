
from __future__ import annotations
from typing import Annotated, Any, Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, RootModel
from enum import Enum


class Meta(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    type: Literal['meta']
    version: Annotated[str, Field(description="Visualli spec version (e.g. '0.1')")]
    title: str
    created: AwareDatetime | None = None
    lastModified: AwareDatetime | None = None


class Extension(BaseModel):
    type: Literal['extension']
    id: Annotated[
        str,
        Field(
            description="Unique identifier for the extension (e.g., 'semantic-anchors')"
        ),
    ]
    data: Annotated[
        list[Any] | None, Field(description='Data payload for the extension')
    ] = None


class Layout(Enum):
    """
    Spatial arrangement of the layer's nodes on the canvas. 'radial' arranges nodes in a circle around the parent node, 'linear-horizontal' arranges them along a horizontal axis, 'linear-vertical' arranges them along a vertical axis.
    """

    radial = 'radial'
    linear_horizontal = 'linear-horizontal'
    linear_vertical = 'linear-vertical'


class Position(BaseModel):
    x: float
    y: float


class Data(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    label: Annotated[str, Field(description='Label text for the node')]
    summary: Annotated[
        str, Field(description='A short description or summary of the node content')
    ]
    color: str | None = None


class Node(BaseModel):
    id: str
    position: Position
    data: Data


class Style(Enum):
    dashed = 'dashed'
    solid = 'solid'


class Data1(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    label: str
    style: Style | None = 'solid'


class Connection(BaseModel):
    id: str
    from_: Annotated[str, Field(alias='from', description='Source Node ID')]
    to: Annotated[str, Field(description='Target Node ID')]
    data: Data1


class Formation(Enum):
    """
    Visual arrangement of nodes within the container. Uses the same vocabulary as Layer.layout: 'radial' arranges nodes in a circle, 'linear-horizontal' along a horizontal axis, 'linear-vertical' along a vertical axis.
    """

    radial = 'radial'
    linear_horizontal = 'linear-horizontal'
    linear_vertical = 'linear-vertical'


class Style1(Enum):
    """
    Visual style of the container border
    """

    dashed = 'dashed'
    none = 'none'


class Data2(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )
    label: Annotated[str, Field(description='Container Label')]
    formation: Annotated[
        Formation | None,
        Field(
            description="Visual arrangement of nodes within the container. Uses the same vocabulary as Layer.layout: 'radial' arranges nodes in a circle, 'linear-horizontal' along a horizontal axis, 'linear-vertical' along a vertical axis."
        ),
    ] = None
    style: Annotated[
        Style1 | None, Field(description='Visual style of the container border')
    ] = None


class Container(BaseModel):
    id: str
    nodes: Annotated[
        list[str], Field(description='List of Node IDs contained in this group')
    ]
    data: Data2


class Layer(BaseModel):
    type: Literal['layer']
    id: Annotated[str, Field(description='UUID of the layer')]
    level: Annotated[int, Field(description='Hierarchy level (0 is root)', ge=0)]
    parentLayerId: Annotated[
        str | None, Field(description='UUID of the parent layer')
    ] = None
    parentNodeId: Annotated[
        str | None,
        Field(
            description='UUID of the specific node in the parent layer this layer attaches to'
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


class VisualliSpec011(RootModel[Meta | Extension | Layer]):
    root: Annotated[
        Meta | Extension | Layer,
        Field(
            description='Schema for a single line in a .visualli (JSONL) file. Each line must be one of: Meta, Extension, or Layer.',
            discriminator='type',
            title='Visualli Spec 0.1.1',
        ),
    ]
