/**
 * Auto-Merge Engine Tests
 */

import { ConflictDetector } from '../conflict-detection';
import {
  AutoMergeStrategy,
  KeepLatestStrategy,
  KeepAllStrategy,
  SummarizeStrategy,
  AskUserStrategy,
  mergeStrategyRegistry,
} from '../merge-strategies';
import { AutoMergeEngine } from '../auto-merge';
import { ChildResult, ConflictResolution } from '../merge-types';
import { SessionSchema } from '@/lib/types/session';

describe('ConflictDetector', () => {
  const detector = new ConflictDetector();

  it('should detect COMPLETED list conflicts', async () => {
    const parent: Partial<SessionSchema> = {
      COMPLETED: ['task1', 'task2'],
    };
    const childResults: ChildResult[] = [
      {
        taskId: 'child1',
        conversationId: 'conv1',
        schema: { COMPLETED: ['task2', 'task3'] },
        timestamp: Date.now(),
      },
    ];

    const conflicts = await detector.detectConflicts(parent, childResults);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].location).toBe('COMPLETED');
    expect(conflicts[0].type).toBe('schema');
    expect(conflicts[0].severity).toBe('warning');
  });

  it('should detect DECISIONS contradictions', async () => {
    const parent: Partial<SessionSchema> = {
      DECISIONS: {
        approach: 'method-a',
      },
    };
    const childResults: ChildResult[] = [
      {
        taskId: 'child1',
        conversationId: 'conv1',
        schema: {
          DECISIONS: {
            approach: 'method-b',
          },
        },
        timestamp: Date.now(),
      },
    ];

    const conflicts = await detector.detectConflicts(parent, childResults);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].location).toBe('DECISIONS.approach');
    expect(conflicts[0].type).toBe('contradiction');
    expect(conflicts[0].severity).toBe('critical');
  });

  it('should detect NEXT items already in COMPLETED', async () => {
    const parent: Partial<SessionSchema> = {
      COMPLETED: ['task1'],
      NEXT: [],
    };
    const childResults: ChildResult[] = [
      {
        taskId: 'child1',
        conversationId: 'conv1',
        schema: {
          NEXT: ['task1'],
        },
        timestamp: Date.now(),
      },
    ];

    const conflicts = await detector.detectConflicts(parent, childResults);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].location).toBe('NEXT');
    expect(conflicts[0].type).toBe('schema');
    expect(conflicts[0].severity).toBe('info');
  });

  it('should detect contradictions between multiple child results', async () => {
    const parent: Partial<SessionSchema> = {};
    const childResults: ChildResult[] = [
      {
        taskId: 'child1',
        conversationId: 'conv1',
        summary: 'The feature cannot be implemented due to technical limitations',
        schema: {},
        timestamp: Date.now(),
      },
      {
        taskId: 'child2',
        conversationId: 'conv2',
        summary: 'The feature can definitely be implemented',
        schema: {},
        timestamp: Date.now(),
      },
    ];

    const conflicts = await detector.detectConflicts(parent, childResults);

    const contradictions = conflicts.filter((c) => c.type === 'contradiction');
    expect(contradictions.length).toBeGreaterThan(0);
  });

  it('should detect overlapping changes', async () => {
    const parent: Partial<SessionSchema> = {};
    const childResults: ChildResult[] = [
      {
        taskId: 'child1',
        conversationId: 'conv1',
        schema: {
          COMPLETED: ['shared-task'],
        },
        timestamp: Date.now(),
      },
      {
        taskId: 'child2',
        conversationId: 'conv2',
        schema: {
          COMPLETED: ['shared-task'],
        },
        timestamp: Date.now(),
      },
    ];

    const conflicts = await detector.detectConflicts(parent, childResults);

    const overlaps = conflicts.filter((c) => c.location === 'COMPLETED' && c.type === 'content');
    expect(overlaps.length).toBeGreaterThan(0);
  });
});

