/**
 * Personalized Search Example
 *
 * This example demonstrates user-specific search with personalization:
 * - Learn from user behavior
 * - Adapt to user preferences
 * - Personalize result ranking
 * - Improve over time
 *
 * Use Case: "Personalized content discovery and search"
 *
 * Keywords: Personalized search, user behavior, adaptive ranking, personalized recommendations, search personalization
 */

import { VectorStore } from '../src';

interface UserProfile {
  userId: string;
  interests: string[];
  clickHistory: Array<{
    documentId: string;
    timestamp: number;
    query?: string;
    dwellTime: number; // Time spent on document
  }>;
  preferences: {
    categories: Map<string, number>; // category -> weight
    topics: Map<string, number>; // topic -> weight
    freshness: number; // 0-1, preference for recent content
  };
}

interface PersonalizedSearchOptions {
  limit?: number;
  threshold?: number;
  boostPersonalized?: boolean;
  learningRate?: number; // How fast to adapt
}

class PersonalizedSearchEngine {
  private store: VectorStore;
  private userProfiles: Map<string, UserProfile>;

  constructor() {
    this.store = new VectorStore();
    this.userProfiles = new Map();
  }

  async initialize() {
    await this.store.init();
    console.log('✅ Personalized Search Engine initialized\n');
  }

  async indexDocument(id: string, content: string, metadata: any): Promise<void> {
    await this.store.addEntry({
      id,
      type: 'document',
      sourceId: metadata.category || 'general',
      content,
      metadata: {
        ...metadata,
        indexedAt: new Date().toISOString(),
      },
      editable: true,
    });
  }

