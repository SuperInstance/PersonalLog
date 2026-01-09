/**
 * Video Sentiment Analysis Example
 *
 * This example demonstrates sentiment analysis for video content:
 * - Analyze video comments and reactions
 * - Track emotional journey throughout video
 * - Scene-by-scene sentiment analysis
 * - Content performance insights
 *
 * Use Case: "Content creators analyzing video performance"
 *
 * Keywords: Video sentiment analysis, emotional journey, scene analysis, video analytics, content performance
 */

import {
  detectSentiment,
  isPositiveSentiment,
  SentimentResult,
} from '@superinstance/jepa-real-time-sentiment-analysis';

interface VideoComment {
  id: string;
  username: string;
  message: string;
  timestamp: number; // Video timestamp in seconds
}

interface SceneSegment {
  startTime: number;
  endTime: number;
  title: string;
  comments: VideoComment[];
}

interface EmotionalJourneyPoint {
  timestamp: number;
  sentiment: string;
  positivity: number;
  engagement: number;
  dominantEmotion: string;
}

interface VideoInsight {
  type: 'peak' | 'drop' | 'controversial' | 'viral';
  timestamp: number;
  description: string;
  sentimentScore: number;
}

class VideoSentimentAnalyzer {
  private comments: VideoComment[] = [];
  private scenes: SceneSegment[] = [];

  loadComments(comments: VideoComment[]): void {
    this.comments = comments;
    console.log(`📝 Loaded ${comments.length} comments\n`);
  }

  defineScenes(scenes: SceneSegment[]): void {
    this.scenes = scenes;
    console.log(`🎬 Defined ${scenes.length} scenes\n`);
  }

  analyzeOverallSentiment(): any {
    console.log('🎯 Overall Video Sentiment:\n');

    const sentimentCounts = new Map<string, number>();
    let positiveCount = 0;

    for (const comment of this.comments) {
      const result = detectSentiment(comment.message);
      sentimentCounts.set(result.sentiment, (sentimentCounts.get(result.sentiment) || 0) + 1);

      if (isPositiveSentiment(result.sentiment)) {
        positiveCount++;
      }
    }

    const total = this.comments.length;
    const positiveRatio = positiveCount / total;

    console.log(`   Total Comments: ${total}`);
    console.log(`   Positive Ratio: ${(positiveRatio * 100).toFixed(0)}%`);
    console.log('\n   Sentiment Breakdown:');

    for (const [sentiment, count] of sentimentCounts) {
      const percentage = (count / total * 100).toFixed(0);
      console.log(`     ${sentiment}: ${count} (${percentage}%)`);
    }

    return {
      total,
      positiveRatio,
      sentimentCounts: Object.fromEntries(sentimentCounts),
    };
  }

  analyzeEmotionalJourney(interval: number = 60): EmotionalJourneyPoint[] {
    console.log(`\n📈 Emotional Journey (every ${interval}s):\n`);

    const journey: EmotionalJourneyPoint[] = [];
    const maxTime = Math.max(...this.comments.map(c => c.timestamp));

    for (let time = 0; time < maxTime; time += interval) {
      const windowComments = this.comments.filter(
        c => c.timestamp >= time && c.timestamp < time + interval
      );

      if (windowComments.length === 0) continue;

      // Analyze sentiment in this window
      const sentimentCounts = new Map<string, number>();
      let totalPositivity = 0;

      for (const comment of windowComments) {
        const result = detectSentiment(comment.message);
        sentimentCounts.set(result.sentiment, (sentimentCounts.get(result.sentiment) || 0) + 1);

        if (isPositiveSentiment(result.sentiment)) {
          totalPositivity++;
        }
      }

      // Find dominant sentiment
      let dominantSentiment = '';
      let maxCount = 0;
      for (const [sentiment, count] of sentimentCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantSentiment = sentiment;
        }
      }

      const positivity = totalPositivity / windowComments.length;

      journey.push({
        timestamp: time,
        sentiment: dominantSentiment,
        positivity,
        engagement: windowComments.length,
        dominantEmotion: dominantSentiment,
      });
    }

