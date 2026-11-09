import { describe, expect, it } from 'vitest';
import {
  parseVisualliFile,
  VisualliParseError,
  getSemanticAnchors,
  getChildLayers,
  countLayersBeneath,
} from '../src/parser/visualliParser';
import {
  convertVisualliToFlatNodes,
  getNodesForLayer,
} from '../src/parser/visualliConverter';

const VALID_SAMPLE_JSONL = [
  JSON.stringify({
    type: 'meta',
    version: '0.1.5',
    title: 'Test Map',
    created: '2026-01-01T00:00:00Z',
  }),
  JSON.stringify({
    type: 'extension',
    id: 'semantic-anchors',
    data: [
      { word: 'Idea', description: 'A concept', knowMoreUrl: 'https://example.com' },
      { badData: true },
    ],
  }),
  JSON.stringify({
    type: 'layer',
    id: 'layer-0',
    level: 0,
    layout: 'radial',
    nodes: [
      {
        id: 'root-1',
        position: { x: 0, y: 0 },
        data: { label: 'Root Concept', summary: 'The starting point' },
      },
    ],
    connections: [],
    containers: [],
  }),
  JSON.stringify({
    type: 'layer',
    id: 'layer-1',
    level: 1,
    parentLayerId: 'layer-0',
    parentNodeId: 'root-1',
    layout: 'linear-horizontal',
    nodes: [
      {
        id: 'child-1',
        position: { x: 100, y: 200 },
        data: { label: 'Child One', summary: 'First branch', color: 'teal' },
      },
      {
        id: 'child-2',
        position: { x: 300, y: 200 },
        data: { label: 'Child Two', summary: 'Second branch', color: 'berry' },
      },
    ],
    connections: [
      {
        id: 'conn-1',
        from: 'child-1',
        to: 'child-2',
        data: { label: 'leads to', style: 'solid' },
      },
    ],
    containers: [],
  }),
].join('\n');

describe('visualliParser', () => {
  it('parses valid JSONL document with meta, extensions and hierarchical layers', () => {
    const doc = parseVisualliFile(VALID_SAMPLE_JSONL);
    expect(doc.meta.title).toBe('Test Map');
    expect(doc.meta.version).toBe('0.1.5');
    expect(doc.layers.size).toBe(2);
    expect(doc.rootLayer?.id).toBe('layer-0');
    expect(doc.layersByLevel.get(0)?.length).toBe(1);
    expect(doc.layersByLevel.get(1)?.length).toBe(1);
  });

  it('handles CRLF and trailing empty lines', () => {
    const crlfContent = VALID_SAMPLE_JSONL.replace(/\n/g, '\r\n') + '\r\n\r\n';
    const doc = parseVisualliFile(crlfContent);
    expect(doc.meta.title).toBe('Test Map');
    expect(doc.layers.size).toBe(2);
  });

  it('extracts semantic anchors safely and filters invalid entries', () => {
    const doc = parseVisualliFile(VALID_SAMPLE_JSONL);
    const anchors = getSemanticAnchors(doc);
    expect(anchors).toEqual([
      { word: 'Idea', description: 'A concept', knowMoreUrl: 'https://example.com' },
    ]);
  });

  it('returns empty array when semantic-anchors extension is absent', () => {
    const minimal = [
      JSON.stringify({ type: 'meta', version: '0.1.0', title: 'Minimal' }),
      JSON.stringify({
        type: 'layer',
        id: 'root',
        level: 0,
        nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'A', summary: 'B' } }],
      }),
    ].join('\n');
    const doc = parseVisualliFile(minimal);
    expect(getSemanticAnchors(doc)).toEqual([]);
  });

  it('throws VisualliParseError on invalid JSON syntax', () => {
    expect(() => parseVisualliFile('{"type": "meta"\n{"bad json')).toThrow(VisualliParseError);
  });

  it('throws VisualliParseError when type field is missing', () => {
    expect(() => parseVisualliFile('{"version": "0.1"}\n')).toThrow(/Missing 'type' field/);
  });

  it('throws VisualliParseError when meta section is missing', () => {
    const noMeta = JSON.stringify({
      type: 'layer',
      id: 'l0',
      level: 0,
      nodes: [],
    });
    expect(() => parseVisualliFile(noMeta)).toThrow(/Missing required meta section/);
  });

  it('throws VisualliParseError when root layer (level 0) is missing', () => {
    const noRoot = [
      JSON.stringify({ type: 'meta', version: '0.1', title: 'T' }),
      JSON.stringify({ type: 'layer', id: 'l1', level: 1, nodes: [] }),
    ].join('\n');
    expect(() => parseVisualliFile(noRoot)).toThrow(/Missing root layer/);
  });

  it('retrieves child layers and counts depth beneath a node correctly', () => {
    const doc = parseVisualliFile(VALID_SAMPLE_JSONL);
    const children = getChildLayers(doc, 'root-1');
    expect(children.length).toBe(1);
    expect(children[0]!.id).toBe('layer-1');

    expect(countLayersBeneath(doc, 'root-1')).toBe(1);
    expect(countLayersBeneath(doc, 'child-1')).toBe(0);
  });
});

describe('visualliConverter', () => {
  it('converts document to flat NodeMap and builds childrenIds index', () => {
    const doc = parseVisualliFile(VALID_SAMPLE_JSONL);
    const nodeMap = convertVisualliToFlatNodes(doc);

    expect(nodeMap.size).toBe(3);
    const root = nodeMap.get('root-1');
    expect(root).toBeDefined();
    expect(root?.title).toBe('Root Concept');
    expect(root?.childrenIds).toEqual(['child-1', 'child-2']);
    expect(root?.isExpanded).toBe(true);
    expect(root?.branchCount).toBe(1);

    const child1 = nodeMap.get('child-1');
    expect(child1?.parentId).toBe('root-1');
    expect(child1?.childrenIds).toEqual([]);
    expect(child1?.isExpanded).toBe(false);
  });

  it('preserves file positions when explicit coordinates are supplied', () => {
    const doc = parseVisualliFile(VALID_SAMPLE_JSONL);
    const nodeMap = convertVisualliToFlatNodes(doc);
    expect(nodeMap.get('child-1')?.x).toBe(100);
    expect(nodeMap.get('child-1')?.y).toBe(200);
    expect(nodeMap.get('child-2')?.x).toBe(300);
    expect(nodeMap.get('child-2')?.y).toBe(200);
  });

  it('extracts nodes for a specific layer using getNodesForLayer', () => {
    const doc = parseVisualliFile(VALID_SAMPLE_JSONL);
    const l1Nodes = getNodesForLayer(doc, 'layer-1');
    expect(l1Nodes.length).toBe(2);
    expect(l1Nodes.map((n) => n.id)).toEqual(['child-1', 'child-2']);

    const missing = getNodesForLayer(doc, 'non-existent');
    expect(missing).toEqual([]);
  });
});
