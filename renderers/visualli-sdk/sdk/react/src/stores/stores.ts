// ─── Selection Store ──────────────────────────────────────────────────────────

import { create } from 'zustand';
import { selectionStore, renderConfigStore } from '@visualli/core';
import type { ISelectionStore, IRenderConfigStore } from '@visualli/core';

export const useSelectionStore = create<ISelectionStore>((set) => {
  selectionStore.subscribe((state) => set(state));
  return selectionStore.getState();
});

// ─── Render Config Store ──────────────────────────────────────────────────────

export const useRenderConfigStore = create<IRenderConfigStore>((set) => {
  renderConfigStore.subscribe((state) => set(state));
  return renderConfigStore.getState();
});
