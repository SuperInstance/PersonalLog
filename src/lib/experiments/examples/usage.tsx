/**
 * A/B Testing Examples
 *
 * Practical examples of using the A/B testing framework
 */

import { createExperiment, startExperiment, getVariant, trackMetric, getResults } from '../api';
import { useVariant, useMetricTracker, useDurationMetric } from '../hooks';
import { Variant, VariantGroup } from '@/components/experiments/Variant';

// ============================================================================
// Example 1: Simple UI Experiment
// ============================================================================

/**
 * Create a button color experiment
 */
export function setupButtonColorExperiment() {
  const experiment = createExperiment({
    name: 'Button Color Test',
    description: 'Test if green button increases clicks vs blue button',
    type: 'ui',
    variants: [
      {
        id: 'blue',
        name: 'Blue Button',
        config: { color: 'blue', text: 'Click Me' },
        weight: 1,
        isControl: true,
      },
      {
        id: 'green',
        name: 'Green Button',
        config: { color: 'green', text: 'Click Me' },
        weight: 1,
      },
    ],
    primaryMetric: {
      id: 'clicks',
      name: 'Button Clicks',
      type: 'binary',
      direction: 'maximize',
    },
    objective: 'engagement',
    duration: 3 * 24 * 60 * 60 * 1000, // 3 days
    confidenceThreshold: 0.95,
    earlyStopping: true,
    bandit: false, // Use consistent hashing
  });

  startExperiment(experiment.id);
  return experiment;
}

/**
 * Use the button color experiment in a component
 */
export function ButtonColorExample({ userId }: { userId: string }) {
  const variant = useVariant('exp-button-color', userId);
  const trackMetric = useMetricTracker();

  if (!variant) {
    return null;
  }

  const config = variant.config as { color: string; text: string };

  const handleClick = () => {
    // Track click
    trackMetric('exp-button-color', variant.id, 'clicks', 1);
  };

  return (
    <button
      style={{ backgroundColor: config.color, color: 'white' }}
      onClick={handleClick}
    >
      {config.text}
    </button>
  );
}

// ============================================================================
// Example 2: Performance Experiment
// ============================================================================

/**
 * Test different batch sizes for performance
 */
export function setupBatchSizeExperiment() {
  const experiment = createExperiment({
    name: 'Search Batch Size',
    description: 'Optimize batch size for vector search performance',
    type: 'performance',
    variants: [
      {
        id: 'batch_10',
        name: 'Batch 10',
        config: { batchSize: 10 },
        weight: 1,
        isControl: true,
      },
      {
        id: 'batch_50',
        name: 'Batch 50',
        config: { batchSize: 50 },
        weight: 1,
      },
      {
        id: 'batch_100',
        name: 'Batch 100',
        config: { batchSize: 100 },
        weight: 1,
      },
    ],
    primaryMetric: {
      id: 'search_time',
      name: 'Average Search Time',
      type: 'duration',
      direction: 'minimize',
    },
    additionalMetrics: [
      {
        id: 'memory_usage',
        name: 'Memory Usage (MB)',
        type: 'numeric',
        direction: 'minimize',
      },
    ],
    objective: 'performance',
    duration: 7 * 24 * 60 * 60 * 1000, // 1 week
    confidenceThreshold: 0.95,
    earlyStopping: true,
    bandit: true, // Use bandit optimization
  });

  startExperiment(experiment.id);
  return experiment;
}

/**
 * Track search performance
 */
export function trackSearchPerformance(experimentId: string, variantId: string) {
  const { start, end } = useDurationMetric();

  const performSearch = async (query: string) => {
    start(experimentId, variantId, 'search_time');

    try {
      const results = await searchVectors(query);
      end(); // Automatically tracks duration

      // Track memory usage
      if (performance.memory) {
        const memUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
        trackMetric(experimentId, variantId, 'memory_usage', memUsage);
      }

      return results;
    } catch (error) {
      end(); // Still track duration even on error
      throw error;
    }
  };

  return { performSearch };
}

// ============================================================================
// Example 3: Message Density Experiment
// ============================================================================

/**
 * Test different message densities
 */
export function setupMessageDensityExperiment() {
  const experiment = createExperiment({
    name: 'Message Density',
    description: 'Test message density for optimal readability',
    type: 'ui',
    variants: [
      {
        id: 'compact',
        name: 'Compact',
        config: { spacing: '0.5rem', fontSize: 14, lineHeight: 1.4 },
        weight: 1,
      },
      {
        id: 'comfortable',
        name: 'Comfortable',
        config: { spacing: '1rem', fontSize: 16, lineHeight: 1.6 },
        weight: 1,
        isControl: true,
      },
      {
        id: 'spacious',
        name: 'Spacious',
        config: { spacing: '1.5rem', fontSize: 18, lineHeight: 1.8 },
        weight: 1,
      },
    ],
    primaryMetric: {
      id: 'engagement_time',
      name: 'Engagement Time',
      type: 'duration',
      direction: 'maximize',
    },
    additionalMetrics: [
      {
        id: 'scroll_depth',
        name: 'Scroll Depth (%)',
        type: 'ratio',
        direction: 'maximize',
      },
      {
        id: 'messages_read',
        name: 'Messages Read',
        type: 'count',
        direction: 'maximize',
      },
    ],
    objective: 'engagement',
    duration: 14 * 24 * 60 * 60 * 1000, // 2 weeks
    confidenceThreshold: 0.95,
    earlyStopping: true,
    bandit: true,
  });

  startExperiment(experiment.id);
  return experiment;
}