describe('AutoMergeStrategy', () => {
  const strategy = new AutoMergeStrategy();

  it('should auto-merge when no critical conflicts', () => {
    const conflicts = [
      {
        id: '1',
        type: 'schema' as const,
        severity: 'info' as const,
        location: 'NEXT',
        description: 'Info conflict',
        options: ['keep-parent'],
        suggestions: [],
      },
    ];

    expect(strategy.canAutoMerge(conflicts)).toBe(true);
  });

  it('should not auto-merge when critical conflicts exist', () => {
    const conflicts = [
      {
        id: '1',
        type: 'contradiction' as const,
        severity: 'critical' as const,
        location: 'DECISIONS.approach',
        description: 'Critical conflict',
        options: ['keep-parent'],
        suggestions: [],
      },
    ];

    expect(strategy.canAutoMerge(conflicts)).toBe(false);
  });

  it('should merge schemas correctly', async () => {
    const parent = {
      schema: {
        COMPLETED: ['task1'],
        DECISIONS: { option1: 'value1' },
      },
    };
    const child: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv1',
      schema: {
        COMPLETED: ['task2'],
        DECISIONS: { option2: 'value2' },
      },
      timestamp: Date.now(),
    };

    const result = await strategy.merge(parent, child, []);

    expect(result.success).toBe(true);
    expect(result.merged.schema.COMPLETED).toEqual(['task1', 'task2']);
    expect(result.merged.schema.DECISIONS).toEqual({
      option1: 'value1',
      option2: 'value2',
    });
  });
});

describe('KeepLatestStrategy', () => {
  const strategy = new KeepLatestStrategy();

  it('should prefer child values in conflicts', async () => {
    const parent = {
      schema: {
        DECISIONS: { approach: 'parent-value' },
      },
    };
    const child: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv1',
      schema: {
        DECISIONS: { approach: 'child-value' },
      },
      timestamp: Date.now(),
    };
    const conflicts = [
      {
        id: '1',
        type: 'contradiction' as const,
        severity: 'critical' as const,
        location: 'DECISIONS.approach',
        description: 'Conflict',
        options: ['keep-child'],
        suggestions: [],
        parentValue: 'parent-value',
        childValue: 'child-value',
      },
    ];

    const result = await strategy.merge(parent, child, conflicts);

    expect(result.success).toBe(true);
    expect(result.merged.schema.DECISIONS?.approach).toBe('child-value');
  });
});

describe('KeepAllStrategy', () => {
  const strategy = new KeepAllStrategy();

  it('should preserve merge metadata', async () => {
    const parent = { schema: {} };
    const child: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv1',
      schema: {},
      timestamp: Date.now(),
    };

    const result = await strategy.merge(parent, child, []);

    expect(result.success).toBe(true);
    expect(result.merged.schema).toHaveProperty('_mergeMetadata');
    expect(Array.isArray(result.merged.schema._mergeMetadata)).toBe(true);
  });
});

describe('SummarizeStrategy', () => {
  const strategy = new SummarizeStrategy();

  it('should generate merge summary', async () => {
    const parent = { schema: { COMPLETED: [] } };
    const child: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv1',
      schema: { COMPLETED: ['task1', 'task2'] },
      timestamp: Date.now(),
    };
    const conflicts = [
      {
        id: '1',
        type: 'schema' as const,
        severity: 'info' as const,
        location: 'COMPLETED',
        description: 'Conflict',
        options: ['keep-one'],
        suggestions: [],
      },
    ];

    const result = await strategy.merge(parent, child, conflicts);

    expect(result.success).toBe(true);
    expect(result.merged).toHaveProperty('summary');
    expect(result.merged.summary).toContain('Merge Summary');
  });

  it('should not auto-merge if too many conflicts', () => {
    const conflicts = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      type: 'schema' as const,
      severity: 'warning' as const,
      location: 'COMPLETED',
      description: `Conflict ${i}`,
      options: ['keep-one'],
      suggestions: [],
    }));

    expect(strategy.canAutoMerge(conflicts)).toBe(false);
  });
});

