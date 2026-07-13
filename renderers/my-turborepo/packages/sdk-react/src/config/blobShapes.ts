// ─── Blob Shapes Configuration ───────────────────────────────────────────────
//
// Blob shapes are centered at (0, 0). Coordinates are relative — multiply by
// (radiusX, radiusY) to get world coords. Drawing uses closed quadratic bezier
// curves through midpoints of consecutive control points (same as visualli.ai).
//
// Shapes match the visualli.ai reference designs exactly.

export interface BlobPoint { x: number; y: number }
export type BlobShape = ReadonlyArray<BlobPoint>;

// ── Blob background layer depth config ────────────────────────────────────────
// Index 0 = outermost layer (rendered first, behind the top blob).

export const BLOB_LAYER_CONFIG = [
  { opacity: 0.3, rotation: -15, scaleUp: 1.30, strokeWidth: 3, dash: [6, 4] as [number, number] },
  { opacity: 0.4, rotation: -10, scaleUp: 1.20, strokeWidth: 1, dash: undefined },
  { opacity: 0.5, rotation: -5,  scaleUp: 1.10, strokeWidth: 2, dash: undefined },
] as const;

export const NODE_LAYER_CONFIG = { opacity: 1, rotation: 0, strokeWidth: 3 } as const;

// ── Six organic blob variants ─────────────────────────────────────────────────
export const ALL_BLOB_SHAPES: ReadonlyArray<BlobShape> = [
  // Shape 0 · Blob 1 (root / L0)
  [
    { x:  1.12, y:  0.00 }, { x:  0.86, y:  0.56 }, { x:  0.46, y:  0.94 },
    { x: -0.08, y:  1.06 }, { x: -0.68, y:  0.82 }, { x: -0.96, y:  0.08 },
    { x: -0.55, y: -0.82 }, { x:  0.04, y: -1.02 }, { x:  0.72, y: -0.80 },
    { x:  1.08, y: -0.38 },
  ],
  // Shape 1 · Blob 2
  [
    { x: -0.489, y: -0.625 }, { x: -0.384, y: -0.716 }, { x: -0.285, y: -0.792 },
    { x: -0.189, y: -0.855 }, { x: -0.090, y: -0.903 }, { x:  0.014, y: -0.932 },
    { x:  0.129, y: -0.940 }, { x:  0.255, y: -0.924 }, { x:  0.412, y: -0.876 },
    { x:  0.516, y: -0.832 }, { x:  0.612, y: -0.780 }, { x:  0.695, y: -0.725 },
    { x:  0.767, y: -0.666 }, { x:  0.830, y: -0.606 }, { x:  0.885, y: -0.546 },
    { x:  0.933, y: -0.486 }, { x:  0.979, y: -0.425 }, { x:  1.006, y: -0.385 },
    { x:  1.034, y: -0.334 }, { x:  1.058, y: -0.276 }, { x:  1.078, y: -0.209 },
    { x:  1.092, y: -0.133 }, { x:  1.101, y: -0.046 }, { x:  1.102, y:  0.052 },
    { x:  1.094, y:  0.173 }, { x:  1.083, y:  0.244 }, { x:  1.063, y:  0.324 },
    { x:  1.034, y:  0.401 }, { x:  0.996, y:  0.477 }, { x:  0.948, y:  0.549 },
    { x:  0.889, y:  0.617 }, { x:  0.820, y:  0.681 }, { x:  0.735, y:  0.741 },
    { x:  0.658, y:  0.783 }, { x:  0.569, y:  0.822 }, { x:  0.474, y:  0.855 },
    { x:  0.372, y:  0.882 }, { x:  0.265, y:  0.904 }, { x:  0.156, y:  0.920 },
    { x:  0.046, y:  0.931 }, { x: -0.069, y:  0.938 }, { x: -0.155, y:  0.935 },
    { x: -0.250, y:  0.919 }, { x: -0.346, y:  0.890 }, { x: -0.443, y:  0.851 },
    { x: -0.539, y:  0.800 }, { x: -0.633, y:  0.738 }, { x: -0.723, y:  0.667 },
    { x: -0.808, y:  0.585 }, { x: -0.882, y:  0.501 }, { x: -0.944, y:  0.421 },
    { x: -0.994, y:  0.343 }, { x: -1.034, y:  0.267 }, { x: -1.064, y:  0.192 },
    { x: -1.085, y:  0.120 }, { x: -1.097, y:  0.042 }, { x: -1.102, y:  0.001 },
    { x: -1.090, y: -0.243 }, { x: -1.050, y: -0.365 }, { x: -0.990, y: -0.441 },
    { x: -0.911, y: -0.479 }, { x: -0.819, y: -0.499 }, { x: -0.715, y: -0.517 },
    { x: -0.605, y: -0.551 },
  ],
  // Shape 2 · Blob 3
  [
    { x:  0.003, y: -0.970 }, { x:  0.163, y: -0.984 }, { x:  0.286, y: -1.028 },
    { x:  0.389, y: -1.096 }, { x:  0.488, y: -1.174 }, { x:  0.597, y: -1.210 },
    { x:  0.728, y: -1.165 }, { x:  0.867, y: -1.036 }, { x:  0.996, y: -0.839 },
    { x:  1.098, y: -0.590 }, { x:  1.158, y: -0.304 }, { x:  1.153, y:  0.012 },
    { x:  1.080, y:  0.336 }, { x:  0.944, y:  0.639 }, { x:  0.756, y:  0.889 },
    { x:  0.484, y:  1.072 }, { x:  0.339, y:  1.079 }, { x:  0.219, y:  1.051 },
    { x:  0.131, y:  0.994 }, { x:  0.059, y:  0.939 }, { x:  0.008, y:  0.915 },
    { x: -0.105, y:  0.931 }, { x: -0.176, y:  0.965 }, { x: -0.249, y:  1.005 },
    { x: -0.345, y:  1.039 }, { x: -0.497, y:  1.055 }, { x: -0.672, y:  1.032 },
    { x: -0.817, y:  0.952 }, { x: -0.945, y:  0.810 }, { x: -1.054, y:  0.600 },
    { x: -1.160, y:  0.302 }, { x: -1.187, y: -0.011 }, { x: -1.165, y: -0.326 },
    { x: -1.097, y: -0.599 }, { x: -0.991, y: -0.838 }, { x: -0.852, y: -0.912 },
    { x: -0.695, y: -0.958 }, { x: -0.530, y: -0.988 }, { x: -0.357, y: -0.992 },
    { x: -0.180, y: -0.983 },
  ],
  // Shape 3 · Blob 4
  [
    { x: -0.734, y: -1.127 }, { x: -0.656, y: -1.146 }, { x: -0.567, y: -1.142 },
    { x: -0.468, y: -1.115 }, { x: -0.358, y: -1.079 }, { x: -0.238, y: -1.034 },
    { x: -0.107, y: -0.989 }, { x:  0.035, y: -0.953 }, { x:  0.188, y: -0.929 },
    { x:  0.325, y: -0.916 }, { x:  0.484, y: -0.896 }, { x:  0.650, y: -0.854 },
    { x:  0.811, y: -0.770 }, { x:  0.955, y: -0.631 }, { x:  1.068, y: -0.422 },
    { x:  1.138, y: -0.126 }, { x:  1.152, y:  0.272 }, { x:  1.121, y:  0.451 },
    { x:  1.046, y:  0.602 }, { x:  0.928, y:  0.727 }, { x:  0.767, y:  0.833 },
    { x:  0.565, y:  0.925 }, { x:  0.323, y:  1.001 }, { x:  0.042, y:  1.075 },
    { x: -0.277, y:  1.142 }, { x: -0.368, y:  1.147 }, { x: -0.475, y:  1.136 },
    { x: -0.589, y:  1.104 }, { x: -0.704, y:  1.050 }, { x: -0.815, y:  0.973 },
    { x: -0.913, y:  0.871 }, { x: -0.993, y:  0.746 }, { x: -1.048, y:  0.593 },
    { x: -1.109, y:  0.298 }, { x: -1.145, y:  0.018 }, { x: -1.154, y: -0.243 },
    { x: -1.135, y: -0.482 }, { x: -1.085, y: -0.695 }, { x: -1.003, y: -0.874 },
    { x: -0.886, y: -1.020 },
  ],
  // Shape 4 · Blob 5 (inverted Blob 4)
  [
    { x: -0.734, y:  1.127 }, { x: -0.656, y:  1.146 }, { x: -0.567, y:  1.142 },
    { x: -0.468, y:  1.115 }, { x: -0.358, y:  1.079 }, { x: -0.238, y:  1.034 },
    { x: -0.107, y:  0.989 }, { x:  0.035, y:  0.953 }, { x:  0.188, y:  0.929 },
    { x:  0.325, y:  0.916 }, { x:  0.484, y:  0.896 }, { x:  0.650, y:  0.854 },
    { x:  0.811, y:  0.770 }, { x:  0.955, y:  0.631 }, { x:  1.068, y:  0.422 },
    { x:  1.138, y:  0.126 }, { x:  1.152, y: -0.272 }, { x:  1.121, y: -0.451 },
    { x:  1.046, y: -0.602 }, { x:  0.928, y: -0.727 }, { x:  0.767, y: -0.833 },
    { x:  0.565, y: -0.925 }, { x:  0.323, y: -1.001 }, { x:  0.042, y: -1.075 },
    { x: -0.277, y: -1.142 }, { x: -0.368, y: -1.147 }, { x: -0.475, y: -1.136 },
    { x: -0.589, y: -1.104 }, { x: -0.704, y: -1.050 }, { x: -0.815, y: -0.973 },
    { x: -0.913, y: -0.871 }, { x: -0.993, y: -0.746 }, { x: -1.048, y: -0.593 },
    { x: -1.109, y: -0.298 }, { x: -1.145, y: -0.018 }, { x: -1.154, y:  0.243 },
    { x: -1.135, y:  0.482 }, { x: -1.085, y:  0.695 }, { x: -1.003, y:  0.874 },
    { x: -0.886, y:  1.020 },
  ],
  // Shape 5 · Blob 6
  [
    { x:  0.001, y: -1.006 }, { x:  0.134, y: -1.001 }, { x:  0.262, y: -1.024 },
    { x:  0.382, y: -1.073 }, { x:  0.498, y: -1.107 }, { x:  0.614, y: -1.105 },
    { x:  0.733, y: -1.049 }, { x:  0.850, y: -0.932 }, { x:  0.953, y: -0.755 },
    { x:  1.030, y: -0.529 }, { x:  1.067, y: -0.265 }, { x:  1.054, y:  0.018 },
    { x:  0.986, y:  0.300 }, { x:  0.868, y:  0.557 }, { x:  0.715, y:  0.766 },
    { x:  0.550, y:  0.909 }, { x:  0.396, y:  0.984 }, { x:  0.262, y:  1.005 },
    { x:  0.148, y:  1.003 }, { x:  0.037, y:  1.008 }, { x: -0.083, y:  1.040 },
    { x: -0.220, y:  1.118 }, { x: -0.360, y:  1.192 }, { x: -0.500, y:  1.234 },
    { x: -0.650, y:  1.175 }, { x: -0.810, y:  1.045 }, { x: -0.990, y:  0.855 },
    { x: -1.140, y:  0.610 }, { x: -1.240, y:  0.330 }, { x: -1.270, y:  0.040 },
    { x: -1.275, y: -0.250 }, { x: -1.225, y: -0.500 }, { x: -1.080, y: -0.720 },
    { x: -0.890, y: -0.920 }, { x: -0.734, y: -1.053 }, { x: -0.614, y: -1.112 },
    { x: -0.498, y: -1.127 }, { x: -0.381, y: -1.110 }, { x: -0.261, y: -1.095 },
    { x: -0.133, y: -1.058 }, { x:  0.001, y: -1.010 }, { x:  0.134, y: -1.001 },
  ],
];

