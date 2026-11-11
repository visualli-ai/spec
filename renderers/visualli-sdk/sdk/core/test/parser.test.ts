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
  convertLayerToFlatNodes,
  getNodesForLayer,
  resolveNodeOverlaps,
} from '../src/parser/visualliConverter';
import type { VisualliDocument } from '../src/types/document';
import type { VisualliLayer } from '../src/types/layer';
import type { FlatNode } from '../src/types/mindmap';

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

  describe('multi-line JSONL input cases', () => {
    it('parses JSONL containing multi-line strings with escaped newlines and array labels', () => {
      const multiLineContent = [
        JSON.stringify({ type: 'meta', version: '0.1.0', title: 'Multi-line Title' }),
        JSON.stringify({
          type: 'layer',
          id: 'l0',
          level: 0,
          nodes: [
            {
              id: 'node-multiline',
              position: { x: 0, y: 0 },
              data: {
                label: ['First Line', 'Second Line'],
                summary: 'Paragraph 1\n\nParagraph 2\nLine with "quotes" and symbols: & < >',
              },
            },
          ],
        }),
      ].join('\n');

      const doc = parseVisualliFile(multiLineContent);
      expect(doc.rootLayer?.nodes[0]?.data.summary).toContain('\n\n');

      const nodeMap = convertVisualliToFlatNodes(doc);
      const flat = nodeMap.get('node-multiline');
      expect(flat?.title).toBe('First Line Second Line');
      expect(flat?.description).toContain('Paragraph 1\n\nParagraph 2');
    });

    it('handles multiple consecutive blank lines, leading and trailing whitespace, and skips unknown line types', () => {
      const messyJsonl = `

        {"type": "meta", "version": "0.1.0", "title": "Messy Map"}

        {"type": "comment", "text": "This is a comment line that should be ignored"}

        {"type": "layer", "id": "l0", "level": 0, "nodes": [{"id": "n1", "position": {"x": 0, "y": 0}, "data": {"label": "Root", "summary": "S"}}]}

        {"type": "unrecognized_extension", "data": [1, 2, 3]}

      `;

      const doc = parseVisualliFile(messyJsonl);
      expect(doc.meta.title).toBe('Messy Map');
      expect(doc.layers.size).toBe(1);
      expect(doc.rootLayer?.nodes.length).toBe(1);
    });
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

  describe('missing positions and automatic layout generation', () => {
    it('automatically generates radial layout when node positions are completely missing', () => {
      const doc: VisualliDocument = {
        meta: { type: 'meta', version: '0.1.0', title: 'No Positions' },
        layers: new Map(),
        layersByLevel: new Map(),
        rootLayer: null,
      };

      const layer: VisualliLayer = {
        type: 'layer',
        id: 'l0',
        level: 0,
        layout: 'radial',
        nodes: [
          { id: 'n1', position: undefined as unknown as { x: number; y: number }, data: { label: 'Node 1', summary: 'S1' } },
          { id: 'n2', position: undefined as unknown as { x: number; y: number }, data: { label: 'Node 2', summary: 'S2' } },
          { id: 'n3', position: undefined as unknown as { x: number; y: number }, data: { label: 'Node 3', summary: 'S3' } },
        ],
        connections: [],
        containers: [],
      };
      doc.layers.set('l0', layer);
      doc.rootLayer = layer;

      const flatNodes = convertLayerToFlatNodes(layer, doc);
      expect(flatNodes.length).toBe(3);

      // Verify automatic layout generated distinct, finite coordinates
      const positions = flatNodes.map((n) => ({ x: n.x, y: n.y }));
      expect(positions[0]).not.toEqual(positions[1]);
      expect(positions[1]).not.toEqual(positions[2]);

      for (const pos of positions) {
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }
    });

    it('detects placeholder positions (all {x: 0, y: 0}) and falls back to layout generation', () => {
      const doc: VisualliDocument = {
        meta: { type: 'meta', version: '0.1.0', title: 'Placeholders' },
        layers: new Map(),
        layersByLevel: new Map(),
        rootLayer: null,
      };

      const layer: VisualliLayer = {
        type: 'layer',
        id: 'l0',
        level: 0,
        layout: 'radial',
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Center 1', summary: 'S1' } },
          { id: 'n2', position: { x: 0, y: 0 }, data: { label: 'Center 2', summary: 'S2' } },
          { id: 'n3', position: { x: 0, y: 0 }, data: { label: 'Center 3', summary: 'S3' } },
          { id: 'n4', position: { x: 0, y: 0 }, data: { label: 'Center 4', summary: 'S4' } },
        ],
        connections: [],
        containers: [],
      };
      doc.layers.set('l0', layer);
      doc.rootLayer = layer;

      const flatNodes = convertLayerToFlatNodes(layer, doc);
      // Because all 4 nodes were placed at (0, 0), the converter treats them as placeholders
      // and recalculates the layout. Thus, nodes should not all remain at (0, 0).
      const allZeros = flatNodes.every((n) => n.x === 0 && n.y === 0);
      expect(allZeros).toBe(false);

      const dists = flatNodes.map((n) => Math.hypot(n.x, n.y));
      expect(dists.some((d) => d > 0)).toBe(true);
    });

    it('generates linear-horizontal and linear-vertical layouts correctly when positions are absent', () => {
      const doc: VisualliDocument = {
        meta: { type: 'meta', version: '0.1.0', title: 'Linear Test' },
        layers: new Map(),
        layersByLevel: new Map(),
        rootLayer: null,
      };

      const hLayer: VisualliLayer = {
        type: 'layer',
        id: 'lh',
        level: 0,
        layout: 'linear-horizontal',
        nodes: [
          { id: 'h1', position: { x: 0, y: 0 }, data: { label: 'Step 1', summary: 'First' } },
          { id: 'h2', position: { x: 0, y: 0 }, data: { label: 'Step 2', summary: 'Second' } },
          { id: 'h3', position: { x: 0, y: 0 }, data: { label: 'Step 3', summary: 'Third' } },
        ],
        connections: [],
        containers: [],
      };

      const vLayer: VisualliLayer = {
        type: 'layer',
        id: 'lv',
        level: 0,
        layout: 'linear-vertical',
        nodes: [
          { id: 'v1', position: { x: 0, y: 0 }, data: { label: 'Rank 1', summary: 'First' } },
          { id: 'v2', position: { x: 0, y: 0 }, data: { label: 'Rank 2', summary: 'Second' } },
          { id: 'v3', position: { x: 0, y: 0 }, data: { label: 'Rank 3', summary: 'Third' } },
        ],
        connections: [],
        containers: [],
      };

      const hNodes = convertLayerToFlatNodes(hLayer, doc);
      const vNodes = convertLayerToFlatNodes(vLayer, doc);

      // Horizontal layout: X coordinates are spaced out, Y coordinates are aligned near center (0)
      expect(hNodes[0]!.x).toBeLessThan(hNodes[1]!.x);
      expect(hNodes[1]!.x).toBeLessThan(hNodes[2]!.x);
      expect(hNodes[0]!.y).toBe(0);
      expect(hNodes[1]!.y).toBe(0);

      // Vertical layout: Y coordinates are spaced out, X coordinates are aligned near center (0)
      expect(vNodes[0]!.y).toBeLessThan(vNodes[1]!.y);
      expect(vNodes[1]!.y).toBeLessThan(vNodes[2]!.y);
      expect(vNodes[0]!.x).toBe(0);
      expect(vNodes[1]!.x).toBe(0);
    });

    it('positions single node at origin (0, 0)', () => {
      const doc: VisualliDocument = {
        meta: { type: 'meta', version: '0.1.0', title: 'Single' },
        layers: new Map(),
        layersByLevel: new Map(),
        rootLayer: null,
      };

      const singleLayer: VisualliLayer = {
        type: 'layer',
        id: 's0',
        level: 0,
        layout: 'radial',
        nodes: [{ id: 'solo', position: undefined as unknown as { x: number; y: number }, data: { label: 'Solo', summary: 'Single' } }],
        connections: [],
        containers: [],
      };

      const nodes = convertLayerToFlatNodes(singleLayer, doc);
      expect(nodes.length).toBe(1);
      expect(nodes[0]!.x).toBe(0);
      expect(nodes[0]!.y).toBe(0);
    });

    it('arranges nodes in containers according to container formation when unpositioned', () => {
      const doc: VisualliDocument = {
        meta: { type: 'meta', version: '0.1.0', title: 'Container Formation' },
        layers: new Map(),
        layersByLevel: new Map(),
        rootLayer: null,
      };

      const containerLayer: VisualliLayer = {
        type: 'layer',
        id: 'cl',
        level: 0,
        layout: 'radial',
        nodes: [
          { id: 'c1', position: { x: 0, y: 0 }, data: { label: 'Item 1', summary: 'A' } },
          { id: 'c2', position: { x: 0, y: 0 }, data: { label: 'Item 2', summary: 'B' } },
        ],
        connections: [],
        containers: [
          {
            id: 'cont-1',
            nodes: ['c1', 'c2'],
            data: {
              label: 'Group',
              formation: 'linear-horizontal',
              style: 'dashed',
            },
          },
        ],
      };

      const nodes = convertLayerToFlatNodes(containerLayer, doc);
      expect(nodes.length).toBe(2);
      expect(nodes[0]!.x).not.toBe(nodes[1]!.x);
    });

    it('resolves overlapping nodes apart using resolveNodeOverlaps', () => {
      const overlappingNodes: FlatNode[] = [
        {
          id: 'n1',
          parentId: null,
          x: 0,
          y: 0,
          level: 0,
          title: 'A',
          description: '',
          color: '',
          kind: 'root',
          width: 200,
          height: 100,
          isExpanded: false,
          branchCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'n2',
          parentId: null,
          x: 10,
          y: 10,
          level: 0,
          title: 'B',
          description: '',
          color: '',
          kind: 'node',
          width: 200,
          height: 100,
          isExpanded: false,
          branchCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const initialDist = Math.hypot(overlappingNodes[1]!.x - overlappingNodes[0]!.x, overlappingNodes[1]!.y - overlappingNodes[0]!.y);
      resolveNodeOverlaps(overlappingNodes);
      const newDist = Math.hypot(overlappingNodes[1]!.x - overlappingNodes[0]!.x, overlappingNodes[1]!.y - overlappingNodes[0]!.y);

      expect(newDist).toBeGreaterThan(initialDist);
      expect(newDist).toBeGreaterThanOrEqual(150);
    });
  });
});
