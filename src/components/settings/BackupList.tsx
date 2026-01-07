'use client';

/**
 * Backup List Component
 *
 * Displays a browsable list of backups with:
 * - Search and filter functionality
 * - Backup metadata display
 * - Integrity status indicators
 * - Quick actions (restore, download, delete)
 *
 * @module components/settings
 */

import { useState } from 'react';
import {
  Search,
  Calendar,
  HardDrive,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  Eye,
  Clock
} from 'lucide-react';
import { Backup, generateIntegrityReport } from '@/lib/backup';
import { IntegrityReport } from '@/lib/backup/integrity';

interface BackupListProps {
  /** Available backups */
  backups: Backup[];
  /** Called when user clicks restore */
  onRestore: (backup: Backup) => void;
  /** Called when user clicks download */
  onDownload: (backup: Backup) => void;
  /** Called when user clicks delete */
  onDelete: (backup: Backup) => void;
  /** Called when user clicks preview */
  onPreview?: (backup: Backup) => void;
  /** Currently selected backup ID */
  selectedBackupId?: string;
}

type SortBy = 'date' | 'name' | 'size' | 'type';
type FilterType = 'all' | 'full' | 'incremental';
type FilterStatus = 'all' | 'healthy' | 'warning' | 'critical';

/**
 * BackupList displays backups with search, filter, and sort capabilities
 */
