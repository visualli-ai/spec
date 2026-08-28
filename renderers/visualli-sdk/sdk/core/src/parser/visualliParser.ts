// ─── .visualli File Parser ────────────────────────────────────────────────────
//
// Reads JSONL (JSON Lines) format and parses into a structured VisualliDocument.

import type { VisualliDocument } from '../types/document.js';
import type { VisualliMeta } from '../types/meta.js';
import type { VisualliLayer } from '../types/layer.js';
import type { Layer } from '../types/schema.js';

/**
 * Convert schema Layer to VisualliLayer by ensuring required arrays exist.
 */
function toVisualliLayer(schemaLayer: Layer): VisualliLayer {
  return {
    type: 'layer',
    id: schemaLayer.id,
    level: schemaLayer.level,
    parentLayerId: schemaLayer.parentLayerId,
    parentNodeId: schemaLayer.parentNodeId,
    layout: schemaLayer.layout,
    nodes: schemaLayer.nodes ?? [],
    connections: schemaLayer.connections ?? [],
    containers: schemaLayer.containers ?? [],
  };
}

export class VisualliParseError extends Error {
  constructor(message: string, public readonly lineNumber?: number) {
    super(message);
    this.name = 'VisualliParseError';
  }
}

/**
 * Parse a .visualli file content (JSONL format) into a VisualliDocument.
 *
 * @throws VisualliParseError on malformed input
 */
export function parseVisualliFile(content: string): VisualliDocument {
  const lines = content.trim().split('\n');

  const doc: VisualliDocument = {
    meta: null as unknown as VisualliMeta,
    layers: new Map(),
    layersByLevel: new Map(),
    rootLayer: null,
  };

  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    if (!line.trim()) continue;

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch (err) {
      throw new VisualliParseError(
        `Failed to parse JSON at line ${lineNumber}: ${err}`,
        lineNumber,
      );
    }

    if (!obj['type']) {
      throw new VisualliParseError(
        `Missing 'type' field at line ${lineNumber}`,
        lineNumber,
      );
    }

    switch (obj['type']) {
      case 'meta':
        doc.meta = obj as unknown as VisualliMeta;
        break;

      case 'layer': {
        // Convert schema Layer to VisualliLayer
        const schemaLayer = obj as unknown as Layer;
        const layer = toVisualliLayer(schemaLayer);
        
        doc.layers.set(layer.id, layer);

        if (!doc.layersByLevel.has(layer.level)) {
          doc.layersByLevel.set(layer.level, []);
        }
        doc.layersByLevel.get(layer.level)!.push(layer);

        if (layer.level === 0) {
          doc.rootLayer = layer;
        }
        break;
      }

      default:
        // Unknown type — silently skip
        break;
    }
  }

  if (!doc.meta) throw new VisualliParseError('Missing required meta section');
  if (!doc.rootLayer) throw new VisualliParseError('Missing root layer (level 0)');

  return doc;
}

export async function fetchAndParseVisualli(url: string): Promise<VisualliDocument> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return parseVisualliFile(await response.text());
}

/**
 * Parse .visualli JSONL data as returned from the MongoDB `visualli` field.
 *
 * @throws VisualliParseError
 */
export function parseVisualliFromMongoDB(visualliJsonl: string): VisualliDocument {
  if (!visualliJsonl || typeof visualliJsonl !== 'string') {
    throw new VisualliParseError('Invalid visualli data: expected a JSONL string');
  }
  const trimmed = visualliJsonl.trim();
  if (!trimmed) throw new VisualliParseError('Empty visualli data from MongoDB');
  return parseVisualliFile(trimmed);
}

/**
 * Parse a .visualli file from a browser `File` object.
 * (Browser-only – requires `FileReader`.)
 */
export function loadVisualliFileFromFile(file: File): Promise<VisualliDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(parseVisualliFile(e.target?.result as string));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ── Tree Helpers ──────────────────────────────────────────────────────────────

/** Return all layers whose `parentNodeId` matches the given node ID. */
export function getChildLayers(
  doc: VisualliDocument,
  nodeId: string,
): VisualliLayer[] {
  const result: VisualliLayer[] = [];
  for (const layer of doc.layers.values()) {
    if (layer.parentNodeId === nodeId) result.push(layer);
  }
  return result;
}

/**
 * Count the maximum depth of layers beneath a node (its "magnitude").
 * Returns 0 when the node has no child layers.
 */
export function countLayersBeneath(
  doc: VisualliDocument,
  nodeId: string,
  visited = new Set<string>(),
): number {
  if (visited.has(nodeId)) return 0;
  visited.add(nodeId);

  const children = getChildLayers(doc, nodeId);
  if (children.length === 0) return 0;

  let maxDepth = 0;
  for (const layer of children) {
    let depth = 1;
    for (const node of layer.nodes) {
      depth = Math.max(depth, 1 + countLayersBeneath(doc, node.id, visited));
    }
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}
