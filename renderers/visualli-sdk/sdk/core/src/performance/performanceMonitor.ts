// ─── Performance Monitors ─────────────────────────────────────────────────────
//
// FPSMonitor     – tracks frame rate via requestAnimationFrame (browser)
// MemoryMonitor  – polls performance.memory (Chrome)
// PerformanceProfiler – mark / measure utility for arbitrary operations

import {
  FPS_TARGET,
  FPS_SAMPLE_WINDOW,
  MEMORY_CHECK_INTERVAL,
} from '../constants/performanceConstants.js';

// ── FPS Monitor ───────────────────────────────────────────────────────────────

export class FPSMonitor {
  private frameTimes: number[] = [];
  private lastTime = 0;
  private currentFPS = FPS_TARGET;
  private rafId: number | null = null;

  start(): void {
    if (this.rafId !== null) return;

    const measure = (ts: number) => {
      if (this.lastTime > 0) {
        this.frameTimes.push(ts - this.lastTime);
        if (this.frameTimes.length > FPS_SAMPLE_WINDOW) this.frameTimes.shift();
        this.currentFPS = this.calc();
      }
      this.lastTime = ts;
      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  stop(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  private calc(): number {
    if (this.frameTimes.length === 0) return FPS_TARGET;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avg);
  }

  getFPS(): number { return this.currentFPS; }
  getAverageFPS(): number { return this.currentFPS; }

  getP95FrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  reset(): void { this.frameTimes = []; this.currentFPS = FPS_TARGET; }
}

// ── Memory Monitor ────────────────────────────────────────────────────────────

export interface MemoryStats {
  usedJSHeapSize:  number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  heapUsagePercent: number;
}

export class MemoryMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private current = 0;

  start(onUpdate?: (mb: number) => void): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      this.current = this.measure();
      onUpdate?.(this.current);
    }, MEMORY_CHECK_INTERVAL);
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  private measure(): number {
    const mem = (performance as unknown as Record<string, unknown>)['memory'] as Record<string, number> | undefined;
    return mem ? mem['usedJSHeapSize'] / (1024 * 1024) : 0;
  }

  getMemoryMB(): number { return this.current; }

  getStats(): MemoryStats | null {
    const mem = (performance as unknown as Record<string, unknown>)['memory'] as Record<string, number> | undefined;
    if (!mem) return null;
    return {
      usedJSHeapSize:   mem['usedJSHeapSize'],
      totalJSHeapSize:  mem['totalJSHeapSize'],
      jsHeapSizeLimit:  mem['jsHeapSizeLimit'],
      heapUsagePercent: (mem['usedJSHeapSize'] / mem['jsHeapSizeLimit']) * 100,
    };
  }

  static isSupported(): boolean {
    return !!(performance as unknown as Record<string, unknown>)['memory'];
  }
}

// ── Performance Profiler ──────────────────────────────────────────────────────

export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();

  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  measure(label: string): number {
    const start = this.marks.get(label);
    if (start === undefined) return 0;
    const duration = performance.now() - start;
    const list = this.measures.get(label) ?? [];
    list.push(duration);
    this.measures.set(label, list);
    this.marks.delete(label);
    return duration;
  }

  getAverage(label: string): number {
    const list = this.measures.get(label);
    if (!list?.length) return 0;
    return list.reduce((a, b) => a + b, 0) / list.length;
  }

  getP95(label: string): number {
    const list = this.measures.get(label);
    if (!list?.length) return 0;
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  clear(label?: string): void {
    if (label) { this.marks.delete(label); this.measures.delete(label); }
    else { this.marks.clear(); this.measures.clear(); }
  }
}
