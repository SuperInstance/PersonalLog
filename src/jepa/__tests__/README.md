# JEPA Testing Guide

Quick reference for running and maintaining JEPA tests.

## Quick Start

### Run All JEPA Tests
```bash
npm run test:unit -- src/jepa/__tests__/
```

### Run Specific Test File
```bash
# Audio capture tests
npm run test:unit -- src/jepa/__tests__/audio-capture.test.ts

# STT engine tests
npm run test:unit -- src/jepa/__tests__/stt-engine.test.ts

# Markdown formatter tests
npm run test:unit -- src/jepa/__tests__/markdown-formatter.test.ts

# Export functionality tests
npm run test:unit -- src/jepa/__tests__/export.test.ts
```

### Run with Coverage
```bash
npm run test:coverage -- src/jepa/__tests__/
```

### Watch Mode (Development)
```bash
npm run test:watch -- src/jepa/__tests__/
```

## Test Structure

```
src/jepa/__tests__/
├── audio-capture.test.ts       # Audio capture and recording
├── stt-engine.test.ts          # Speech-to-Text engine
├── markdown-formatter.test.ts  # Transcript formatting
├── export.test.ts              # Export functionality
└── README.md                   # This file
```

## Test Categories

### Audio Capture Tests (65+ tests)
- Microphone permissions
- Device enumeration
- Recording controls (start/stop/pause/resume)
- Audio buffering (64ms windows)
- Error handling
- Performance benchmarks
- Cross-browser compatibility

### STT Engine Tests (55+ tests)
- Model loading
- Real-time transcription
- Timestamp alignment
- Accuracy verification
- Fallback mechanisms
- Language support
- Memory management

### Markdown Formatter Tests (45+ tests)
- STT-only format
- JEPA-only format
- Interleaved format
- Timestamp formatting
- A2A conversion
- Special characters handling

### Export Tests (50+ tests)
- Copy to clipboard
- File download (.md)
- Format conversion (SRT, VTT, JSON, CSV)
- Selection export
- Batch export
- Error handling

## Common Test Patterns

### Mock Setup
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})
```

### Async Tests
```typescript
it('should load model', async () => {
  const result = await engine.loadModel('tiny')
  expect(result).toBe(true)
})
```

### Error Tests
```typescript
it('should handle errors', async () => {
  mockFunction.mockRejectedValueOnce(new Error('Test error'))
  await expect(asyncFunction()).rejects.toThrow('Test error')
})
```

## Performance Benchmarks

### Audio Capture
- Initialization: < 1000ms
- Permission request: < 500ms
- Audio latency: < 300ms

### STT Transcription
- Model loading: < 5000ms
- Transcription: < 250ms per buffer

### Export
- Clipboard copy: < 100ms
- File download: < 200ms
- Large file (1000+ segments): < 1000ms

## Cross-Browser Testing

Tests verify compatibility with:
- Chrome 120+
- Firefox 121+
- Safari 17.2+
- Edge 120+

## Troubleshooting

### Tests Not Found
```bash
# Ensure vitest config includes JEPA tests
grep "src/jepa" vitest.config.ts
```

### Mock Errors
```bash
# Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

### Timeout Errors
```bash
# Increase timeout in vitest.config.ts
testTimeout: 10000
```

## Coverage Goals

- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >90%
- **Lines:** >80%

## Related Documentation

- [Full Test Report](../../../docs/jepa/ROUND-2-TEST-REPORT.md)
- [JEPA Integration Roadmap](../../../.agents/roadmaps/JEPA_INTEGRATION.md)
- [Round 2 Plan](../../../.agents/round-2/UPDATED-PLAN.md)

## Support

For issues or questions:
1. Check the full test report
2. Review Round 2 plan
3. Consult implementation requirements
4. Run with verbose flag: `npm run test:unit -- --verbose`
