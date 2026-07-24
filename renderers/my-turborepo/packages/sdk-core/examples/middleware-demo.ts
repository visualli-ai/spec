/**
 * Middleware Demo Script
 * 
 * This script demonstrates the new middleware functionality in @mysdk/core
 * Run with: tsx examples/middleware-demo.ts
 */

import { parseVisualliFile, VisualliParser, JSONLStreamReader } from '../src/parser/index.js';

// Sample JSONL data
const sampleData = `{"type":"meta","version":"1.0.0","schema":"visualli"}
{"type":"extension","id":"ext-1","extensionType":"calendar","data":{"date":"2026-07-22"}}
{"type":"extension","id":"ext-2","extensionType":"reminder","data":{"text":"Meeting at 3pm"}}
{"type":"layer","id":"root","level":0,"label":"Root Node"}
{"type":"layer","id":"child-1","level":1,"parentNodeId":"root","label":"Child 1"}`;

console.log('=== Middleware Demo ===\n');

// ─── Demo 1: Original Parser (Backward Compatibility) ─────────────────────────
console.log('1. Original parseVisualliFile (extensions skipped):');
try {
  const doc1 = parseVisualliFile(sampleData);
  console.log(`   - Meta: ${doc1.meta.version}`);
  console.log(`   - Extensions: ${doc1.extensions.size} (should be 0)`);
  console.log(`   - Layers: ${doc1.layers.size}`);
  console.log(`   - Root layer: ${doc1.rootLayer?.label}`);
} catch (err: any) {
  console.error('   Error:', err.message);
}

console.log('\n');

// ─── Demo 2: New Parser (Extensions Stored) ───────────────────────────────────
console.log('2. New VisualliParser (extensions stored):');
try {
  const parser2 = new VisualliParser();
  const doc2 = parser2.parseDocument(sampleData);
  console.log(`   - Meta: ${doc2.meta.version}`);
  console.log(`   - Extensions: ${doc2.extensions.size} (should be 2)`);
  console.log(`   - Layers: ${doc2.layers.size}`);
  
  // List extensions
  for (const [id, ext] of doc2.extensions) {
    console.log(`   - Extension: ${id} (${(ext as any).extensionType})`);
  }
} catch (err: any) {
  console.error('   Error:', err.message);
}

console.log('\n');

// ─── Demo 3: Middleware Transform ──────────────────────────────────────────────
console.log('3. Middleware: Transform extension data');
try {
  const parser3 = new VisualliParser()
    .use((data) => {
      if (data.type === 'extension') {
        // Add processed timestamp
        return {
          ...data,
          processedAt: new Date().toISOString(),
          wasProcessed: true
        };
      }
      return data;
    });
  
  const doc3 = parser3.parseDocument(sampleData);
  console.log(`   - Extensions: ${doc3.extensions.size}`);
  
  for (const [id, ext] of doc3.extensions) {
    const e = ext as any;
    console.log(`   - ${id}: processed=${e.wasProcessed}, at=${e.processedAt?.substring(0, 19)}`);
  }
} catch (err: any) {
  console.error('   Error:', err.message);
}

console.log('\n');

// ─── Demo 4: Middleware Filter ─────────────────────────────────────────────────
console.log('4. Middleware: Filter out calendar extensions');
try {
  const parser4 = new VisualliParser()
    .use((data) => {
      if (data.type === 'extension' && data.extensionType === 'calendar') {
        return null; // Filter out calendar extensions
      }
      return data;
    });
  
  const doc4 = parser4.parseDocument(sampleData);
  console.log(`   - Extensions: ${doc4.extensions.size} (should be 1 - reminder only)`);
  
  for (const [id, ext] of doc4.extensions) {
    console.log(`   - ${id}: ${(ext as any).extensionType}`);
  }
} catch (err: any) {
  console.error('   Error:', err.message);
}

console.log('\n');

// ─── Demo 5: Chained Middleware ────────────────────────────────────────────────
console.log('5. Chained middleware (logging + transform):');
try {
  let lineCount = 0;
  const parser5 = new VisualliParser()
    .use((data) => {
      // Middleware 1: Log
      lineCount++;
      console.log(`   [MW1] Line ${lineCount}: ${data.type}`);
      return data;
    })
    .use((data) => {
      // Middleware 2: Add metadata
      return { ...data, processedByChain: true };
    });
  
  const doc5 = parser5.parseDocument(sampleData);
  const firstLayer = Array.from(doc5.layers.values())[0] as any;
  console.log(`   - First layer has processedByChain: ${firstLayer.processedByChain}`);
} catch (err: any) {
  console.error('   Error:', err.message);
}

console.log('\n');

// ─── Demo 6: Streaming Parser ──────────────────────────────────────────────────
console.log('6. Streaming parser (chunked data):');
try {
  const parser6 = new VisualliParser();
  const parsedLines: any[] = [];
  
  const reader = new JSONLStreamReader(parser6, (line) => {
    if (line) {
      parsedLines.push(line);
      console.log(`   [Stream] Parsed: ${line.type} ${line.id || ''}`);
    }
  });
  
  // Simulate chunked data
  const chunks = [
    '{"type":"meta","version":"1.0.0"}\n',
    '{"type":"layer","id":"test',
    '-1","level":0,"lab',
    'el":"Test"}\n'
  ];
  
  for (const chunk of chunks) {
    reader.feedChunk(chunk);
  }
  reader.flush();
  
  console.log(`   - Total lines parsed: ${parsedLines.length}`);
} catch (err: any) {
  console.error('   Error:', err.message);
}

console.log('\n=== Demo Complete ===');
