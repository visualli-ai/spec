# Middleware Examples

This document demonstrates how to use the new middleware architecture in `@mysdk/core`.

## Basic Usage

### 1. Using the Original Parser (Backward Compatible)

The original `parseVisualliFile()` function still works exactly as before:

```typescript
import { parseVisualliFile } from '@mysdk/core';

const content = `
{"type":"meta","version":"1.0.0"}
{"type":"layer","id":"root","level":0}
{"type":"extension","id":"my-ext","data":"something"}
`;

const doc = parseVisualliFile(content);
// Extensions are SKIPPED in the original parser
console.log(doc.extensions.size); // 0
```

### 2. Using the New VisualliParser with Middleware

The new class-based parser supports middleware and stores extensions:

```typescript
import { VisualliParser } from '@mysdk/core';

const parser = new VisualliParser();
const doc = parser.parseDocument(content);

// Extensions are NOW STORED (not skipped)
console.log(doc.extensions.size); // 1
```

## Middleware Examples

### Example 1: Transform Extension Data

```typescript
import { VisualliParser } from '@mysdk/core';

const parser = new VisualliParser()
  .use((data) => {
    if (data.type === 'extension') {
      // Add a timestamp to all extensions
      return {
        ...data,
        processedAt: new Date().toISOString()
      };
    }
    return data;
  });

const doc = parser.parseDocument(jsonlContent);
```

### Example 2: Filter Out Specific Types

```typescript
const parser = new VisualliParser()
  .use((data) => {
    // Skip all extensions from the document
    if (data.type === 'extension') {
      return null; // Returning null filters this line
    }
    return data;
  });

const doc = parser.parseDocument(jsonlContent);
// Extensions will be filtered out
```

### Example 3: Validate and Enrich Data

```typescript
const parser = new VisualliParser()
  .use((data) => {
    if (data.type === 'layer') {
      // Add computed properties
      return {
        ...data,
        hasParent: !!data.parentNodeId,
        depth: data.level || 0
      };
    }
    return data;
  })
  .use((data) => {
    // Chain multiple middlewares
    if (data.type === 'extension' && !data.id) {
      console.warn('Extension missing ID, skipping');
      return null;
    }
    return data;
  });
```

## Streaming Usage

### Example 4: Process JSONL Streams

```typescript
import { VisualliParser, JSONLStreamReader } from '@mysdk/core';

const parser = new VisualliParser()
  .use((data) => {
    // Transform data as it streams in
    return { ...data, streamed: true };
  });

const parsedLines: any[] = [];
const reader = new JSONLStreamReader(parser, (line) => {
  if (line) {
    parsedLines.push(line);
    console.log('Parsed line:', line.type);
  }
});

// Feed chunks from a stream
reader.feedChunk('{"type":"meta","version":"1.0.0"}\n');
reader.feedChunk('{"type":"layer","id":"root"');
reader.feedChunk(',"level":0}\n');
reader.flush();

console.log(`Processed ${parsedLines.length} lines`);
```

### Example 5: Process ReadableStream

```typescript
const response = await fetch('/data.visualli');
const stream = response.body;

const allLines: any[] = [];
const reader = new JSONLStreamReader(
  parser,
  (line) => line && allLines.push(line)
);

await reader.consumeStream(stream!);
console.log(`Streamed ${allLines.length} lines`);
```

## Advanced Use Cases

### Example 6: Application-Specific Extension Parser

This is the main use case - downstream apps can inject custom logic:

```typescript
// In your application code (not in sdk-core)
import { VisualliParser } from '@mysdk/core';

interface MyCustomExtension {
  type: 'extension';
  id: string;
  extensionType: 'calendar' | 'reminder' | 'link';
  data: any;
}

const appParser = new VisualliParser()
  .use((data) => {
    if (data.type === 'extension') {
      // Parse application-specific extension format
      const extType = data.extensionType as string;
      
      switch (extType) {
        case 'calendar':
          return parseCalendarExtension(data);
        case 'reminder':
          return parseReminderExtension(data);
        case 'link':
          return parseLinkExtension(data);
        default:
          console.warn(`Unknown extension type: ${extType}`);
          return null; // Skip unknown extensions
      }
    }
    return data;
  });

function parseCalendarExtension(data: any) {
  // Your custom parsing logic
  return {
    ...data,
    parsedDate: new Date(data.data?.date),
    isUpcoming: new Date(data.data?.date) > new Date()
  };
}
```

### Example 7: Logging and Debugging

```typescript
const parser = new VisualliParser()
  .use((data) => {
    // Log all parsed lines for debugging
    console.log('[Parser]', data.type, data.id || '(no id)');
    return data;
  })
  .use((data) => {
    // Count types
    if (!global.typeCount) global.typeCount = {};
    global.typeCount[data.type] = (global.typeCount[data.type] || 0) + 1;
    return data;
  });
```

## Migration Guide

### Before (Direct Parser)

```typescript
import { parseVisualliFile } from '@mysdk/core';

const doc = parseVisualliFile(content);
// No way to customize parsing
```

### After (With Middleware)

```typescript
import { VisualliParser } from '@mysdk/core';

const parser = new VisualliParser()
  .use(myCustomMiddleware);

const doc = parser.parseDocument(content);
// Full control over parsing pipeline
```

## Key Differences

| Feature | `parseVisualliFile()` | `VisualliParser` |
|---------|----------------------|------------------|
| Extensions | Skipped | Stored (unless middleware filters) |
| Customization | None | Full middleware pipeline |
| Streaming | No | Yes (via JSONLStreamReader) |
| Backward Compat | ✅ Original function | ✅ New class |
| Use Case | Simple parsing | Advanced/app-specific parsing |

## Best Practices

1. **Keep middleware pure**: Don't rely on external state
2. **Order matters**: Middlewares execute in registration order
3. **Return null to filter**: Explicitly return `null` to skip a line
4. **Use the class for extensions**: If you need extensions, use `VisualliParser`
5. **Keep the original for simple cases**: Use `parseVisualliFile()` if you don't need customization
