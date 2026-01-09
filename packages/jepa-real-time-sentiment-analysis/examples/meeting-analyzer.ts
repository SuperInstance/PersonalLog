/**
 * Meeting Sentiment Analyzer Example
 *
 * This example demonstrates tracking meeting sentiment over time:
 * - Monitor engagement levels
 * - Detect conflicts and disagreements
 * - Track emotional tone changes
 * - Improve meeting effectiveness
 *
 * Use Case: "Improve meeting effectiveness and team dynamics"
 *
 * Keywords: Meeting sentiment analysis, engagement tracking, conflict detection, meeting effectiveness, team dynamics
 */

import {
  detectSentiment,
  isPositiveSentiment,
  SentimentResult,
} from '@superinstance/jepa-real-time-sentiment-analysis';

interface MeetingMessage {
  speaker: string;
  message: string;
  timestamp: number; // Minutes from start
}

interface MeetingSegment {
  startTime: number;
  endTime: number;
  topic: string;
  sentiment: string;
  engagement: 'low' | 'medium' | 'high';
  conflict: boolean;
}

interface ParticipantStats {
  speaker: string;
  messageCount: number;
  avgSentiment: number;
  participation: number; // % of total messages
  conflictCount: number;
  positiveRatio: number;
}

interface MeetingInsight {
  type: 'conflict' | 'engagement_drop' | 'positive_peak' | 'dominance';
  timestamp: number;
  description: string;
  participants?: string[];
}

class MeetingAnalyzer {
  private messages: MeetingMessage[] = [];
  private participants: Set<string> = new Set();

  addMessage(message: MeetingMessage): void {
    this.messages.push(message);
    this.participants.add(message.speaker);
  }

  analyzeMeetingFlow(): MeetingSegment[] {
    console.log('📊 Analyzing Meeting Flow...\n');

    const segments: MeetingSegment[] = [];
    const segmentLength = 10; // 10-minute segments
    const maxTime = Math.max(...this.messages.map(m => m.timestamp));

    for (let time = 0; time < maxTime; time += segmentLength) {
      const segmentMessages = this.messages.filter(
        m => m.timestamp >= time && m.timestamp < time + segmentLength
      );

      if (segmentMessages.length === 0) continue;

      // Analyze sentiment
      const sentimentResults = segmentMessages.map(m => detectSentiment(m.message));

      // Calculate average sentiment
      const avgValence = sentimentResults.reduce((sum, r) => sum + r.valence, 0) / sentimentResults.length;
      const avgArousal = sentimentResults.reduce((sum, r) => sum + r.arousal, 0) / sentimentResults.length;

      // Determine overall sentiment
      let overallSentiment = 'neutral';
      if (avgValence > 0.6) overallSentiment = 'positive';
      else if (avgValence < 0.4) overallSentiment = 'negative';

      // Determine engagement level
      const messagesPerMinute = segmentMessages.length / segmentLength;
      let engagement: 'low' | 'medium' | 'high';
      if (messagesPerMinute < 1) engagement = 'low';
      else if (messagesPerMinute < 3) engagement = 'medium';
      else engagement = 'high';

      // Detect conflict (high arousal + low valence)
      const conflict = avgArousal > 0.7 && avgValence < 0.4;

      // Infer topic from messages
      const topic = this.inferTopic(segmentMessages);

      segments.push({
        startTime: time,
        endTime: time + segmentLength,
        topic,
        sentiment: overallSentiment,
        engagement,
        conflict,
      });
    }

    // Print segments
    segments.forEach((segment, index) => {
      const timeStr = `${segment.startTime}-${segment.endTime}m`;
      const sentimentIcon = segment.sentiment === 'positive' ? '😊' :
                           segment.sentiment === 'negative' ? '😟' : '😐';
      const engagementIcon = segment.engagement === 'high' ? '🔥' :
                            segment.engagement === 'medium' ? '⚡' : '💤';
      const conflictIcon = segment.conflict ? '⚠️ ' : '';

      console.log(`${index + 1}. ${timeStr} ${sentimentIcon} ${conflictIcon}${segment.topic}`);
      console.log(`   Sentiment: ${segment.sentiment}, Engagement: ${segment.engagement} ${engagementIcon}\n`);
    });

    return segments;
  }