describe('AskUserStrategy', () => {
  const strategy = new AskUserStrategy();

  it('should always require user input', () => {
    const conflicts = [];
    expect(strategy.canAutoMerge(conflicts)).toBe(false);
  });

  it('should return result requiring user input', async () => {
    const parent = { schema: {} };
    const child: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv1',
      schema: {},
      timestamp: Date.now(),
    };
    const conflicts = [
      {
        id: '1',
        type: 'contradiction' as const,
        severity: 'critical' as const,
        location: 'DECISIONS.option',
        description: 'Critical conflict',
        options: ['ask-user'],
        suggestions: [],
      },
    ];

    const result = await strategy.merge(parent, child, conflicts);

    expect(result.success).toBe(true);
    expect(result.requiredUserInput).toBe(true);
    expect(result.conflictsResolved).toBe(0);
  });
});

describe('MergeStrategyRegistry', () => {
  it('should have all default strategies registered', () => {
    const strategies = mergeStrategyRegistry.getAll();
    const names = strategies.map((s) => s.name);

    expect(names).toContain('auto-merge');
    expect(names).toContain('keep-latest');
    expect(names).toContain('keep-all');
    expect(names).toContain('summarize');
    expect(names).toContain('ask-user');
  });

  it('should select auto-merge strategy for no conflicts', () => {
    const conflicts = [];
    const strategy = mergeStrategyRegistry.selectStrategy(conflicts);

    expect(strategy.name).toBe('auto-merge');
  });

  it('should select ask-user strategy for critical conflicts', () => {
    const conflicts = [
      {
        id: '1',
        type: 'contradiction' as const,
        severity: 'critical' as const,
        location: 'DECISIONS.option',
        description: 'Critical',
        options: ['ask-user'],
        suggestions: [],
      },
    ];
    const strategy = mergeStrategyRegistry.selectStrategy(conflicts);

    expect(strategy.name).toBe('keep-latest'); // Can still auto-merge
  });

  it('should allow custom strategy registration', () => {
    const customStrategy = {
      name: 'custom-strategy',
      description: 'Custom',
      canAutoMerge: () => true,
      merge: async () => ({
        success: true,
        merged: { schema: {} },
        conflicts: [],
        conflictsResolved: 0,
        requiredUserInput: false,
      }),
    };

    mergeStrategyRegistry.register(customStrategy);
    const retrieved = mergeStrategyRegistry.get('custom-strategy');

    expect(retrieved).toBe(customStrategy);
  });
});

describe('AutoMergeEngine', () => {
  const engine = new AutoMergeEngine();

  it('should detect and preview conflicts', async () => {
    const parentConversation: any = {
      id: 'conv1',
      schema: {
        DECISIONS: { approach: 'method-a' },
      },
    };
    const childResult: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv2',
      schema: {
        DECISIONS: { approach: 'method-b' },
      },
      timestamp: Date.now(),
    };

    const conflicts = await engine.previewConflicts(parentConversation, childResult);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].type).toBe('contradiction');
  });

  it('should auto-merge when safe', async () => {
    const parentConversation: any = {
      id: 'conv1',
      schema: {
        COMPLETED: ['task1'],
      },
    };
    const childResult: ChildResult = {
      taskId: 'child1',
      conversationId: 'conv2',
      schema: {
        COMPLETED: ['task2'],
      },
      timestamp: Date.now(),
    };

    // Mock the update function
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    jest.doMock('@/lib/db/conversations', () => ({
      getConversation: jest.fn().mockResolvedValue({
        id: 'conv1',
        schema: {},
        content: [],
      }),
      updateConversation: mockUpdate,
    }));

    const result = await engine.mergeChildResult(parentConversation, childResult);

    expect(result.success).toBe(true);
    expect(result.requiredUserInput).toBe(false);
  });
});
