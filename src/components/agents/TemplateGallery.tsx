'use client';

/**
 * TemplateGallery Component
 *
 * Displays a browsable gallery of agent templates.
 * Users can filter by category, search, and instantiate templates with one click.
 *
 * Features:
 * - Search and filter templates
 * - Loading states during template creation
 * - Success/error feedback
 * - Smooth animations
 */

import React, { useState, useMemo } from 'react';
import { Search, Grid3x3, Star, Sparkles, TrendingUp, X, Loader2, Check } from 'lucide-react';
import { agentRegistry } from '@/lib/agents';
import {
  AGENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  searchTemplates,
  getFeaturedTemplates,
  getPopularTemplates,
  getNewTemplates,
} from '@/lib/agents/templates/registry';
import { AgentCategory } from '@/lib/agents/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';

interface TemplateGalleryProps {
  /** Callback when user selects a template */
  onSelectTemplate: (templateId: string) => void;
  /** Callback to close the gallery */
  onClose?: () => void;
  /** Hardware score for filtering compatible templates */
  hardwareScore?: number;
}

type ViewMode = 'all' | 'featured' | 'popular' | 'new';

export function TemplateGallery({
  onSelectTemplate,
  onClose,
  hardwareScore = 100,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  // Filter and search templates
  const filteredTemplates = useMemo(() => {
    let templates = AGENT_TEMPLATES;

    // Apply view mode filter
    if (viewMode === 'featured') {
      templates = getFeaturedTemplates();
    } else if (viewMode === 'popular') {
      templates = getPopularTemplates();
    } else if (viewMode === 'new') {
      templates = getNewTemplates();
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      templates = getTemplatesByCategory(selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Filter by hardware compatibility
    templates = templates.filter((template) => {
      if (!template.requirements?.hardware?.minJEPAScore) {
        return true;
      }
      // Use performanceScore as a proxy for JEPA capability
      // performanceScore 0-100 maps to JEPA capability
      return hardwareScore >= template.requirements.hardware.minJEPAScore;
    });

    return templates;
  }, [searchQuery, selectedCategory, viewMode, hardwareScore]);

  const handleSelectTemplate = async (templateId: string) => {
    setCreatingTemplateId(templateId);
    try {
      await onSelectTemplate(templateId);
      showSuccess('Template created successfully!');
      // Small delay for better UX
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (error) {
      console.error('Failed to create template:', error);
      showError('Failed to create template. Please try again.');
      setCreatingTemplateId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Agent Templates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and use pre-built agent configurations
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close template gallery"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 space-y-4 border-b border-slate-200 dark:border-slate-800">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search templates"
          />
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'all'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Templates
          </button>
          <button
            onClick={() => setViewMode('featured')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'featured'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Featured
          </button>
          <button
            onClick={() => setViewMode('popular')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'popular'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Popular
          </button>
          <button
            onClick={() => setViewMode('new')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              viewMode === 'new'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Categories
          </button>
          {Object.entries(TEMPLATE_CATEGORIES).map(([category, info]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as AgentCategory)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                selectedCategory === category
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{info.icon}</span>
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Grid3x3 className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No templates found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleSelectTemplate(template.id)}
                hardwareScore={hardwareScore}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredTemplates.length} of {AGENT_TEMPLATES.length} templates
        </p>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: any;
  onSelect: () => void;
  hardwareScore: number;
}

function TemplateCard({ template, onSelect, hardwareScore }: TemplateCardProps) {
  const isCompatible = !template.requirements?.hardware?.minJEPAScore ||
    hardwareScore >= template.requirements.hardware.minJEPAScore;

  const categoryInfo = TEMPLATE_CATEGORIES[template.category as keyof typeof TEMPLATE_CATEGORIES];

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] animate-fade-in ${
        !isCompatible ? 'opacity-60' : ''
      }`}
      onClick={isCompatible ? onSelect : undefined}
      role="button"
      tabIndex={isCompatible ? 0 : undefined}
      onKeyDown={(e) => {
        if (isCompatible && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Use ${template.name} template`}
    >
      {/* Icon and Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl" role="img" aria-label={`${template.name} icon`}>
          {template.icon}
        </div>
        {!isCompatible && (
          <div className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900 rounded-md animate-pulse">
            Incompatible
          </div>
        )}
      </div>

      {/* Title and Category */}
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {template.name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{categoryInfo?.icon}</span>
          <span>{categoryInfo?.label}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {template.metadata.tags.slice(0, 3).map((tag: string) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 rounded transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {tag}
          </span>
        ))}
        {template.metadata.tags.length > 3 && (
          <span className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800 rounded">
            +{template.metadata.tags.length - 3}
          </span>
        )}
      </div>

      {/* Use Template Button */}
      <Button
        variant={isCompatible ? 'default' : 'ghost'}
        size="sm"
        className="w-full"
        disabled={!isCompatible}
        onClick={(e) => {
          e.stopPropagation();
          if (isCompatible) onSelect();
        }}
      >
        {isCompatible ? 'Use Template' : 'Not Compatible'}
      </Button>
    </Card>
  );
}
