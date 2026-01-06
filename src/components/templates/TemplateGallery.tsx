/**
 * Template Gallery Component
 *
 * Browse and select from a library of pre-built agent templates.
 * Templates are organized by category and difficulty level.
 */

'use client';

import { useState, useMemo } from 'react';
import { AgentTemplate, AGENT_TEMPLATES, getTemplatesByCategory } from '@/lib/agents/templates';
import { AgentCategory } from '@/lib/agents';
import { TemplateCard } from './TemplateCard';
import { TemplateDetail } from './TemplateDetail';

interface TemplateGalleryProps {
  onSelectTemplate?: (template: AgentTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Category definitions
  const categories = useMemo(
    () => [
      { id: 'all', name: 'All Templates', icon: '📦', count: AGENT_TEMPLATES.length },
      {
        id: AgentCategory.KNOWLEDGE,
        name: 'Knowledge',
        icon: '📚',
        count: getTemplatesByCategory(AgentCategory.KNOWLEDGE).length,
      },
      {
        id: AgentCategory.CREATIVE,
        name: 'Creativity',
        icon: '🎨',
        count: getTemplatesByCategory(AgentCategory.CREATIVE).length,
      },
      {
        id: AgentCategory.AUTOMATION,
        name: 'Productivity',
        icon: '⚡',
        count: getTemplatesByCategory(AgentCategory.AUTOMATION).length,
      },
      {
        id: AgentCategory.DATA,
        name: 'Technical',
        icon: '💻',
        count: getTemplatesByCategory(AgentCategory.DATA).length,
      },
      {
        id: AgentCategory.CUSTOM,
        name: 'Wellness',
        icon: '🧘',
        count: getTemplatesByCategory(AgentCategory.CUSTOM).length,
      },
    ],
    []
  );

  // Filter templates by category and search
  const filteredTemplates = useMemo(() => {
    let templates = AGENT_TEMPLATES;

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          (t.metadata.tags || []).some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return templates;
  }, [selectedCategory, searchQuery]);

  const handleSelectTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = (template: AgentTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setSelectedTemplate(null);
  };

  return (
    <div className="template-gallery">
      <div className="gallery-header">
        <h2>Agent Templates</h2>
        <p className="gallery-subtitle">
          Start with a template and customize it to your needs
        </p>

        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="clear-search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
            aria-label={`Filter by ${category.name}`}
            aria-pressed={selectedCategory === category.id}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
            <span className="category-count">({category.count})</span>
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="templates-grid">
        {filteredTemplates.length === 0 ? (
          <div className="no-results">
            <p>No templates found matching your criteria.</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="clear-search-btn">
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => handleSelectTemplate(template)}
            />
          ))
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetail
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUseTemplate={() => handleUseTemplate(selectedTemplate)}
        />
      )}

      <style jsx>{`
        .template-gallery {
          padding: 2rem 0;
        }

        .gallery-header {
          margin-bottom: 2rem;
        }

        .gallery-header h2 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #0a0a0a;
        }

        .gallery-subtitle {
          font-size: 1rem;
          color: #666;
          margin-bottom: 1.5rem;
        }

        .search-bar {
          position: relative;
          max-width: 500px;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #999;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }

        .clear-search:hover {
          color: #666;
        }

        .category-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .category-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
        }

        .category-tab:hover {
          border-color: #0066cc;
          background: #f5f9ff;
        }

        .category-tab.active {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }

        .category-icon {
          font-size: 1.25rem;
        }

        .category-name {
          font-weight: 500;
        }

        .category-count {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .no-results {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .clear-search-btn {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .clear-search-btn:hover {
          background: #0052a3;
        }

        @media (max-width: 768px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }

          .category-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.5rem;
          }

          .category-tab {
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}