  private inferTopic(messages: MeetingMessage[]): string {
    const text = messages.map(m => m.message).join(' ').toLowerCase();

    if (text.includes('budget') || text.includes('cost') || text.includes('price')) {
      return 'Budget discussion';
    } else if (text.includes('timeline') || text.includes('schedule') || text.includes('deadline')) {
      return 'Timeline planning';
    } else if (text.includes('disagree') || text.includes('concern') || text.includes('issue')) {
      return 'Conflict resolution';
    } else if (text.includes('idea') || text.includes('suggest') || text.includes('proposal')) {
      return 'Brainstorming';
    } else if (text.includes('decide') || text.includes('agree') || text.includes('conclusion')) {
      return 'Decision making';
    } else {
      return 'General discussion';
    }
  }

  analyzeParticipants(): ParticipantStats[] {
    console.log('\n👥 Participant Analysis:\n');

    const participantStats: Map<string, ParticipantStats> = new Map();
    const totalMessages = this.messages.length;

    for (const participant of this.participants) {
      const participantMessages = this.messages.filter(m => m.speaker === participant);

      const sentimentResults = participantMessages.map(m => detectSentiment(m.message));
      const avgValence = sentimentResults.reduce((sum, r) => sum + r.valence, 0) / sentimentResults.length;

      const positiveCount = sentimentResults.filter(r => isPositiveSentiment(r.sentiment)).length;
      const positiveRatio = positiveCount / sentimentResults.length;

      // Count conflicts (negative + high arousal)
      const conflictCount = sentimentResults.filter(r => r.valence < 0.4 && r.arousal > 0.7).length;

      participantStats.set(participant, {
        speaker: participant,
        messageCount: participantMessages.length,
        avgSentiment: avgValence,
        participation: (participantMessages.length / totalMessages) * 100,
        conflictCount,
        positiveRatio,
      });
    }

    // Sort by participation
    const stats = Array.from(participantStats.values()).sort((a, b) => b.messageCount - a.messageCount);

    // Print stats
    console.log('Speaker          | Messages | Participation | Avg Sentiment | Conflicts');
    console.log('-----------------|----------|----------------|----------------|----------');

    for (const stat of stats) {
      const sentimentBar = '█'.repeat(Math.round(stat.avgSentiment * 10));
      console.log(`${stat.speaker.padEnd(16)} | ${stat.messageCount.toString().padEnd(8)} | ${stat.participation.toFixed(0)}%         | ${sentimentBar.padEnd(14)} | ${stat.conflictCount}`);
    }

    console.log('');

    return stats;
  }

