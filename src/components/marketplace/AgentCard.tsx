/**
 * Agent Card Component
 *
 * Preview card for marketplace agents with hover effects.
 * Features loading states, animations, and success feedback.
 */

'use client';

import { Download, Star, User, Loader2, Check } from 'lucide-react';
import { useState } from 'react';
import type { MarketplaceAgent } from '@/lib/marketplace/types';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface AgentCardProps {
  /** Agent data */
  agent: MarketplaceAgent;

  /** Callback when install button is clicked */
  onInstall: (agentId: string) => void;

  /** Callback when view details is clicked */
  onViewDetails: (agentId: string) => void;

  /** Custom className */
  className?: string;
}

export function AgentCard({
  agent,
  onInstall,
  onViewDetails,
  className = '',
}: AgentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(agent.marketplace.installation?.installed || false);
  const [showSuccess, setShowSuccess] = useState(false);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await onInstall(agent.id);
      setIsInstalled(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to install agent:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden animate-fade-in',
        isHovered && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 scale-[1.02]',
        showSuccess && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="relative p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agent Icon */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center text-3xl shadow-inner">
              {agent.icon}
            </div>

            {/* Name and Category */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                {agent.name}
              </h3>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {agent.category}
              </span>
            </div>
          </div>

          {/* Featured Badge */}
          {agent.marketplace.stats.featured && (
            <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
              ⭐ Featured
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-3">
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {truncate(agent.description, 120)}
        </p>

        {/* Meta - Rating and Downloads */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <RatingStars
              rating={agent.marketplace.stats.rating}
              ratingCount={agent.marketplace.stats.ratingCount}
              size="sm"
              showCount={false}
            />
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              ({agent.marketplace.stats.ratingCount})
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Download className="w-3.5 h-3.5" />
            <span>{formatNumber(agent.marketplace.stats.downloads)}</span>
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <User className="w-3.5 h-3.5" />
          <span>by {agent.marketplace.author}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        {isInstalled ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" />
              Installed
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(agent.id)}
            >
              View Details
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleInstall}
              disabled={isInstalling || showSuccess}
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Installing...
                </>
              ) : showSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Installed!
                </>
              ) : (
                '+ Install'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(agent.id)}
              disabled={isInstalling}
            >
              Details
            </Button>
          </div>
        )}
      </div>

      {/* Quick Preview on Hover */}
      {isHovered && agent.marketplace.longDescription && (
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pt-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Quick Preview
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
              {agent.marketplace.longDescription.slice(0, 150)}...
            </p>
            <div className="flex flex-wrap gap-1">
              {agent.marketplace.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
