/**
 * Agent Detail Modal Component
 *
 * Comprehensive modal showing full agent details with tabs.
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Download, Star, Calendar, User, ExternalLink, Github, FileText, History, MessageSquare, Loader2 } from 'lucide-react';
import type { MarketplaceAgent, AgentRating, RatingStats } from '@/lib/marketplace/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RatingStars } from './RatingStars';
import { RatingSummary } from './RatingSummary';
import { ReviewForm } from './ReviewForm';
import { ReviewsList } from './ReviewsList';
import { cn } from '@/lib/utils';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { getRatingStats, getAgentReviews, getUserRatingForAgent, rateAgent } from '@/lib/marketplace/ratings';

export interface AgentDetailModalProps {
  /** Agent to display */
  agent: MarketplaceAgent;

  /** Whether modal is open */
  isOpen: boolean;

  /** Callback when modal closes */
  onClose: () => void;

  /** Callback when install is clicked */
  onInstall: (agentId: string) => void;

  /** Callback when uninstall is clicked */
  onUninstall: (agentId: string) => void;

  /** Callback when rating is submitted */
  onRate?: (agentId: string, rating: number, review?: string) => void;
}

type TabValue = 'about' | 'versions' | 'reviews';

export function AgentDetailModal({
  agent,
  isOpen,
  onClose,
  onInstall,
  onUninstall,
  onRate,
}: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('about');
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [userRating, setUserRating] = useState<AgentRating | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const isInstalled = agent.marketplace.installation?.installed;

  // Load rating stats when modal opens
  useEffect(() => {
    if (isOpen && agent) {
      loadRatingData();
    }
  }, [isOpen, agent.id]);

  const loadRatingData = async () => {
    try {
      const [stats, userRat] = await Promise.all([
        getRatingStats(agent.id),
        getUserRatingForAgent(agent.id, 'current-user'), // In production, use actual user ID
      ]);
      setRatingStats(stats);
      setUserRating(userRat);
    } catch (error) {
      console.error('Failed to load rating data:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleRateSubmit = async (rating: number, reviewTitle?: string, review?: string) => {
    try {
      const userId = 'current-user'; // In production, use actual user ID

      await rateAgent(agent.id, userId, rating, review);

      // Reload rating data
      await loadRatingData();

      // Call parent callback
      if (onRate) {
        onRate(agent.id, rating, review);
      }

      setShowReviewForm(false);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      throw error;
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const { markReviewHelpful } = await import('@/lib/marketplace/ratings');
      await markReviewHelpful(reviewId, 'current-user');
      // Reload rating data
      await loadRatingData();
    } catch (error) {
      console.error('Failed to mark helpful:', error);
      throw error;
    }
  };

  const tabs = [
    { value: 'about' as TabValue, label: 'About', icon: FileText },
    { value: 'versions' as TabValue, label: 'Versions', icon: History },
    { value: 'reviews' as TabValue, label: 'Reviews', icon: MessageSquare, count: agent.marketplace.stats.ratingCount },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        {/* Large Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center text-5xl shadow-inner flex-shrink-0">
          {agent.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {agent.name}
              </h2>

              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {agent.marketplace.author}
                </span>

                <span>•</span>

                <span>v{agent.marketplace.version}</span>

                <span>•</span>

                <span className="capitalize">{agent.category}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {isInstalled ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onUninstall(agent.id)}
                >
                  Uninstall
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="md"
                  onClick={() => onInstall(agent.id)}
                >
                  + Install Agent
                </Button>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-3 mt-3">
            {agent.metadata.documentation && (
              <a
                href={agent.metadata.documentation}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <FileText className="w-4 h-4" />
                Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {agent.metadata.repository && (
              <a
                href={agent.metadata.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Github className="w-4 h-4" />
                Repository
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <span className="text-sm text-gray-500 dark:text-gray-400">
              {agent.marketplace.license}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 py-4 border-b border-gray-200 dark:border-gray-700">
        {/* Rating */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
          <RatingStars
            rating={agent.marketplace.stats.rating}
            ratingCount={agent.marketplace.stats.ratingCount}
            size="sm"
            showCount={false}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {agent.marketplace.stats.rating.toFixed(1)}
          </span>
        </div>

        {/* Downloads */}
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Download className="w-4 h-4" />
          <span>{formatNumber(agent.marketplace.stats.downloads)} downloads</span>
        </div>

        {/* Installs */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatNumber(agent.marketplace.stats.installs)}
          </span>
          {' '}installs
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>Updated {formatRelativeTime(new Date(agent.marketplace.stats.lastUpdated).toISOString())}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.value
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="py-6 overflow-y-auto max-h-[60vh]">
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                About
              </h3>
              <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300">
                {agent.marketplace.longDescription || agent.description}
              </div>
            </div>

            {/* Capabilities */}
            {agent.requirements && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Requirements
                </h3>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {agent.requirements.hardware?.minRAM && (
                    <li>• Minimum {agent.requirements.hardware.minRAM}GB RAM</li>
                  )}
                  {agent.requirements.hardware?.minJEPAScore && (
                    <li>• JEPA Score {agent.requirements.hardware.minJEPAScore}+</li>
                  )}
                  {agent.requirements.dependencies && agent.requirements.dependencies.length > 0 && (
                    <li>• Requires: {agent.requirements.dependencies.join(', ')}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Tags */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.marketplace.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Screenshots */}
            {agent.marketplace.screenshots && agent.marketplace.screenshots.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Screenshots
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {agent.marketplace.screenshots.map((screenshot, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-80 h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center"
                    >
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Screenshot {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Version History
            </h3>

            {agent.marketplace.changelog && agent.marketplace.changelog.length > 0 ? (
              <div className="space-y-3">
                {agent.marketplace.changelog.map((entry, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {entry}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No version history available.
              </p>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Rating Summary */}
            {ratingStats && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <RatingSummary stats={ratingStats} size="md" />
              </div>
            )}

            {/* Review Form */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {userRating ? 'Update Your Review' : 'Write a Review'}
                </h3>
                {userRating && !showReviewForm && (
                  <Button size="sm" variant="outline" onClick={() => setShowReviewForm(true)}>
                    Edit Review
                  </Button>
                )}
              </div>

              {showReviewForm || !userRating ? (
                <ReviewForm
                  agentId={agent.id}
                  existingRating={userRating || undefined}
                  onSubmit={handleRateSubmit}
                  onCancel={() => {
                    setShowReviewForm(false);
                  }}
                  submitText={userRating ? 'Update Review' : 'Submit Review'}
                />
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  You have already reviewed this agent. Thank you for your feedback!
                </div>
              )}
            </div>

            {/* Reviews List */}
            {isLoadingReviews ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <ReviewsList
                agentId={agent.id}
                onMarkHelpful={handleMarkHelpful}
                canMarkHelpful={!userRating}
                pageSize={5}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
