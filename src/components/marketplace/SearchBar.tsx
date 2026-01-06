/**
 * Search Bar Component
 *
 * Search input with debounced queries and recent searches.
 */

'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';

export interface SearchBarProps {
  /** Current search query */
  query: string;

  /** Callback when query changes */
  onQueryChange: (query: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Recent searches */
  recentSearches?: string[];

  /** Callback when recent search is clicked */
  onRecentSearchClick?: (query: string) => void;

  /** Debounce delay in ms */
  debounceMs?: number;

  /** Custom className */
  className?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  placeholder = 'Search agents...',
  recentSearches = [],
  onRecentSearchClick,
  debounceMs = 300,
  className = '',
}: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced query update
  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange(localQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localQuery, debounceMs, onQueryChange]);

  // Update local query when prop changes
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleClear = () => {
    setLocalQuery('');
    onQueryChange('');
    inputRef.current?.focus();
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setLocalQuery(recentQuery);
    onQueryChange(recentQuery);
    onRecentSearchClick?.(recentQuery);
    setShowRecent(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowRecent(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onFocus={() => setShowRecent(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {localQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Recent Searches Dropdown */}
      {showRecent && recentSearches.length > 0 && !localQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Recent Searches
            </p>

            {recentSearches.slice(0, 5).map((recentQuery, index) => (
              <button
                key={`${recentQuery}-${index}`}
                type="button"
                onClick={() => handleRecentSearchClick(recentQuery)}
                className="w-full px-2 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span>{recentQuery}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