    // Print journey
    journey.forEach(point => {
      const minutes = Math.floor(point.timestamp / 60);
      const seconds = point.timestamp % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const sentimentIcon = isPositiveSentiment(point.sentiment) ? '😊' : '😟';

      console.log(`   ${timeStr} ${sentimentIcon} ${point.sentiment} (${(point.positivity * 100).toFixed(0)}% positive) - ${point.engagement} comments`);
    });

    return journey;
  }

  analyzeByScene(): any[] {
    if (this.scenes.length === 0) {
      console.log('\n⚠️  No scenes defined for scene-by-scene analysis\n');
      return [];
    }

    console.log('\n🎬 Scene-by-Scene Analysis:\n');

    const sceneAnalysis: any[] = [];

    for (const scene of this.scenes) {
      const sceneComments = this.comments.filter(
        c => c.timestamp >= scene.startTime && c.timestamp < scene.endTime
      );

      if (sceneComments.length === 0) {
        sceneAnalysis.push({
          scene: scene.title,
          startTime: scene.startTime,
          endTime: scene.endTime,
          commentCount: 0,
          avgSentiment: 'N/A',
          positiveRatio: 0,
        });
        continue;
      }

      const sentimentCounts = new Map<string, number>();
      let positiveCount = 0;

      for (const comment of sceneComments) {
        const result = detectSentiment(comment.message);
        sentimentCounts.set(result.sentiment, (sentimentCounts.get(result.sentiment) || 0) + 1);

        if (isPositiveSentiment(result.sentiment)) {
          positiveCount++;
        }
      }

      // Find average sentiment
      let dominantSentiment = '';
      let maxCount = 0;
      for (const [sentiment, count] of sentimentCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantSentiment = sentiment;
        }
      }

      const positiveRatio = positiveCount / sceneComments.length;

      sceneAnalysis.push({
        scene: scene.title,
        startTime: scene.startTime,
        endTime: scene.endTime,
        commentCount: sceneComments.length,
        avgSentiment: dominantSentiment,
        positiveRatio,
      });

      const timeStr = `${Math.floor(scene.startTime / 60)}:${(scene.startTime % 60).toString().padStart(2, '0')}`;
      console.log(`   ${timeStr} "${scene.title}"`);
      console.log(`     Comments: ${sceneComments.length}`);
      console.log(`     Sentiment: ${dominantSentiment} (${(positiveRatio * 100).toFixed(0)}% positive)\n`);
    }

    return sceneAnalysis;
  }

  identifyKeyMoments(): VideoInsight[] {
    console.log('\n🎯 Key Moments & Insights:\n');

    const insights: VideoInsight[] = [];
    const journey = this.analyzeEmotionalJourney(30);

    // Find peaks
    const maxEngagement = Math.max(...journey.map(j => j.engagement));
    const peakMoment = journey.find(j => j.engagement === maxEngagement);

    if (peakMoment && maxEngagement > 5) {
      insights.push({
        type: 'peak',
        timestamp: peakMoment.timestamp,
        description: `Peak engagement at ${Math.floor(peakMoment.timestamp / 60)}:${(peakMoment.timestamp % 60).toString().padStart(2, '0')}`,
        sentimentScore: peakMoment.positivity,
      });
    }

    // Find drops
    for (let i = 1; i < journey.length; i++) {
      const drop = journey[i - 1].positivity - journey[i].positivity;
      if (drop > 0.3) {
        insights.push({
          type: 'drop',
          timestamp: journey[i].timestamp,
          description: `Sentiment dropped ${(drop * 100).toFixed(0)}%`,
          sentimentScore: journey[i].positivity,
        });
      }
    }

    // Find controversial moments (mixed sentiment)
    for (const point of journey) {
      if (point.engagement > 5 && point.positivity > 0.3 && point.positivity < 0.7) {
        insights.push({
          type: 'controversial',
          timestamp: point.timestamp,
          description: `Mixed reactions at ${Math.floor(point.timestamp / 60)}:${(point.timestamp % 60).toString().padStart(2, '0')}`,
          sentimentScore: point.positivity,
        });
      }
    }

    // Print insights
    insights.forEach((insight, index) => {
      const icon = insight.type === 'peak' ? '📈' :
                   insight.type === 'drop' ? '📉' :
                   insight.type === 'controversial' ? '⚠️' : '🔥';
      console.log(`   ${index + 1}. ${icon} ${insight.description}`);
      console.log(`      Sentiment: ${(insight.sentimentScore * 100).toFixed(0)}% positive\n`);
    });

    return insights;
  }

  generateReport(): string {
    const lines: string[] = [];
    lines.push('=== Video Sentiment Analysis Report ===\n');

    // Overall stats
    const overall = this.analyzeOverallSentiment();
    lines.push('📊 Overall Performance:');
    lines.push(`   Total Comments: ${overall.total}`);
    lines.push(`   Positive Ratio: ${(overall.positiveRatio * 100).toFixed(0)}%\n`);

    // Key moments
    const insights = this.identifyKeyMoments();
    if (insights.length > 0) {
      lines.push('🎯 Key Moments:');
      insights.forEach((insight, index) => {
        lines.push(`   ${index + 1}. ${insight.description}`);
      });
      lines.push('');
    }

    // Recommendations
    lines.push('💡 Recommendations:');

    if (overall.positiveRatio > 0.8) {
      lines.push('   ✅ Excellent audience response!');
      lines.push('   • Maintain this content style');
      lines.push('   • Create more videos like this');
    } else if (overall.positiveRatio > 0.6) {
      lines.push('   ⚠️  Good response with room for improvement');
      lines.push('   • Analyze drop-off points');
      lines.push('   • Address controversial topics carefully');
    } else {
      lines.push('   ❌ Poor audience response');
      lines.push('   • Review content strategy');
      lines.push('   • Consider reworking approach');
    }

    return lines.join('\n');
  }
}

