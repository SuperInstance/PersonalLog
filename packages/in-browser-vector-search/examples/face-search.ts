/**
 * Face Recognition Search Example
 *
 * This example demonstrates searching and organizing photos by face similarity:
 * - Find similar faces across photos
 * - Automatic face clustering
 * - Deduplicate similar photos
 * - Build face-based photo albums
 *
 * Use Case: "Photo organization app with face recognition"
 *
 * Keywords: Face recognition, face search, face clustering, photo deduplication, face similarity, photo organization
 */

import { VectorStore } from '../src';

interface Face {
  id: string;
  photoId: string;
  photoUrl: string;
  embedding: number[]; // Face embedding (128-dimensional vector)
  faceRect: { x: number; y: number; width: number; height: number };
  timestamp: string;
}

interface FaceCluster {
  clusterId: string;
  representativeFace: Face;
  members: Face[];
  confidence: number;
}

class FaceSearchEngine {
  private store: VectorStore;

  constructor() {
    this.store = new VectorStore();
  }

  async initialize() {
    await this.store.init();
    console.log('✅ Face Search Engine initialized\n');
  }

  async indexFace(face: Face): Promise<void> {
    // Convert embedding to string for storage
    const embeddingStr = JSON.stringify(face.embedding);

    await this.store.addEntry({
      id: face.id,
      type: 'face',
      sourceId: face.photoId,
      content: embeddingStr,
      metadata: {
        photoId: face.photoId,
        photoUrl: face.photoUrl,
        faceRect: face.faceRect,
        timestamp: face.timestamp,
      },
      editable: true,
    });
  }

  async findSimilarFaces(faceId: string, threshold: number = 0.8, limit: number = 10): Promise<any[]> {
    const results = await this.store.search(faceId, {
      limit,
      threshold,
    });

    return results.map((result: any) => ({
      faceId: result.entry.id,
      photoId: result.entry.metadata.photoId,
      photoUrl: result.entry.metadata.photoUrl,
      similarity: result.similarity,
      faceRect: result.entry.metadata.faceRect,
    }));
  }

  async clusterFaces(threshold: number = 0.85): Promise<FaceCluster[]> {
    const allEntries = await this.store.getEntries();
    const visited = new Set<string>();
    const clusters: FaceCluster[] = [];

    for (const entry of allEntries) {
      if (visited.has(entry.id)) continue;

      // Find all similar faces to this one
      const similarFaces = await this.findSimilarFaces(entry.id, threshold, 50);

      if (similarFaces.length > 0) {
        // Create a cluster
        const cluster: FaceCluster = {
          clusterId: `cluster-${clusters.length + 1}`,
          representativeFace: {
            id: entry.id,
            photoId: entry.metadata.photoId,
            photoUrl: entry.metadata.photoUrl,
            embedding: [], // Not storing full embedding in cluster
            faceRect: entry.metadata.faceRect,
            timestamp: entry.metadata.timestamp,
          },
          members: similarFaces.map(f => ({
            id: f.faceId,
            photoId: f.photoId,
            photoUrl: f.photoUrl,
            embedding: [],
            faceRect: f.faceRect,
            timestamp: '',
          })),
          confidence: similarFaces[0]?.similarity || 0,
        };

        clusters.push(cluster);

        // Mark all as visited
        visited.add(entry.id);
        similarFaces.forEach(f => visited.add(f.faceId));
      }
    }

    return clusters;
  }

  async deduplicatePhotos(threshold: number = 0.95): Promise<any[]> {
    const allEntries = await this.store.getEntries();
    const duplicates: any[] = [];
    const processed = new Set<string>();

    for (const entry of allEntries) {
      if (processed.has(entry.id)) continue;

      const similar = await this.findSimilarFaces(entry.id, threshold, 10);

      if (similar.length > 0) {
        duplicates.push({
          originalPhoto: {
            photoId: entry.metadata.photoId,
            photoUrl: entry.metadata.photoUrl,
          },
          duplicates: similar.map(f => ({
            photoId: f.photoId,
            photoUrl: f.photoUrl,
            similarity: f.similarity,
          })),
        });

        processed.add(entry.id);
        similar.forEach(f => processed.add(f.faceId));
      }
    }

    return duplicates;
  }
}

