/**
 * Category Navigation Component
 *
 * Horizontal navigation for agent categories with count badges.
 */

'use client';

import { AgentCategory } from '@/lib/agents/types';
import { cn } from '@/lib/utils';

export interface CategoryNavProps {
  /** Currently selected category */
  selectedCategory: AgentCategory | 'all';

  /** Callback when category is selected */
  onSelectCategory: (category: AgentCategory | 'all') => void;

  /** Category counts */
  categoryCounts?: Partial<Record<AgentCategory | 'all', number>>;

  /** Custom className */
  className?: string;
}

const categoryInfo: Record<AgentCategory | 'all', { label: string; icon: string }> = {
  all: { label: 'All Agents', icon: '🌐' },
  [AgentCategory.ANALYSIS]: { label: 'Analysis', icon: '🔍' },
  [AgentCategory.KNOWLEDGE]: { label: 'Knowledge', icon: '📚' },
  [AgentCategory.CREATIVE]: { label: 'Creative', icon: '✨' },
  [AgentCategory.AUTOMATION]: { label: 'Automation', icon: '⚙️' },
  [AgentCategory.COMMUNICATION]: { label: 'Communication', icon: '💬' },
  [AgentCategory.DATA]: { label: 'Data', icon: '📊' },
  [AgentCategory.CUSTOM]: { label: 'Custom', icon: '🎨' },
};

export function CategoryNav({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  className = '',
}: CategoryNavProps) {
  return (
    <nav
      className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent ${className}`}
      role="navigation"
      aria-label="Agent categories"
    >
      {(Object.keys(categoryInfo) as (AgentCategory | 'all')[]).map((category) => {
        const info = categoryInfo[category];
        const count = categoryCounts[category] || 0;
        const isSelected = selectedCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              isSelected
                ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            aria-label={`${info.label} category${count > 0 ? ` (${count} agents)` : ''}`}
            aria-pressed={isSelected}
          >
            <span className="text-base" aria-hidden="true">
              {info.icon}
            </span>
            <span>{info.label}</span>

            {count > 0 && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                )}
                aria-label={`${count} agents`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
