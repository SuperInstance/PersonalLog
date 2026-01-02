'use client'

/**
 * Model Setup Wizard
 *
 * Step-by-step wizard for adding AI models and creating AI contacts.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Check,
  Search,
  Server,
  Sparkles,
  Wand2,
  User,
  Layers,
  Trash2,
  Edit,
  Copy,
} from 'lucide-react'
import { listModels, addModel, deleteModel, createContact, listContacts } from '@/lib/wizard/model-store'
import { getOllamaService } from '@/lib/wizard/ollama-service'
import { PROVIDER_TEMPLATES, type ModelProvider, type AIContact } from '@/lib/wizard/models'
import { generateContactId } from '@/lib/wizard/models'

type WizardStep = 'provider' | 'configure' | 'contact' | 'review' | 'success'

interface ProviderForm {
  provider: ModelProvider
  apiKey: string
  baseUrl: string
  modelName: string
}

interface ContactForm {
  nickname: string
  firstName: string
  systemPrompt: string
  responseStyle: 'brief' | 'balanced' | 'detailed'
  temperature: number
  color: string
}

export default function SetupWizardPage() {
  const router = useRouter()

  const [step, setStep] = useState<WizardStep>('provider')
  const [providerForm, setProviderForm] = useState<ProviderForm>({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    modelName: '',
  })
  const [contactForm, setContactForm] = useState<ContactForm>({
    nickname: '',
    firstName: '',
    systemPrompt: '',
    responseStyle: 'balanced',
    temperature: 0.7,
    color: 'bg-blue-500',
  })

  const [models, setModels] = useState<any[]>([])
  const [contacts, setContacts] = useState<AIContact[]>([])
  const [ollamaModels, setOllamaModels] = useState<any[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [ollamaHardware, setOllamaHardware] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [createdContactId, setCreatedContactId] = useState<string | null>(null)

  useEffect(() => {
    loadModels()
    loadContacts()
    checkOllama()
  }, [])

  const loadModels = async () => {
    try {
      const allModels = await listModels()
      setModels(allModels)
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const loadContacts = async () => {
    try {
      const allContacts = await listContacts()
      setContacts(allContacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

  const checkOllama = async () => {
    const ollama = getOllamaService()
    const available = await ollama.isAvailable()
    setOllamaAvailable(available)

    if (available) {
      const hw = await ollama.getHardwareInfo()
      setOllamaHardware(hw)

      const ollamaModelsList = await ollama.listModels()
      setOllamaModels(ollamaModelsList)
    }
  }

  const handleSearchOllama = async () => {
    setIsSearching(true)
    try {
      const ollama = getOllamaService()
      const modelsList = await ollama.listModels()

      // Add each Ollama model to our store
      for (const ollamaModel of modelsList) {
        const modelConfig = await ollama.createModelConfig(ollamaModel)

        // Check if already exists
        const exists = models.find(m => m.modelName === ollamaModel.name)
        if (!exists) {
          await addModel({
            ...modelConfig,
            isActive: true,
          })
        }
      }

      await loadModels()
      setOllamaModels(modelsList)
    } catch (error) {
      console.error('Failed to search Ollama:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddModel = async () => {
    try {
      const template = PROVIDER_TEMPLATES.find(t => t.id === providerForm.provider)

      await addModel({
        name: template?.name || providerForm.provider,
        provider: providerForm.provider,
        modelName: providerForm.modelName,
        apiKey: providerForm.apiKey,
        baseUrl: providerForm.baseUrl || template?.baseUrl,
        isActive: true,
        capabilities: {
          maxContext: 128000,
          supportsStreaming: true,
          supportsImages: providerForm.provider === 'openai' || providerForm.provider === 'anthropic',
          supportsFunctions: false,
          estimatedSpeed: 'fast',
        },
      })

      setStep('contact')
    } catch (error) {
      console.error('Failed to add model:', error)
      alert('Failed to add model. Please check your configuration.')
    }
  }

  const handleCreateContact = async () => {
    if (models.length === 0) {
      alert('Please add a model first')
      return
    }

    try {
      // Use the most recently added model
      const baseModel = models[models.length - 1]

      const contact = await createContact({
        nickname: contactForm.nickname || baseModel.name,
        firstName: contactForm.firstName || generateFirstName(baseModel.name),
        baseModelId: baseModel.id,
        systemPrompt: contactForm.systemPrompt || `You are ${contactForm.nickname || baseModel.name}, a helpful AI assistant.`,
        personality: {
          vibeAttributes: [],
          learnedFrom: {},
        },
        contextFiles: [],
        responseStyle: contactForm.responseStyle,
        temperature: contactForm.temperature,
        color: contactForm.color,
      })

      setCreatedContactId(contact.id)
      await loadContacts()
      setStep('success')
    } catch (error) {
      console.error('Failed to create contact:', error)
      alert('Failed to create contact. Please try again.')
    }
  }

  const handleSelectModel = (modelId: string) => {
    setProviderForm(prev => ({ ...prev, modelName: modelId }))
    setStep('configure')
  }

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Delete this model? This will also delete all AI contacts using it.')) return

    try {
      await deleteModel(modelId)
      await loadModels()
      await loadContacts()
    } catch (error) {
      console.error('Failed to delete model:', error)
    }
  }

  const handleForkContact = async (contactId: string) => {
    const { forkContact } = await import('@/lib/wizard/model-store')
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return

    try {
      const newContact = await forkContact(contactId, {
        nickname: `${contact.nickname} (Copy)`,
      })
      await loadContacts()
      router.push(`/setup/edit/${newContact.id}`)
    } catch (error) {
      console.error('Failed to fork contact:', error)
    }
  }

  const generateFirstName = (modelName: string): string => {
    // Generate a friendly first name from model name
    const names: Record<string, string> = {
      'gpt-4o': 'GPT',
      'gpt-4': 'GPT',
      'claude': 'Claude',
      'grok': 'Grok',
      'deepseek': 'DeepSeek',
      'llama': 'Llama',
      'mistral': 'Mistral',
      'gemini': 'Gemini',
    }

    const lower = modelName.toLowerCase()
    for (const [key, value] of Object.entries(names)) {
      if (lower.includes(key)) return value
    }

    return modelName.split('-')[0]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/messenger"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  AI Model Setup
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Add models and create AI contacts
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <StepIndicator
            steps={[
              { id: 'provider', label: 'Provider', current: step === 'provider', completed: ['configure', 'contact', 'review', 'success'].includes(step) },
              { id: 'configure', label: 'Configure', current: step === 'configure', completed: ['contact', 'review', 'success'].includes(step) },
              { id: 'contact', label: 'Contact', current: step === 'contact', completed: ['success'].includes(step) },
            ]}
          />
        </div>

        {/* Provider Selection */}
        {step === 'provider' && (
          <ProviderSelectionStep
            providerForm={providerForm}
            onChange={setProviderForm}
            onSelect={handleSelectModel}
            models={models}
            ollamaModels={ollamaModels}
            ollamaAvailable={ollamaAvailable}
            ollamaHardware={ollamaHardware}
            onSearchOllama={handleSearchOllama}
            isSearching={isSearching}
            onDeleteModel={handleDeleteModel}
          />
        )}

        {/* Configure Model */}
        {step === 'configure' && (
          <ConfigureStep
            providerForm={providerForm}
            onChange={setProviderForm}
            onNext={handleAddModel}
            onBack={() => setStep('provider')}
          />
        )}

        {/* Create Contact */}
        {step === 'contact' && (
          <ContactStep
            contactForm={contactForm}
            onChange={setContactForm}
            onNext={handleCreateContact}
            onBack={() => setStep('configure')}
          />
        )}

        {/* Success */}
        {step === 'success' && (
          <SuccessStep
            contactId={createdContactId}
            contacts={contacts}
            onDone={() => router.push('/messenger')}
            onCreateAnother={() => {
              setStep('provider')
              setCreatedContactId(null)
              setProviderForm({
                provider: 'openai',
                apiKey: '',
                baseUrl: '',
                modelName: '',
              })
              setContactForm({
                nickname: '',
                firstName: '',
                systemPrompt: '',
                responseStyle: 'balanced',
                temperature: 0.7,
                color: 'bg-blue-500',
              })
            }}
          />
        )}
      </main>

      {/* Existing Contacts Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 overflow-y-auto hidden lg:block">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Your AI Contacts
        </h2>
        <div className="space-y-2">
          {contacts.map(contact => (
            <div
              key={contact.id}
              className="group flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
            >
              <div className={`w-10 h-10 rounded-full ${contact.color} flex items-center justify-center text-white font-semibold`}>
                {contact.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {contact.nickname}
                </p>
                <p className="text-xs text-slate-500">
                  {contact.firstName}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => router.push(`/setup/edit/${contact.id}`)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => handleForkContact(contact.id)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                  title="Create copy"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No AI contacts yet</p>
              <p className="text-xs mt-1">Add a model to create one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

function StepIndicator({ steps }: { steps: Array<{ id: string; label: string; current: boolean; completed: boolean }> }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              step.current
                ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                : step.completed
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {step.completed ? <Check className="w-5 h-5" /> : index + 1}
          </div>
          <span className={`ml-2 text-sm font-medium ${step.current ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className="mx-4 w-16 h-0.5 bg-slate-200 dark:bg-slate-800" />
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PROVIDER SELECTION STEP
// ============================================================================

function ProviderSelectionStep({
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
}: {
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
}) {
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
            onClick={handleSearchOllama}
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

// ============================================================================
// CONFIGURE STEP
// ============================================================================

function ConfigureStep({
  providerForm,
  onChange,
  onNext,
  onBack,
}: {
  providerForm: ProviderForm
  onChange: (form: ProviderForm) => void
  onNext: () => void
  onBack: () => void
}) {
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

// ============================================================================
// CONTACT STEP
// ============================================================================

function ContactStep({
  contactForm,
  onChange,
  onNext,
  onBack,
}: {
  contactForm: ContactForm
  onChange: (form: ContactForm) => void
  onNext: () => void
  onBack: () => void
}) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500', 'bg-orange-500',
    'bg-amber-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-slate-600',
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className={`w-16 h-16 rounded-full ${contactForm.color} flex items-center justify-center mx-auto mb-3`}>
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create AI Contact
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Customize the personality of your AI assistant
        </p>
      </div>

      {/* Nickname */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Nickname
        </label>
        <input
          type="text"
          value={contactForm.nickname}
          onChange={(e) => onChange({ ...contactForm, nickname: e.target.value })}
          placeholder="e.g., Research Assistant"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* First Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          First Name
        </label>
        <input
          type="text"
          value={contactForm.firstName}
          onChange={(e) => onChange({ ...contactForm, firstName: e.target.value })}
          placeholder="e.g., Alex"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Short name to call into conversations
        </p>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Avatar Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onChange({ ...contactForm, color })}
              className={`w-10 h-10 rounded-full ${color} transition-transform hover:scale-110 ${
                contactForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Response Style */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Response Style
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['brief', 'balanced', 'detailed'] as const).map(style => (
            <button
              key={style}
              onClick={() => onChange({ ...contactForm, responseStyle: style })}
              className={`p-3 rounded-xl border-2 transition-all capitalize ${
                contactForm.responseStyle === style
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            System Prompt
          </label>
        <textarea
          value={contactForm.systemPrompt}
          onChange={(e) => onChange({ ...contactForm, systemPrompt: e.target.value })}
          placeholder="You are a helpful AI assistant..."
          rows={4}
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Define how this AI should behave. You can also vibe-fine-tune this later in conversations.
        </p>
      </div>

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
          disabled={!contactForm.nickname}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        >
          Create Contact
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// SUCCESS STEP
// ============================================================================

function SuccessStep({
  contactId,
  contacts,
  onDone,
  onCreateAnother,
}: {
  contactId: string | null
  contacts: AIContact[]
  onDone: () => void
  onCreateAnother: () => void
}) {
  const contact = contacts.find(c => c.id === contactId)

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        AI Contact Created!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        {contact?.nickname} is ready to join your conversations
      </p>

      {/* Contact Card */}
      {contact && (
        <div className="max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 mb-8">
          <div className={`w-16 h-16 rounded-full ${contact.color} flex items-center justify-center text-2xl mx-auto mb-3`}>
            {contact.firstName[0]}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {contact.nickname}
          </h3>
          <p className="text-sm text-slate-500">
            "{contact.firstName}"
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onCreateAnother}
          className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Add Another Contact
        </button>
        <button
          onClick={onDone}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2"
        >
          Go to Messenger
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
