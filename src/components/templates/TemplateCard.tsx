/**
 * Template Card Component
 *
 * Individual card for displaying an agent template in the gallery.
 */

'use client';

import { AgentTemplate } from '@/lib/agents/templates';

interface TemplateCardProps {
  template: AgentTemplate;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const difficultyColors = {
    beginner: '#4caf50',
    intermediate: '#ff9800',
    advanced: '#f44336',
  };

  return (
    <div className="template-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="card-header">
        <span className="template-icon">{template.icon}</span>
        <div className="template-info">
          <h3 className="template-name">{template.name}</h3>
          <span
            className="difficulty-badge"
            style={{ backgroundColor: difficultyColors[template.difficulty] }}
          >
            {template.difficulty}
          </span>
        </div>
      </div>

      <p className="template-description">{template.description}</p>

      <div className="card-footer">
        <div className="template-tags">
          {(template.metadata.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {(template.metadata.tags || []).length > 3 && (
            <span className="tag-more">+{(template.metadata.tags || []).length - 3}</span>
          )}
        </div>
        <button className="view-template-btn">View Template</button>
      </div>

      <style jsx>{`
        .template-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: #0066cc;
        }

        .template-card:focus {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .template-icon {
          font-size: 2.5rem;
          line-height: 1;
        }

        .template-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .template-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #0a0a0a;
        }

        .difficulty-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
          width: fit-content;
        }

        .template-description {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #666;
          margin: 0;
          flex: 1;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .template-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          flex: 1;
        }

        .tag {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #666;
        }

        .tag-more {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #e0e0e0;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #666;
          font-weight: 500;
        }

        .view-template-btn {
          padding: 0.5rem 1rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .view-template-btn:hover {
          background: #0052a3;
        }

        @media (max-width: 480px) {
          .template-card {
            padding: 1rem;
          }

          .card-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .view-template-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
