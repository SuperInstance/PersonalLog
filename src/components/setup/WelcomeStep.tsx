'use client'

/**
 * Welcome Step - Provider Selection
 *
 * First step of the wizard where users select their AI provider.
 */

import { useState } from 'react'
import { Check, Search, Trash2, Server } from 'lucide-react'
import { PROVIDER_TEMPLATES, type ModelProvider } from '@/lib/wizard/models'

interface ProviderForm {
  provider: ModelProvider
  apiKey: string
  baseUrl: string
  modelName: string
}

interface WelcomeStepProps {
  providerForm: ProviderForm
  onChange: (form: ProviderForm) => void
  onSelect: (modelId: string) => void
  models: any[]
  ollamaModels: any[]
  ollamaAvailable: boolean
  ollamaHardware: any
  onSearchOllama: () => void
  isSearching: boolean
  onDeleteModel: (id: string) => void
}

export function WelcomeStep({
  providerForm,
  onChange,
  onSelect,
  models,
  ollamaModels,
  ollamaAvailable,
  ollamaHardware,
  onSearchOllama,
  isSearching,
  onDeleteModel,
}: WelcomeStepProps) {
  const [showAllProviders, setShowAllProviders] = useState(false)

  const mainProviders = PROVIDER_TEMPLATES.slice(0, 7)
  const additionalProviders = PROVIDER_TEMPLATES.slice(7)

  return (
    <div className="space-y-8">
      {/* Popular Providers */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Add an AI Provider
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Select a provider to add. Your API keys are stored locally and never shared.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {mainProviders.map(provider => {
            const isSelected = providerForm.provider === provider.id

            return (
              <button
                key={provider.id}
                onClick={() => onChange({ ...providerForm, provider: provider.id as ModelProvider })}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="text-3xl mb-2">{provider.icon}</div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {provider.name}
                </h3>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Show More */}
        {!showAllProviders && (
          <button
            onClick={() => setShowAllProviders(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + More providers
          </button>
        )}

        {showAllProviders && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {additionalProviders.map(provider => (
              <button
                key={provider.id}
                onClick={() => onChange({ ...providerForm, provider: provider.id as ModelProvider })}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  providerForm.provider === provider.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="text-3xl mb-2">{provider.icon}</div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {provider.name}
                </h3>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ollama Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-2xl">
            🦙
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Ollama (Local Models)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {ollamaAvailable
                ? `Connected • ${ollamaModels.length} models • ${ollamaHardware?.hasGpu ? 'GPU available' : 'CPU only'}`
                : 'Search for local Ollama installation'}
            </p>
          </div>
          <button
            onClick={onSearchOllama}
            disabled={isSearching}
            className="ml-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {ollamaAvailable ? 'Refresh' : 'Search'}
              </>
            )}
          </button>
        </div>

        {/* Ollama Models */}
        {ollamaModels.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {ollamaModels.map(model => (
              <button
                key={model.name}
                onClick={() => onChange({
                  ...providerForm,
                  provider: 'ollama',
                  modelName: model.name,
                })}
                className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-colors text-left"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  {model.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Hardware Constraints Warning */}
        {ollamaHardware && !ollamaHardware.canParallel && ollamaModels.length > 1 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Hardware constraint: Running multiple models in parallel may not be available on your system.
            </p>
          </div>
        )}
      </div>

      {/* Existing Models */}
      {models.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Added Models
          </h3>
          <div className="space-y-2">
            {models.map(model => (
              <div
                key={model.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${PROVIDER_TEMPLATES.find(t => t.id === model.provider)?.color || 'bg-slate-500'} flex items-center justify-center text-lg`}>
                    {PROVIDER_TEMPLATES.find(t => t.id === model.provider)?.icon || '🤖'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {model.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {model.modelName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteModel(model.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
