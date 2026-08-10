// ─── Node Store ───────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { FlatNode, NodeMap } from '@visualli-sdk/core';

export interface INodeStore {
  nodes: NodeMap;
  childrenIndex: Map<string | null, Set<string>>;

  setNodes: (nodes: NodeMap) => void;
  updateNode: (nodeId: string, updates: Partial<FlatNode>) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  addNode: (node: FlatNode) => void;
  removeNode: (nodeId: string) => void;
  setNodeExpanded: (nodeId: string, expanded: boolean) => void;

  getNode: (nodeId: string) => FlatNode | undefined;
  getChildren: (parentId: string | null) => FlatNode[];
  getChildrenIds: (parentId: string | null) => Set<string>;
  getAllNodes: () => FlatNode[];
}

function buildChildrenIndex(nodes: NodeMap): Map<string | null, Set<string>> {
  const index = new Map<string | null, Set<string>>();
  for (const node of nodes.values()) {
    const pid = node.parentId ?? null;
    if (!index.has(pid)) index.set(pid, new Set());
    index.get(pid)!.add(node.id);
  }
  return index;
}

export const useNodeStore = create<INodeStore>((set, get) => ({
  nodes: new Map(),
  childrenIndex: new Map(),

  setNodes: (nodes) =>
    set({ nodes, childrenIndex: buildChildrenIndex(nodes) }),

  updateNode: (nodeId, updates) =>
    set((s) => {
      const node = s.nodes.get(nodeId);
      if (!node) return s;
      const next = new Map(s.nodes);
      next.set(nodeId, { ...node, ...updates, updatedAt: new Date() });
      return { nodes: next };
    }),

  updateNodePosition: (nodeId, x, y) =>
    set((s) => {
      const node = s.nodes.get(nodeId);
      if (!node || (node.x === x && node.y === y)) return s;
      const next = new Map(s.nodes);
      next.set(nodeId, { ...node, x, y });
      return { nodes: next };
    }),

  addNode: (node) =>
    set((s) => {
      const next = new Map(s.nodes);
      next.set(node.id, node);
      const idx = new Map(s.childrenIndex);
      const pid = node.parentId ?? null;
      if (!idx.has(pid)) idx.set(pid, new Set());
      idx.get(pid)!.add(node.id);
      return { nodes: next, childrenIndex: idx };
    }),

  removeNode: (nodeId) =>
    set((s) => {
      const node = s.nodes.get(nodeId);
      if (!node) return s;
      const next = new Map(s.nodes);
      next.delete(nodeId);
      const idx = new Map(s.childrenIndex);
      const pid = node.parentId ?? null;
      if (idx.has(pid)) {
        const set = new Set(idx.get(pid)!);
        set.delete(nodeId);
        if (set.size === 0) idx.delete(pid); else idx.set(pid, set);
      }
      return { nodes: next, childrenIndex: idx };
    }),

  setNodeExpanded: (nodeId, expanded) =>
    set((s) => {
      const node = s.nodes.get(nodeId);
      if (!node) return s;
      const next = new Map(s.nodes);
      next.set(nodeId, { ...node, isExpanded: expanded, updatedAt: new Date() });
      return { nodes: next };
    }),

  getNode: (nodeId) => get().nodes.get(nodeId),
  getChildren: (pid) => {
    const { nodes, childrenIndex } = get();
    return Array.from(childrenIndex.get(pid) ?? []).map(id => nodes.get(id)!).filter(Boolean);
  },
  getChildrenIds: (pid) => get().childrenIndex.get(pid) ?? new Set(),
  getAllNodes: () => Array.from(get().nodes.values()),
}));
