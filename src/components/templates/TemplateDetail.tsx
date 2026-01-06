/**
 * Template Detail Component
 *
 * Modal showing full details about an agent template,
 * including use cases, tips, and example conversations.
 */

'use client';

import { useState } from 'react';
import { AgentTemplate } from '@/lib/agents/templates';
import { CustomizationWizard } from './CustomizationWizard';

interface TemplateDetailProps {
  template: AgentTemplate;
  onClose: () => void;
  onUseTemplate: (template: AgentTemplate) => void;
}

export function TemplateDetail({ template, onClose, onUseTemplate }: TemplateDetailProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'examples' | 'config'>('overview');

  const handleCustomize = () => {
    setShowWizard(true);
  };

  const handleUseTemplate = () => {
    onUseTemplate(template);
  };

  if (showWizard) {
    return (
      <CustomizationWizard
        template={template}
        onComplete={(customizedAgent) => {
          // Convert AgentDefinition to AgentTemplate by adding missing fields
          const templateWithDefaults: AgentTemplate = {
            ...customizedAgent,
            difficulty: template.difficulty,
            useCases: template.useCases,
            tips: template.tips,
            exampleConversations: template.exampleConversations
          };
          onUseTemplate(templateWithDefaults);
          setShowWizard(false);
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <span className="template-icon">{template.icon}</span>
            <div>
              <h2 className="template-title">{template.name}</h2>
              <span
                className={`difficulty-badge difficulty-${template.difficulty}`}
              >
                {template.difficulty}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            Examples
          </button>
          <button
            className={`tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <p className="description">{template.description}</p>

              <section>
                <h3>Use Cases</h3>
                <ul>
                  {template.useCases.map((useCase, index) => (
                    <li key={index}>{useCase}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Tips</h3>
                <ul>
                  {template.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Capabilities</h3>
                <div className="capabilities">
                  {(template.metadata.tags || []).map((tag) => (
                    <span key={tag} className="capability-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="examples-tab">
              {template.exampleConversations && template.exampleConversations.length > 0 ? (
                template.exampleConversations.map((conv, index) => (
                  <div key={index} className="example-conversation">
                    <div className="conversation-user">
                      <span className="role-label">You:</span>
                      <p>{conv.user}</p>
                    </div>
                    <div className="conversation-agent">
                      <span className="role-label">{template.icon} {template.name}:</span>
                      <p>{conv.agent}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-examples">No example conversations available.</p>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="config-tab">
              <h3>Configuration Options</h3>
              {template.configSchema ? (
                <dl className="config-list">
                  {Object.entries(template.configSchema).map(([key, config]) => (
                    <div key={key} className="config-item">
                      <dt>
                        <code>{key}</code>
                        {config.required && <span className="required">required</span>}
                      </dt>
                      <dd>{config.description}</dd>
                      <dd className="config-meta">
                        Type: <code>{config.type}</code>
                        {config.default !== undefined && (
                          <>
                            {' | Default: '}
                            <code>
                              {Array.isArray(config.default)
                                ? JSON.stringify(config.default)
                                : String(config.default)}
                            </code>
                          </>
                        )}
                        {config.enum && (
                          <>
                            {' | Options: '}
                            <code>{config.enum.join(', ')}</code>
                          </>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="no-config">No configuration options available.</p>
              )}

              {template.examples && template.examples.length > 0 && (
                <>
                  <h3>Example Configurations</h3>
                  <div className="examples-grid">
                    {template.examples.map((example, index) => (
                      <div key={index} className="example-config">
                        <h4>{example.name}</h4>
                        <p className="example-description">{example.description}</p>
                        <pre>
                          <code>{JSON.stringify(example.config, null, 2)}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleCustomize}>
            Customize Template
          </button>
          <button className="btn-secondary" onClick={handleUseTemplate}>
            Use as Is
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 2rem;
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 2rem 2rem 1rem;
            border-bottom: 1px solid #e0e0e0;
          }

          .header-left {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
          }

          .template-icon {
            font-size: 3rem;
            line-height: 1;
          }

          .template-title {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
          }

          .difficulty-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            color: white;
          }

          .difficulty-beginner {
            background: #4caf50;
          }

          .difficulty-intermediate {
            background: #ff9800;
          }

          .difficulty-advanced {
            background: #f44336;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            color: #666;
            transition: color 0.2s;
          }

          .close-btn:hover {
            color: #0a0a0a;
          }

          .tabs {
            display: flex;
            gap: 0;
            padding: 0 2rem;
            border-bottom: 1px solid #e0e0e0;
          }

          .tab {
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            color: #666;
            transition: all 0.2s;
          }

          .tab:hover {
            color: #0066cc;
          }

          .tab.active {
            color: #0066cc;
            border-bottom-color: #0066cc;
          }

          .modal-body {
            padding: 2rem;
            overflow-y: auto;
            flex: 1;
          }

          .overview-tab section {
            margin-bottom: 1.5rem;
          }

          .overview-tab h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
          }

          .description {
            font-size: 1.05rem;
            line-height: 1.6;
            color: #333;
            margin-bottom: 1.5rem;
          }

          .overview-tab ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .overview-tab li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
          }

          .overview-tab li:before {
            content: '•';
            position: absolute;
            left: 0;
            color: #0066cc;
            font-weight: bold;
          }

          .capabilities {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .capability-tag {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: #f5f5f5;
            border-radius: 20px;
            font-size: 0.9rem;
            color: #333;
          }

          .example-conversation {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .conversation-user,
          .conversation-agent {
            margin-bottom: 1rem;
          }

          .conversation-agent {
            margin-bottom: 0;
          }

          .role-label {
            font-weight: 600;
            color: #0066cc;
            display: block;
            margin-bottom: 0.5rem;
          }

          .conversation-user p,
          .conversation-agent p {
            margin: 0;
            line-height: 1.5;
          }

          .config-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .config-item {
            padding: 1rem;
            background: #f9f9f9;
            border-radius: 8px;
          }

          .config-item dt {
            font-weight: 600;
    margin-bottom: 0.25rem;
          }

          .config-item dt code {
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .required {
    color: #f44336;
    font-size: 0.75rem;
    text-transform: uppercase;
    margin-left: 0.5rem;
  }

  .config-item dd {
    margin: 0.5rem 0;
    color: #666;
  }

  .config-meta {
    font-size: 0.85rem;
    color: #999;
  }

  .config-meta code {
    background: white;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.85rem;
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .example-config {
    background: #f9f9f9;
    border-radius: 8px;
    padding: 1rem;
  }

  .example-config h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .example-description {
    font-size: 0.9rem;
    color: #666;
    margin: 0 0 0.75rem 0;
  }

  .example-config pre {
    background: white;
    padding: 0.75rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0;
  }

  .example-config code {
    font-size: 0.85rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid #e0e0e0;
  }

  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #0066cc;
    color: white;
    border: none;
  }

  .btn-primary:hover {
    background: #0052a3;
  }

  .btn-secondary {
    background: white;
    color: #0066cc;
    border: 1px solid #0066cc;
  }

  .btn-secondary:hover {
    background: #f5f9ff;
  }

  .no-examples,
  .no-config {
    color: #666;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .modal-content {
      max-height: 95vh;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 1.5rem;
    }

    .modal-footer {
      flex-direction: column;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
    }

    .examples-grid {
      grid-template-columns: 1fr;
    }
  }
        `}</style>
      </div>
    </div>
  );
}
