/**
 * Feature Flag Registry
 *
 * Central registry of all feature flags in PersonalLog.
 * Each feature is defined with its requirements, dependencies, and metadata.
 */

import type {
  FeatureFlag,
  FeatureCategory,
  IFeatureFlagRegistry,
} from './types';

/**
 * Default feature flag definitions for PersonalLog
 */
export const DEFAULT_FEATURES: FeatureFlag[] = [
  // ============================================================
  // AI FEATURES
  // ============================================================

  {
    id: 'ai.local_models',
    name: 'Local AI Models',
    description: 'Support for running AI models locally via Ollama',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'local', 'ollama', 'privacy'],
    dependencies: [],
    performanceImpact: 70,
    minRAM: 8,
    minCores: 4,
  },
  {
    id: 'ai.streaming_responses',
    name: 'Streaming AI Responses',
    description: 'Stream AI responses token-by-token for better UX',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'streaming', 'ux'],
    dependencies: [],
    performanceImpact: 10,
  },
  {
    id: 'ai.parallel_processing',
    name: 'Parallel AI Processing',
    description: 'Process multiple AI requests simultaneously',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 50,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'performance', 'parallel'],
    dependencies: ['ai.streaming_responses'],
    performanceImpact: 40,
    minCores: 4,
  },
  {
    id: 'ai.context_compression',
    name: 'AI Context Compression',
    description: 'Compress conversation context to fit model limits',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'optimization', 'context'],
    dependencies: [],
    performanceImpact: 30,
  },
  {
    id: 'ai.multibot',
    name: 'Multi-Bot Conversations',
    description: 'Use multiple AI personalities in a single conversation',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 40,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'multi-bot', 'conversation'],
    dependencies: ['ai.local_models'],
    performanceImpact: 50,
    minRAM: 8,
  },
  {
    id: 'ai.custom_models',
    name: 'Custom Model Integration',
    description: 'Add custom AI model providers and endpoints',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'custom', 'provider'],
    dependencies: [],
    performanceImpact: 10,
  },
  {
    id: 'ai.response_caching',
    name: 'AI Response Caching',
    description: 'Cache AI responses to reduce API calls',
    category: 'ai',
    state: 'enabled',
    minHardwareScore: 10,
    userOverridable: true,
    experimental: false,
    tags: ['ai', 'caching', 'optimization'],
    dependencies: [],
    performanceImpact: 5,
  },

  // ============================================================
  // UI FEATURES
  // ============================================================

  {
    id: 'ui.animations',
    name: 'UI Animations',
    description: 'Smooth animations and transitions throughout the app',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'animation', 'ux'],
    dependencies: [],
    performanceImpact: 20,
  },
  {
    id: 'ui.virtualization',
    name: 'List Virtualization',
    description: 'Virtualize long lists for better performance',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'performance', 'lists'],
    dependencies: [],
    performanceImpact: 15,
  },
  {
    id: 'ui.rich_text_editor',
    name: 'Rich Text Editor',
    description: 'Advanced text editing with formatting options',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'editor', 'rich-text'],
    dependencies: [],
    performanceImpact: 20,
  },
  {
    id: 'ui.markdown_preview',
    name: 'Markdown Preview',
    description: 'Live markdown preview in conversations',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'markdown', 'preview'],
    dependencies: [],
    performanceImpact: 15,
  },
  {
    id: 'ui.syntax_highlighting',
    name: 'Code Syntax Highlighting',
    description: 'Highlight code blocks with syntax colors',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'code', 'syntax'],
    dependencies: [],
    performanceImpact: 20,
  },
  {
    id: 'ui.themes',
    name: 'Custom Themes',
    description: 'Support for custom UI themes and color schemes',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 10,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'themes', 'customization'],
    dependencies: [],
    performanceImpact: 5,
  },
  {
    id: 'ui.compact_mode',
    name: 'Compact Mode',
    description: 'Compact UI layout for smaller screens',
    category: 'ui',
    state: 'enabled',
    minHardwareScore: 10,
    userOverridable: true,
    experimental: false,
    tags: ['ui', 'layout', 'compact'],
    dependencies: [],
    performanceImpact: 0,
  },

  // ============================================================
  // KNOWLEDGE FEATURES
  // ============================================================

  {
    id: 'knowledge.vector_search',
    name: 'Vector Search',
    description: 'Semantic search in knowledge base using embeddings',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'search', 'vector', 'semantic'],
    dependencies: [],
    performanceImpact: 40,
    minRAM: 4,
  },
  {
    id: 'knowledge.auto_sync',
    name: 'Auto-Sync Knowledge Base',
    description: 'Automatically sync knowledge base in background',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'sync', 'background'],
    dependencies: ['knowledge.vector_search'],
    performanceImpact: 30,
  },
  {
    id: 'knowledge.checkpoints',
    name: 'Knowledge Checkpoints',
    description: 'Create checkpoints for knowledge base states',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'checkpoint', 'versioning'],
    dependencies: [],
    performanceImpact: 15,
  },
  {
    id: 'knowledge.embeddings_cache',
    name: 'Embeddings Cache',
    description: 'Cache vector embeddings for faster search',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'cache', 'embeddings'],
    dependencies: ['knowledge.vector_search'],
    performanceImpact: 25,
  },
  {
    id: 'knowledge.incremental_updates',
    name: 'Incremental Knowledge Updates',
    description: 'Update knowledge base incrementally instead of full rebuild',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'incremental', 'optimization'],
    dependencies: ['knowledge.vector_search'],
    performanceImpact: 20,
  },
  {
    id: 'knowledge.lora_export',
    name: 'LoRA Training Data Export',
    description: 'Export knowledge as LoRA training data',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 40,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'lora', 'export', 'training'],
    dependencies: ['knowledge.checkpoints'],
    performanceImpact: 30,
  },
  {
    id: 'knowledge.semantic_chunks',
    name: 'Semantic Chunking',
    description: 'Intelligently chunk text based on semantic boundaries',
    category: 'knowledge',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['knowledge', 'chunking', 'semantic'],
    dependencies: ['knowledge.vector_search'],
    performanceImpact: 35,
  },

  // ============================================================
  // MEDIA FEATURES
  // ============================================================

  {
    id: 'media.audio_recording',
    name: 'Audio Recording',
    description: 'Record audio messages directly in conversations',
    category: 'media',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['media', 'audio', 'recording'],
    dependencies: [],
    performanceImpact: 20,
  },
  {
    id: 'media.audio_transcription',
    name: 'Audio Transcription',
    description: 'Transcribe audio messages to text',
    category: 'media',
    state: 'enabled',
    minHardwareScore: 40,
    userOverridable: true,
    experimental: false,
    tags: ['media', 'audio', 'transcription', 'ai'],
    dependencies: ['media.audio_recording'],
    performanceImpact: 60,
    minRAM: 4,
  },
  {
    id: 'media.file_uploads',
    name: 'File Uploads',
    description: 'Upload and attach files to conversations',
    category: 'media',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['media', 'files', 'upload'],
    dependencies: [],
    performanceImpact: 20,
  },
  {
    id: 'media.image_processing',
    name: 'Image Processing',
    description: 'Process and analyze images in conversations',
    category: 'media',
    state: 'enabled',
    minHardwareScore: 40,
    userOverridable: true,
    experimental: false,
    tags: ['media', 'image', 'vision'],
    dependencies: ['media.file_uploads'],
    performanceImpact: 50,
    requiresGPU: false,
  },
  {
    id: 'media.video_support',
    name: 'Video Support',
    description: 'Support for video messages and playback',
    category: 'media',
    state: 'enabled',
    minHardwareScore: 50,
    userOverridable: true,
    experimental: false,
    tags: ['media', 'video', 'playback'],
    dependencies: ['media.file_uploads'],
    performanceImpact: 60,
    minRAM: 8,
  },
  {
    id: 'media.pdf_extraction',
    name: 'PDF Text Extraction',
    description: 'Extract text from PDF files for knowledge base',
    category: 'media',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['media', 'pdf', 'extraction'],
    dependencies: ['media.file_uploads'],
    performanceImpact: 40,
  },

  // ============================================================
  // ADVANCED FEATURES
  // ============================================================

  {
    id: 'advanced.plugins',
    name: 'Plugin System',
    description: 'Support for third-party plugins and extensions',
    category: 'advanced',
    state: 'enabled',
    minHardwareScore: 40,
    userOverridable: true,
    experimental: false,
    tags: ['advanced', 'plugins', 'extensions'],
    dependencies: [],
    performanceImpact: 20,
  },
  {
    id: 'advanced.native_extensions',
    name: 'Native Extensions',
    description: 'Use native Rust/C++ extensions for performance',
    category: 'advanced',
    state: 'disabled',
    minHardwareScore: 60,
    userOverridable: true,
    experimental: true,
    tags: ['advanced', 'native', 'rust', 'cpp'],
    dependencies: [],
    performanceImpact: 80,
  },
  {
    id: 'advanced.offline_mode',
    name: 'Offline Mode',
    description: 'Full functionality without internet connection',
    category: 'advanced',
    state: 'enabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: false,
    tags: ['advanced', 'offline', 'pwa'],
    dependencies: ['ai.local_models'],
    performanceImpact: 30,
  },
  {
    id: 'advanced.encryption',
    name: 'End-to-End Encryption',
    description: 'Encrypt all data at rest and in transit',
    category: 'advanced',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['advanced', 'security', 'encryption'],
    dependencies: [],
    performanceImpact: 25,
  },
  {
    id: 'advanced.cloud_sync',
    name: 'Cloud Sync',
    description: 'Sync data across devices with cloud storage',
    category: 'advanced',
    state: 'enabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['advanced', 'sync', 'cloud'],
    dependencies: [],
    performanceImpact: 20,
    minNetworkSpeed: 1,
  },
  {
    id: 'advanced.ab_testing',
    name: 'A/B Testing Framework',
    description: 'Run A/B tests on features and configurations',
    category: 'advanced',
    state: 'disabled',
    minHardwareScore: 30,
    userOverridable: true,
    experimental: true,
    tags: ['advanced', 'testing', 'ab'],
    dependencies: [],
    performanceImpact: 10,
  },
  {
    id: 'advanced.analytics',
    name: 'Usage Analytics',
    description: 'Track usage patterns for optimization',
    category: 'advanced',
    state: 'disabled',
    minHardwareScore: 20,
    userOverridable: true,
    experimental: false,
    tags: ['advanced', 'analytics', 'tracking'],
    dependencies: [],
    performanceImpact: 10,
  },
  {
    id: 'advanced.auto_optimization',
    name: 'Auto-Optimization',
    description: 'Automatically optimize settings based on usage',
    category: 'advanced',
    state: 'disabled',
    minHardwareScore: 40,
    userOverridable: true,
    experimental: true,
    tags: ['advanced', 'optimization', 'auto'],
    dependencies: ['advanced.analytics'],
    performanceImpact: 30,
  },
];

