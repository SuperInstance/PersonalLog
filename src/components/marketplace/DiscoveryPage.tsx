/**
 * Plugin Discovery Page Component
 *
 * Comprehensive discovery page with:
 * - Trending plugins section
 * - New arrivals section
 * - Top rated section
 * - Editor's picks section
 * - Category browsing
 * - Personalized recommendations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Clock, Star, Sparkles, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchBar } from './SearchBar';
import { PluginFilters } from './PluginFilters';
import { AgentCard } from './AgentCard';
import type { MarketplaceAgent, SearchFilters, DiscoveryResult, SearchHistoryEntry } from '@/lib/marketplace';
import {
  getTrendingPlugins,
  getNewPlugins,
  getTopRatedPlugins,
  getEditorsPicks,
  getPersonalizedFeed,
  getAllTags,
  getSearchHistory,
} from '@/lib/marketplace';

export interface DiscoveryPageProps {
  /** Installed plugin IDs for recommendations */
  installedPluginIds?: string[];

  /** Custom className */
  className?: string;
}

interface SectionData {
  title: string;
  icon: React.ReactNode;
  plugins: MarketplaceAgent[];
  loading: boolean;
}

export function DiscoveryPage({ installedPluginIds = [], className = '' }: DiscoveryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState<MarketplaceAgent[]>([]);

  // Handle install action
  const handleInstall = (agentId: string) => {
    console.log('Install agent:', agentId);
    // TODO: Implement install logic
  };

  // Handle view details action
  const handleViewDetails = (agentId: string) => {
    console.log('View details:', agentId);
    // TODO: Implement view details logic
  };

  const [sections, setSections] = useState<{
    trending: SectionData;
    new: SectionData;
    topRated: SectionData;
    editorsPicks: SectionData;
    personalized: SectionData;
  }>({
    trending: { title: 'Trending', icon: <TrendingUp className="w-5 h-5" />, plugins: [], loading: true },
    new: { title: 'New Arrivals', icon: <Clock className="w-5 h-5" />, plugins: [], loading: true },
    topRated: { title: 'Top Rated', icon: <Star className="w-5 h-5" />, plugins: [], loading: true },
    editorsPicks: { title: "Editor's Picks", icon: <Sparkles className="w-5 h-5" />, plugins: [], loading: true },
    personalized: { title: 'Recommended for You', icon: <Users className="w-5 h-5" />, plugins: [], loading: true },
  });

  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load discovery sections
  useEffect(() => {
    const loadDiscoveryData = async () => {
      try {
        // Load all sections in parallel
        const [trending, newPlugins, topRated, editorsPicks, personalized, tags] = await Promise.all([
          getTrendingPlugins(6),
          getNewPlugins(6),
          getTopRatedPlugins(6),
          getEditorsPicks(6),
          getPersonalizedFeed(installedPluginIds, { trending: 3, new: 2, topRated: 2, recommended: 3 }),
          getAllTags(),
        ]);

        setSections({
          trending: {
            title: 'Trending',
            icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
            plugins: trending.map((r) => r.plugin),
            loading: false,
          },
          new: {
            title: 'New Arrivals',
            icon: <Clock className="w-5 h-5 text-green-500" />,
            plugins: newPlugins.map((r) => r.plugin),
            loading: false,
          },
          topRated: {
            title: 'Top Rated',
            icon: <Star className="w-5 h-5 text-yellow-500" />,
            plugins: topRated.map((r) => r.plugin),
            loading: false,
          },
          editorsPicks: {
            title: "Editor's Picks",
            icon: <Sparkles className="w-5 h-5 text-purple-500" />,
            plugins: editorsPicks.map((r) => r.plugin),
            loading: false,
          },
          personalized: {
            title: 'Recommended for You',
            icon: <Users className="w-5 h-5 text-orange-500" />,
            plugins: personalized.map((r) => r.plugin),
            loading: false,
          },
        });

        setAvailableTags(tags);
      } catch (error) {
        console.error('Failed to load discovery data:', error);
        // Set loading to false even on error
        setSections((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            updated[key as keyof typeof prev].loading = false;
          });
          return updated;
        });
      }
    };

    loadDiscoveryData();
  }, [installedPluginIds]);

  // Load search history
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Handle search query change
  const handleQueryChange = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Perform search (this would use the searchAgents function)
    // For now, we'll leave it empty until the search is actually triggered
  }, []);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((query: string) => {
    setSearchQuery(query);
    // Trigger search with this query
  }, []);

  const renderPluginGrid = (plugins: MarketplaceAgent[], loading: boolean) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (plugins.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No plugins found</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((plugin) => (
          <AgentCard
            key={plugin.id}
            agent={plugin}
            onInstall={handleInstall}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>
    );
  };

  const renderSection = (key: string, section: SectionData) => {
    if (section.plugins.length === 0 && !section.loading) {
      return null;
    }

    return (
      <section key={key} className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {section.icon}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{section.title}</h2>
        </div>
        {renderPluginGrid(section.plugins, section.loading)}
      </section>
    );
  };

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Discover Plugins
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore the marketplace and find the perfect plugins for your needs
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          query={searchQuery}
          onQueryChange={handleQueryChange}
          searchHistory={searchHistory}
          onRecentSearchClick={handleRecentSearchClick}
          placeholder="Search for plugins..."
        />
      </div>

      {/* Main Layout */}
      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-6">
            <PluginFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableTags={availableTags}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Search Results */}
          {searchQuery && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Search Results for "{searchQuery}"
              </h2>
              {renderPluginGrid(searchResults, false)}
            </div>
          )}

          {/* Discovery Sections */}
          {!searchQuery && (
            <>
              {renderSection('trending', sections.trending)}
              {renderSection('personalized', sections.personalized)}
              {renderSection('new', sections.new)}
              {renderSection('topRated', sections.topRated)}
              {renderSection('editorsPicks', sections.editorsPicks)}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