// Sample video comments
const sampleVideoComments: VideoComment[] = [
  { id: '1', username: 'user1', message: 'Great intro! 👍', timestamp: 15 },
  { id: '2', username: 'user2', message: 'This is amazing!', timestamp: 30 },
  { id: '3', username: 'user3', message: 'Love the explanation', timestamp: 45 },
  { id: '4', username: 'user4', message: 'Best part so far!', timestamp: 60 },
  { id: '5', username: 'user5', message: 'This is boring...', timestamp: 90 },
  { id: '6', username: 'user6', message: 'Can we move on?', timestamp: 105 },
  { id: '7', username: 'user7', message: 'Not interesting', timestamp: 120 },
  { id: '8', username: 'user8', message: 'Getting better now', timestamp: 150 },
  { id: '9', username: 'user9', message: 'Wow! That twist!', timestamp: 180 },
  { id: '10', username: 'user10', message: 'Incredible ending!', timestamp: 210 },
  { id: '11', username: 'user11', message: 'Mind blown 🤯', timestamp: 225 },
  { id: '12', username: 'user12', message: 'Best video ever!', timestamp: 240 },
];

// Sample scenes
const sampleScenes: SceneSegment[] = [
  { startTime: 0, endTime: 90, title: 'Introduction', comments: [] },
  { startTime: 90, endTime: 150, title: 'Deep Dive', comments: [] },
  { startTime: 150, endTime: 240, title: 'Conclusion', comments: [] },
];

// Demonstrations
async function demonstrateVideoSentiment() {
  console.log('=== Video Sentiment Analysis ===\n');

  const analyzer = new VideoSentimentAnalyzer();
  analyzer.loadComments(sampleVideoComments);
  analyzer.defineScenes(sampleScenes);

  // Analyze overall sentiment
  analyzer.analyzeOverallSentiment();

  // Emotional journey
  analyzer.analyzeEmotionalJourney(60);

  // Scene analysis
  analyzer.analyzeByScene();

  // Key moments
  analyzer.identifyKeyMoments();

  // Generate report
  console.log('\n' + analyzer.generateReport());
}

