'use client'

/**
 * Edit AI Contact Page
 *
 * Edit existing AI contacts, vibe-fine-tune from conversations, and create versions.
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Plus,
  FileText,
  Sliders,
  Copy,
  Trash2,
} from 'lucide-react'
import { getContact, updateContact, addContextFile, forkContact, listContacts } from '@/lib/wizard/model-store'
import { getModel } from '@/lib/wizard/model-store'
import type { AIContact, ContextFile } from '@/lib/wizard/models'
import { getOllamaService } from '@/lib/wizard/ollama-service'

type Tab = 'personality' | 'vibe' | 'context' | 'advanced'

export default function EditContactPage() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string

  const [contact, setContact] = useState<AIContact | null>(null)
  const [baseModel, setBaseModel] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('personality')
  const [hasChanges, setHasChanges] = useState(false)

  // Vibe state
  const [personalityPrompt, setPersonalityPrompt] = useState('')
  const [vibeAttributes, setVibeAttributes] = useState<Record<string, number>>({})
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(500)
  const [responseStyle, setResponseStyle] = useState<'brief' | 'balanced' | 'detailed'>('balanced')

  // Context files
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([])
  const [newContextFileName, setNewContextFileName] = useState('')
  const [newContextFileContent, setNewContextFileContent] = useState('')

  // Conversation learning
  const [conversationId, setConversationId] = useState('')
  const [learnFromConv, setLearnFromConv] = useState(false)

  useEffect(() => {
    loadContact()
  }, [contactId])

  const loadContact = async () => {
    try {
      const c = await getContact(contactId)
      if (!c) {
        router.push('/setup')
        return
      }
      setContact(c)

      // Load base model
      const model = await getModel(c.baseModelId)
      setBaseModel(model)

      // Initialize state
      setPersonalityPrompt(c.systemPrompt)
      setTemperature(c.temperature)
      setMaxTokens(c.maxTokens)
      setResponseStyle(c.responseStyle)
      setContextFiles(c.contextFiles || [])

      // Convert vibe attributes to record
      const attrs: Record<string, number> = {}
      for (const attr of c.personality.vibeAttributes) {
        attrs[attr.attribute] = attr.value
      }
      setVibeAttributes(attrs)

      if (c.personality.learnedFrom.conversationId) {
        setConversationId(c.personality.learnedFrom.conversationId)
        setLearnFromConv(true)
      }
    } catch (error) {
      console.error('Failed to load contact:', error)
      router.push('/setup')
    }
  }

  const handleSave = async () => {
    if (!contact) return

    try {
      // Convert vibe attributes back to array
      const vibeAttrArray = Object.entries(vibeAttributes).map(([attr, value]) => ({
        attribute: attr,
        value,
        source: 'manual' as const,
      }))

      await updateContact(contactId, {
        systemPrompt: personalityPrompt,
        personality: {
          vibeAttributes: vibeAttrArray,
          learnedFrom: learnFromConv ? { conversationId } : {},
          conversationId: learnFromConv ? conversationId : undefined,
        },
        temperature,
        maxTokens,
        responseStyle,
        contextFiles,
      })

      setHasChanges(false)
      alert('Contact updated successfully!')
    } catch (error) {
      console.error('Failed to update contact:', error)
      alert('Failed to update contact')
    }
  }

  const handleCreateVersion = async () => {
    if (!contact) return

    if (!confirm('Create a new version of this contact? The current settings will be copied.')) {
      return
    }

    try {
      const newContact = await forkContact(contactId, {
        nickname: `${contact.nickname} v${(contact.version || 1) + 1}`,
      })
      router.push(`/setup/edit/${newContact.id}`)
    } catch (error) {
      console.error('Failed to create version:', error)
      alert('Failed to create version')
    }
  }

  const handleAddContextFile = async () => {
    if (!contact || !newContextFileName.trim()) return

    try {
      await addContextFile(contactId, {
        name: newContextFileName,
        type: 'knowledge',
        content: newContextFileContent,
      })
      await loadContact()
      setNewContextFileName('')
      setNewContextFileContent('')
    } catch (error) {
      console.error('Failed to add context file:', error)
    }
  }

  const handleRemoveContextFile = async (fileId: string) => {
    if (!contact) return
    const { removeContextFile } = await import('@/lib/wizard/model-store')
    await removeContextFile(contactId, fileId)
    await loadContact()
  }

  const handleVibeAdjust = (attribute: string, change: number) => {
    const current = vibeAttributes[attribute] || 0.5
    const newValue = Math.max(0, Math.min(1, current + change))
    setVibeAttributes({ ...vibeAttributes, [attribute]: newValue })
    setHasChanges(true)
  }

  const handleProcessConversation = async () => {
    if (!conversationId) {
      alert('Enter a conversation ID to learn from')
      return
    }

    // In production, this would analyze the conversation
    // and extract personality patterns
    alert(`This would analyze conversation ${conversationId} and update the contact's personality based on the interaction patterns. (Coming soon)`)
  }

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading contact...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/setup"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className={`w-10 h-10 rounded-full ${contact.color} flex items-center justify-center text-white font-semibold`}>
                {contact.firstName[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {contact.nickname}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {baseModel?.name} • v{contact.version || 1}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateVersion}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                title="Create new version"
              >
                <Copy className="w-4 h-4" />
                Version
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasChanges
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6">
          <TabButton active={activeTab === 'personality'} onClick={() => setActiveTab('personality')} icon={<MessageSquare className="w-4 h-4" />}>
            Personality
          </TabButton>
          <TabButton active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Sparkles className="w-4 h-4" />}>
            Vibe Tuning
          </TabButton>
          <TabButton active={activeTab === 'context'} onClick={() => setActiveTab('context')} icon={<FileText className="w-4 h-4" />}>
            Context Files
          </TabButton>
          <TabButton active={activeTab === 'advanced'} onClick={() => setActiveTab('advanced')} icon={<Sliders className="w-4 h-4" />}>
            Advanced
          </TabButton>
        </div>

        {/* Personality Tab */}
        {activeTab === 'personality' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                System Prompt
              </h3>
              <textarea
                value={personalityPrompt}
                onChange={(e) => {
                  setPersonalityPrompt(e.target.value)
                  setHasChanges(true)
                }}
                rows={8}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="You are a helpful AI assistant..."
              />
            </div>

            {/* Learn from conversation */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Learn from Conversation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Analyze an existing conversation to extract personality patterns and communication style.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  placeholder="Conversation ID..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
                <button
                  onClick={handleProcessConversation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Process
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vibe Tuning Tab */}
        {activeTab === 'vibe' && (
          <VibeTuningContent
            vibeAttributes={vibeAttributes}
            onAdjust={handleVibeAdjust}
            temperature={temperature}
            onTemperatureChange={(t) => {
              setTemperature(t)
              setHasChanges(true)
            }}
            responseStyle={responseStyle}
            onResponseStyleChange={(s) => {
              setResponseStyle(s)
              setHasChanges(true)
            }}
          />
        )}

        {/* Context Files Tab */}
        {activeTab === 'context' && (
          <div className="space-y-6">
            {/* Existing Files */}
            {contextFiles.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Knowledge Base
                </h3>
                <div className="space-y-2">
                  {contextFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {file.content.length} chars • {file.type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveContextFile(file.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New File */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Add Context File
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newContextFileName}
                  onChange={(e) => setNewContextFileName(e.target.value)}
                  placeholder="File name (e.g., Product Guidelines)"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
                <textarea
                  value={newContextFileContent}
                  onChange={(e) => setNewContextFileContent(e.target.value)}
                  placeholder="Paste the content to use as context..."
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
                <div className="flex items-center gap-2">
                  <select
                    value="knowledge"
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  >
                    <option value="knowledge">Knowledge</option>
                    <option value="style">Style Guide</option>
                    <option value="instruction">Instructions</option>
                  </select>
                  <button
                    onClick={handleAddContextFile}
                    disabled={!newContextFileName.trim() || !newContextFileContent.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add File
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Context files are automatically included when this AI is in a conversation. Use them to give the AI specialized knowledge or specific instructions.
              </p>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Model Settings
              </h3>
              <div className="space-y-4">
                {/* Response Style */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Response Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['brief', 'balanced', 'detailed'].map(style => (
                      <button
                        key={style}
                        onClick={() => {
                          setResponseStyle(style as any)
                          setHasChanges(true)
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                          responseStyle === style
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Creativity (Temperature): {temperature.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => {
                      setTemperature(parseFloat(e.target.value))
                      setHasChanges(true)
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Max Response Length
                  </label>
                  <select
                    value={maxTokens}
                    onChange={(e) => {
                      setMaxTokens(parseInt(e.target.value))
                      setHasChanges(true)
                    }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  >
                    <option value={100}>Brief (~100 tokens)</option>
                    <option value={300}>Medium (~300 tokens)</option>
                    <option value={500}>Long (~500 tokens)</option>
                    <option value={1000}>Detailed (~1000 tokens)</option>
                    <option value={2000}>Extended (~2000 tokens)</option>
                  </select>
                </div>
              </div>

              {/* Base Model Info */}
              {baseModel && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Base model: <span className="font-medium text-slate-900 dark:text-slate-100">{baseModel.name}</span>
                    <br />
                    Provider: <span className="font-medium text-slate-900 dark:text-slate-100">{baseModel.provider}</span>
                    {baseModel.capabilities && (
                      <>
                        <br />
                        Max context: <span className="font-medium text-slate-900 dark:text-slate-100">{baseModel.capabilities.maxContext.toLocaleString()} tokens</span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? 'bg-blue-500 text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function VibeTuningContent({
  vibeAttributes,
  onAdjust,
  temperature,
  onTemperatureChange,
  responseStyle,
  onResponseStyleChange,
}: {
  vibeAttributes: Record<string, number>
  onAdjust: (attr: string, change: number) => void
  temperature: number
  onTemperatureChange: (t: number) => void
  responseStyle: 'brief' | 'balanced' | 'detailed'
  onResponseStyleChange: (s: 'brief' | 'balanced' | 'detailed') => void
}) {
  const vibes = [
    { attribute: 'creativity', label: 'Creativity', icon: '🎨', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    { attribute: 'friendliness', label: 'Friendliness', icon: '😊', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { attribute: 'conciseness', label: 'Conciseness', icon: '💬', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    { attribute: 'formality', label: 'Formality', icon: '🎩', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    { attribute: 'humor', label: 'Humor', icon: '😄', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
    { attribute: 'empathy', label: 'Empathy', icon: '💚', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    { attribute: 'assertiveness', label: 'Assertiveness', icon: '⚡', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    { attribute: 'curiosity', label: 'Curiosity', icon: '🔍', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  ]

  return (
    <div className="space-y-6">
      {/* Quick adjustments */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Quick Vibe Adjustments
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Click + or - to adjust personality attributes. These will modify the AI's responses.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vibes.map(vibe => {
            const value = vibeAttributes[vibe.attribute] || 0.5

            return (
              <div key={vibe.attribute} className="bg-white dark:bg-slate-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{vibe.icon}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{vibe.label}</span>
                  </div>
                  <span className="text-sm text-slate-500">{Math.round(value * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAdjust(vibe.attribute, -0.1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    −
                  </button>
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${vibe.color} transition-all`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={() => onAdjust(vibe.attribute, 0.1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Response Style Override */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Response Behavior
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Response Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['brief', 'balanced', 'detailed'].map(style => (
                <button
                  key={style}
                  onClick={() => onResponseStyleChange(style as any)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                    responseStyle === style
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Temperature Override: {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Focused</span>
              <span>Exploratory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vibe Summary */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Current Vibe Profile
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(vibeAttributes).map(([attr, value]) => (
            value > 0.6 && (
              <span key={attr} className="px-3 py-1 bg-white dark:bg-slate-900 rounded-full text-sm text-slate-700 dark:text-slate-300">
                {attr}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