  detectInsights(): MeetingInsight[] {
    console.log('\n🎯 Meeting Insights:\n');

    const insights: MeetingInsight[] = [];
    const segments = this.analyzeMeetingFlow();
    const participantStats = this.analyzeParticipants();

    // Detect conflicts
    for (const segment of segments) {
      if (segment.conflict) {
        insights.push({
          type: 'conflict',
          timestamp: segment.startTime,
          description: `Conflict detected during ${segment.topic}`,
        });
      }
    }

    // Detect engagement drops
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].engagement === 'low' && segments[i - 1].engagement !== 'low') {
        insights.push({
          type: 'engagement_drop',
          timestamp: segments[i].startTime,
          description: `Engagement dropped during ${segments[i].topic}`,
        });
      }
    }

    // Detect positive peaks
    for (const segment of segments) {
      if (segment.sentiment === 'positive' && segment.engagement === 'high') {
        insights.push({
          type: 'positive_peak',
          timestamp: segment.startTime,
          description: `High positive engagement during ${segment.topic}`,
        });
      }
    }

    // Detect dominance
    for (const stat of participantStats) {
      if (stat.participation > 50) {
        insights.push({
          type: 'dominance',
          timestamp: 0,
          description: `${stat.speaker} dominated the conversation (${stat.participation.toFixed(0)}% of messages)`,
          participants: [stat.speaker],
        });
      }
    }

    // Print insights
    insights.forEach((insight, index) => {
      const icon = insight.type === 'conflict' ? '⚠️' :
                   insight.type === 'engagement_drop' ? '📉' :
                   insight.type === 'positive_peak' ? '📈' : '🎤';
      console.log(`${index + 1}. ${icon} ${insight.description}`);
    });

    console.log('');

    return insights;
  }

  generateMeetingReport(): string {
    const lines: string[] = [];
    lines.push('=== Meeting Analysis Report ===\n');

    // Overall stats
    const duration = Math.max(...this.messages.map(m => m.timestamp));
    const totalMessages = this.messages.length;
    const avgMessagesPerMinute = totalMessages / duration;

    lines.push('📊 Meeting Overview:');
    lines.push(`   Duration: ${duration} minutes`);
    lines.push(`   Total Messages: ${totalMessages}`);
    lines.push(`   Average Pace: ${avgMessagesPerMinute.toFixed(1)} messages/minute`);
    lines.push(`   Participants: ${this.participants.size}\n`);

    // Sentiment analysis
    const sentimentResults = this.messages.map(m => detectSentiment(m.message));
    const avgValence = sentimentResults.reduce((sum, r) => sum + r.valence, 0) / sentimentResults.length;
    const positiveCount = sentimentResults.filter(r => isPositiveSentiment(r.sentiment)).length;

    lines.push('😊 Overall Sentiment:');
    lines.push(`   Positive Ratio: ${(positiveCount / sentimentResults.length * 100).toFixed(0)}%`);
    lines.push(`   Average Valence: ${(avgValence * 100).toFixed(0)}%`);
    lines.push(`   Tone: ${avgValence > 0.6 ? 'Positive' : avgValence < 0.4 ? 'Negative' : 'Neutral'}\n`);

    // Key insights
    const insights = this.detectInsights();
    if (insights.length > 0) {
      lines.push('🎯 Key Insights:');
      insights.forEach((insight, index) => {
        lines.push(`   ${index + 1}. ${insight.description}`);
      });
      lines.push('');
    }

    // Recommendations
    lines.push('💡 Recommendations:\n');

    if (avgValence < 0.4) {
      lines.push('⚠️  Meeting had negative tone:');
      lines.push('   • Consider follow-up to address concerns');
      lines.push('   • Check in with participants individually');
    } else if (avgValence > 0.7) {
      lines.push('✅ Meeting was very positive:');
      lines.push('   • Great team dynamics');
      lines.push('   • Maintain this energy in future meetings');
    }

    const conflicts = insights.filter(i => i.type === 'conflict');
    if (conflicts.length > 0) {
      lines.push(`\n⚠️  ${conflicts.length} conflict(s) detected:`);
      lines.push('   • May require mediation');
      lines.push('   • Consider private follow-ups');
    }

    const drops = insights.filter(i => i.type === 'engagement_drop');
    if (drops.length > 0) {
      lines.push(`\n💤 ${drops.length} engagement drop(s) detected:`);
      lines.push('   • Shorten meeting segments');
      lines.push('   • Add interactive elements');
    }

    const dominant = insights.filter(i => i.type === 'dominance');
    if (dominant.length > 0) {
      lines.push(`\n🎤 Conversation dominance detected:`);
      lines.push('   • Encourage quieter participants');
      lines.push('   • Use round-robin format');
    }

    return lines.join('\n');
  }
}

// Sample meeting messages
const sampleMeetingMessages: MeetingMessage[] = [
  { speaker: 'Alice', message: 'Thanks for joining everyone', timestamp: 0 },
  { speaker: 'Bob', message: 'Great to be here!', timestamp: 1 },
  { speaker: 'Carol', message: 'Lets get started with the budget', timestamp: 2 },
  { speaker: 'Alice', message: 'I have concerns about the costs', timestamp: 5 },
  { speaker: 'Bob', message: 'The numbers look reasonable to me', timestamp: 7 },
  { speaker: 'Carol', message: 'We need to cut costs somewhere', timestamp: 10 },
  { speaker: 'Dave', message: 'I disagree, this investment is necessary', timestamp: 12 },
  { speaker: 'Alice', message: 'This is getting frustrating', timestamp: 15 },
  { speaker: 'Carol', message: 'Lets try to find a compromise', timestamp: 18 },
  { speaker: 'Bob', message: 'What about the timeline?', timestamp: 22 },
  { speaker: 'Dave', message: 'We can definitely meet the deadline', timestamp: 24 },
  { speaker: 'Alice', message: 'Im not sure thats realistic', timestamp: 26 },
  { speaker: 'Carol', message: 'Lets break it down into phases', timestamp: 30 },
  { speaker: 'Bob', message: 'Thats a great idea!', timestamp: 32 },
  { speaker: 'Dave', message: 'I agree, phase 1 by next month', timestamp: 35 },
  { speaker: 'Alice', message: 'That sounds achievable', timestamp: 38 },
  { speaker: 'Carol', message: 'Excellent! Were making progress', timestamp: 42 },
  { speaker: 'Bob', message: 'Love the energy team!', timestamp: 45 },
  { speaker: 'Dave', message: 'This is going to be a great project', timestamp: 48 },
];

