// The design system's colour rule (geometry/color.ts → topicFor): topic names
// resolve to their topic, missing colours take the topics in sibling order, and
// free-form colours go to the nearest topic.

import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS, TOKENS, topicForColor, topicFromName, parseVisualliFile, convertLayerToFlatNodes } from '../src/index';

describe('topic names', () => {
  it('every topic name (any case, with spaces) resolves to that topic', () => {
    for (const t of TOPICS) {
      expect(topicForColor(t, 'x')).toBe(t);
      expect(topicForColor(` ${t.toUpperCase()} `, 'y')).toBe(t);
    }
  });
  it('anything else is not a name', () => {
    expect(topicFromName('#87f2f8')).toBeNull();
    expect(topicFromName('turquoise')).toBeNull();
    expect(topicFromName(undefined)).toBeNull();
  });
});

describe('missing colours cycle the topics in sibling order', () => {
  it('index 0..7 → the topics in order, then around again', () => {
    expect(Array.from({ length: 10 }, (_, i) => topicForColor(undefined, `n${i}`, i))).toEqual([...TOPICS, TOPICS[0], TOPICS[1]]);
    expect(topicForColor('  ', 'n', 3)).toBe(TOPICS[3]);
  });
  it('a hex colour still resolves to its nearest topic, whatever the index', () => {
    expect(topicForColor('#faada5', 'n', 0)).toBe('berry');
  });
});

describe('through the parser', () => {
  const layer = (nodes: Array<[string, string | undefined]>) => JSON.stringify({
    type: 'layer', id: 'l0', level: 0, layout: 'radial', connections: [], containers: [],
    nodes: nodes.map(([id, color]) => ({ id, position: { x: 0, y: 0 }, data: { label: id, ...(color === undefined ? {} : { color }) } })),
  });
  const meta = JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' });
  it('named topics are drawn in that topic; uncoloured siblings get different topics', () => {
    const doc = parseVisualliFile([meta, layer([['a', 'teal'], ['b', 'Berry'], ['c', undefined], ['d', undefined], ['e', undefined]])].join('\n'));
    const nodes = convertLayerToFlatNodes(doc.rootLayer!, doc);
    expect(nodes.map((n) => n.topic)).toEqual(['teal', 'berry', TOPICS[2], TOPICS[3], TOPICS[4]]);
    expect(nodes[0]!.color).toBe(TOKENS.light['topic-teal']); // a named colour is carried as its topic's fill
  });
});

// Once the design system's color.ts reaches design-system/ (a design-system release + sync), compare results.
const dsColor = resolve(__dirname, '../../../../../design-system/geometry/color.ts');
describe.skipIf(!existsSync(dsColor))('matches the design system (geometry/color.ts)', () => {
  it('names and missing colours resolve exactly like topicFor', async () => {
    const DS = await import(dsColor);
    expect([...TOPICS]).toEqual([...DS.TOPIC_ORDER]);
    for (const c of [...TOPICS, ' Teal ', 'SUN', undefined, '']) for (let i = 0; i < 10; i++) {
      const want = DS.topicFor(c, i);
      if (want) expect(topicForColor(c, 'seed', i)).toBe(want);
    }
  });
});
