/**
 * Live Stream Monitor Example
 *
 * This example demonstrates real-time sentiment monitoring for live streams:
 * - Track audience emotions during live broadcasts
 * - Detect engagement spikes and drops
 - Identify controversial moments
 * - Real-time emotional analytics dashboard
 *
 * Use Case: "Measure audience reaction during live streams"
 *
 * Keywords: Live stream sentiment, real-time emotion tracking, audience engagement, stream analytics, live monitoring
 */

import {
  detectSentiment,
  isPositiveSentiment,
  SentimentResult,
} from '@superinstance/jepa-real-time-sentiment-analysis';

interface StreamComment {
  id: string;
  username: string;
  message: string;
  timestamp: number;
}

interface SentimentSnapshot {
  timestamp: number;
  totalComments: number;
  sentimentScores: Map<string, number>;
  dominantSentiment: string;
  positiveRatio: number;
  engagement: 'low' | 'medium' | 'high';
}

interface StreamInsight {
  type: 'spike' | 'drop' | 'controversy' | 'milestone';
  timestamp: number;
  description: string;
  sentiment?: string;
  magnitude: number;
}

class LiveStreamMonitor {
  private commentHistory: StreamComment[] = [];
  private sentimentHistory: SentimentSnapshot[] = [];
  private insights: StreamInsight[] = [];
  private updateInterval: number = 5000; // 5 seconds
  private intervalId: number | null = null;

  constructor(private windowSize: number = 60) {} // 60 second window

  startMonitoring(): void {
    console.log('🎥 Starting live stream sentiment monitoring...\n');
    console.log(`   Update interval: ${this.updateInterval / 1000}s`);
    console.log(`   Analysis window: ${this.windowSize}s\n`);

    this.intervalId = window.setInterval(() => {
      this.analyzeSentiment();
    }, this.updateInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('\n⏹️  Stopped monitoring');
    }
  }

  addComment(comment: StreamComment): void {
    this.commentHistory.push(comment);

    // Keep only comments within the time window
    const cutoff = Date.now() - this.windowSize * 1000;
    this.commentHistory = this.commentHistory.filter(c => c.timestamp > cutoff);
  }

  private analyzeSentiment(): void {
    const now = Date.now();
    const recentComments = this.commentHistory.filter(
      c => c.timestamp > now - this.updateInterval
    );

    if (recentComments.length === 0) {
      console.log('⏳ No comments in this interval');
      return;
    }

    // Analyze sentiment of all recent comments
    const sentimentScores = new Map<string, number>();
    let positiveCount = 0;

    for (const comment of recentComments) {
      const result = detectSentiment(comment.message);
      const sentiment = result.sentiment;

      sentimentScores.set(sentiment, (sentimentScores.get(sentiment) || 0) + 1);

      if (isPositiveSentiment(sentiment)) {
        positiveCount++;
      }
    }

    // Find dominant sentiment
    let dominantSentiment = '';
    let maxCount = 0;
    for (const [sentiment, count] of sentimentScores) {
      if (count > maxCount) {
        maxCount = count;
        dominantSentiment = sentiment;
      }
    }

    // Calculate positive ratio
    const positiveRatio = positiveCount / recentComments.length;

    // Determine engagement level
    const commentsPerSecond = recentComments.length / (this.updateInterval / 1000);
    let engagement: 'low' | 'medium' | 'high';
    if (commentsPerSecond < 1) {
      engagement = 'low';
    } else if (commentsPerSecond < 3) {
      engagement = 'medium';
    } else {
      engagement = 'high';
    }

    // Create snapshot
    const snapshot: SentimentSnapshot = {
      timestamp: now,
      totalComments: recentComments.length,
      sentimentScores,
      dominantSentiment,
      positiveRatio,
      engagement,
    };

    this.sentimentHistory.push(snapshot);

    // Detect insights
    this.detectInsights(snapshot);

    // Print status
    this.printStatus(snapshot);
  }

  private detectInsights(current: SentimentSnapshot): void {
    const previous = this.sentimentHistory[this.sentimentHistory.length - 2];

    if (!previous) return;

    // Detect sentiment spike
    if (current.totalComments > previous.totalComments * 2) {
      this.insights.push({
        type: 'spike',
        timestamp: current.timestamp,
        description: `Comment volume spike! ${current.totalComments} comments`,
        magnitude: current.totalComments / previous.totalComments,
      });
    }

    // Detect sentiment drop
    if (current.positiveRatio < previous.positiveRatio - 0.2) {
      this.insights.push({
        type: 'drop',
        timestamp: current.timestamp,
        description: `Sentiment dropped to ${(current.positiveRatio * 100).toFixed(0)}% positive`,
        sentiment: 'negative',
        magnitude: previous.positiveRatio - current.positiveRatio,
      });
    }

    // Detect controversy (mixed sentiment with high volume)
    const sentimentCount = current.sentimentScores.size;
    if (sentimentCount >= 3 && current.engagement === 'high') {
      this.insights.push({
        type: 'controversy',
        timestamp: current.timestamp,
        description: 'Mixed reactions detected - potential controversy',
        magnitude: current.totalComments,
      });
    }
  }

