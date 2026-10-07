// The design system's colour rule (geometry/color.ts): topic names resolve to
// their topic, missing colours take the topics in sibling order, and any other
// colour is custom — drawn as given, with a darker ring (customColor). Nothing is
// snapped to a topic.

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { TOPICS, TOKENS, ideaColor, ideaStyle, topicFromName, parseVisualliFile, convertLayerToFlatNodes } from '../src/index';

describe('topic names', () => {
  it('every topic name (any case, with spaces) resolves to that topic', () => {
    for (const t of TOPICS) {
      expect(ideaColor(t, 0)).toEqual({ topic: t, custom: null });
      expect(ideaColor(` ${t.toUpperCase()} `, 5).topic).toBe(t);
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
    expect(Array.from({ length: 10 }, (_, i) => ideaColor(undefined, i).topic)).toEqual([...TOPICS, TOPICS[0], TOPICS[1]]);
    expect(ideaColor('  ', 3).topic).toBe(TOPICS[3]);
  });
});

describe('custom colours are drawn as given', () => {
  it('a hex colour is its own fill, with the fill × CUSTOM.ringShade as the ring', () => {
    expect(ideaColor('#faada5', 0)).toEqual({ topic: null, custom: { fill: '#faada5', ring: '#c38781' } });
  });
  it('even a hex equal to a topic fill stays custom (no snapping)', () => {
    expect(ideaColor(TOKENS.light['topic-teal']!, 0).topic).toBeNull();
  });
  it('a colour without a darker shade (not 6-digit hex) rings with the edge token', () => {
    expect(ideaStyle('dark', ideaColor('rebeccapurple', 0))).toEqual({ fill: 'rebeccapurple', ring: TOKENS.dark['edge'] });
  });
  it('topics follow the theme; custom colours do not', () => {
    expect(ideaStyle('dark', { topic: 'teal' })).toMatchObject({ fill: TOKENS.dark['topic-teal'], ring: TOKENS.dark['topic-teal-ring'] });
    expect(ideaStyle('dark', ideaColor('#faada5', 0)).fill).toBe(ideaStyle('light', ideaColor('#faada5', 0)).fill);
  });
});

describe('through the parser', () => {
  const layer = (nodes: Array<[string, string | undefined]>) => JSON.stringify({
    type: 'layer', id: 'l0', level: 0, layout: 'radial', connections: [], containers: [],
    nodes: nodes.map(([id, color]) => ({ id, position: { x: 0, y: 0 }, data: { label: id, ...(color === undefined ? {} : { color }) } })),
  });
  const meta = JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' });
  it('named topics are drawn in that topic; uncoloured siblings get different topics; custom colours stay custom', () => {
    const doc = parseVisualliFile([meta, layer([['a', 'teal'], ['b', 'Berry'], ['c', undefined], ['d', undefined], ['e', '#b7e7f3']])].join('\n'));
    const nodes = convertLayerToFlatNodes(doc.rootLayer!, doc);
    expect(nodes.map((n) => n.topic ?? null)).toEqual(['teal', 'berry', TOPICS[2], TOPICS[3], null]);
    expect(nodes[4]!.custom).toEqual({ fill: '#b7e7f3', ring: '#8fb4be' });
    expect(nodes[0]!.color).toBe('teal'); // the colour as authored
  });
});

// The design system's color.ts (vendored in design-system/): the SDK must resolve every colour exactly like it.
const dsColor = resolve(__dirname, '../../../../../design-system/geometry/color.ts');
describe('matches the design system (geometry/color.ts)', () => {
  it('every colour resolves exactly like topicFor / customColor', async () => {
    const DS = await import(dsColor);
    expect([...TOPICS]).toEqual([...DS.TOPIC_ORDER]);
    for (const c of [...TOPICS, ' Teal ', 'SUN', undefined, '', '#b7e7f3', '#FFF', 'red']) for (let i = 0; i < 10; i++) {
      const want = DS.topicFor(c, i);
      expect(ideaColor(c, i)).toEqual(want ? { topic: want, custom: null } : { topic: null, custom: DS.customColor(c) });
    }
  });
});
