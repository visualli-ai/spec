from typing import List, Optional, Union, Dict, Any, Literal
from pydantic import BaseModel, Field, UUID4, HttpUrl

"""
Visualli Pydantic Models.

These models are the official Python binding for the Visualli specification.
They are derived from the single source of truth: `visualli.schema.json` located at the root of the spec repo.
"""

class Meta(BaseModel):
    type: Literal["meta"] = "meta"
    version: str = Field(..., description="Visualli spec version (e.g. '0.1')")
    title: str
    created: Optional[str] = Field(None, description="ISO 8601 date-time string")
    lastModified: Optional[str] = Field(None, description="ISO 8601 date-time string")

class Extension(BaseModel):
    type: Literal["extension"] = "extension"
    id: str = Field(..., description="Unique identifier for the extension")
    config: Optional[Dict[str, Any]] = Field(None, description="Configuration parameters")
    data: Optional[List[Any]] = Field(None, description="Data payload")

class Node(BaseModel):
    id: str = Field(..., description="Unique node ID")
    position: Dict[str, float] = Field(..., description="x/y coordinates")
    data: Dict[str, Any] = Field(..., description="Node content/attributes")

class Connection(BaseModel):
    id: str = Field(..., description="Unique connection ID")
    from_node: str = Field(..., alias="from", description="Source node ID")
    to_node: str = Field(..., alias="to", description="Target node ID")
    label: Optional[str] = None

class Container(BaseModel):
    id: str = Field(..., description="Unique container ID")
    label: str = Field(..., description="Container label")
    nodes: List[str] = Field(..., description="List of node IDs in this container")

class Layer(BaseModel):
    type: Literal["layer"] = "layer"
    id: str = Field(..., description="Layer UUID")
    level: int = Field(..., ge=0, description="Hierarchy level (0 is root)")
    parentLayerId: Optional[str] = Field(None, description="Parent layer UUID")
    parentNodeId: Optional[str] = Field(None, description="Attached node UUID")
    description: Optional[str] = None
    nodes: List[Node] = Field(default_factory=list)
    connections: List[Connection] = Field(default_factory=list)
    containers: List[Container] = Field(default_factory=list)

VisualliFragment = Union[Meta, Extension, Layer]