  private printStatus(snapshot: SentimentSnapshot): void {
    const time = new Date(snapshot.timestamp).toLocaleTimeString();

    console.log(`📊 [${time}] Stream Status:`);
    console.log(`   Comments: ${snapshot.totalComments} (${snapshot.engagement} engagement)`);
    console.log(`   Dominant: ${snapshot.dominantSentiment}`);
    console.log(`   Positive: ${(snapshot.positiveRatio * 100).toFixed(0)}%`);

    // Print sentiment breakdown
    console.log('   Breakdown:');
    for (const [sentiment, count] of snapshot.sentimentScores) {
      const percentage = (count / snapshot.totalComments * 100).toFixed(0);
      console.log(`     ${sentiment}: ${count} (${percentage}%)`);
    }

    // Print recent insights
    const recentInsights = this.insights.filter(
      i => i.timestamp > Date.now() - 10000
    );

    if (recentInsights.length > 0) {
      console.log('   🚨 Insights:');
      recentInsights.forEach(insight => {
        const icon = insight.type === 'spike' ? '📈' :
                     insight.type === 'drop' ? '📉' :
                     insight.type === 'controversy' ? '⚠️' : '🎯';
        console.log(`     ${icon} ${insight.description}`);
      });
    }

    console.log('');
  }

  generateReport(): string {
    const lines: string[] = [];
    lines.push('=== Live Stream Sentiment Report ===\n');

    if (this.sentimentHistory.length === 0) {
      lines.push('No data available');
      return lines.join('\n');
    }

    // Overall statistics
    const totalComments = this.commentHistory.length;
    const avgPositive = this.sentimentHistory.reduce((sum, s) => sum + s.positiveRatio, 0) / this.sentimentHistory.length;

    lines.push('📊 Overall Statistics:');
    lines.push(`   Total Comments: ${totalComments}`);
    lines.push(`   Average Positive Sentiment: ${(avgPositive * 100).toFixed(0)}%`);
    lines.push(`   Monitoring Duration: ${this.sentimentHistory.length * (this.updateInterval / 1000)}s\n`);

    // Sentiment distribution
    const sentimentTotals = new Map<string, number>();
    for (const snapshot of this.sentimentHistory) {
      for (const [sentiment, count] of snapshot.sentimentScores) {
        sentimentTotals.set(sentiment, (sentimentTotals.get(sentiment) || 0) + count);
      }
    }

    lines.push('😊 Sentiment Distribution:');
    for (const [sentiment, count] of sentimentTotals) {
      const percentage = (count / totalComments * 100).toFixed(0);
      lines.push(`   ${sentiment}: ${count} (${percentage}%)`);
    }
    lines.push('');

    // Key insights
    if (this.insights.length > 0) {
      lines.push('🎯 Key Moments:');
      this.insights.slice(0, 10).forEach((insight, index) => {
        const time = new Date(insight.timestamp).toLocaleTimeString();
        lines.push(`   ${index + 1}. [${time}] ${insight.description}`);
      });
      lines.push('');
    }

    // Engagement timeline
    lines.push('📈 Engagement Timeline:');
    this.sentimentHistory.slice(0, 10).forEach(snapshot => {
      const time = new Date(snapshot.timestamp).toLocaleTimeString();
      const engagementIcon = snapshot.engagement === 'high' ? '🔥' :
                            snapshot.engagement === 'medium' ? '⚡' : '💤';
      lines.push(`   ${time} ${engagementIcon} ${snapshot.totalComments} comments`);
    });

    return lines.join('\n');
  }
}

// Sample live stream comments
const sampleStreamComments: StreamComment[] = [
  { id: '1', username: 'user1', message: 'This is amazing! 🔥', timestamp: Date.now() - 59000 },
  { id: '2', username: 'user2', message: 'Best stream ever!', timestamp: Date.now() - 55000 },
  { id: '3', username: 'user3', message: 'Love this content', timestamp: Date.now() - 50000 },
  { id: '4', username: 'user4', message: 'Boring...', timestamp: Date.now() - 45000 },
  { id: '5', username: 'user5', message: 'Can you explain that again?', timestamp: Date.now() - 40000 },
  { id: '6', username: 'user6', message: 'Wow! Just wow!', timestamp: Date.now() - 35000 },
  { id: '7', username: 'user7', message: 'This is exactly what I needed', timestamp: Date.now() - 30000 },
  { id: '8', username: 'user8', message: 'Disappointed with this segment', timestamp: Date.now() - 25000 },
  { id: '9', username: 'user9', message: 'Keep up the great work! 👏', timestamp: Date.now() - 20000 },
  { id: '10', username: 'user10', message: 'This is changing my life!', timestamp: Date.now() - 15000 },
  { id: '11', username: 'user11', message: 'Thank you so much!', timestamp: Date.now() - 10000 },
  { id: '12', username: 'user12', message: 'Incredible insights', timestamp: Date.now() - 5000 },
];

