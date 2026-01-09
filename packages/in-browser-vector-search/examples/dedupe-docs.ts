/**
 * Document Deduplication Example
 *
 * This example demonstrates finding duplicate and near-duplicate documents:
 * - Detect exact duplicates
 * - Find near-duplicates (paraphrased content)
 * - Content clustering by similarity
 * - Smart document merging
 *
 * Use Case: "Clean up document databases and content management systems"
 *
 * Keywords: Document deduplication, near-duplicate detection, content clustering, duplicate documents, document similarity
 */

import { VectorStore } from '../src';

interface Document {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  category: string;
}

interface DuplicateGroup {
  groupId: string;
  original: Document;
  duplicates: Array<{
    document: Document;
    similarity: number;
    type: 'exact' | 'near' | 'related';
  }>;
  recommendation: 'keep_original' | 'merge' | 'review_needed';
}

class DocumentDeduplicator {
  private store: VectorStore;

  constructor() {
    this.store = new VectorStore();
  }

  async initialize() {
    await this.store.init();
    console.log('✅ Document Deduplicator initialized\n');
  }

  async indexDocument(doc: Document): Promise<void> {
    await this.store.addEntry({
      id: doc.id,
      type: 'document',
      sourceId: doc.category,
      content: `${doc.title}\n\n${doc.content}`,
      metadata: {
        title: doc.title,
        author: doc.author,
        createdAt: doc.createdAt,
        category: doc.category,
        wordCount: doc.content.split(/\s+/).length,
      },
      editable: true,
    });
  }

  async findDuplicates(
    docId: string,
    exactThreshold: number = 0.98,
    nearThreshold: number = 0.90,
    relatedThreshold: number = 0.80
  ): Promise<DuplicateGroup | null> {
    const entry = await this.store.getEntry(docId);
    if (!entry) return null;

    const results = await this.store.search(entry.content, {
      limit: 20,
      threshold: relatedThreshold,
    });

    const duplicates = results
      .filter((r: any) => r.entry.id !== docId) // Exclude self
      .map((r: any) => {
        let type: 'exact' | 'near' | 'related';

        if (r.similarity >= exactThreshold) {
          type = 'exact';
        } else if (r.similarity >= nearThreshold) {
          type = 'near';
        } else {
          type = 'related';
        }

        return {
          document: {
            id: r.entry.id,
            title: r.entry.metadata.title,
            content: r.entry.content,
            author: r.entry.metadata.author,
            createdAt: r.entry.metadata.createdAt,
            category: r.entry.metadata.category,
          },
          similarity: r.similarity,
          type,
        };
      });

    if (duplicates.length === 0) {
      return null;
    }

    // Determine recommendation
    let recommendation: 'keep_original' | 'merge' | 'review_needed';

    const exactCount = duplicates.filter(d => d.type === 'exact').length;
    const nearCount = duplicates.filter(d => d.type === 'near').length;

    if (exactCount > 0) {
      recommendation = 'keep_original';
    } else if (nearCount > 0) {
      recommendation = 'merge';
    } else {
      recommendation = 'review_needed';
    }

    return {
      groupId: `group-${docId}`,
      original: {
        id: docId,
        title: entry.metadata.title,
        content: entry.content,
        author: entry.metadata.author,
        createdAt: entry.metadata.createdAt,
        category: entry.metadata.category,
      },
      duplicates,
      recommendation,
    };
  }

  async findAllDuplicateGroups(): Promise<DuplicateGroup[]> {
    const allEntries = await this.store.getEntries();
    const processed = new Set<string>();
    const groups: DuplicateGroup[] = [];

    for (const entry of allEntries) {
      if (processed.has(entry.id)) continue;

      const group = await this.findDuplicates(entry.id);

      if (group && group.duplicates.length > 0) {
        groups.push(group);
        processed.add(entry.id);
        group.duplicates.forEach(d => processed.add(d.document.id));
      }
    }

    return groups;
  }