export function BackupList({
  backups,
  onRestore,
  onDownload,
  onDelete,
  onPreview,
  selectedBackupId
}: BackupListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedBackupId, setExpandedBackupId] = useState<string | null>(null);
  const [integrityReports, setIntegrityReports] = useState<Map<string, IntegrityReport>>(new Map());

  // Load integrity report on demand
  const loadIntegrityReport = async (backup: Backup) => {
    if (integrityReports.has(backup.id)) {
      return integrityReports.get(backup.id);
    }

    try {
      const report = await generateIntegrityReport(backup);
      setIntegrityReports(prev => new Map(prev).set(backup.id, report));
      return report;
    } catch (error) {
      console.error('Failed to load integrity report:', error);
      return null;
    }
  };

  // Toggle expand backup details
  const handleToggleExpand = async (backup: Backup) => {
    if (expandedBackupId === backup.id) {
      setExpandedBackupId(null);
    } else {
      setExpandedBackupId(backup.id);
      await loadIntegrityReport(backup);
    }
  };

  // Filter and sort backups
  const filteredBackups = backups
    .filter(backup => {
      // Search query
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        backup.name.toLowerCase().includes(query) ||
        backup.description?.toLowerCase().includes(query) ||
        backup.tags.some(tag => tag.toLowerCase().includes(query));

      // Filter by type
      const matchesType = filterType === 'all' || backup.type === filterType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.compressedSize - b.compressedSize;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search backups by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Types</option>
            <option value="full">Full</option>
            <option value="incremental">Incremental</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>{filteredBackups.length} backup{filteredBackups.length !== 1 ? 's' : ''}</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Backup List */}
      <div className="space-y-3">
        {filteredBackups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
            <HardDrive className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No backups found</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              {searchQuery || filterType !== 'all' ? 'Try adjusting your filters' : 'Create your first backup'}
            </p>
          </div>
        ) : (
          filteredBackups.map((backup) => (
            <BackupListItem
              key={backup.id}
              backup={backup}
              isExpanded={expandedBackupId === backup.id}
              isSelected={selectedBackupId === backup.id}
              integrityReport={integrityReports.get(backup.id)}
              onToggleExpand={() => handleToggleExpand(backup)}
              onRestore={() => onRestore(backup)}
              onDownload={() => onDownload(backup)}
              onDelete={() => onDelete(backup)}
              onPreview={() => onPreview?.(backup)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface BackupListItemProps {
  backup: Backup;
  isExpanded: boolean;
  isSelected: boolean;
  integrityReport?: IntegrityReport;
  onToggleExpand: () => void;
  onRestore: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onPreview?: () => void;
}

function BackupListItem({
  backup,
  isExpanded,
  isSelected,
  integrityReport,
  onToggleExpand,
  onRestore,
  onDownload,
  onDelete,
  onPreview
}: BackupListItemProps) {
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const getCompressionRatio = (): string => {
    if (backup.size === backup.compressedSize) return 'No compression';
    const ratio = ((1 - backup.compressedSize / backup.size) * 100).toFixed(0);
    return `${ratio}% smaller`;
  };

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Expand Button */}
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name and badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {backup.name}
              </h3>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                  backup.type === 'full'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`}
              >
                {backup.type}
              </span>
              {backup.isAutomatic && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex-shrink-0">
                  Auto
                </span>
              )}
              {backup.compression === 'gzip' && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex-shrink-0">
                  Compressed
                </span>
              )}
            </div>

            {/* Description */}
            {backup.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                {backup.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(backup.timestamp)}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-4 h-4" />
                {formatBytes(backup.compressedSize)}
                {backup.compression === 'gzip' && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    ({getCompressionRatio()})
                  </span>
                )}
              </span>
              {backup.tags.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {backup.tags.slice(0, 2).join(', ')}
                  {backup.tags.length > 2 && ` +${backup.tags.length - 2}`}
                </span>
              )}
            </div>

            {/* Tags */}
            {backup.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {backup.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onPreview && (
              <button
                onClick={() => onPreview()}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                title="Preview"
              >
                <Eye className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onDownload}
              className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors text-green-600 dark:text-green-400"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onRestore}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Restore
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <BackupDetails backup={backup} integrityReport={integrityReport} />
          </div>
        )}
      </div>
    </div>
  );
}

interface BackupDetailsProps {
  backup: Backup;
  integrityReport?: IntegrityReport;
}

function BackupDetails({ backup, integrityReport }: BackupDetailsProps) {
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getIntegrityStatus = () => {
    if (!integrityReport) return null;

    const statusConfig = {
      healthy: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Healthy' },
      warning: { icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Warning' },
      critical: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Critical' },
      corrupted: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Corrupted' }
    };

    const config = statusConfig[integrityReport.status];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
        <div className="flex-1">
          <span className={`font-semibold ${config.color}`}>{config.label}</span>
          <span className="text-sm opacity-75 ml-2">
            {integrityReport.score}/100 · {integrityReport.validItems} valid items
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Integrity Status */}
      {integrityReport ? (
        getIntegrityStatus()
      ) : (
        <div className="bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Shield className="w-5 h-5" />
            <span>Integrity check available</span>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-slate-600 dark:text-slate-400">Created</span>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {new Date(backup.timestamp).toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-slate-600 dark:text-slate-400">Size (original)</span>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {formatBytes(backup.size)}
          </p>
        </div>
        <div>
          <span className="text-slate-600 dark:text-slate-400">Size (compressed)</span>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {formatBytes(backup.compressedSize)}
          </p>
        </div>
        <div>
          <span className="text-slate-600 dark:text-slate-400">Version</span>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {backup.version}
          </p>
        </div>
      </div>

      {/* Content Summary */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Content Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <ContentSummaryItem
            label="Conversations"
            count={backup.data.conversations?.length || 0}
          />
          <ContentSummaryItem
            label="Messages"
            count={backup.data.conversations?.reduce((sum, c) => sum + (c.messages?.length || 0), 0) || 0}
          />
          <ContentSummaryItem
            label="Knowledge"
            count={backup.data.knowledge?.length || 0}
          />
          <ContentSummaryItem
            label="Settings"
            count={Object.keys(backup.data.settings || {}).length}
          />
          <ContentSummaryItem
            label="Analytics"
            count={backup.data.analytics?.events?.length || 0}
          />
          <ContentSummaryItem
            label="Personalization"
            count={Object.keys(backup.data.personalization || {}).length}
          />
        </div>
      </div>

      {/* Backup ID and Checksum */}
      <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
        <div className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          ID: {backup.id}
        </div>
        <div className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded break-all">
          SHA-256: {backup.checksum}
        </div>
      </div>
    </div>
  );
}

interface ContentSummaryItemProps {
  label: string;
  count: number;
}

function ContentSummaryItem({ label, count }: ContentSummaryItemProps) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{count}</span>
    </div>
  );
}
