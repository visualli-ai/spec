// ─── Stream Parser ─────────────────────────────────────────────────────────────
//
// Handles streaming JSONL data with line buffering across chunk boundaries

import type { VisualliParser } from './visualliParser.js';
import type { RawNodeData } from './middleware.js';

/**
 * Stream reader for JSONL format
 * Handles line buffering across chunk boundaries
 */
export class JSONLStreamReader {
  private parser: VisualliParser;
  private buffer = '';
  private lineCallback: (parsedLine: RawNodeData | null) => void;

  constructor(
    parser: VisualliParser,
    onLine: (parsedLine: RawNodeData | null) => void
  ) {
    this.parser = parser;
    this.lineCallback = onLine;
  }

  /**
   * Feed a chunk of data from ReadableStream
   */
  feedChunk(chunk: string): void {
    this.buffer += chunk;
    
    // Process complete lines
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, newlineIndex);
      this.buffer = this.buffer.substring(newlineIndex + 1);
      
      if (line.trim()) {
        const parsed = this.parser.parseLine(line);
        this.lineCallback(parsed);
      }
    }
  }

  /**
   * Flush remaining buffer (call when stream ends)
   */
  flush(): void {
    if (this.buffer.trim()) {
      const parsed = this.parser.parseLine(this.buffer);
      this.lineCallback(parsed);
      this.buffer = '';
    }
  }

  /**
   * Utility to consume a ReadableStream
   */
  async consumeStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        this.feedChunk(chunk);
      }
      this.flush();
    } finally {
      reader.releaseLock();
    }
  }
}
