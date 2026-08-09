// ─── Layer Navigation Utilities ──────────────────────────────────────────────
//
// React-specific re-exports or wrappers of core navigation logic.

export {
  getConnectionsForLayer,
  getChildLayerForNode,
  getLayerForNavigation,
  calculateFitZoom,
  calculateFitCenter,
  getContainersForLayer,
  calculateFitView,
} from '@visualli/core';

export type { FitResult, ContainerGroupInfo } from '@visualli/core';
