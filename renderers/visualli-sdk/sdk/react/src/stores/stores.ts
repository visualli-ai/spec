// ─── Selection Store ──────────────────────────────────────────────────────────

import { create } from 'zustand';
import { selectionStore, renderConfigStore } from '@visualli-sdk/core';
import type { ISelectionStore, IRenderConfigStore } from '@visualli-sdk/core';

export const useSelectionStore = create<ISelectionStore>((set, get, store) => {
  selectionStore.subscribe((state) => set(state));
  return selectionStore.getState();
});

// ─── Render Config Store ──────────────────────────────────────────────────────

export const useRenderConfigStore = create<IRenderConfigStore>((set, get, store) => {
  renderConfigStore.subscribe((state) => set(state));
  return renderConfigStore.getState();
});
