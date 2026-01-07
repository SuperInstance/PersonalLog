/**
 * Agent Marketplace Types
 *
 * Type definitions for the agent marketplace system.
 * Enables sharing, discovery, import/export, and versioning of agent definitions.
 */

import type { AgentDefinition, AgentCategory as BaseAgentCategory } from '@/lib/agents/types';

// Re-export AgentCategory for convenience
export type AgentCategory = BaseAgentCategory;

/**
 * Export format options
 */
export enum ExportFormat {
  /** JSON format */
  JSON = 'json',
  /** YAML format */
  YAML = 'yaml',
}

/**
 * Agent visibility levels
 */
export type AgentVisibility = 'public' | 'private' | 'unlisted';

/**
 * Agent marketplace metadata
 */
export interface MarketplaceMetadata {
  /** Author/creator name */
  author: string;
  /** User ID (for own agents) */
  authorId?: string;
  /** Semver version (1.0.0) */
  version: string;
  /** Detailed description */
  description: string;
  /** Long-form description in Markdown */
  longDescription?: string;
  /** Searchable tags */
  tags: string[];
  /** URLs to screenshots */
  screenshots?: string[];
  /** Usage statistics */
  stats: AgentStats;
  /** Installation status */
  installation?: AgentInstallation;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Visibility level */
  visibility: AgentVisibility;
  /** License (MIT, Apache-2.0, etc.) */
  license: string;
  /** Version changelog */
  changelog?: string[];
  /** Previous versions */
  previousVersions?: AgentVersion[];
}

/**
 * Agent usage statistics
 */
export interface AgentStats {
  /** Download count */
  downloads: number;
  /** Install count */
  installs: number;
  /** Average rating (0-5) */
  rating: number;
  /** Number of ratings */
  ratingCount: number;
  /** Last update timestamp */
  lastUpdated: number;
  /** Whether agent is featured */
  featured?: boolean;
}

/**
 * Agent installation status
 */
export interface AgentInstallation {
  /** Whether agent is installed */
  installed: boolean;
  /** Installed version (if installed) */
  installedVersion?: string;
  /** Installation timestamp (if installed) */
  installedAt?: string;
}

/**
 * Agent rating/review
 */
export interface AgentRating {
  /** Unique rating ID */
  id: string;
  /** Agent ID being rated */
  agentId: string;
  /** User ID who submitted rating */
  userId: string;
  /** User display name */
  userName?: string;
  /** Rating value (1-5) */
  rating: number;
  /** Optional review text */
  review?: string;
  /** Review title (optional) */
  reviewTitle?: string;
  /** Number of helpful votes */
  helpful?: number;
  /** Whether current user marked as helpful */
  userMarkedHelpful?: boolean;
  /** Whether review has been reported */
  reported?: boolean;
  /** Edit history */
  editHistory?: ReviewEdit[];
  /** Plugin version at time of review */
  pluginVersion?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Review edit history entry
 */
export interface ReviewEdit {
  /** When edit was made */
  timestamp: number;
  /** Previous rating value */
  previousRating: number;
  /** Previous review title */
  previousTitle?: string;
  /** Previous review text */
  previousText?: string;
}

/**
 * Review helpful vote
 */
export interface ReviewVote {
  /** Unique vote ID */
  id: string;
  /** Review ID */
  reviewId: string;
  /** User ID who voted */
  userId: string;
  /** Vote timestamp */
  createdAt: number;
}

/**
 * Review report for moderation
 */
export interface ReviewReport {
  /** Unique report ID */
  id: string;
  /** Review ID being reported */
  reviewId: string;
  /** User ID reporting */
  userId: string;
  /** Report reason */
  reason: 'spam' | 'offensive' | 'inappropriate' | 'fake' | 'other';
  /** Additional details */
  details?: string;
  /** Report status */
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  /** When report was created */
  createdAt: number;
  /** When report was reviewed */
  reviewedAt?: number;
  /** User ID who reviewed */
  reviewedBy?: string;
  /** Action taken */
  action?: 'keep' | 'remove' | 'edit' | 'ban-user';
}

/**
 * Rating statistics
 */
export interface RatingStats {
  /** Average rating (0-5) */
  average: number;
  /** Total number of ratings */
  count: number;
  /** Distribution of ratings (1-5 stars) */
  distribution: Record<number, number>;
  /** Percentage distribution */
  distributionPercentages: Record<number, number>;
}

/**
 * Review with user info
 */
export interface Review extends AgentRating {
  /** Formatted date string */
  formattedDate?: string;
  /** Relative time string (e.g., "2 days ago") */
  relativeTime?: string;
}

/**
 * Agent version for version control
 */
export interface AgentVersion {
  /** Version string */
  version: string;
  /** Agent definition at this version */
  definition: AgentDefinition;
  /** Changelog for this version */
  changelog: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Marketplace agent (extends AgentDefinition with marketplace metadata)
 */
export interface MarketplaceAgent extends AgentDefinition {
  /** Marketplace-specific metadata */
  marketplace: MarketplaceMetadata;
}

/**
 * Exported agent data structure
 */
export interface ExportedAgentData {
  /** Format identifier */
  format: string;
  /** Agent definition */
  agent: AgentDefinition;
  /** Marketplace metadata */
  marketplace: MarketplaceMetadata;
  /** Export timestamp */
  exportedAt: string;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Whether import was successful */
  imported: boolean;
  /** Agent ID if imported */
  agentId?: string;
  /** Whether import was skipped */
  skipped?: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Import validation result
 */
export interface ImportValidation {
  /** Whether data is valid */
  valid: boolean;
  /** Validation errors if invalid */
  errors?: string[];
  /** Warnings (non-blocking) */
  warnings?: string[];
}

/**
 * Conflict resolution option
 */
export type ConflictResolution = 'skip' | 'replace' | 'rename' | 'merge';

/**
 * Search filters
 */
export interface SearchFilters {
  /** Filter by category */
  category?: AgentCategory;
  /** Minimum rating */
  minRating?: number;
  /** Filter by tags */
  tags?: string[];
  /** Filter by visibility */
  visibility?: AgentVisibility;
  /** Minimum downloads */
  minDownloads?: number;
}

/**
 * Search result with relevance score
 */
export interface SearchResult extends MarketplaceAgent {
  /** Relevance score (0-1) */
  relevance: number;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  /** Version 1 */
  v1: AgentVersion;
  /** Version 2 */
  v2: AgentVersion;
  /** Fields that changed */
  changes: VersionChange[];
}

/**
 * Version change
 */
export interface VersionChange {
  /** Field that changed */
  field: string;
  /** Old value */
  oldValue: unknown;
  /** New value */
  newValue: unknown;
  /** Type of change */
  type: 'added' | 'removed' | 'modified';
}
