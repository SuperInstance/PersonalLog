'use client'

/**
 * Agent Editor
 *
 * Main orchestrator component for editing AI contacts.
 * Manages tabs, state, and data persistence.
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Copy } from 'lucide-react'
import { getContact, updateContact, addContextFile, forkContact, getModel } from '@/lib/wizard/model-store'
import { type AIContact, type ContextFile } from '@/lib/wizard/models'
import { TabNavigation, EditorTab } from './TabNavigation'
import { PersonalityTab } from './PersonalityTab'
import { VibeTuningTab } from './VibeTuningTab'
import { KnowledgeTab } from './KnowledgeTab'
import { AdvancedTab } from './AdvancedTab'

interface AgentEditorProps {
  onComplete?: () => void
}

export function AgentEditor({ onComplete }: AgentEditorProps) {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string

  const [contact, setContact] = useState<AIContact | null>(null)
  const [baseModel, setBaseModel] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>('personality')
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
          learnedFrom: (conversationId ? { conversationId, messageCount: 0 } : { messageCount: 0 }) as any,
          conversationId: conversationId || undefined,
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
    <>
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
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Personality Tab */}
        {activeTab === 'personality' && (
          <PersonalityTab
            personalityPrompt={personalityPrompt}
            onPromptChange={setPersonalityPrompt}
            conversationId={conversationId}
            onConversationIdChange={setConversationId}
            onProcessConversation={handleProcessConversation}
            onHasChanges={() => setHasChanges(true)}
          />
        )}

        {/* Vibe Tuning Tab */}
        {activeTab === 'vibe' && (
          <VibeTuningTab
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
          <KnowledgeTab
            contextFiles={contextFiles}
            onRemoveFile={handleRemoveContextFile}
            newFileName={newContextFileName}
            onNewFileNameChange={setNewContextFileName}
            newFileContent={newContextFileContent}
            onNewFileContentChange={setNewContextFileContent}
            onAddFile={handleAddContextFile}
          />
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <AdvancedTab
            temperature={temperature}
            onTemperatureChange={setTemperature}
            maxTokens={maxTokens}
            onMaxTokensChange={setMaxTokens}
            responseStyle={responseStyle}
            onResponseStyleChange={setResponseStyle}
            baseModel={baseModel}
            onHasChanges={() => setHasChanges(true)}
          />
        )}
      </main>
    </>
  )
}