// Demonstration
async function demonstrateLivestreamMonitoring() {
  console.log('=== Live Stream Sentiment Monitoring ===\n');

  const monitor = new LiveStreamMonitor(60);
  monitor.startMonitoring();

  // Simulate live comments
  console.log('💬 Simulating live chat...\n');

  for (const comment of sampleStreamComments) {
    monitor.addComment(comment);

    // Simulate real-time arrival
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Wait for analysis
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Stop monitoring and show report
  monitor.stopMonitoring();

  console.log('\n' + monitor.generateReport());
}

async function demonstrateRealTimeDashboard() {
  console.log('\n=== Real-Time Dashboard Example ===\n');

  const monitor = new LiveStreamMonitor(60);

  console.log('💡 Dashboard Integration:\n');

  console.log(`
// Frontend integration
function setupDashboard(monitor) {
  // Update sentiment gauge
  setInterval(() => {
    const latest = monitor.sentimentHistory[monitor.sentimentHistory.length - 1];
    if (latest) {
      updateSentimentGauge(latest.positiveRatio);
      updateEngagementMeter(latest.engagement);
      updateCommentVolume(latest.totalComments);
    }
  }, 1000);

  // Show insights as alerts
  monitor.insights.forEach(insight => {
    if (insight.type === 'spike') {
      showAlert('📈 Comment spike detected!', 'info');
    } else if (insight.type === 'drop') {
      showAlert('📉 Sentiment dropping!', 'warning');
    } else if (insight.type === 'controversy') {
      showAlert('⚠️ Controversy detected!', 'danger');
    }
  });
}

// Sentiment gauge update
function updateSentimentGauge(ratio) {
  const gauge = document.getElementById('sentiment-gauge');
  gauge.style.width = \`\${ratio * 100}%\`;
  gauge.className = ratio > 0.7 ? 'positive' : ratio > 0.4 ? 'neutral' : 'negative';
}
  `);

  monitor.startMonitoring();

  // Add some comments
  for (const comment of sampleStreamComments.slice(0, 6)) {
    monitor.addComment(comment);
  }

  await new Promise(resolve => setTimeout(resolve, 6000));

  monitor.stopMonitoring();
}

async function demonstratePlatformIntegration() {
  console.log('\n=== Platform Integration Example ===\n');

  console.log('🎯 Streaming Platforms:\n');

  console.log('1️⃣  Twitch Integration');
  console.log('   - Connect to Twitch IRC');
  console.log('   - Monitor chat in real-time');
  console.log('   - Alert streamer to sentiment changes');
  console.log('   - Overlay sentiment metrics on stream\n');

  console.log('2️⃣  YouTube Live Integration');
  console.log('   - Use YouTube Live Chat API');
  console.log('   - Track super chat sentiments');
  console.log('   - Measure audience satisfaction');
  console.log('   - Optimize content in real-time\n');

  console.log('3️⃣  Facebook Live Integration');
  console.log('   - Monitor reactions and comments');
  console.log('   - Track engagement metrics');
  console.log('   - Identify viral moments\n');

  console.log('4️⃣  TikTok Live Integration');
  console.log('   - Real-time comment analysis');
  console.log('   - Detect trending topics');
  console.log('   - Measure audience response\n');

  console.log('💡 Use Cases:\n');
  console.log('   • Streamer Performance Optimization');
  console.log('   • Audience Engagement Analysis');
  console.log('   • Content Quality Monitoring');
  console.log('   • Sponsorship ROI Measurement');
  console.log('   • Community Management\n');
}

// Export functions
export {
  LiveStreamMonitor,
  demonstrateLivestreamMonitoring,
  demonstrateRealTimeDashboard,
  demonstratePlatformIntegration,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateLivestreamMonitoring = demonstrateLivestreamMonitoring;
  (window as any).demonstrateRealTimeDashboard = demonstrateRealTimeDashboard;
  console.log('📝 Live Stream Monitor - Available functions:');
  console.log('  - demonstrateLivestreamMonitoring() - Monitor live stream sentiment');
  console.log('  - demonstrateRealTimeDashboard() - See dashboard integration');
}
