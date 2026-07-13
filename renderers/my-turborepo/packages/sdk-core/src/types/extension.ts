// ─── Visualli Extension Types ──────────────────────────────────────────────────

export interface VisualliExtension {
  type: 'extension';
  id: string;
  config?: Record<string, unknown>;
  data?: unknown[];
}