export const ACTIVE_BLOB_TYPES: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5];

/**
 * Per-shape text x-offset as a fraction of baseRadiusX.
 * Compensates for visually asymmetric blobs. Positive = right, negative = left.
 */
export const BLOB_TEXT_OFFSETS: ReadonlyArray<number> = [0, 0, 0, 0, 0, -0.10];

/**
 * Deterministic pseudo-random blob-type selector per tree level.
 * Root level (0) always uses shape 0; consecutive levels use different shapes.
 */
export function getBlobTypeForLayer(level: number): number {
  const numTypes = ACTIVE_BLOB_TYPES.length;
  if (numTypes <= 1) return ACTIVE_BLOB_TYPES[0] ?? 0;
  let currentType = 0;
  for (let i = 1; i <= level; i++) {
    const pseudoRandom = Math.floor(Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453));
    const stepOffset = (pseudoRandom % (numTypes - 1)) + 1;
    currentType = (currentType + stepOffset) % numTypes;
  }
  return ACTIVE_BLOB_TYPES[currentType];
}

/**
 * Draw the blob path onto a Konva canvas context (centered at 0,0).
 * Uses closed quadratic bezier curves through midpoints of control points.
 * Call this inside a Konva Shape's sceneFunc / hitFunc.
 */
export function drawBlobPath(
  ctx: { beginPath(): void; moveTo(x: number, y: number): void; quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void; closePath(): void },
  radiusX: number,
  radiusY: number,
  blobType: number,
): void {
  const srcPts = ALL_BLOB_SHAPES[blobType] ?? ALL_BLOB_SHAPES[0];
  const pts = srcPts.map(p => ({ x: p.x * radiusX, y: p.y * radiusY }));
  ctx.beginPath();
  const last  = pts[pts.length - 1];
  const first = pts[0];
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
  }
  ctx.closePath();
}

// Legacy export kept for consumers that may import buildBlobPathData.
// Generates an SVG path string (less accurate than the sceneFunc approach).
export function buildBlobPathData(
  _shape: BlobShape,
  cx: number,
  cy: number,
  width: number,
  height: number,
): string {
  const rx = width / 2;
  const ry = height / 2;
  const blobType = 0;
  const srcPts = ALL_BLOB_SHAPES[blobType];
  const pts = srcPts.map(p => ({ x: cx + p.x * rx, y: cy + p.y * ry }));
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const last  = pts[pts.length - 1];
  const first = pts[0];
  const s     = mid(last, first);
  let d = `M ${s.x} ${s.y}`;
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m    = mid(curr, next);
    d += ` Q ${curr.x} ${curr.y} ${m.x} ${m.y}`;
  }
  d += ' Z';
  return d;
}