  async clusterByCategory(category: string, threshold: number = 0.75): Promise<any[]> {
    const results = await this.store.search(category, {
      limit: 100,
      threshold,
    });

    const clusters: Map<string, any[]> = new Map();

    for (const result of results) {
      const entry = result.entry;
      const cat = entry.metadata.category;

      if (!clusters.has(cat)) {
        clusters.set(cat, []);
      }

      clusters.get(cat)!.push({
        id: entry.id,
        title: entry.metadata.title,
        similarity: result.similarity,
      });
    }

    return Array.from(clusters.entries()).map(([category, docs]) => ({
      category,
      documents: docs,
    }));
  }
}

// Sample documents with duplicates
const sampleDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Introduction to Machine Learning',
    content: 'Machine learning is a subset of artificial intelligence that focuses on building systems that can learn from data. It enables computers to improve their performance on a specific task through experience.',
    author: 'Alice Johnson',
    createdAt: '2024-01-01T09:00:00Z',
    category: 'Technology',
  },
  {
    id: 'doc-2',
    title: 'Introduction to Machine Learning',
    content: 'Machine learning is a subset of artificial intelligence that focuses on building systems that can learn from data. It enables computers to improve their performance on a specific task through experience.',
    author: 'Bob Smith',
    createdAt: '2024-01-02T10:30:00Z',
    category: 'Technology',
  },
  {
    id: 'doc-3',
    title: 'Getting Started with ML',
    content: 'Machine learning represents a branch of AI dedicated to creating data-driven systems. These systems can enhance their capabilities over time by processing and learning from information.',
    author: 'Carol White',
    createdAt: '2024-01-03T14:15:00Z',
    category: 'Technology',
  },
  {
    id: 'doc-4',
    title: 'Best Practices for Remote Work',
    content: 'Remote work has become increasingly common in recent years. To be successful, create a dedicated workspace, maintain regular hours, and communicate effectively with your team.',
    author: 'David Brown',
    createdAt: '2024-01-04T11:00:00Z',
    category: 'Business',
  },
  {
    id: 'doc-5',
    title: 'Remote Work Tips',
    content: 'Working from home is now very popular. Success requires having a separate work area, keeping consistent schedules, and staying in good contact with colleagues.',
    author: 'Eve Davis',
    createdAt: '2024-01-05T16:45:00Z',
    category: 'Business',
  },
  {
    id: 'doc-6',
    title: 'The Complete Guide to Remote Work',
    content: 'Remote work has become increasingly common in recent years. To be successful, create a dedicated workspace, maintain regular hours, and communicate effectively with your team. Additionally, take regular breaks and set boundaries between work and personal life.',
    author: 'Frank Miller',
    createdAt: '2024-01-06T09:30:00Z',
    category: 'Business',
  },
  {
    id: 'doc-7',
    title: 'Climate Change: A Global Challenge',
    content: 'Climate change represents one of the most pressing issues of our time. Rising global temperatures, extreme weather events, and melting ice caps are clear indicators that action is needed now.',
    author: 'Grace Wilson',
    createdAt: '2024-01-07T13:20:00Z',
    category: 'Environment',
  },
  {
    id: 'doc-8',
    title: 'Understanding Climate Change',
    content: 'Climate change is a critical global challenge. We are seeing rising temperatures, more frequent extreme weather, and disappearing polar ice. Immediate action is necessary to address this crisis.',
    author: 'Henry Taylor',
    createdAt: '2024-01-08T10:00:00Z',
    category: 'Environment',
  },
];

