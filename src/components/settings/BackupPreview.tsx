'use client';

/**
 * Backup Preview Component
 *
 * Shows detailed preview of backup contents including:
 * - Conversations and messages
 * - Knowledge base entries
 * - Settings
 * - Analytics data
 * - Personalization data
 *
 * @module components/settings
 */

import { useState } from 'react';
import {
  X,
  FileText,
  Database,
  Settings,
  BarChart3,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Calendar,
  Tag,
  Eye,
  Download,
  User,
  MessageSquare,
  BookOpen,
  Sliders,
  TrendingUp,
  Heart
} from 'lucide-react';
import { Backup, BackupData } from '@/lib/backup/types';

interface BackupPreviewProps {
  /** Backup to preview */
  backup: Backup;
  /** Called when preview is closed */
  onClose: () => void;
  /** Called when user clicks restore */
  onRestore?: () => void;
  /** Called when user clicks download */
  onDownload?: () => void;
}

type TabType = 'conversations' | 'knowledge' | 'settings' | 'analytics' | 'personalization';

/**
 * BackupPreview displays detailed contents of a backup
 */
export function BackupPreview({ backup, onClose, onRestore, onDownload }: BackupPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const tabs = [
    { id: 'conversations' as TabType, label: 'Conversations', icon: MessageSquare, count: backup.data.conversations?.length || 0 },
    { id: 'knowledge' as TabType, label: 'Knowledge', icon: BookOpen, count: backup.data.knowledge?.length || 0 },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings, count: Object.keys(backup.data.settings || {}).length },
    { id: 'analytics' as TabType, label: 'Analytics', icon: TrendingUp, count: backup.data.analytics?.events?.length || 0 },
    { id: 'personalization' as TabType, label: 'Personalization', icon: Heart, count: Object.keys(backup.data.personalization || {}).length }
  ];

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {backup.name}
                </h2>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(backup.timestamp).toLocaleString()}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{backup.type}</span>
                  <span>·</span>
                  <span>{backup.version}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {onRestore && (
              <button
                onClick={onRestore}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Database className="w-5 h-5" />
                Restore This Backup
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'conversations' && (
            <ConversationsTab
              conversations={backup.data.conversations || []}
              searchQuery={searchQuery}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpand}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeTab
              knowledge={backup.data.knowledge || []}
              searchQuery={searchQuery}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpand}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={backup.data.settings || {}}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              analytics={backup.data.analytics}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'personalization' && (
            <PersonalizationTab
              personalization={backup.data.personalization || {}}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

interface ConversationsTabProps {
  conversations: any[];
  searchQuery: string;
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
}

function ConversationsTab({ conversations, searchQuery, expandedItems, onToggleExpand }: ConversationsTabProps) {
  const filtered = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return <EmptyState message={searchQuery ? 'No conversations match your search' : 'No conversations in this backup'} />;
  }

  return (
    <div className="space-y-3">
      {filtered.map((conv) => (
        <div key={conv.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => onToggleExpand(conv.id)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1 text-left">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{conv.title}</h4>
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-500 mt-1">
                <span>{conv.type}</span>
                <span>·</span>
                <span>{conv.messages?.length || 0} messages</span>
                <span>·</span>
                <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {expandedItems.has(conv.id) ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {expandedItems.has(conv.id) && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="space-y-2">
                {conv.messages?.slice(0, 5).map((msg: any) => (
                  <div key={msg.id} className="flex items-start gap-3 text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{msg.author?.type || 'Unknown'}</p>
                      <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                        {msg.content?.text || msg.content?.systemNote || '[No content]'}
                      </p>
                    </div>
                  </div>
                ))}
                {conv.messages?.length > 5 && (
                  <p className="text-sm text-slate-500 text-center">
                    ...and {conv.messages.length - 5} more messages
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface KnowledgeTabProps {
  knowledge: any[];
  searchQuery: string;
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
}

function KnowledgeTab({ knowledge, searchQuery, expandedItems, onToggleExpand }: KnowledgeTabProps) {
  const filtered = knowledge.filter(entry =>
    entry.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return <EmptyState message={searchQuery ? 'No knowledge entries match your search' : 'No knowledge entries in this backup'} />;
  }

  return (
    <div className="space-y-3">
      {filtered.map((entry) => (
        <div key={entry.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {entry.type}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(entry.metadata?.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                {entry.content}
              </p>
              {entry.metadata?.tags && entry.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {entry.metadata.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface SettingsTabProps {
  settings: any;
  searchQuery: string;
}

function SettingsTab({ settings, searchQuery }: SettingsTabProps) {
  const categories = [
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'intelligence', label: 'Intelligence', icon: Sparkles },
    { id: 'featureFlags', label: 'Feature Flags', icon: Settings },
    { id: 'hardware', label: 'Hardware', icon: Database },
    { id: 'optimization', label: 'Optimization', icon: TrendingUp }
  ];

  const filteredCategories = categories.filter(cat => {
    if (!settings[cat.id]) return false;
    return cat.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredCategories.length === 0) {
    return <EmptyState message={searchQuery ? 'No settings match your search' : 'No settings in this backup'} />;
  }

  return (
    <div className="space-y-4">
      {filteredCategories.map((category) => {
        const Icon = category.icon;
        const data = settings[category.id];

        return (
          <div key={category.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {category.label}
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AnalyticsTabProps {
  analytics: any;
  searchQuery: string;
}

function AnalyticsTab({ analytics, searchQuery }: AnalyticsTabProps) {
  if (!analytics) {
    return <EmptyState message="No analytics data in this backup" />;
  }

  const events = analytics.events || [];
  const filtered = events.filter((event: any) =>
    event.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return <EmptyState message={searchQuery ? 'No events match your search' : 'No analytics events in this backup'} />;
  }

  return (
    <div className="space-y-3">
      {analytics.statistics && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Statistics Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Total Events</span>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{analytics.statistics.totalEvents}</p>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Total Sessions</span>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{analytics.statistics.totalSessions}</p>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Avg Session</span>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {Math.round(analytics.statistics.avgSessionDuration / 60)}m
              </p>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Most Active</span>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{analytics.statistics.mostActiveDay}</p>
            </div>
          </div>
        </div>
      )}

      {filtered.slice(0, 20).map((event: any) => (
        <div key={event.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{event.type}</h4>
              <p className="text-sm text-slate-500">{event.category}</p>
            </div>
            <span className="text-xs text-slate-500">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          {event.data && Object.keys(event.data).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded p-2 text-xs font-mono overflow-x-auto">
              {JSON.stringify(event.data, null, 2)}
            </div>
          )}
        </div>
      ))}

      {filtered.length > 20 && (
        <p className="text-center text-sm text-slate-500">
          Showing 20 of {filtered.length} events
        </p>
      )}
    </div>
  );
}

interface PersonalizationTabProps {
  personalization: any;
  searchQuery: string;
}

function PersonalizationTab({ personalization, searchQuery }: PersonalizationTabProps) {
  const categories = [
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'ui', label: 'UI Preferences', icon: Settings },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'patterns', label: 'Usage Patterns', icon: TrendingUp },
    { id: 'learning', label: 'Learning State', icon: Sparkles }
  ];

  const filteredCategories = categories.filter(cat => {
    if (!personalization[cat.id]) return false;
    return cat.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredCategories.length === 0 && !personalization.preferences) {
    return <EmptyState message={searchQuery ? 'No personalization data matches your search' : 'No personalization data in this backup'} />;
  }

  return (
    <div className="space-y-4">
      {/* Learned Preferences */}
      {personalization.preferences && Object.keys(personalization.preferences).length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Learned Preferences ({Object.keys(personalization.preferences).length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(personalization.preferences)
              .filter(([key]) => key.toLowerCase().includes(searchQuery.toLowerCase()))
              .slice(0, 10)
              .map(([key, pref]: [string, any]) => (
                <div key={key} className="bg-white dark:bg-slate-900 rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{key}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      pref.source === 'learned'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {pref.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Confidence: {Math.round(pref.confidence * 100)}%
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Other Categories */}
      {filteredCategories.map((category) => {
        const Icon = category.icon;
        const data = personalization[category.id];

        return (
          <div key={category.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Icon className="w-5 h-5" />
              {category.label}
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              <pre className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="w-12 h-12 text-slate-400 mb-4" />
      <p className="text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