async function demonstrateContentOptimization() {
  console.log('\n=== Content Optimization Insights ===\n');

  const analyzer = new VideoSentimentAnalyzer();
  analyzer.loadComments(sampleVideoComments);

  console.log('💡 Content Creator Tips:\n');

  console.log('1️⃣  Identify Peak Engagement Points');
  console.log('   - Find timestamps with highest positive sentiment');
  console.log('   - Replicate those elements in future videos');
  console.log('   - Create highlights from these moments\n');

  console.log('2️⃣  Address Drop-Off Points');
  console.log('   - Detect where sentiment decreases');
  console.log('   - Edit or rework those sections');
  console.log('   - Add hooks to maintain interest\n');

  console.log('3️⃣  Optimize Pacing');
  console.log('   - Match content pace to audience energy');
  console.log('   - Fast pace for high engagement topics');
  console.log('   - Slow down for complex explanations\n');

  console.log('4️⃣  Title & Thumbnail Optimization');
  console.log('   - Use sentiment analysis to test titles');
  console.log('   - A/B test thumbnail emotional impact');
  console.log('   - Align content with audience expectations\n');

  console.log('5️⃣  Community Engagement');
  console.log('   - Respond to comments with low sentiment');
  console.log('   - Pin positive comments');
  console.log('   - Address concerns constructively\n');

  // Demonstrate optimization workflow
  console.log('🔧 Optimization Workflow:\n');

  console.log(`
// 1. Analyze video performance
const analyzer = new VideoSentimentAnalyzer();
analyzer.loadComments(videoComments);

// 2. Get emotional journey
const journey = analyzer.analyzeEmotionalJourney(60);

// 3. Find best performing segment
const bestSegment = journey.reduce((best, current) =>
  current.positivity > best.positivity ? current : best
);

console.log(\`Best segment at \${bestSegment.timestamp}s\`);

// 4. Create highlight clip
extractClip(bestSegment.timestamp, bestSegment.timestamp + 60);

// 5. A/B test improvements
testVariation('improved-cut', improvedVersion);
comparePerformance('original', 'improved-cut');
  `);
}

async function demonstratePlatformAnalytics() {
  console.log('\n=== Platform Analytics Integration ===\n');

  console.log('🎬 Video Platform Features:\n');

  console.log('YouTube Analytics:');
  console.log('  - Comment sentiment over time');
  console.log('  - Audience retention vs sentiment');
  console.log('  - A/B test thumbnail impact');
  console.log('  - Identify viral moments\n');

  console.log('TikTok Analytics:');
  console.log('  - Real-time comment sentiment');
  console.log('  - Trending emotional topics');
  console.log('  - Engagement prediction');
  console.log('  - Content recommendations\n');

  console.log('Instagram Reels:');
  console.log('  - Reaction sentiment analysis');
  console.log('  - Optimal posting time');
  console.log('  - Hashtag effectiveness');
  console.log('  - Collaborator impact\n');

  console.log('💡 Key Metrics:\n');
  console.log('   • Sentiment Score: 0-100 (higher is better)');
  console.log('   • Engagement Rate: Comments per view');
  console.log('   • Retention vs Sentiment: Correlation');
  console.log('   • Viral Potential: Peak sentiment moments');
  console.log('   • Audience Loyalty: Returning commenters\n');
}

// Export functions
export {
  VideoSentimentAnalyzer,
  demonstrateVideoSentiment,
  demonstrateContentOptimization,
  demonstratePlatformAnalytics,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateVideoSentiment = demonstrateVideoSentiment;
  (window as any).demonstrateContentOptimization = demonstrateContentOptimization;
  console.log('📝 Video Sentiment Analysis - Available functions:');
  console.log('  - demonstrateVideoSentiment() - Analyze video sentiment');
  console.log('  - demonstrateContentOptimization() - Learn optimization strategies');
}
