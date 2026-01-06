/**
 * Agent Marketplace
 *
 * Complete marketplace system for sharing, discovering, importing,
 * and exporting AI agents with version control and ratings.
 *
 * @example
 * ```typescript
 * import { marketplace } from '@/lib/marketplace';
 *
 * // Export an agent
 * await marketplace.export.downloadAgentFile(myAgent, 'json');
 *
 * // Import an agent
 * const result = await marketplace.import.importAgentFromFile(file);
 *
 * // Search agents
 * const results = await marketplace.search.searchAgents('research');
 *
 * // Rate an agent
 * await marketplace.ratings.rateAgent('agent-id', 'user-id', 5, 'Great!');
 *
 * // Create new version
 * const updated = await marketplace.versions.createVersion(agent, ['New feature']);
 * ```
 */

// Storage functions (for internal use)
import {
  saveMarketplaceAgent,
  loadMarketplaceAgent,
  loadAllMarketplaceAgents,
  deleteMarketplaceAgent,
  updateAgentStats,
  searchMarketplaceAgents,
  getMarketplaceAgentsByCategory,
  getMarketplaceAgentsByVisibility,
  incrementDownloads,
  incrementInstalls,
  clearAllMarketplaceAgents,
} from './storage';

// Export functions (for internal use)
import {
  exportAgentToJSON,
  exportAgentToYAML,
  exportMultipleAgents,
  downloadAgentFile,
  downloadMultipleAgents,
  validateExport,
  getExportFilename,
  prepareAgentForExport,
} from './export';

// Import functions (for internal use)
import {
  importAgentFromJSON,
  importAgentFromYAML,
  importAgentWithValidation,
  importAgentFromFile,
  importMultipleAgentsFromFile,
  validateImport,
  checkForConflicts,
  promptConflictResolution,
} from './import';

// Ratings functions (for internal use)
import {
  rateAgent,
  getAgentRatings,
  getAverageRating,
  getUserRatingForAgent,
  deleteRatingForAgent,
  getRatingDistribution,
  getTopRatedAgents,
  updateRating,
} from './ratings';

// Versions functions (for internal use)
import {
  createVersion,
  getVersionHistory,
  compareVersions,
  rollbackToVersion,
} from './versions';

// Community functions (for internal use)
import {
  shareAgent,
  updateSharedAgent,
  deleteSharedAgent,
  searchCommunityAgents,
  getFeaturedAgents,
  getTrendingAgents,
  getNewAgents,
  forkAgent,
} from './community';

// Search functions (for internal use)
import {
  searchAgents as searchAgentsUtil,
  advancedSearch,
  filterByCategory,
  filterByRating,
  getPopularAgents,
  getTopRatedAgents as getTopRatedAgentsSearch,
  getRecentAgents,
  getRecentlyUpdatedAgents,
  getAgentsByTag,
  getAgentsByAuthor,
  getAgentsByVisibility,
  getTrendingAgents as getTrendingAgentsSearch,
  getAllTags,
  getAllAuthors,
} from './search';

// Types
export type {
  MarketplaceAgent,
  AgentRating,
  AgentVersion,
  AgentStats,
  MarketplaceMetadata,
  AgentInstallation,
  ExportedAgentData,
  ImportResult,
  ImportValidation,
  ConflictResolution,
  SearchFilters,
  SearchResult,
  VersionComparison,
  VersionChange,
} from './types';

export { ExportFormat } from './types';
export type { AgentVisibility } from './types';

// Storage
export {
  saveMarketplaceAgent,
  loadMarketplaceAgent,
  loadAllMarketplaceAgents,
  deleteMarketplaceAgent,
  updateAgentStats,
  searchMarketplaceAgents,
  getMarketplaceAgentsByCategory,
  getMarketplaceAgentsByVisibility,
  incrementDownloads,
  incrementInstalls,
  clearAllMarketplaceAgents,
  // Ratings storage
  saveRating,
  getRatingsForAgent,
  getUserRating,
  deleteRating,
  deleteRatingsForAgent,
} from './storage';

// Export
export {
  exportAgentToJSON,
  exportAgentToYAML,
  exportMultipleAgents,
  downloadAgentFile,
  downloadMultipleAgents,
  validateExport,
  getExportFilename,
  prepareAgentForExport,
} from './export';

// Import
export {
  importAgentFromJSON,
  importAgentFromYAML,
  importAgentWithValidation,
  importAgentFromFile,
  importMultipleAgentsFromFile,
  validateImport,
  checkForConflicts,
  promptConflictResolution,
} from './import';

// Ratings
export {
  rateAgent,
  getAgentRatings,
  getAverageRating,
  getUserRatingForAgent,
  updateRating,
  deleteRatingForAgent,
  getRatingDistribution,
  getTopRatedAgents,
} from './ratings';

// Search
export {
  searchAgents,
  filterByCategory,
  filterByRating,
  getPopularAgents,
  getTopRatedAgents as getTopRatedAgentsSearch,
  getRecentAgents,
  getRecentlyUpdatedAgents,
  getAgentsByTag,
  getAgentsByAuthor,
  getAgentsByVisibility,
  getTrendingAgents,
  getAllTags,
  getAllAuthors,
  advancedSearch,
} from './search';

// Versions
export {
  createVersion,
  getVersionHistory,
  rollbackToVersion,
  compareVersions,
  isUpgradeAvailable,
  upgradeToLatest,
  pruneOldVersions,
} from './versions';

// Community (NEW)
export {
  shareAgent,
  getCommunityAgents,
  getTrendingAgents as getTrendingCommunityAgents,
  getNewAgents,
  getFeaturedAgents,
  downloadAgent as downloadCommunityAgent,
  rateAgent as rateCommunityAgent,
  forkAgent,
  reportAgent,
  featureAgent,
  updateSharedAgent,
  deleteSharedAgent,
  searchCommunityAgents,
  getReports,
  getAgentReviews,
} from './community';

export type {
  MarketplaceVisibility,
  MarketplaceStats,
  ReportReason,
  AgentReport,
} from './community';

// Note: The grouped `marketplace` export object has been removed to avoid circular dependency issues.
// All functions are exported directly via the export statements above.
// You can import them individually, e.g.:
// import { saveMarketplaceAgent, exportAgentToJSON, rateAgent } from '@/lib/marketplace'