/**
 * Feature flag registry implementation
 */
export class FeatureFlagRegistry implements IFeatureFlagRegistry {
  private features: Map<string, FeatureFlag> = new Map();

  constructor(features: FeatureFlag[] = DEFAULT_FEATURES) {
    features.forEach(feature => this.registerFeature(feature));
  }

  getAllFeatures(): FeatureFlag[] {
    return Array.from(this.features.values());
  }

  getFeature(id: string): FeatureFlag | undefined {
    return this.features.get(id);
  }

  getFeaturesByCategory(category: FeatureCategory): FeatureFlag[] {
    return this.getAllFeatures().filter(f => f.category === category);
  }

  getFeaturesByTag(tag: string): FeatureFlag[] {
    return this.getAllFeatures().filter(f => f.tags.includes(tag));
  }

  registerFeature(feature: FeatureFlag): void {
    this.features.set(feature.id, feature);
  }

  unregisterFeature(id: string): void {
    this.features.delete(id);
  }

  updateFeature(id: string, updates: Partial<FeatureFlag>): void {
    const existing = this.features.get(id);
    if (existing) {
      this.features.set(id, { ...existing, ...updates });
    }
  }
}

// Global registry instance
let globalRegistry: FeatureFlagRegistry | null = null;

/**
 * Get the global feature flag registry instance
 */
export function getGlobalRegistry(): FeatureFlagRegistry {
  if (!globalRegistry) {
    globalRegistry = new FeatureFlagRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
