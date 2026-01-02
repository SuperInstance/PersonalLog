'use client'

/**
 * Setup Wizard
 *
 * Main orchestrator component for the AI model setup wizard.
 * Manages state, step transitions, and data flow between steps.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Edit, Copy } from 'lucide-react'
import { listModels, addModel, deleteModel, createContact, listContacts } from '@/lib/wizard/model-store'
import { getOllamaService } from '@/lib/wizard/ollama-service'
import { PROVIDER_TEMPLATES, type ModelProvider, type AIContact } from '@/lib/wizard/models'
import { SetupProgress } from './SetupProgress'
import { WelcomeStep } from './WelcomeStep'
import { ConfigureStep } from './ConfigureStep'
import { ContactStep } from './ContactStep'
import { CompleteStep } from './CompleteStep'

export type WizardStep = 'provider' | 'configure' | 'contact' | 'success'

export interface ProviderForm {
  provider: ModelProvider
  apiKey: string
  baseUrl: string
  modelName: string
}

export interface ContactForm {
  nickname: string
  firstName: string
  systemPrompt: string
  responseStyle: 'brief' | 'balanced' | 'detailed'
  temperature: number
  color: string
}

interface SetupWizardProps {
  onComplete?: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
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

  const steps = [
    { id: 'provider', label: 'Provider', current: step === 'provider', completed: ['configure', 'contact', 'success'].includes(step) },
    { id: 'configure', label: 'Configure', current: step === 'configure', completed: ['contact', 'success'].includes(step) },
    { id: 'contact', label: 'Contact', current: step === 'contact', completed: ['success'].includes(step) },
  ]

  return (
    <>
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
                <span className="text-xl">🪄</span>
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
          <SetupProgress steps={steps} />
        </div>

        {/* Provider Selection */}
        {step === 'provider' && (
          <WelcomeStep
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
          <CompleteStep
            contactId={createdContactId}
            contacts={contacts}
            onDone={() => {
              if (onComplete) {
                onComplete()
              } else {
                router.push('/messenger')
              }
            }}
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
    </>
  )
}
