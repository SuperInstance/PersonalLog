/**
 * Agent Gallery Component
 *
 * Grid display of agent cards with filters and sorting.
 */

'use client';

import { useState, useMemo } from 'react';
import type { MarketplaceAgent, AgentCategory } from '@/lib/marketplace/types';
import { AgentCard } from './AgentCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package } from 'lucide-react';
import { Select } from '@/components/ui/form/Select';

export interface AgentGalleryProps {
  /** Agents to display */
  agents: MarketplaceAgent[];

  /** Loading state */
  loading?: boolean;

  /** Callback when install is clicked */
  onInstall: (agentId: string) => void;

  /** Callback when view details is clicked */
  onViewDetails: (agentId: string) => void;

  /** Current category filter */
  category?: AgentCategory | 'all';

  /** Current search query */
  searchQuery?: string;

  /** Custom className */
  className?: string;
}

type SortOption = 'popular' | 'rating' | 'recent' | 'name';

export function AgentGallery({
  agents,
  loading = false,
  onInstall,
  onViewDetails,
  category = 'all',
  searchQuery = '',
  className = '',
}: AgentGalleryProps) {
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let filtered = [...agents];

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter((agent) => agent.category === category);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.marketplace.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort agents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.marketplace.stats.downloads - a.marketplace.stats.downloads;
        case 'rating':
          return b.marketplace.stats.rating - a.marketplace.stats.rating;
        case 'recent':
          return (
            b.marketplace.stats.lastUpdated - a.marketplace.stats.lastUpdated
          );
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [agents, category, searchQuery, sortBy]);

  // Show loading skeleton
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Sort Controls Skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state
  if (filteredAgents.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <EmptyState
          icon={Package}
          title="No agents found"
          description={
            searchQuery || category !== 'all'
              ? `No agents match your search criteria. Try adjusting your filters.`
              : 'No agents available in the marketplace yet.'
          }
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Results Count and Sort */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
        </p>

        <div className="flex items-center gap-2">
          <label
            htmlFor="sort-select"
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            Sort by:
          </label>
          <Select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-40"
            options={[
              { value: 'popular', label: 'Most Popular' },
              { value: 'rating', label: 'Top Rated' },
              { value: 'recent', label: 'Recently Updated' },
              { value: 'name', label: 'Name (A-Z)' },
            ]}
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Top Rated</option>
            <option value="recent">Recently Updated</option>
            <option value="name">Name (A-Z)</option>
          </Select>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onInstall={onInstall}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
