/**
 * Customization Wizard Component
 *
 * Step-by-step wizard for customizing agent templates.
 * Users can modify agent name, icon, personality, capabilities, and constraints.
 */

'use client';

import { useState } from 'react';
import { AgentTemplate } from '@/lib/agents/templates';
import type { AgentDefinition } from '@/lib/agents/types';

interface CustomizationWizardProps {
  template: AgentTemplate;
  onComplete: (agent: AgentDefinition) => void;
  onCancel: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function CustomizationWizard({
  template,
  onComplete,
  onCancel,
}: CustomizationWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [customAgent, setCustomAgent] = useState<Partial<AgentDefinition>>({
    ...template,
    id: `${template.id}-custom-${Date.now()}`,
  });

  const steps = [
    { number: 1, title: 'Name & Icon', description: 'Personalize your agent' },
    { number: 2, title: 'Description', description: 'Explain what it does' },
    { number: 3, title: 'Capabilities', description: 'Choose features' },
    { number: 4, title: 'Configuration', description: 'Set preferences' },
    { number: 5, title: 'Preview', description: 'Review and create' },
  ];

  const updateAgent = (updates: Partial<AgentDefinition>) => {
    setCustomAgent((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < 5) {
      setStep((step + 1) as WizardStep);
    } else {
      // Complete - create agent
      if (customAgent.id && customAgent.name && customAgent.description) {
        onComplete(customAgent as AgentDefinition);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return customAgent.name && customAgent.name.length > 0;
      case 2:
        return customAgent.description && customAgent.description.length > 0;
      case 3:
        return true; // Capabilities are optional
      case 4:
        return true; // Config is optional
      case 5:
        return true; // Preview is always valid
      default:
        return false;
    }
  };

  return (
    <div className="wizard-overlay" onClick={onCancel}>
      <div className="wizard-content" onClick={(e) => e.stopPropagation()}>
        {/* Progress Header */}
        <div className="wizard-header">
          <h2>Customize Your Agent</h2>
          <button className="close-btn" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="wizard-progress">
          {steps.map((s) => (
            <div
              key={s.number}
              className={`progress-step ${
                step === s.number ? 'active' : ''
              } ${step > s.number ? 'completed' : ''}`}
            >
              <div className="step-number">{s.number}</div>
              <div className="step-info">
                <div className="step-title">{s.title}</div>
                <div className="step-description">{s.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="wizard-body">
          {step === 1 && (
            <NameIconStep agent={customAgent} onChange={updateAgent} />
          )}
          {step === 2 && (
            <DescriptionStep agent={customAgent} onChange={updateAgent} />
          )}
          {step === 3 && (
            <CapabilitiesStep agent={customAgent} onChange={updateAgent} />
          )}
          {step === 4 && (
            <ConfigurationStep agent={customAgent} onChange={updateAgent} />
          )}
          {step === 5 && (
            <PreviewStep agent={customAgent} onChange={updateAgent} />
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-footer">
          {step > 1 ? (
            <button className="btn-secondary" onClick={handleBack}>
              ← Back
            </button>
          ) : (
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}

          {step < 5 ? (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              ✓ Create Agent
            </button>
          )}
        </div>

        <style jsx>{`
          .wizard-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            padding: 2rem;
            overflow-y: auto;
          }

          .wizard-content {
            background: white;
            border-radius: 16px;
            max-width: 700px;
            width: 100%;
            max-height: 95vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .wizard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2rem 2rem 1rem;
          }

          .wizard-header h2 {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0;
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

          .wizard-progress {
            display: flex;
            padding: 1rem 2rem;
            border-bottom: 1px solid #e0e0e0;
            overflow-x: auto;
          }

          .progress-step {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 150px;
            opacity: 0.5;
            transition: opacity 0.2s;
          }

          .progress-step.active {
            opacity: 1;
          }

          .progress-step.completed {
            opacity: 0.75;
          }

          .step-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
            flex-shrink: 0;
          }

          .progress-step.active .step-number {
            background: #0066cc;
            color: white;
          }

          .progress-step.completed .step-number {
            background: #4caf50;
            color: white;
          }

          .step-info {
            display: flex;
            flex-direction: column;
          }

          .step-title {
            font-weight: 600;
            font-size: 0.95rem;
          }

          .step-description {
            font-size: 0.8rem;
            color: #666;
          }

          .wizard-body {
            padding: 2rem;
            flex: 1;
            overflow-y: auto;
          }

          .wizard-footer {
            display: flex;
            justify-content: space-between;
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

          .btn-primary:hover:not(:disabled) {
            background: #0052a3;
          }

          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: white;
            color: #0066cc;
            border: 1px solid #0066cc;
          }

          .btn-secondary:hover {
            background: #f5f9ff;
          }

          @media (max-width: 768px) {
            .wizard-content {
              max-height: 100vh;
              border-radius: 0;
            }

            .wizard-header,
            .wizard-body,
            .wizard-footer {
              padding: 1.5rem;
            }

            .wizard-progress {
              padding: 1rem 1.5rem;
            }

            .step-description {
              display: none;
            }

            .wizard-footer {
              flex-direction: column-reverse;
            }

            .btn-primary,
            .btn-secondary {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// ============ Step Components ============

interface StepProps {
  agent: Partial<AgentDefinition>;
  onChange: (updates: Partial<AgentDefinition>) => void;
}

function NameIconStep({ agent, onChange }: StepProps) {
  const icons = ['🤖', '🎯', '💡', '🚀', '⚡', '🔮', '🎨', '📊', '🔬', '🎓'];

  return (
    <div className="step-content">
      <h3>Name & Icon</h3>
      <p className="step-subtitle">
        Give your agent a unique name and choose an icon to represent it.
      </p>

      <div className="form-group">
        <label htmlFor="agent-name">Agent Name</label>
        <input
          id="agent-name"
          type="text"
          value={agent.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="My Custom Agent"
          className="form-input"
        />
        <p className="form-hint">
          Choose a descriptive name that reflects your agent's purpose.
        </p>
      </div>

      <div className="form-group">
        <label>Icon</label>
        <div className="icon-grid">
          {icons.map((icon) => (
            <button
              key={icon}
              className={`icon-option ${agent.icon === icon ? 'selected' : ''}`}
              onClick={() => onChange({ icon })}
            >
              {icon}
            </button>
          ))}
          <button
            className={`icon-option custom ${
              !icons.includes(agent.icon || '') ? 'selected' : ''
            }`}
            onClick={() => {
              const customIcon = prompt('Enter a custom icon (emoji):', '🤖');
              if (customIcon) {
                onChange({ icon: customIcon });
              }
            }}
          >
            +
          </button>
        </div>
      </div>

      <style jsx>{`
        .step-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 2rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .form-hint {
          font-size: 0.9rem;
          color: #666;
          margin-top: 0.5rem;
        }

        .icon-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 0.75rem;
        }

        .icon-option {
          width: 60px;
          height: 60px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          font-size: 1.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-option:hover {
          border-color: #0066cc;
          background: #f5f9ff;
        }

        .icon-option.selected {
          border-color: #0066cc;
          background: #e6f0ff;
        }

        .icon-option.custom {
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
}

function DescriptionStep({ agent, onChange }: StepProps) {
  return (
    <div className="step-content">
      <h3>Description</h3>
      <p className="step-subtitle">
        Describe what your agent does and how it should help users.
      </p>

      <div className="form-group">
        <label htmlFor="agent-description">Description</label>
        <textarea
          id="agent-description"
          value={agent.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what your agent does..."
          rows={6}
          className="form-textarea"
        />
        <p className="form-hint">
          A clear description helps users understand when and how to use your
          agent.
        </p>
      </div>

      <style jsx>{`
        .step-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 2rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .form-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .form-hint {
          font-size: 0.9rem;
          color: #666;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}

function CapabilitiesStep({ agent, onChange }: StepProps) {
  const [customTag, setCustomTag] = useState('');
  const tags = agent.metadata?.tags || [];

  const suggestedTags = [
    'productivity',
    'writing',
    'analysis',
    'automation',
    'learning',
    'creative',
    'research',
    'organization',
  ];

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onChange({
        metadata: {
          ...agent.metadata,
          version: agent.metadata?.version || '1.0.0',
          author: agent.metadata?.author || 'Unknown',
          createdAt: agent.metadata?.createdAt || new Date().toISOString(),
          updatedAt: agent.metadata?.updatedAt || new Date().toISOString(),
          tags: [...tags, tag],
        },
      });
    }
  };

  const removeTag = (tag: string) => {
    onChange({
      metadata: {
        ...agent.metadata,
        version: agent.metadata?.version || '1.0.0',
        author: agent.metadata?.author || 'Unknown',
        createdAt: agent.metadata?.createdAt || new Date().toISOString(),
        updatedAt: agent.metadata?.updatedAt || new Date().toISOString(),
        tags: tags.filter((t) => t !== tag),
      },
    });
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      addTag(customTag.trim());
      setCustomTag('');
    }
  };

  return (
    <div className="step-content">
      <h3>Capabilities & Tags</h3>
      <p className="step-subtitle">
        Add tags to help users discover and understand your agent's capabilities.
      </p>

      <div className="form-group">
        <label>Current Tags</label>
        <div className="tags-list">
          {tags.map((tag) => (
            <span key={tag} className="tag-badge">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="tag-remove"
                aria-label={`Remove ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <p className="empty-state">No tags added yet.</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Suggested Tags</label>
        <div className="suggested-tags">
          {suggestedTags
            .filter((tag) => !tags.includes(tag))
            .map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="suggested-tag"
              >
                + {tag}
              </button>
            ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="custom-tag">Add Custom Tag</label>
        <div className="custom-tag-input">
          <input
            id="custom-tag"
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
            placeholder="Enter a tag..."
            className="form-input"
          />
          <button onClick={handleAddCustomTag} className="btn-add">
            Add
          </button>
        </div>
      </div>

      <style jsx>{`
        .step-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 2rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: #333;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #e6f0ff;
          border: 1px solid #0066cc;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #0066cc;
        }

        .tag-remove {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-size: 1rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .tag-remove:hover {
          opacity: 1;
        }

        .empty-state {
          color: #999;
          font-style: italic;
        }

        .suggested-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .suggested-tag {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .suggested-tag:hover {
          border-color: #0066cc;
          background: #f5f9ff;
        }

        .custom-tag-input {
          display: flex;
          gap: 0.5rem;
        }

        .form-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .btn-add {
          padding: 0.75rem 1.5rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .btn-add:hover {
          background: #0052a3;
        }
      `}</style>
    </div>
  );
}

function ConfigurationStep({ agent, onChange }: StepProps) {
  return (
    <div className="step-content">
      <h3>Configuration</h3>
      <p className="step-subtitle">
        Set default configuration values for your agent.
      </p>

      {agent.configSchema && Object.keys(agent.configSchema).length > 0 ? (
        <div className="config-options">
          {Object.entries(agent.configSchema).map(([key, config]) => (
            <div key={key} className="config-option">
              <label htmlFor={`config-${key}`}>
                {config.description}
                {config.required && <span className="required">*</span>}
              </label>

              {config.enum ? (
                <select
                  id={`config-${key}`}
                  className="form-select"
                  onChange={(e) => {
                    const value =
                      config.type === 'number'
                        ? Number(e.target.value)
                        : e.target.value;
                    onChange({
                      configSchema: {
                        ...agent.configSchema,
                        [key]: { ...config, default: value },
                      },
                    });
                  }}
                >
                  {config.enum.map((option) => (
                    <option
                      key={String(option)}
                      value={String(option)}
                      selected={config.default === option}
                    >
                      {String(option)}
                    </option>
                  ))}
                </select>
              ) : config.type === 'boolean' ? (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    defaultChecked={Boolean(config.default)}
                    onChange={(e) => {
                      onChange({
                        configSchema: {
                          ...agent.configSchema,
                          [key]: { ...config, default: e.target.checked },
                        },
                      });
                    }}
                  />
                  <span>Enabled</span>
                </label>
              ) : config.type === 'number' ? (
                <input
                  type="number"
                  id={`config-${key}`}
                  defaultValue={Number(config.default)}
                  min={config.min}
                  max={config.max}
                  className="form-input"
                  onChange={(e) => {
                    onChange({
                      configSchema: {
                        ...agent.configSchema,
                        [key]: { ...config, default: Number(e.target.value) },
                      },
                    });
                  }}
                />
              ) : (
                <input
                  type="text"
                  id={`config-${key}`}
                  defaultValue={String(config.default || '')}
                  className="form-input"
                  onChange={(e) => {
                    onChange({
                      configSchema: {
                        ...agent.configSchema,
                        [key]: { ...config, default: e.target.value },
                      },
                    });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>
            This template has no configurable options. You can proceed to the
            next step.
          </p>
        </div>
      )}

      <style jsx>{`
        .step-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .config-options {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .config-option label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .required {
          color: #f44336;
          margin-left: 0.25rem;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .checkbox-label input[type='checkbox'] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
      `}</style>
    </div>
  );
}

function PreviewStep({ agent }: StepProps) {
  return (
    <div className="step-content">
      <h3>Preview & Create</h3>
      <p className="step-subtitle">
        Review your customized agent before creating it.
      </p>

      <div className="preview-card">
        <div className="preview-header">
          <span className="preview-icon">{agent.icon}</span>
          <div>
            <h4 className="preview-name">{agent.name}</h4>
            <p className="preview-id">ID: {agent.id}</p>
          </div>
        </div>

        <div className="preview-section">
          <h5>Description</h5>
          <p>{agent.description}</p>
        </div>

        {agent.metadata?.tags && agent.metadata.tags.length > 0 && (
          <div className="preview-section">
            <h5>Tags</h5>
            <div className="preview-tags">
              {agent.metadata.tags.map((tag) => (
                <span key={tag} className="preview-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {agent.configSchema && Object.keys(agent.configSchema).length > 0 && (
          <div className="preview-section">
            <h5>Configuration</h5>
            <dl className="preview-config">
              {Object.entries(agent.configSchema).map(([key, config]) => (
                <div key={key} className="config-item">
                  <dt>{key}</dt>
                  <dd>
                    {Array.isArray(config.default)
                      ? JSON.stringify(config.default)
                      : String(config.default)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="ready-message">
        <span className="check-icon">✓</span>
        <p>Ready to create your custom agent!</p>
      </div>

      <style jsx>{`
        .step-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .step-subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .preview-card {
          background: #f9f9f9;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
        }

        .preview-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .preview-icon {
          font-size: 3rem;
        }

        .preview-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .preview-id {
          font-size: 0.85rem;
          color: #666;
          font-family: monospace;
          margin: 0.25rem 0 0 0;
        }

        .preview-section {
          margin-bottom: 1.5rem;
        }

        .preview-section:last-child {
          margin-bottom: 0;
        }

        .preview-section h5 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .preview-section p {
          margin: 0;
          line-height: 1.6;
          color: #333;
        }

        .preview-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .preview-tag {
          padding: 0.4rem 0.75rem;
          background: white;
          border-radius: 16px;
          font-size: 0.85rem;
          color: #0066cc;
          border: 1px solid #0066cc;
        }

        .preview-config {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .config-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
        }

        .config-item dt {
          font-weight: 600;
          color: #333;
        }

        .config-item dd {
          margin: 0;
          color: #666;
          font-family: monospace;
        }

        .ready-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
          padding: 1.5rem;
          background: #e8f5e9;
          border-radius: 8px;
          color: #2e7d32;
        }

        .check-icon {
          font-size: 2rem;
          font-weight: bold;
        }

        .ready-message p {
          margin: 0;
          font-weight: 600;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}