// Demonstrations
async function demonstrateMeetingAnalysis() {
  console.log('=== Meeting Sentiment Analysis ===\n');

  const analyzer = new MeetingAnalyzer();

  // Add messages
  for (const message of sampleMeetingMessages) {
    analyzer.addMessage(message);
  }

  // Analyze meeting
  analyzer.analyzeMeetingFlow();
  analyzer.analyzeParticipants();
  analyzer.detectInsights();

  // Generate report
  console.log('\n' + analyzer.generateMeetingReport());
}

async function demonstrateRealTimeMonitoring() {
  console.log('\n=== Real-Time Meeting Monitoring ===\n');

  console.log('💡 Live Meeting Dashboard:\n');

  console.log(`
// Real-time sentiment tracking
function trackLiveMeeting() {
  const analyzer = new MeetingAnalyzer();

  // Connect to meeting transcription
  meeting.on('transcript', (data) => {
    analyzer.addMessage({
      speaker: data.speaker,
      message: data.text,
      timestamp: Date.now() / 1000 / 60
    });

    // Update dashboard every 5 messages
    if (analyzer.messages.length % 5 === 0) {
      const latest = detectSentiment(data.text);

      updateDashboard({
        sentiment: latest.sentiment,
        valence: latest.valence,
        speaker: data.speaker,
        conflict: latest.valence < 0.4 && latest.arousal > 0.7
      });
    }
  });
}

// Dashboard update
function updateDashboard(metrics) {
  // Update sentiment gauge
  document.getElementById('sentiment-gauge')
    .style.setProperty('--value', metrics.valence * 100);

  // Show conflict alert
  if (metrics.conflict) {
    showAlert('Conflict detected!', 'warning');
  }

  // Update participant stats
  updateParticipationChart(metrics.speaker);
}
  `);

  const analyzer = new MeetingAnalyzer();

  // Simulate live meeting
  console.log('🎙️  Simulating live meeting...\n');

  for (const message of sampleMeetingMessages) {
    analyzer.addMessage(message);

    // Analyze every few messages
    if (Math.random() > 0.7) {
      const latest = detectSentiment(message.message);
      const icon = isPositiveSentiment(latest.sentiment) ? '😊' : '😟';
      console.log(`[${message.timestamp}m] ${message.speaker}: ${icon} ${latest.sentiment}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ Meeting complete!');
}

async function demonstrateImprovementTips() {
  console.log('\n=== Meeting Improvement Tips ===\n');

  console.log('💡 Strategies for Better Meetings:\n');

  console.log('1️⃣  Before the Meeting');
  console.log('   • Set clear agenda and objectives');
  console.log('   • Invite necessary participants only');
  console.log('   • Prepare materials in advance');
  console.log('   • Establish ground rules\n');

  console.log('2️⃣  During the Meeting');
  console.log('   • Monitor sentiment in real-time');
  console.log('   • Address conflicts early');
  console.log('   • Encourage equal participation');
  console.log('   • Keep discussions focused\n');

  console.log('3️⃣  After the Meeting');
  console.log('   • Review sentiment analysis report');
  console.log('   • Follow up on action items');
  console.log('   • Address lingering conflicts');
  console.log('   • Collect feedback\n');

  console.log('📈 Metrics to Track:\n');
  console.log('   • Average sentiment score');
  console.log('   • Participation balance');
  console.log('   • Conflict frequency');
  console.log('   • Engagement level');
  console.log('   • Action item completion\n');

  console.log('🎯 Success Indicators:\n');
  console.log('   ✅ Positive sentiment (>70%)');
  console.log('   ✅ Balanced participation');
  console.log('   ✅ High engagement');
  console.log('   ✅ Minimal conflicts');
  console.log('   ✅ Clear action items\n');
}

// Export functions
export {
  MeetingAnalyzer,
  demonstrateMeetingAnalysis,
  demonstrateRealTimeMonitoring,
  demonstrateImprovementTips,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateMeetingAnalysis = demonstrateMeetingAnalysis;
  (window as any).demonstrateRealTimeMonitoring = demonstrateRealTimeMonitoring;
  console.log('📝 Meeting Analyzer - Available functions:');
  console.log('  - demonstrateMeetingAnalysis() - Analyze meeting sentiment');
  console.log('  - demonstrateRealTimeMonitoring() - See live monitoring demo');
}
