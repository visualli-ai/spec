// ─── Selection Store ──────────────────────────────────────────────────────────

import { create } from 'zustand';
import { selectionStore, renderConfigStore } from '@mysdk/core';
import type { ISelectionStore, IRenderConfigStore } from '@mysdk/core';

export const useSelectionStore = create<ISelectionStore>((set, get, store) => {
  selectionStore.subscribe((state) => set(state));
  return selectionStore.getState();
});

// ─── Render Config Store ──────────────────────────────────────────────────────

export const useRenderConfigStore = create<IRenderConfigStore>((set, get, store) => {
  renderConfigStore.subscribe((state) => set(state));
  return renderConfigStore.getState();
});