/**
 * Component using message density experiment
 */
export function MessageDensityExample({ userId }: { userId: string }) {
  const variants = {
    compact: (
      <div className="space-y-2 text-sm leading-tight">
        <MessageList density="compact" />
      </div>
    ),
    comfortable: (
      <div className="space-y-4 text-base leading-relaxed">
        <MessageList density="comfortable" />
      </div>
    ),
    spacious: (
      <div className="space-y-6 text-lg leading-loose">
        <MessageList density="spacious" />
      </div>
    ),
  };

  return (
    <VariantGroup
      experiment="exp-message-density"
      userId={userId}
      variants={variants}
      fallback={
        <div className="space-y-4 text-base">
          <MessageList density="comfortable" />
        </div>
      }
    />
  );
}

// ============================================================================
// Example 4: AI Temperature Experiment
// ============================================================================

/**
 * Test different AI response temperatures
 */
export function setupAITemperatureExperiment() {
  const experiment = createExperiment({
    name: 'AI Temperature',
    description: 'Test AI response creativity levels',
    type: 'ai',
    variants: [
      {
        id: 'conservative',
        name: 'Conservative (0.3)',
        config: { temperature: 0.3, topP: 0.9 },
        weight: 1,
        isControl: true,
      },
      {
        id: 'balanced',
        name: 'Balanced (0.7)',
        config: { temperature: 0.7, topP: 0.9 },
        weight: 1,
      },
      {
        id: 'creative',
        name: 'Creative (1.0)',
        config: { temperature: 1.0, topP: 0.95 },
        weight: 1,
      },
    ],
    primaryMetric: {
      id: 'satisfaction',
      name: 'User Satisfaction (1-5)',
      type: 'numeric',
      direction: 'maximize',
    },
    additionalMetrics: [
      {
        id: 'helpful',
        name: 'Helpful (yes/no)',
        type: 'binary',
        direction: 'maximize',
      },
      {
        id: 'response_length',
        name: 'Response Length (chars)',
        type: 'count',
        direction: 'maximize',
      },
    ],
    objective: 'satisfaction',
    duration: 7 * 24 * 60 * 60 * 1000,
    confidenceThreshold: 0.95,
    earlyStopping: false, // Don't stop early
    bandit: true,
  });

  startExperiment(experiment.id);
  return experiment;
}

// ============================================================================
// Example 5: Checking Results
// ============================================================================

/**
 * Component to display experiment results
 */
export function ExperimentResults({ experimentId }: { experimentId: string }) {
  const results = getResults(experimentId);

  if (!results) {
    return <div>No results yet</div>;
  }

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-4">Experiment Results</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600">Status: {results.status}</p>
        <p className="text-sm text-gray-600">
          Total Sample Size: {results.totalSampleSize}
        </p>
        <p className="text-sm text-gray-600">
          Significant: {results.hasSignificantResults ? 'Yes' : 'No'}
        </p>
      </div>

      {results.winner && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800">Winner: {results.winner.variantId}</h3>
          <p className="text-sm text-green-700">
            Probability: {results.winner.confidence}
          </p>
          <p className="text-sm text-green-700">
            Lift: {results.winner.liftPercentage}
          </p>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Variant Performance</h3>
        {Object.entries(results.variants).map(([variantId, stats]) => (
          <div key={variantId} className="mb-2 p-2 border rounded">
            <p className="font-medium">{variantId}</p>
            <p className="text-sm text-gray-600">
              Users: {stats.totalUsers}
            </p>
            {stats.probabilityOfBeingBest && (
              <p className="text-sm text-gray-600">
                P(Best): {(stats.probabilityOfBeingBest * 100).toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Recommendation: {results.recommendation}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: Complete Workflow
// ============================================================================

/**
 * Complete A/B testing workflow example
 */
export async function completeABTestingWorkflow() {
  // Step 1: Create experiment
  const experiment = setupButtonColorExperiment();
  console.log('Created experiment:', experiment.id);

  // Step 2: Wait for data collection
  console.log('Collecting data...');

  // Step 3: Periodically check results
  const checkInterval = setInterval(() => {
    const results = getResults(experiment.id);

    if (results) {
      console.log('Current results:', {
        totalUsers: results.totalSampleSize,
        hasWinner: !!results.winner,
        winner: results.winner?.variantId,
      });

      // Step 4: Complete if significant
      if (results.hasSignificantResults) {
        clearInterval(checkInterval);

        console.log('Significant results detected!');
        console.log('Winner:', results.winner);

        // Step 5: Apply winner to feature flags
        // (this would be application-specific)
        console.log('Applying winner to production...');

        // Archive experiment
        // manager.archiveExperiment(experiment.id);
      }
    }
  }, 60000); // Check every minute

  // Stop checking after experiment duration
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('Experiment duration elapsed');
  }, experiment.plannedDuration);
}

// ============================================================================
// Helper Types and Functions
// ============================================================================

interface MessageListProps {
  density: 'compact' | 'comfortable' | 'spacious';
}

function MessageList({ density }: MessageListProps) {
  // Mock message list component
  return <div>Messages with {density} density</div>;
}

async function searchVectors(query: string) {
  // Mock search function
  return [];
}

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
    };
  }
}