// Demonstration functions
async function demonstrateDeduplication() {
  console.log('=== Document Deduplication Demo ===\n');

  const deduplicator = new DocumentDeduplicator();
  await deduplicator.initialize();

  // Index all documents
  console.log('📚 Indexing documents...');
  for (const doc of sampleDocuments) {
    await deduplicator.indexDocument(doc);
    console.log(`  ✅ Indexed: ${doc.title}`);
  }
  console.log(`\nIndexed ${sampleDocuments.length} documents\n`);

  // Example 1: Find exact duplicates
  console.log('🔍 Example 1: Find Exact Duplicates');
  console.log('   Checking doc-1 for exact duplicates...\n');

  const dup1 = await deduplicator.findDuplicates('doc-1', 0.98, 0.90, 0.80);
  if (dup1) {
    console.log(`   Original: ${dup1.original.title}`);
    console.log(`   Author: ${dup1.original.author}\n`);

    const exactDupes = dup1.duplicates.filter(d => d.type === 'exact');
    if (exactDupes.length > 0) {
      console.log(`   ✅ Found ${exactDupes.length} exact duplicate(s):`);
      exactDupes.forEach(d => {
        console.log(`      - ${d.document.title} by ${d.document.author}`);
        console.log(`        Similarity: ${(d.similarity * 100).toFixed(1)}%`);
      });
    }
    console.log('');
  }

  // Example 2: Find near-duplicates
  console.log('🔍 Example 2: Find Near-Duplicates');
  console.log('   Checking doc-4 for similar content...\n');

  const dup2 = await deduplicator.findDuplicates('doc-4', 0.98, 0.90, 0.80);
  if (dup2) {
    console.log(`   Original: ${dup2.original.title}\n`);

    const nearDupes = dup2.duplicates.filter(d => d.type === 'near' || d.type === 'exact');
    if (nearDupes.length > 0) {
      console.log(`   ⚠️  Found ${nearDupes.length} near-duplicate(s):`);
      nearDupes.forEach(d => {
        console.log(`      - ${d.document.title} (${d.type})`);
        console.log(`        Similarity: ${(d.similarity * 100).toFixed(1)}%`);
      });
    }
    console.log('');
  }

  // Example 3: Find all duplicate groups
  console.log('🔍 Example 3: Find All Duplicate Groups');
  console.log('   Scanning entire document collection...\n');

  const allGroups = await deduplicator.findAllDuplicateGroups();
  console.log(`   Found ${allGroups.length} duplicate groups:\n`);

  allGroups.forEach((group, index) => {
    console.log(`   Group ${index + 1}: ${group.original.title}`);
    console.log(`   Recommendation: ${group.recommendation}`);
    console.log(`   Duplicates: ${group.duplicates.length}`);
    group.duplicates.forEach(d => {
      console.log(`      - ${d.document.title} [${d.type}] ${(d.similarity * 100).toFixed(0)}%`);
    });
    console.log('');
  });

  // Example 4: Content clustering
  console.log('🔍 Example 4: Content Clustering');
  console.log('   Grouping related content by category...\n');

  const clusters = await deduplicator.clusterByCategory('Technology', 0.70);
  clusters.forEach(cluster => {
    console.log(`   📁 Category: ${cluster.category}`);
    console.log(`   Documents: ${cluster.documents.length}`);
    cluster.documents.slice(0, 3).forEach(doc => {
      console.log(`      - ${doc.title}`);
    });
    console.log('');
  });
}

