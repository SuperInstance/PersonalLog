/**
 * JEPA Sentiment Analysis Benchmarks
 *
 * Measures performance of sentiment analysis including:
 * - Single message analysis
 * - Batch processing
 * - Real-time streaming
 * - Long text analysis
 * - Multi-language support
 */

import type { Benchmark, BenchmarkSuite } from '../types.js';

// Mock sentiment analyzer
class MockSentimentAnalyzer {
  // Simple sentiment patterns
  private positiveWords = ['happy', 'great', 'awesome', 'love', 'excellent', 'wonderful'];
  private negativeWords = ['sad', 'bad', 'terrible', 'hate', 'awful', 'horrible'];

  analyze(text: string) {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const word of this.positiveWords) {
      if (lowerText.includes(word)) score++;
    }

    for (const word of this.negativeWords) {
      if (lowerText.includes(word)) score--;
    }

    // Normalize to -1 to 1
    const normalized = Math.max(-1, Math.min(1, score / 5));

    return {
      sentiment: normalized > 0.3 ? 'positive' : normalized < -0.3 ? 'negative' : 'neutral',
      score: normalized,
      confidence: Math.abs(normalized)
    };
  }

  analyzeBatch(texts: string[]) {
    return texts.map(text => this.analyze(text));
  }
}

// Generate test messages
function generateTestMessage(length: number = 50): string {
  const words = [
    'happy', 'sad', 'great', 'terrible', 'awesome', 'awful',
    'love', 'hate', 'excellent', 'horrible', 'wonderful', 'bad',
    'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'
  ];

  let message = '';
  for (let i = 0; i < length; i++) {
    message += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return message.trim();
}

export const jepaSentimentBenchmarks: BenchmarkSuite = {
  name: 'JEPA Sentiment Analysis',
  description: 'Performance benchmarks for sentiment analysis operations',

  benchmarks: [
    {
      name: 'Single Message Analysis',
      description: 'Analyze sentiment of a single message',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const message = 'I am very happy with this awesome result!';
        analyzer.analyze(message);
      }
    },

    {
      name: 'Short Text Analysis',
      description: 'Analyze short text (50 words)',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const message = generateTestMessage(50);
        analyzer.analyze(message);
      }
    },

    {
      name: 'Long Text Analysis',
      description: 'Analyze long text (500 words)',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const message = generateTestMessage(500);
        analyzer.analyze(message);
      }
    },

    {
      name: 'Very Long Text Analysis',
      description: 'Analyze very long text (2000 words)',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const message = generateTestMessage(2000);
        analyzer.analyze(message);
      }
    },

    {
      name: 'Batch Analysis (10 messages)',
      description: 'Analyze 10 messages in batch',
      setup: () => {
        const analyzer = new MockSentimentAnalyzer();
        const messages = Array.from({ length: 10 }, () => generateTestMessage(50));
        return { analyzer, messages };
      },
      fn: ({ analyzer, messages }: any) => {
        analyzer.analyzeBatch(messages);
      }
    },

    {
      name: 'Batch Analysis (100 messages)',
      description: 'Analyze 100 messages in batch',
      setup: () => {
        const analyzer = new MockSentimentAnalyzer();
        const messages = Array.from({ length: 100 }, () => generateTestMessage(50));
        return { analyzer, messages };
      },
      fn: ({ analyzer, messages }: any) => {
        analyzer.analyzeBatch(messages);
      }
    },

    {
      name: 'Batch Analysis (1000 messages)',
      description: 'Analyze 1000 messages in batch',
      setup: () => {
        const analyzer = new MockSentimentAnalyzer();
        const messages = Array.from({ length: 1000 }, () => generateTestMessage(50));
        return { analyzer, messages };
      },
      fn: ({ analyzer, messages }: any) => {
        analyzer.analyzeBatch(messages);
      }
    },

    {
      name: 'Real-time Streaming (60 FPS)',
      description: 'Simulate real-time sentiment analysis at 60 FPS',
      fn: async () => {
        const analyzer = new MockSentimentAnalyzer();
        const frameTime = 1000 / 60; // ~16.67ms per frame

        for (let i = 0; i < 60; i++) {
          const message = generateTestMessage(20);
          analyzer.analyze(message);
          await new Promise(resolve => setTimeout(resolve, frameTime));
        }
      }
    },

    {
      name: 'High-Throughput Processing',
      description: 'Process as many messages as possible in 1 second',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const startTime = performance.now();
        let count = 0;

        while (performance.now() - startTime < 1000) {
          const message = generateTestMessage(50);
          analyzer.analyze(message);
          count++;
        }

        return count;
      }
    },

    {
      name: 'Emoji-Rich Text Analysis',
      description: 'Analyze text with many emojis',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const message = 'I am 😊 very 🎉 happy 🥳 and 💖 excited 🚀 about this ✨ wonderful 🌟 result! 🎊';
        analyzer.analyze(message);
      }
    },

    {
      name: 'Multi-language Text',
      description: 'Analyze text with mixed languages',
      fn: () => {
        const analyzer = new MockSentimentAnalyzer();
        const message = 'This is great! 这是太棒了! C\'est formidable! ¡Esto es genial!';
        analyzer.analyze(message);
      }
    }
  ]
};
