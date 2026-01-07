/**
 * Enhanced Search Bar Component
 *
 * Advanced search input with:
 * - Autocomplete suggestions
 * - Search history
 * - Debounced queries
 * - Clear button
 * - Saved search management
 */

'use client';

import { Search, X, Clock, Bookmark, Tag } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import type { SearchSuggestion, SearchHistoryEntry } from '@/lib/marketplace';
import { getSearchSuggestions as getSearchSuggestionsUtil } from '@/lib/marketplace/search';

export interface SearchBarProps {
  /** Current search query */
  query: string;

  /** Callback when query changes */
  onQueryChange: (query: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Search history */
  searchHistory?: SearchHistoryEntry[];

  /** Callback when recent search is clicked */
  onRecentSearchClick?: (query: string) => void;

  /** Debounce delay in ms */
  debounceMs?: number;

  /** Show suggestions */
  showSuggestions?: boolean;

  /** Custom className */
  className?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  placeholder = 'Search plugins...',
  searchHistory = [],
  onRecentSearchClick,
  debounceMs = 300,
  showSuggestions = true,
  className = '',
}: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!showSuggestions || q.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await getSearchSuggestionsUtil(q, 5);
      setSuggestions(results);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [showSuggestions]);

  // Update suggestions when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery) {
        fetchSuggestions(localQuery);
      } else {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localQuery, fetchSuggestions]);

  const handleClear = () => {
    setLocalQuery('');
    onQueryChange('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setLocalQuery(suggestion.text);
    onQueryChange(suggestion.text);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setLocalQuery(recentQuery);
    onQueryChange(recentQuery);
    onRecentSearchClick?.(recentQuery);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'name':
        return <Search className="w-4 h-4 text-blue-500" />;
      case 'tag':
        return <Tag className="w-4 h-4 text-purple-500" />;
      case 'category':
        return <Search className="w-4 h-4 text-green-500" />;
      case 'author':
        return <Bookmark className="w-4 h-4 text-orange-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const hasDropdownContent = localQuery
    ? suggestions.length > 0 || isLoading
    : searchHistory.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
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

      {/* Dropdown */}
      {isOpen && hasDropdownContent && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden max-h-96 overflow-y-auto">
          {/* Search Suggestions */}
          {localQuery && (
            <>
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading suggestions...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Suggestions
                  </p>

                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type}-${suggestion.text}-${index}`}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-2 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span className="flex-1">{suggestion.text}</span>
                      <span className="text-xs text-gray-500 capitalize">{suggestion.type}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No suggestions found
                </div>
              )}
            </>
          )}

          {/* Recent Searches */}
          {!localQuery && searchHistory.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent Searches
              </p>

              {searchHistory.slice(0, 5).map((entry, index) => (
                <button
                  key={`${entry.query}-${index}`}
                  type="button"
                  onClick={() => handleRecentSearchClick(entry.query)}
                  className="w-full px-2 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{entry.query}</span>
                  <span className="text-xs text-gray-500">{entry.resultCount} results</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