async function demonstrateSmartCleanup() {
  console.log('\n=== Smart Document Cleanup ===\n');

  const deduplicator = new DocumentDeduplicator();
  await deduplicator.initialize();

  // Index documents
  for (const doc of sampleDocuments) {
    await deduplicator.indexDocument(doc);
  }

  console.log('💡 Intelligent Cleanup Recommendations:\n');

  const groups = await deduplicator.findAllDuplicateGroups();

  // Analysis
  const exactDuplicates = groups.filter(g => g.duplicates.some(d => d.type === 'exact'));
  const nearDuplicates = groups.filter(g => g.duplicates.some(d => d.type === 'near'));
  const relatedContent = groups.filter(g => g.duplicates.some(d => d.type === 'related'));

  console.log('📊 Analysis Results:');
  console.log(`   Exact Duplicates: ${exactDuplicates.length} groups`);
  console.log(`   Near-Duplicates: ${nearDuplicates.length} groups`);
  console.log(`   Related Content: ${relatedContent.length} groups\n`);

  // Recommendations
  let spaceSaved = 0;
  let cleanupActions: string[] = [];

  groups.forEach(group => {
    const exactCount = group.duplicates.filter(d => d.type === 'exact').length;
    const nearCount = group.duplicates.filter(d => d.type === 'near').length;

    if (exactCount > 0) {
      spaceSaved += exactCount * 0.5; // Assume 0.5MB per doc
      cleanupActions.push(`🗑️  Delete ${exactCount} exact duplicate(s) of "${group.original.title}"`);
    }

    if (nearCount > 0 && exactCount === 0) {
      cleanupActions.push(`🔀 Review and potentially merge ${nearCount} near-duplicate(s) of "${group.original.title}"`);
    }
  });

  console.log('🎯 Cleanup Actions:');
  cleanupActions.forEach((action, index) => {
    console.log(`   ${index + 1}. ${action}`);
  });
  console.log('');

  console.log(`💾 Estimated Space Savings: ${spaceSaved.toFixed(1)} MB\n`);

  // Detailed plan
  console.log('📋 Detailed Cleanup Plan:\n');

  groups.slice(0, 3).forEach((group, index) => {
    console.log(`${index + 1}. "${group.original.title}"`);
    console.log(`   Action: ${group.recommendation.replace(/_/g, ' ').toUpperCase()}`);

    const exact = group.duplicates.filter(d => d.type === 'exact');
    const near = group.duplicates.filter(d => d.type === 'near');

    if (exact.length > 0) {
      console.log(`   - Remove ${exact.length} exact duplicate(s)`);
    }
    if (near.length > 0) {
      console.log(`   - Merge ${near.length} near-duplicate(s)`);
    }

    console.log('');
  });
}

async function demonstrateRealWorldUseCases() {
  console.log('\n=== Real-World Use Cases ===\n');

  const deduplicator = new DocumentDeduplicator();
  await deduplicator.initialize();

  // Index documents
  for (const doc of sampleDocuments) {
    await deduplicator.indexDocument(doc);
  }

  console.log('🎯 Common Scenarios:\n');

  // Scenario 1: Content management system
  console.log('1️⃣  Content Management System - Database Cleanup');
  console.log('   Problem: Multiple authors uploading similar content\n');

  const groups = await deduplicator.findAllDuplicateGroups();
  const totalDuplicates = groups.reduce((sum, g) => sum + g.duplicates.filter(d => d.type === 'exact').length, 0);

  console.log(`   ✅ Identified ${totalDuplicates} exact duplicates`);
  console.log(`   ✅ Can save ${(totalDuplicates * 0.5).toFixed(1)} MB of storage`);
  console.log(`   ✅ Improve search result quality\n`);

  // Scenario 2: News aggregation
  console.log('2️⃣  News Aggregator - Story Deduplication');
  console.log('   Problem: Same story from multiple sources\n');

  console.log('   ✅ Detect similar news articles');
  console.log('   ✅ Group by story, not by source');
  console.log('   ✅ Show "X sources report this story" instead of duplicates\n');

  // Scenario 3: Legal document management
  console.log('3️⃣  Legal Documents - Version Control');
  console.log('   Problem: Multiple versions of contracts\n');

  const legalGroups = groups.filter(g => g.duplicates.some(d => d.type === 'near'));
  console.log(`   ✅ Found ${legalGroups.length} groups of similar documents`);
  console.log('   ✅ Identify document versions and revisions');
  console.log('   ✅ Track changes across near-duplicates\n');

  // Scenario 4: Research paper database
  console.log('4️⃣  Research Papers - Citation Analysis');
  console.log('   Problem: Find related research\n');

  console.log('   ✅ Cluster papers by topic');
  console.log('   ✅ Identify citation networks');
  console.log('   ✅ Discover related research automatically\n');

  // Scenario 5: E-commerce product catalog
  console.log('5️⃣  E-Commerce - Product Listings');
  console.log('   Problem: Same product from multiple suppliers\n');

  console.log('   ✅ Detect duplicate product listings');
  console.log('   ✅ Merge into single product page');
  console.log('   ✅ Show all suppliers on one page\n');

  // Implementation example
  console.log('🔧 Implementation Example:\n');

  console.log(`
// Automatic deduplication pipeline
async function cleanupDatabase() {
  const deduplicator = new DocumentDeduplicator();
  await deduplicator.initialize();

  // Find all duplicate groups
  const groups = await deduplicator.findAllDuplicateGroups();

  for (const group of groups) {
    if (group.recommendation === 'keep_original') {
      // Delete exact duplicates
      for (const dup of group.duplicates.filter(d => d.type === 'exact')) {
        await database.delete(dup.document.id);
        console.log(\`Deleted: \${dup.document.title}\`);
      }
    } else if (group.recommendation === 'merge') {
      // Flag for review
      await database.flagForReview(group.groupId);
    }
  }

  console.log(\`Cleaned up \${groups.length} duplicate groups\`);
}
  `);
}

