'use client'

/**
 * Configure Step
 *
 * Second step where users configure their selected provider with API keys and model names.
 */

import { Layers } from 'lucide-react'
import { PROVIDER_TEMPLATES, type ModelProvider } from '@/lib/wizard/models'

interface ProviderForm {
  provider: ModelProvider
  apiKey: string
  baseUrl: string
  modelName: string
}

interface ConfigureStepProps {
  providerForm: ProviderForm
  onChange: (form: ProviderForm) => void
  onNext: () => void
  onBack: () => void
}

export function ConfigureStep({
  providerForm,
  onChange,
  onNext,
  onBack,
}: ConfigureStepProps) {
  const template = PROVIDER_TEMPLATES.find(t => t.id === providerForm.provider)

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className={`w-16 h-16 rounded-2xl ${template?.color || 'bg-slate-500'} flex items-center justify-center text-3xl mx-auto mb-3`}>
          {template?.icon}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Configure {template?.name}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Enter your API details to connect
        </p>
      </div>

      {/* API Key */}
      {template?.requiresApiKey && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={providerForm.apiKey}
            onChange={(e) => onChange({ ...providerForm, apiKey: e.target.value })}
            placeholder={providerForm.provider === 'openai' ? 'sk-...' : ''}
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Get your API key from{' '}
            <a
              href={template?.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {template?.name} Console
            </a>
          </p>
        </div>
      )}

      {/* Base URL (for custom providers) */}
      {providerForm.provider === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Base URL
          </label>
          <input
            type="text"
            value={providerForm.baseUrl}
            onChange={(e) => onChange({ ...providerForm, baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            For OpenAI-compatible APIs
          </p>
        </div>
      )}

      {/* Model Name */}
      {providerForm.provider !== 'ollama' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Model Name
          </label>
          {providerForm.provider === 'custom' ? (
            <input
              type="text"
              value={providerForm.modelName}
              onChange={(e) => onChange({ ...providerForm, modelName: e.target.value })}
              placeholder="model-name"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <select
              value={providerForm.modelName}
              onChange={(e) => onChange({ ...providerForm, modelName: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a model...</option>
              {template?.models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={providerForm.provider !== 'ollama' && !providerForm.modelName}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        >
          Continue
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
