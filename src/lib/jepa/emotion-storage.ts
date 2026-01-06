/**
 * Emotion Data Storage
 *
 * IndexedDB-based storage for emotion recordings with query,
 * aggregation, and export capabilities.
 */

import { StorageError } from '@/lib/errors';

const EMOTION_DB_NAME = 'PersonalLogEmotions';
const EMOTION_DB_VERSION = 1;
const STORE_EMOTIONS = 'emotions';

// ============================================================================
// EMOTION DATA MODEL
// ============================================================================

export interface EmotionRecording {
  id: string;
  timestamp: number; // Unix timestamp
  duration: number; // Recording duration in seconds

  // Emotion scores
  valence: number; // 0-1
  arousal: number; // 0-1
  dominance: number; // 0-1

  // Computed
  emotion: string; // 'excited', 'calm', etc.
  confidence: number; // 0-1

  // Context
  conversationId?: string;
  agentId?: string;
  language: string;

  // Metadata
  hasAudio: boolean;
  audioPath?: string; // Path to stored audio
  transcript?: string; // Transcript text
}

export interface EmotionStatistics {
  valence: Statistic;
  arousal: Statistic;
  dominance: Statistic;
  emotionDistribution: Record<string, number>;
}

export interface Statistic {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
}

export interface EmotionPattern {
  type: string;
  description: string;
  confidence: number;
  hour?: number;
  dayOfWeek?: string;
  suggestions?: string[];
}

export interface EmotionQuery {
  startDate?: Date;
  endDate?: Date;
  conversationId?: string;
  agentId?: string;
  emotion?: string;
  minValence?: number;
  maxValence?: number;
  minArousal?: number;
  maxArousal?: number;
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(EMOTION_DB_NAME, EMOTION_DB_VERSION);

    request.onerror = () =>
      reject(new StorageError('Failed to open emotion database', {
        severity: 'high',
        recovery: 'fallback',
        userMessage: 'Unable to access emotion database. Your emotion data may not be saved properly.',
        technicalDetails: `DB: ${EMOTION_DB_NAME}, Version: ${EMOTION_DB_VERSION}`,
        context: { dbName: EMOTION_DB_NAME, version: EMOTION_DB_VERSION },
      }));

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Emotions store
      if (!database.objectStoreNames.contains(STORE_EMOTIONS)) {
        const store = database.createObjectStore(STORE_EMOTIONS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('conversationId', 'conversationId', { unique: false });
        store.createIndex('agentId', 'agentId', { unique: false });
        store.createIndex('emotion', 'emotion', { unique: false });
        store.createIndex('valence', 'valence', { unique: false });
        store.createIndex('arousal', 'arousal', { unique: false });
      }
    };
  });
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Store an emotion recording
 */
export async function storeEmotion(emotion: EmotionRecording): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EMOTIONS);
    const request = store.add(emotion);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store multiple emotion recordings in a batch
 */
export async function storeEmotionsBatch(emotions: EmotionRecording[]): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EMOTIONS);

    emotions.forEach((emotion) => {
      store.add(emotion);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get emotion recordings by date range
 */
export async function getEmotionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<EmotionRecording[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readonly');
    const store = transaction.objectStore(STORE_EMOTIONS);
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startDate.getTime(), endDate.getTime());

    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Query emotions with filters
 */
export async function queryEmotions(query: EmotionQuery): Promise<EmotionRecording[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readonly');
    const store = transaction.objectStore(STORE_EMOTIONS);

    // Build query
    let request: IDBRequest;

    if (query.conversationId) {
      const index = store.index('conversationId');
      request = index.getAll(query.conversationId);
    } else if (query.agentId) {
      const index = store.index('agentId');
      request = index.getAll(query.agentId);
    } else if (query.emotion) {
      const index = store.index('emotion');
      request = index.getAll(query.emotion);
    } else if (query.startDate && query.endDate) {
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(query.startDate.getTime(), query.endDate.getTime());
      request = index.getAll(range);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      let results = request.result;

      // Apply additional filters
      if (query.minValence !== undefined) {
        results = results.filter((r: EmotionRecording) => r.valence >= query.minValence!);
      }
      if (query.maxValence !== undefined) {
        results = results.filter((r: EmotionRecording) => r.valence <= query.maxValence!);
      }
      if (query.minArousal !== undefined) {
        results = results.filter((r: EmotionRecording) => r.arousal >= query.minArousal!);
      }
      if (query.maxArousal !== undefined) {
        results = results.filter((r: EmotionRecording) => r.arousal <= query.maxArousal!);
      }

      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single emotion recording by ID
 */
export async function getEmotion(id: string): Promise<EmotionRecording | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readonly');
    const store = transaction.objectStore(STORE_EMOTIONS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an emotion recording
 */
export async function deleteEmotion(id: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EMOTIONS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete all emotion recordings
 */
export async function deleteAllEmotions(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EMOTIONS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of emotion recordings
 */
export async function getEmotionCount(): Promise<number> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EMOTIONS], 'readonly');
    const store = transaction.objectStore(STORE_EMOTIONS);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Export emotions to CSV
 */
export async function exportEmotionsCSV(emotions: EmotionRecording[]): Promise<string> {
  const headers = [
    'Timestamp',
    'Valence',
    'Arousal',
    'Dominance',
    'Emotion',
    'Confidence',
    'Language',
    'Duration',
    'Conversation ID',
    'Agent ID',
    'Has Audio',
  ];

  const rows = emotions.map((r) => [
    new Date(r.timestamp).toISOString(),
    r.valence.toFixed(3),
    r.arousal.toFixed(3),
    r.dominance.toFixed(3),
    r.emotion,
    r.confidence.toFixed(3),
    r.language,
    r.duration.toFixed(1),
    r.conversationId || '',
    r.agentId || '',
    r.hasAudio ? 'Yes' : 'No',
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  return csv;
}

/**
 * Export emotions to JSON
 */
export async function exportEmotionsJSON(emotions: EmotionRecording[]): Promise<string> {
  return JSON.stringify(emotions, null, 2);
}

/**
 * Download emotions as file
 */
export async function downloadEmotions(
  emotions: EmotionRecording[],
  format: 'csv' | 'json'
): Promise<void> {
  const content =
    format === 'csv' ? await exportEmotionsCSV(emotions) : await exportEmotionsJSON(emotions);
  const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
  const extension = format === 'csv' ? 'csv' : 'json';

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `emotion-trends-${Date.now()}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Close the database connection
 */
export async function closeEmotionDB(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}