async function runDocumentAudit() {
  console.log('\n=== Document Audit Report ===\n');

  const deduplicator = new DocumentDeduplicator();
  await deduplicator.initialize();

  // Index documents
  for (const doc of sampleDocuments) {
    await deduplicator.indexDocument(doc);
  }

  console.log('📊 Document Health Report\n');

  const allGroups = await deduplicator.findAllDuplicateGroups();

  // Metrics
  const totalDocs = sampleDocuments.length;
  const uniqueDocs = totalDocs - allGroups.reduce((sum, g) =>
    sum + g.duplicates.filter(d => d.type === 'exact').length, 0
  );
  const duplicationRate = ((totalDocs - uniqueDocs) / totalDocs * 100).toFixed(1);

  console.log('📈 Key Metrics:');
  console.log(`   Total Documents: ${totalDocs}`);
  console.log(`   Unique Documents: ${uniqueDocs}`);
  console.log(`   Duplication Rate: ${duplicationRate}%`);
  console.log(`   Duplicate Groups: ${allGroups.length}\n`);

  // Breakdown by type
  let exactCount = 0;
  let nearCount = 0;
  let relatedCount = 0;

  allGroups.forEach(group => {
    group.duplicates.forEach(d => {
      if (d.type === 'exact') exactCount++;
      else if (d.type === 'near') nearCount++;
      else relatedCount++;
    });
  });

  console.log('📋 Duplicate Types:');
  console.log(`   Exact Duplicates: ${exactCount}`);
  console.log(`   Near-Duplicates: ${nearCount}`);
  console.log(`   Related Content: ${relatedCount}\n`);

  // Category breakdown
  console.log('📁 Duplication by Category:');
  const categoryBreakdown = new Map<string, number>();

  allGroups.forEach(group => {
    const cat = group.original.category;
    categoryBreakdown.set(cat, (categoryBreakdown.get(cat) || 0) + group.duplicates.length);
  });

  categoryBreakdown.forEach((count, category) => {
    console.log(`   ${category}: ${count} duplicate(s)`);
  });

  console.log('\n💡 Recommendations:\n');
  console.log('1. Delete all exact duplicates (low risk)');
  console.log('2. Review near-duplicates manually (medium risk)');
  console.log('3. Keep related content as-is (may be intentional)');
  console.log('4. Implement duplicate detection on upload\n');
}

// Export functions
export {
  DocumentDeduplicator,
  demonstrateDeduplication,
  demonstrateSmartCleanup,
  demonstrateRealWorldUseCases,
  runDocumentAudit,
};

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateDeduplication = demonstrateDeduplication;
  (window as any).runDocumentAudit = runDocumentAudit;
  console.log('📝 Document Deduplicator - Available functions:');
  console.log('  - demonstrateDeduplication() - See deduplication in action');
  console.log('  - demonstrateSmartCleanup() - Learn cleanup strategies');
  console.log('  - runDocumentAudit() - Generate document health report');
}
