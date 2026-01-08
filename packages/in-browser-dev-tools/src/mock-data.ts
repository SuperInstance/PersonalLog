/**
 * DevTools Mock Data Generator
 *
 * Generates realistic test data for development and testing.
 *
 * @module mock-data
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MockConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  archived: boolean;
  metadata?: Record<string, any>;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface MockKnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  embedding?: number[];
}

export interface MockPluginState {
  id: string;
  name: string;
  enabled: boolean;
  state: string;
  settings: Record<string, any>;
  stats: {
    activationCount: number;
    executionCount: number;
    errorCount: number;
    cpuTime: number;
    peakMemoryMB: number;
  };
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

class MockDataGenerator {
  private loremIpsum = [
    'Lorem ipsum dolor sit amet',
    'consectetur adipiscing elit',
    'sed do eiusmod tempor incididunt',
    'ut labore et dolore magna aliqua',
    'Ut enim ad minim veniam',
    'quis nostrud exercitation ullamco',
    'laboris nisi ut aliquip',
    'ex ea commodo consequat',
    'Duis aute irure dolor',
    'in reprehenderit in voluptate',
    'velit esse cillum dolore',
    'eu fugiat nulla pariatur',
    'Excepteur sint occaecat',
    'cupidatat non proident',
    'sunt in culpa qui',
    'officia deserunt mollit',
  ];

  private topics = [
    'Work Planning',
    'Project Ideas',
    'Code Review',
    'Meeting Notes',
    'Personal Thoughts',
    'Research',
    'Bug Investigation',
    'Feature Design',
    'API Integration',
    'Database Schema',
  ];

  private assistantResponses = [
    "I understand your question. Let me help you with that.",
    "Based on my analysis, here's what I found:",
    "That's an interesting point. Here's my perspective:",
    "Let me break this down for you:",
    "I'd recommend considering these factors:",
    "Here's a potential solution:",
    "Based on the context provided, I suggest:",
    "That depends on several factors. Let me explain:",
  ];

  // ========================================================================
  // GENERATORS
  // ========================================================================

  /**
   * Generate random string
   */
  randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /**
   * Generate random ID
   */
  randomId(prefix: string = ''): string {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate random number
   */
  randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  randomBoolean(likelihood: number = 0.5): boolean {
    return Math.random() < likelihood;
  }

  /**
   * Generate random item from array
   */
  randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate random items from array
   */
  randomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * Generate random date
   */
  randomDate(daysBack: number = 30): number {
    const now = Date.now();
    const daysMs = daysBack * 24 * 60 * 60 * 1000;
    return now - Math.random() * daysMs;
  }

  /**
   * Generate random lorem ipsum text
   */
  randomLorem(sentences: number = 3): string {
    const result: string[] = [];
    for (let i = 0; i < sentences; i++) {
      const sentenceWords = this.randomNumber(5, 15);
      const words: string[] = [];
      for (let j = 0; j < sentenceWords; j++) {
        words.push(this.randomItem(this.loremIpsum));
      }
      result.push(words.join(' ') + '.');
    }
    return result.join(' ');
  }

  // ========================================================================
  // CONVERSATION DATA
  // ========================================================================

  /**
   * Generate mock conversation
   */
  generateConversation(overrides?: Partial<MockConversation>): MockConversation {
    const createdAt = this.randomDate(30);
    const messageCount = this.randomNumber(1, 50);

    return {
      id: this.randomId('conv_'),
      title: this.randomItem(this.topics),
      createdAt,
      updatedAt: createdAt + this.randomNumber(0, 7 * 24 * 60 * 60 * 1000),
      messageCount,
      archived: this.randomBoolean(0.1),
      metadata: {
        hasAttachments: this.randomBoolean(0.2),
        tags: this.randomItems(['important', 'work', 'personal', 'todo', 'reference'], this.randomNumber(0, 3)),
      },
      ...overrides,
    };
  }

  /**
   * Generate mock conversations
   */
  generateConversations(count: number = 10): MockConversation[] {
    return Array.from({ length: count }, () => this.generateConversation());
  }

  /**
   * Generate mock message
   */
  generateMessage(conversationId: string, overrides?: Partial<MockMessage>): MockMessage {
    const role = this.randomBoolean(0.6) ? 'user' : 'assistant';
    const createdAt = this.randomDate(7);

    return {
      id: this.randomId('msg_'),
      conversationId,
      role,
      content: role === 'assistant' ? this.randomItem(this.assistantResponses) + ' ' + this.randomLorem(2) : this.randomLorem(3),
      createdAt,
      metadata: {
        hasContext: this.randomBoolean(0.3),
        model: role === 'assistant' ? 'gpt-4' : undefined,
      },
      ...overrides,
    };
  }

  /**
   * Generate mock messages for conversation
   */
  generateMessages(conversationId: string, count: number = 5): MockMessage[] {
    const messages: MockMessage[] = [];
    let timestamp = this.randomDate(30);

    for (let i = 0; i < count; i++) {
      const message = this.generateMessage(conversationId, {
        createdAt: timestamp,
      });
      messages.push(message);
      timestamp += this.randomNumber(1, 60) * 60 * 1000; // 1-60 minutes later
    }

    return messages;
  }

  // ========================================================================
  // KNOWLEDGE DATA
  // ========================================================================

  /**
   * Generate mock knowledge entry
   */
  generateKnowledgeEntry(overrides?: Partial<MockKnowledgeEntry>): MockKnowledgeEntry {
    const createdAt = this.randomDate(60);
    const tags = this.randomItems(
      ['code', 'documentation', 'tutorial', 'reference', 'note', 'idea', 'snippet'],
      this.randomNumber(1, 4)
    );

    return {
      id: this.randomId('know_'),
      title: this.randomItem(this.topics) + ' - ' + this.randomItem(['Notes', 'Reference', 'Guide', 'Summary']),
      content: this.randomLorem(5),
      tags,
      createdAt,
      updatedAt: createdAt + this.randomNumber(0, 30 * 24 * 60 * 60 * 1000),
      embedding: this.randomBoolean(0.7) ? Array.from({ length: 1536 }, () => Math.random()) : undefined,
      ...overrides,
    };
  }

  /**
   * Generate mock knowledge entries
   */
  generateKnowledgeEntries(count: number = 20): MockKnowledgeEntry[] {
    return Array.from({ length: count }, () => this.generateKnowledgeEntry());
  }

  // ========================================================================
  // PLUGIN DATA
  // ========================================================================

  /**
   * Generate mock plugin state
   */
  generatePluginState(overrides?: Partial<MockPluginState>): MockPluginState {
    const executionCount = this.randomNumber(0, 1000);
    const errorCount = Math.floor(executionCount * this.randomNumber(0, 5) / 100);

    return {
      id: this.randomId('plugin_'),
      name: `Mock Plugin ${this.randomNumber(1, 100)}`,
      enabled: this.randomBoolean(0.7),
      state: this.randomItem(['active', 'inactive', 'error', 'loading']),
      settings: {
        apiKey: this.randomBoolean(0.3) ? 'sk_' + this.randomString(32) : undefined,
        timeout: this.randomNumber(5000, 30000),
        maxRetries: this.randomNumber(0, 5),
        debugMode: this.randomBoolean(0.2),
        customParam: this.randomLorem(1),
      },
      stats: {
        activationCount: this.randomNumber(1, 100),
        executionCount,
        errorCount,
        cpuTime: executionCount * this.randomNumber(1, 100),
        peakMemoryMB: this.randomNumber(10, 500),
      },
      ...overrides,
    };
  }

  /**
   * Generate mock plugin states
   */
  generatePluginStates(count: number = 5): MockPluginState[] {
    return Array.from({ length: count }, () => this.generatePluginState());
  }

  // ========================================================================
  // PERFORMANCE DATA
  // ========================================================================

  /**
   * Generate mock performance metrics
   */
  generatePerformanceMetrics() {
    return {
      fps: this.randomNumber(30, 60),
      memoryUsed: this.randomNumber(50, 500),
      cpuUsage: this.randomNumber(10, 80),
      networkRequests: this.randomNumber(0, 10),
      renderTime: this.randomNumber(5, 100),
      scriptTime: this.randomNumber(10, 200),
    };
  }

  /**
   * Generate mock performance timeline
   */
  generatePerformanceTimeline(points: number = 20): Array<{ timestamp: number; metrics: any }> {
    const timeline: Array<{ timestamp: number; metrics: any }> = [];
    const now = Date.now();

    for (let i = 0; i < points; i++) {
      timeline.push({
        timestamp: now - (points - i) * 1000,
        metrics: this.generatePerformanceMetrics(),
      });
    }

    return timeline;
  }

  // ========================================================================
  // LOG DATA
  // ========================================================================

  /**
   * Generate mock log entry
   */
  generateLogEntry() {
    return {
      id: this.randomId('log_'),
      level: this.randomItem(['debug', 'info', 'warn', 'error']),
      category: this.randomItem(['plugin', 'theme', 'api', 'ui', 'storage', 'performance']),
      message: this.randomLorem(1),
      timestamp: this.randomDate(1),
      data: this.randomBoolean(0.3) ? { key: 'value', nested: { prop: this.randomNumber(1, 100) } } : undefined,
    };
  }

  /**
   * Generate mock log entries
   */
  generateLogEntries(count: number = 50): any[] {
    return Array.from({ length: count }, () => this.generateLogEntry());
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let mockDataGeneratorInstance: MockDataGenerator | null = null;

export function getMockDataGenerator(): MockDataGenerator {
  if (!mockDataGeneratorInstance) {
    mockDataGeneratorInstance = new MockDataGenerator();
  }
  return mockDataGeneratorInstance;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const mockData = getMockDataGenerator();

export const generateConversation = (overrides?: Partial<MockConversation>) =>
  mockData.generateConversation(overrides);

export const generateConversations = (count?: number) => mockData.generateConversations(count);

export const generateMessages = (conversationId: string, count?: number) =>
  mockData.generateMessages(conversationId, count);

export const generateKnowledgeEntry = (overrides?: Partial<MockKnowledgeEntry>) =>
  mockData.generateKnowledgeEntry(overrides);

export const generateKnowledgeEntries = (count?: number) => mockData.generateKnowledgeEntries(count);

export const generatePluginState = (overrides?: Partial<MockPluginState>) =>
  mockData.generatePluginState(overrides);

export const generatePluginStates = (count?: number) => mockData.generatePluginStates(count);