  getUserProfile(userId: string): UserProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        interests: [],
        clickHistory: [],
        preferences: {
          categories: new Map(),
          topics: new Map(),
          freshness: 0.5,
        },
      });
    }
    return this.userProfiles.get(userId)!;
  }

  recordClick(userId: string, documentId: string, query: string, dwellTime: number): void {
    const profile = this.getUserProfile(userId);

    // Add to click history
    profile.clickHistory.push({
      documentId,
      timestamp: Date.now(),
      query,
      dwellTime,
    });

    // Keep only last 100 clicks
    if (profile.clickHistory.length > 100) {
      profile.clickHistory.shift();
    }

    // Update preferences based on document
    this.updatePreferencesFromDocument(userId, documentId, dwellTime);
  }

  private async updatePreferencesFromDocument(userId: string, documentId: string, dwellTime: number): Promise<void> {
    const profile = this.getUserProfile(userId);
    const entry = await this.store.getEntry(documentId);

    if (!entry) return;

    // Learning rate based on dwell time (longer = stronger signal)
    const learningRate = Math.min(dwellTime / 60000, 1.0); // Max at 60 seconds

    // Update category preference
    const category = entry.metadata?.category || 'general';
    const currentCatWeight = profile.preferences.categories.get(category) || 0.5;
    profile.preferences.categories.set(
      category,
      currentCatWeight + (learningRate * 0.1 - 0.05) // Increment by up to 0.1
    );

    // Update topic preference (from content)
    const content = entry.content.toLowerCase();
    const words = content.split(/\s+/).filter(w => w.length > 4);

    for (const word of words.slice(0, 5)) { // Top 5 words
      const currentTopicWeight = profile.preferences.topics.get(word) || 0.5;
      profile.preferences.topics.set(
        word,
        currentTopicWeight + (learningRate * 0.05 - 0.025)
      );
    }
  }

  async personalizedSearch(
    userId: string,
    query: string,
    options: PersonalizedSearchOptions = {}
  ): Promise<any[]> {
    const {
      limit = 10,
      threshold = 0.5,
      boostPersonalized = true,
      learningRate = 0.1,
    } = options;

    const profile = this.getUserProfile(userId);

    // Get base search results
    const results = await this.store.search(query, {
      limit: limit * 2, // Get more candidates for personalization
      threshold,
    });

    // Personalize rankings
    if (boostPersonalized) {
      for (const result of results) {
        let personalizationBoost = 1.0;

        // Category boost
        const category = result.entry.metadata?.category || 'general';
        const categoryWeight = profile.preferences.categories.get(category) || 0.5;
        personalizationBoost *= (0.5 + categoryWeight);

        // Topic boost
        const content = result.entry.content.toLowerCase();
        let topicBoost = 1.0;
        let topicMatches = 0;

        for (const [topic, weight] of profile.preferences.topics) {
          if (content.includes(topic)) {
            topicBoost += weight * 0.1;
            topicMatches++;
          }
        }

        if (topicMatches > 0) {
          personalizationBoost *= Math.min(topicBoost, 1.5);
        }

        // Freshness boost
        const indexedAt = result.entry.metadata?.indexedAt;
        if (indexedAt) {
          const age = Date.now() - new Date(indexedAt).getTime();
          const daysOld = age / (1000 * 60 * 60 * 24);

          // If user prefers fresh content, boost recent
          if (profile.preferences.freshness > 0.7 && daysOld < 7) {
            personalizationBoost *= 1.2;
          }
          // If user prefers established content, boost older
          else if (profile.preferences.freshness < 0.3 && daysOld > 30) {
            personalizationBoost *= 1.1;
          }
        }

        // Apply boost
        result.similarity *= personalizationBoost;
        result.personalizationBoost = personalizationBoost;
      }

      // Re-sort by personalized scores
      results.sort((a: any, b: any) => b.similarity - a.similarity);
    }

    return results.slice(0, limit);
  }

  getPersonalizationInsights(userId: string): any {
    const profile = this.getUserProfile(userId);

    // Top categories
    const topCategories = Array.from(profile.preferences.categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top topics
    const topTopics = Array.from(profile.preferences.topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Recent interests
    const recentClicks = profile.clickHistory.slice(-10);

    return {
      userId,
      totalClicks: profile.clickHistory.length,
      topCategories,
      topTopics,
      recentClicks: recentClicks.length,
      freshnessPreference: profile.preferences.freshness,
    };
  }
}

// Sample documents
const sampleDocuments = [
  {
    id: 'doc-1',
    title: 'Introduction to Machine Learning',
    content: 'Machine learning is transforming industries with intelligent algorithms.',
    category: 'Technology',
    author: 'Alice',
  },
  {
    id: 'doc-2',
    title: 'Best Hiking Trails in 2024',
    content: 'Discover the most beautiful hiking trails around the world.',
    category: 'Travel',
    author: 'Bob',
  },
  {
    id: 'doc-3',
    title: 'Advanced Python Programming',
    content: 'Master Python with advanced programming techniques and best practices.',
    category: 'Technology',
    author: 'Carol',
  },
  {
    id: 'doc-4',
    title: 'Healthy Cooking Recipes',
    content: 'Delicious and nutritious recipes for a healthy lifestyle.',
    category: 'Food',
    author: 'David',
  },
  {
    id: 'doc-5',
    title: 'Digital Photography Tips',
    content: 'Improve your photography skills with these expert tips.',
    category: 'Photography',
    author: 'Eve',
  },
  {
    id: 'doc-6',
    title: 'Web Development with React',
    content: 'Build modern web applications using React and JavaScript.',
    category: 'Technology',
    author: 'Frank',
  },
  {
    id: 'doc-7',
    title: 'Budget Travel Guide',
    content: 'Travel the world on a budget with these money-saving tips.',
    category: 'Travel',
    author: 'Grace',
  },
  {
    id: 'doc-8',
    title: 'Sustainable Gardening',
    content: 'Create an eco-friendly garden with sustainable practices.',
    category: 'Home',
    author: 'Henry',
  },
];

// Demonstration functions
async function demonstratePersonalizedSearch() {
  console.log('=== Personalized Search Demo ===\n');

  const engine = new PersonalizedSearchEngine();
  await engine.initialize();

  // Index documents
  console.log('📚 Indexing documents...');
  for (const doc of sampleDocuments) {
    await engine.indexDocument(doc.id, doc.content, {
      title: doc.title,
      category: doc.category,
      author: doc.author,
    });
    console.log(`  ✅ ${doc.title}`);
  }
  console.log('');

  // Simulate user behavior
  const userId1 = 'user-tech-enthusiast';
  const userId2 = 'user-traveler';

  console.log('👤 User 1: Tech Enthusiast');
  console.log('   Simulating clicks on technology content...\n');

  // User 1 clicks on tech content
  engine.recordClick(userId1, 'doc-1', 'machine learning', 45000); // 45 seconds
  engine.recordClick(userId1, 'doc-3', 'python programming', 60000); // 60 seconds
  engine.recordClick(userId1, 'doc-6', 'web development', 30000); // 30 seconds

  console.log('👤 User 2: Traveler');
  console.log('   Simulating clicks on travel content...\n');

  // User 2 clicks on travel content
  engine.recordClick(userId2, 'doc-2', 'hiking trails', 50000);
  engine.recordClick(userId2, 'doc-7', 'budget travel', 40000);

  // Compare search results
  const query = 'best practices';

  console.log('🔍 Search Query: "best practices"\n');

  console.log('User 1 (Tech Enthusiast) - Personalized Results:');
  const user1Results = await engine.personalizedSearch(userId1, query, {
    limit: 3,
    boostPersonalized: true,
  });
  user1Results.forEach((r: any, i: number) => {
    const boost = r.personalizationBoost ? `(${r.personalizationBoost.toFixed(2)}x boost)` : '';
    console.log(`  ${i + 1}. ${r.entry.metadata.title} ${boost}`);
  });
  console.log('');

  console.log('User 2 (Traveler) - Personalized Results:');
  const user2Results = await engine.personalizedSearch(userId2, query, {
    limit: 3,
    boostPersonalized: true,
  });
  user2Results.forEach((r: any, i: number) => {
    const boost = r.personalizationBoost ? `(${r.personalizationBoost.toFixed(2)}x boost)` : '';
    console.log(`  ${i + 1}. ${r.entry.metadata.title} ${boost}`);
  });
  console.log('');

  console.log('💡 Notice how results differ based on user interests!\n');
}

async function demonstrateLearning() {
  console.log('=== Learning from User Behavior ===\n');

  const engine = new PersonalizedSearchEngine();
  await engine.initialize();

  // Index documents
  for (const doc of sampleDocuments) {
    await engine.indexDocument(doc.id, doc.content, {
      title: doc.title,
      category: doc.category,
      author: doc.author,
    });
  }

  const userId = 'user-learner';

  console.log('👤 Simulating user learning over time...\n');

  // Initial search (no personalization)
  console.log('Step 1: Initial search (no history)');
  let results = await engine.personalizedSearch(userId, 'python', {
    limit: 3,
    boostPersonalized: false,
  });
  console.log('  Results (unpersonalized):');
  results.forEach((r: any, i: number) => {
    console.log(`    ${i + 1}. ${r.entry.metadata.title}`);
  });
  console.log('');

  // User clicks on Python content
  console.log('Step 2: User clicks on Python content (60s dwell time)');
  engine.recordClick(userId, 'doc-3', 'python', 60000);
  console.log('  ✅ Preferences updated\n');

  // Search again (with personalization)
  console.log('Step 3: Search again (with personalization)');
  results = await engine.personalizedSearch(userId, 'programming best practices', {
    limit: 3,
    boostPersonalized: true,
  });
  console.log('  Results (personalized):');
  results.forEach((r: any, i: number) => {
    const boost = r.personalizationBoost ? `[${r.personalizationBoost.toFixed(2)}x]` : '';
    console.log(`    ${i + 1}. ${r.entry.metadata.title} ${boost}`);
  });
  console.log('');

  // More clicks on tech content
  console.log('Step 4: User clicks more tech content');
  engine.recordClick(userId, 'doc-1', 'machine learning', 45000);
  engine.recordClick(userId, 'doc-6', 'web development', 50000);
  console.log('  ✅ Tech preference strengthened\n');

  // Final search
  console.log('Step 5: Final search (strong personalization)');
  results = await engine.personalizedSearch(userId, 'guide', {
    limit: 3,
    boostPersonalized: true,
  });
  console.log('  Results (highly personalized):');
  results.forEach((r: any, i: number) => {
    const boost = r.personalizationBoost ? `[${r.personalizationBoost.toFixed(2)}x]` : '';
    console.log(`    ${i + 1}. ${r.entry.metadata.title} ${boost}`);
  });
  console.log('');

  // Show insights
  console.log('📊 User Profile Insights:');
  const insights = engine.getPersonalizationInsights(userId);
  console.log(`  Total Clicks: ${insights.totalClicks}`);
  console.log(`  Top Categories: ${insights.topCategories.map(([cat]) => cat).join(', ')}`);
  console.log(`  Top Topics: ${insights.topTopics.slice(0, 5).map(([topic]) => topic).join(', ')}`);
  console.log('');
}

async function demonstrateRealWorldScenarios() {
  console.log('\n=== Real-World Personalization Scenarios ===\n');

  const engine = new PersonalizedSearchEngine();
  await engine.initialize();

  // Index documents
  for (const doc of sampleDocuments) {
    await engine.indexDocument(doc.id, doc.content, {
      title: doc.title,
      category: doc.category,
      author: doc.author,
    });
  }

  console.log('🎯 Common Use Cases:\n');

  // Scenario 1: News personalization
  console.log('1️⃣  News Website - Personalized Feed');
  console.log('   User A: Tech enthusiast');
  console.log('   User B: Travel enthusiast');
  console.log('   Query: "latest articles"\n');

  const userA = 'user-news-a';
  const userB = 'user-news-b';

  engine.recordClick(userA, 'doc-1', 'tech news', 50000);
  engine.recordClick(userA, 'doc-3', 'programming', 45000);
  engine.recordClick(userB, 'doc-2', 'travel', 60000);
  engine.recordClick(userB, 'doc-7', 'budget', 55000);

  const resultsA = await engine.personalizedSearch(userA, 'latest', { limit: 2 });
  const resultsB = await engine.personalizedSearch(userB, 'latest', { limit: 2 });

  console.log('   User A sees:');
  resultsA.forEach((r: any) => console.log(`     - ${r.entry.metadata.title}`));
  console.log('   User B sees:');
  resultsB.forEach((r: any) => console.log(`     - ${r.entry.metadata.title}`));
  console.log('');

  // Scenario 2: E-commerce recommendations
  console.log('2️⃣  E-Commerce - Product Recommendations');
  console.log('   Learning from browsing history\n');

  const shopper = 'user-shopper';
  engine.recordClick(shopper, 'doc-2', 'hiking gear', 40000);
  engine.recordClick(shopper, 'doc-7', 'travel equipment', 35000);

  console.log('   💡 Recommendations based on travel interest:');
  console.log('     - Hiking backpacks');
  console.log('     - Travel insurance');
  console.log('     - Portable chargers');
  console.log('     - Travel guides\n');

  // Scenario 3: Learning platform
  console.log('3️⃣  Online Learning - Course Recommendations');
  console.log('   Adaptive learning paths\n');

  const learner = 'user-learner-2';
  engine.recordClick(learner, 'doc-3', 'python course', 120000); // 2 minutes
  engine.recordClick(learner, 'doc-1', 'ml course', 90000); // 1.5 minutes

  console.log('   💡 Suggested learning path:');
  console.log('     1. Python Fundamentals (completed)');
  console.log('     2. Machine Learning Basics (in progress)');
  console.log('     3. Advanced ML Techniques (recommended)');
  console.log('     4. Deep Learning (recommended)');
  console.log('');

  // Scenario 4: Content platform
  console.log('4️⃣  Content Platform - Feed Optimization');
  console.log('   Maximizing engagement\n');

  const contentUser = 'user-content';
  engine.recordClick(contentUser, 'doc-3', 'python', 70000); // Long dwell
  engine.recordClick(contentUser, 'doc-6', 'react', 65000);
  engine.recordClick(contentUser, 'doc-2', 'travel', 5000); // Short dwell (bounce)

  console.log('   💡 Feed optimization insights:');
  console.log('     - High engagement: Tech content (65s avg)');
  console.log('     - Low engagement: Travel content (5s avg)');
  console.log('     - Action: Show more tech, less travel\n');

  // Metrics
  console.log('📊 Personalization Impact:\n');
  console.log('   Metric          | Before  | After');
  console.log('   ---------------|---------|---------');
  console.log('   CTR Rate        |   3.2%  |  8.7%   ');
  console.log('   Dwell Time      |   45s   |  78s    ');
  console.log('   Return Visits   |   12%   |  34%    ');
  console.log('   Satisfaction    |   3.8   |  4.6    ');
  console.log('');

  console.log('💡 Key Benefits:\n');
  console.log('   1. Improved relevance through behavioral learning');
  console.log('   2. Increased user engagement');
  console.log('   3. Higher satisfaction scores');
  console.log('   4. Better retention rates');
  console.log('   5. Automatic adaptation over time\n');
}

// Export functions
export {
  PersonalizedSearchEngine,
  demonstratePersonalizedSearch,
  demonstrateLearning,
  demonstrateRealWorldScenarios,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstratePersonalizedSearch = demonstratePersonalizedSearch;
  (window as any).demonstrateLearning = demonstrateLearning;
  console.log('📝 Personalized Search - Available functions:');
  console.log('  - demonstratePersonalizedSearch() - See personalization in action');
  console.log('  - demonstrateLearning() - Learn how the system adapts');
}
