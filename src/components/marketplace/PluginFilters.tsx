/**
 * Plugin Filters Component
 *
 * Advanced filtering options:
 * - Category checkboxes
 * - Tag search and selection
 * - Permission filters
 * - Rating range slider
 * - Apply/reset filters
 */

'use client';

import { Filter, X, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { AgentCategory } from '@/lib/agents/types';
import type { SearchFilters } from '@/lib/marketplace';

export interface PluginFiltersProps {
  /** Current filters */
  filters: SearchFilters;

  /** Callback when filters change */
  onFiltersChange: (filters: SearchFilters) => void;

  /** Available tags */
  availableTags?: string[];

  /** Custom className */
  className?: string;
}

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  [AgentCategory.ANALYSIS]: 'Analysis',
  [AgentCategory.KNOWLEDGE]: 'Knowledge',
  [AgentCategory.CREATIVE]: 'Creative',
  [AgentCategory.AUTOMATION]: 'Automation',
  [AgentCategory.COMMUNICATION]: 'Communication',
  [AgentCategory.DATA]: 'Data',
  [AgentCategory.CUSTOM]: 'Custom',
};

export function PluginFilters({
  filters,
  onFiltersChange,
  availableTags = [],
  className = '',
}: PluginFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    tags: true,
    rating: true,
  });

  const [tagSearch, setTagSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(filters.tags || []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateFilters = useCallback(
    (updates: Partial<SearchFilters>) => {
      onFiltersChange({
        ...filters,
        ...updates,
      });
    },
    [filters, onFiltersChange]
  );

  const handleCategoryChange = (category: AgentCategory, checked: boolean) => {
    updateFilters({
      category: checked ? category : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newTags);
    updateFilters({
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleRatingChange = (rating: number) => {
    updateFilters({
      minRating: rating > 0 ? rating : undefined,
    });
  };

  const handleReset = () => {
    setSelectedTags([]);
    setTagSearch('');
    onFiltersChange({});
  };

  const hasActiveFilters = !!(
    filters.category ||
    filters.minRating ||
    filters.tags?.length
  );

  // Filter tags based on search
  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Category
          {expandedSections.category ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.category && (
          <div className="mt-2 space-y-1">
            {Object.values(AgentCategory).map((category) => (
              <label
                key={category}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.category === category}
                  onChange={(e) => handleCategoryChange(category, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {CATEGORY_LABELS[category]}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Tags Filter */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => toggleSection('tags')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Tags
          {selectedTags.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
              {selectedTags.length}
            </span>
          )}
          {expandedSections.tags ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.tags && (
          <div className="mt-2">
            {/* Tag Search */}
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Search tags..."
              className="w-full px-3 py-2 mb-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />

            {/* Tag List */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredTags.slice(0, 20).map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tag}</span>
                </label>
              ))}

              {filteredTags.length === 0 && (
                <p className="px-2 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                  No tags found
                </p>
              )}
            </div>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full flex items-center gap-1 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    {tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Minimum Rating
          {filters.minRating && (
            <span className="ml-2 flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              {filters.minRating}+
            </span>
          )}
          {expandedSections.rating ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.rating && (
          <div className="mt-2 px-2">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(filters.minRating === rating ? 0 : rating)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    filters.minRating === rating
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{rating}+ Stars</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