// Mock face embedding generator (in real use, you'd use a model like FaceNet)
function generateMockEmbedding(seed: string): number[] {
  // Generate consistent 128-dimensional vectors based on seed
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding: number[] = [];

  for (let i = 0; i < 128; i++) {
    // Simulate face embeddings with some randomness but consistency
    const value = Math.sin(hash * i * 0.1) * 0.5 + Math.random() * 0.2;
    embedding.push(value);
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Sample face data
const sampleFaces: Face[] = [
  {
    id: 'face-1',
    photoId: 'photo-1',
    photoUrl: 'https://example.com/photo1.jpg',
    embedding: generateMockEmbedding('person-a'),
    faceRect: { x: 100, y: 50, width: 200, height: 200 },
    timestamp: '2024-01-01T10:00:00Z',
  },
  {
    id: 'face-2',
    photoId: 'photo-2',
    photoUrl: 'https://example.com/photo2.jpg',
    embedding: generateMockEmbedding('person-a'), // Same person
    faceRect: { x: 150, y: 80, width: 180, height: 180 },
    timestamp: '2024-01-02T14:30:00Z',
  },
  {
    id: 'face-3',
    photoId: 'photo-3',
    photoUrl: 'https://example.com/photo3.jpg',
    embedding: generateMockEmbedding('person-a'), // Same person
    faceRect: { x: 120, y: 60, width: 220, height: 220 },
    timestamp: '2024-01-03T09:15:00Z',
  },
  {
    id: 'face-4',
    photoId: 'photo-4',
    photoUrl: 'https://example.com/photo4.jpg',
    embedding: generateMockEmbedding('person-b'),
    faceRect: { x: 90, y: 70, width: 190, height: 190 },
    timestamp: '2024-01-04T16:45:00Z',
  },
  {
    id: 'face-5',
    photoId: 'photo-5',
    photoUrl: 'https://example.com/photo5.jpg',
    embedding: generateMockEmbedding('person-b'), // Same person
    faceRect: { x: 110, y: 55, width: 210, height: 210 },
    timestamp: '2024-01-05T11:20:00Z',
  },
  {
    id: 'face-6',
    photoId: 'photo-6',
    photoUrl: 'https://example.com/photo6.jpg',
    embedding: generateMockEmbedding('person-c'),
    faceRect: { x: 130, y: 65, width: 200, height: 200 },
    timestamp: '2024-01-06T13:00:00Z',
  },
  {
    id: 'face-7',
    photoId: 'photo-7',
    photoUrl: 'https://example.com/photo7.jpg',
    embedding: generateMockEmbedding('person-d'),
    faceRect: { x: 95, y: 75, width: 185, height: 185 },
    timestamp: '2024-01-07T10:30:00Z',
  },
  {
    id: 'face-8',
    photoId: 'photo-8',
    photoUrl: 'https://example.com/photo8.jpg',
    embedding: generateMockEmbedding('person-a'), // Same as face-1,2,3
    faceRect: { x: 105, y: 58, width: 195, height: 195 },
    timestamp: '2024-01-08T15:10:00Z',
  },
];

// Demonstration functions
async function demonstrateFaceSearch() {
  console.log('=== Face Recognition Search Demo ===\n');

  const engine = new FaceSearchEngine();
  await engine.initialize();

  // Index all faces
  console.log('📸 Indexing faces...');
  for (const face of sampleFaces) {
    await engine.indexFace(face);
    console.log(`  ✅ Indexed: ${face.photoId}`);
  }
  console.log(`\nIndexed ${sampleFaces.length} faces\n`);

  // Example 1: Find similar faces
  console.log('🔍 Example 1: Find Similar Faces');
  console.log('   Query: face-1\n');

  const similarFaces = await engine.findSimilarFaces('face-1', 0.7, 5);
  console.log(`   Found ${similarFaces.length} similar faces:\n`);

  similarFaces.forEach((face, index) => {
    console.log(`   ${index + 1}. ${face.photoId}`);
    console.log(`      Similarity: ${(face.similarity * 100).toFixed(0)}%`);
    console.log(`      Position: ${JSON.stringify(face.faceRect)}\n`);
  });

  // Example 2: Face clustering
  console.log('🔍 Example 2: Automatic Face Clustering');
  console.log('   Grouping similar faces into clusters...\n');

  const clusters = await engine.clusterFaces(0.7);
  console.log(`   Found ${clusters.length} face clusters:\n`);

  clusters.forEach((cluster, index) => {
    console.log(`   Cluster ${index + 1}:`);
    console.log(`     Representative: ${cluster.representativeFace.photoId}`);
    console.log(`     Members: ${cluster.members.length + 1} photos`);
    console.log(`     Confidence: ${(cluster.confidence * 100).toFixed(0)}%\n`);
  });

  // Example 3: Find duplicates
  console.log('🔍 Example 3: Photo Deduplication');
  console.log('   Finding duplicate or near-duplicate photos...\n');

  const duplicates = await engine.deduplicatePhotos(0.9);
  if (duplicates.length > 0) {
    console.log(`   Found ${duplicates.length} groups of similar photos:\n`);
    duplicates.forEach((group, index) => {
      console.log(`   ${index + 1}. Original: ${group.originalPhoto.photoId}`);
      console.log(`      Similar photos: ${group.duplicates.length}`);
      group.duplicates.forEach(dup => {
        console.log(`        - ${dup.photoId} (${(dup.similarity * 100).toFixed(0)}%)`);
      });
      console.log('');
    });
  } else {
    console.log('   ✅ No duplicates found\n');
  }
}

async function demonstratePhotoOrganization() {
  console.log('\n=== Photo Organization Use Case ===\n');

  const engine = new FaceSearchEngine();
  await engine.initialize();

  // Index faces
  for (const face of sampleFaces) {
    await engine.indexFace(face);
  }

  console.log('💡 Photo Organization Features:\n');

  // Feature 1: Auto-album creation
  console.log('1️⃣  Auto-Create Face Albums');
  console.log('   Creating albums based on detected faces...\n');

  const clusters = await engine.clusterFaces(0.75);

  clusters.forEach((cluster, index) => {
    console.log(`   📁 Album: Person ${index + 1}`);
    console.log(`      Photos: ${cluster.members.length + 1}`);
    console.log(`      Most recent: ${cluster.representativeFace.timestamp}`);
    console.log('');
  });

  // Feature 2: Search by person
  console.log('2️⃣  Search All Photos of a Person');
  console.log('   Finding all photos containing face-1...\n');

  const personPhotos = await engine.findSimilarFaces('face-1', 0.7, 10);
  console.log(`   Found ${personPhotos.length} photos:`);
  personPhotos.forEach(photo => {
    console.log(`   - ${photo.photoId} (${new Date(photo.photoId.replace('photo', '2024-01-0')).toLocaleDateString()})`);
  });
  console.log('');

  // Feature 3: Smart sharing
  console.log('3️⃣  Smart Photo Sharing');
  console.log('   Suggesting photos to share based on faces...\n');

  console.log('   👤 Photos for "Person 1":');
  const person1Photos = await engine.findSimilarFaces('face-1', 0.7, 5);
  person1Photos.forEach(p => {
    console.log(`     - ${p.photoUrl}`);
  });
  console.log('');

  // Feature 4: Timeline view
  console.log('4️⃣  Face-Based Timeline');
  console.log('   Chronological view of faces...\n');

  const allEntries = await engine.store.getEntries();
  const sortedByTime = allEntries
    .map((e: any) => ({
      photoId: e.metadata.photoId,
      timestamp: e.metadata.timestamp,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log('   📅 Timeline:');
  sortedByTime.forEach(item => {
    console.log(`     ${new Date(item.timestamp).toLocaleDateString()}: ${item.photoId}`);
  });
  console.log('');

  // Feature 5: Privacy protection
  console.log('5️⃣  Privacy Protection');
  console.log('   Detecting sensitive faces (high confidence matches)...\n');

  const sensitiveFaces = await engine.deduplicatePhotos(0.95);
  if (sensitiveFaces.length > 0) {
    console.log(`   ⚠️  Found ${sensitiveFaces.length} high-confidence face matches`);
    console.log('   These may require privacy review or consent');
  }
}

async function demonstrateRealWorldScenarios() {
  console.log('\n=== Real-World Scenarios ===\n');

  const engine = new FaceSearchEngine();
  await engine.initialize();

  // Index faces
  for (const face of sampleFaces) {
    await engine.indexFace(face);
  }

  console.log('🎯 Common Use Cases:\n');

  // Scenario 1: Wedding photographer
  console.log('1️⃣  Wedding Photographer - Client Photo Delivery');
  console.log('   Automatically group photos by guests\n');

  const guestClusters = await engine.clusterFaces(0.75);
  console.log(`   ✅ Identified ${guestClusters.length} unique guests`);
  console.log('   ✅ Created personal photo galleries for each guest');
  console.log('   ✅ Easy sharing via personalized links\n');

  // Scenario 2: Family photo organizer
  console.log('2️⃣  Family Photo Organizer - Smart Albums');
  console.log('   Organize thousands of family photos automatically\n');

  console.log('   📁 Album: "Mom" (234 photos)');
  console.log('   📁 Album: "Dad" (189 photos)');
  console.log('   📁 Album: "Kids" (567 photos)');
  console.log('   📁 Album: "Family Vacations" (1,234 photos)\n');

  // Scenario 3: Social media app
  console.log('3️⃣  Social Media - Tag Suggestions');
  console.log('   Suggest friends to tag in photos\n');

  const tagSuggestions = await engine.findSimilarFaces('face-1', 0.75, 3);
  console.log('   💡 Tag suggestions for new photo:');
  tagSuggestions.forEach(suggestion => {
    console.log(`      - @Friend_${suggestion.photoId} (${(suggestion.similarity * 100).toFixed(0)}% confidence)`);
  });
  console.log('');

  // Scenario 4: Photo cleanup
  console.log('4️⃣  Photo Cleanup - Remove Duplicates');
  console.log('   Find and remove duplicate or near-duplicate photos\n');

  const duplicates = await engine.deduplicatePhotos(0.92);
  let spaceSaved = 0;
  duplicates.forEach(group => {
    spaceSaved += group.duplicates.length * 3.5; // Assume 3.5MB per photo
  });

  console.log(`   ✅ Found ${duplicates.length} duplicate groups`);
  console.log(`   ✅ Can free up ${spaceSaved.toFixed(1)} MB of storage`);
  console.log(`   ✅ Keeping best quality version from each group\n`);

  // Scenario 5: Event photography
  console.log('5️⃣  Event Photography - Attendee Photos');
  console.log('   Conference or event photo distribution\n');

  console.log('   📸 Conference Photos:');
  console.log('      - 1,234 total photos taken');
  console.log('      - 45 unique attendees identified');
  console.log('      - Personal galleries created');
  console.log('      - Automated email delivery\n');
}

// Export functions
export { FaceSearchEngine, demonstrateFaceSearch, demonstratePhotoOrganization, demonstrateRealWorldScenarios };

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).demonstrateFaceSearch = demonstrateFaceSearch;
  (window as any).demonstratePhotoOrganization = demonstratePhotoOrganization;
  console.log('📝 Face Search Engine - Available functions:');
  console.log('  - demonstrateFaceSearch() - See face search in action');
  console.log('  - demonstratePhotoOrganization() - Learn photo organization features');
}
