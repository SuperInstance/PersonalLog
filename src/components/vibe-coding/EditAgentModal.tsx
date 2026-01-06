'use client'

/**
 * EditAgentModal Component
 *
 * Modal for editing a generated agent definition.
 * Supports both YAML editor (advanced) and form-based editor (casual).
 */

import { useState, useEffect } from 'react'
import { X, FileCode, Layout, Check, AlertCircle, Loader2 } from 'lucide-react'

interface AgentDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: string
  systemPrompt?: string
  activationMode?: string
  // ... other fields
}

interface EditAgentModalProps {
  isOpen: boolean
  agent: AgentDefinition
  yamlDefinition: string
  onSave: (editedAgent: { yaml?: string; fields?: Record<string, unknown> }) => Promise<void>
  onClose: () => void
}

type EditMode = 'yaml' | 'form'

function EditAgentModal({
  isOpen,
  agent,
  yamlDefinition,
  onSave,
  onClose,
}: EditAgentModalProps) {
  const [editMode, setEditMode] = useState<EditMode>('yaml')
  const [yamlContent, setYamlContent] = useState(yamlDefinition)
  const [formFields, setFormFields] = useState({
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    systemPrompt: agent.systemPrompt || '',
  })
  const [isValid, setIsValid] = useState(true)
  const [validationError, setValidationError] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when modal opens with new agent
  useEffect(() => {
    if (isOpen) {
      setYamlContent(yamlDefinition)
      setFormFields({
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        systemPrompt: agent.systemPrompt || '',
      })
      setIsValid(true)
      setValidationError('')
    }
  }, [isOpen, yamlDefinition, agent])

  if (!isOpen) {
    return null
  }

  const handleSave = async () => {
    if (!isValid) {
      return
    }

    setIsSaving(true)
    try {
      if (editMode === 'yaml') {
        await onSave({ yaml: yamlContent })
      } else {
        await onSave({ fields: formFields })
      }
      onClose()
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to save agent')
    } finally {
      setIsSaving(false)
    }
  }

  const handleYamlChange = (value: string) => {
    setYamlContent(value)
    // Basic YAML validation
    try {
      // Simple check for YAML structure
      const hasRequiredFields = value.includes('id:') && value.includes('name:') && value.includes('description:')
      setIsValid(hasRequiredFields)
      setValidationError(hasRequiredFields ? '' : 'Missing required fields (id, name, description)')
    } catch {
      setIsValid(false)
      setValidationError('Invalid YAML format')
    }
  }

  const handleFormFieldChange = (field: string, value: string) => {
    setFormFields(prev => ({ ...prev, [field]: value }))
    // Form validation
    const isValid = formFields.name.trim().length > 0 && formFields.description.trim().length > 0
    setIsValid(isValid)
    setValidationError(isValid ? '' : 'Name and description are required')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{agent.icon}</span>
              <span>Edit Agent: {agent.name}</span>
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Customize your agent's behavior and personality
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close editor"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Edit Mode Toggle */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Editor mode:</span>
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setEditMode('yaml')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  editMode === 'yaml'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>YAML</span>
              </button>
              <button
                onClick={() => setEditMode('form')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  editMode === 'form'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>Form</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {editMode === 'yaml' ? (
            <YAMLEditor
              content={yamlContent}
              onChange={handleYamlChange}
              isValid={isValid}
            />
          ) : (
            <FormEditor
              fields={formFields}
              onChange={handleFormFieldChange}
              isValid={isValid}
            />
          )}

          {/* Validation error */}
          {!isValid && validationError && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-400">
                  Validation Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                  {validationError}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * YAML Editor component
 */
interface YAMLEditorProps {
  content: string
  onChange: (value: string) => void
  isValid: boolean
}

function YAMLEditor({ content, onChange, isValid }: YAMLEditorProps) {
  return (
    <div className="yaml-editor h-full">
      <div className="mb-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Agent Definition (YAML)
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Edit the raw YAML definition. Make sure to maintain valid YAML syntax.
        </p>
      </div>

      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-96 font-mono text-sm bg-slate-900 dark:bg-slate-950 text-green-400 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 scrollbar-thin ${
            !isValid ? 'ring-2 ring-red-500' : ''
          }`}
          spellCheck={false}
          aria-label="YAML editor"
        />
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span aria-hidden="true">💡</span>
        <span>
          Tip: Indentation matters in YAML. Use spaces (not tabs) for indentation.
        </span>
      </div>
    </div>
  )
}

/**
 * Form Editor component
 */
interface FormEditorProps {
  fields: {
    name: string
    description: string
    icon: string
    systemPrompt: string
  }
  onChange: (field: string, value: string) => void
  isValid: boolean
}

function FormEditor({ fields, onChange, isValid }: FormEditorProps) {
  return (
    <div className="form-editor space-y-4 max-w-2xl">
      {/* Name */}
      <div>
        <label htmlFor="agent-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Agent Name <span className="text-red-500">*</span>
        </label>
        <input
          id="agent-name"
          type="text"
          value={fields.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
          placeholder="e.g., Research Assistant"
        />
      </div>

      {/* Icon */}
      <div>
        <label htmlFor="agent-icon" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Icon (emoji)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="agent-icon"
            type="text"
            value={fields.icon}
            onChange={(e) => onChange('icon', e.target.value)}
            className="w-24 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-center text-2xl"
            placeholder="🤖"
            maxLength={2}
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Pick an emoji to represent your agent
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="agent-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="agent-description"
          value={fields.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 resize-none"
          placeholder="Brief description of what this agent does..."
        />
      </div>

      {/* System Prompt */}
      <div>
        <label htmlFor="agent-prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          System Prompt
        </label>
        <textarea
          id="agent-prompt"
          value={fields.systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          rows={8}
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 resize-none font-mono text-sm"
          placeholder="You are a helpful assistant..."
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          This defines the agent's personality and behavior. Be specific!
        </p>
      </div>
    </div>
  )
}

export default EditAgentModal
