'use client'

/**
 * Long-Form Conversation Page
 *
 * Detailed view for longer AI responses and deeper exploration.
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Send,
  Mic,
  MoreVertical,
  Settings,
  Maximize2,
  FileText,
} from 'lucide-react'
import { getConversation, getMessages, addMessage, updateConversation } from '@/lib/storage'
import { listAgents } from '@/lib/storage'
import type { Conversation, Message, AIAgent } from '@/types/conversation'
import { formatRelativeTime, getAuthorDisplayName } from '@/lib/utils'

export default function LongFormConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversation()
    loadAgents()
  }, [conversationId])

  const loadConversation = async () => {
    try {
      const conv = await getConversation(conversationId)
      if (!conv) {
        router.push('/messenger')
        return
      }
      setConversation(conv)

      const msgs = await getMessages(conversationId)
      setMessages(msgs)

      // Set first AI agent as default
      if (conv.aiContacts.length > 0) {
        const agents = await listAgents()
        const agent = agents.find(a => a.id === conv.aiContacts[0].id)
        if (agent) setSelectedAgent(agent)
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  const loadAgents = async () => {
    // Load agents for AI response
    const agents = await listAgents()
    // Could set selected agent here
  }

  // Focus modal when opened
  useEffect(() => {
    if (showAdvanced && modalRef.current) {
      modalRef.current.focus()
    }
  }, [showAdvanced])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAdvanced) {
        setShowAdvanced(false)
      }
    }

    if (showAdvanced) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showAdvanced])

  // Focus trap for modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }
  }

  const handleSendMessage = async () => {
    if (!conversation || !inputText.trim()) return

    try {
      const newMessage = await addMessage(
        conversation.id,
        'text',
        'user',
        { text: inputText.trim() }
      )

      setMessages(prev => [...prev, newMessage])
      setInputText('')

      // If AI is present, generate response
      if (selectedAgent) {
        await generateAIResponse(inputText.trim())
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const generateAIResponse = async (userMessage: string) => {
    if (!conversation || !selectedAgent) return

    // Simulate AI response (in production, call actual AI)
    setTimeout(() => {
      const aiMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId: conversation.id,
        type: 'text',
        author: {
          type: 'ai-contact',
          contactId: selectedAgent.id,
          contactName: selectedAgent.name,
        },
        content: {
          text: generateMockResponse(userMessage, selectedAgent, messages),
        },
        timestamp: new Date().toISOString(),
        metadata: {
          model: selectedAgent.config.model,
          tokens: { input: 100, output: 150, total: 250 },
        },
      }

      setMessages(prev => [...prev, aiMessage])
    }, 1000)
  }

  const generateMockResponse = (userMsg: string, agent: AIAgent, context: Message[]): string => {
    // Generate contextual response based on agent personality
    const brief = agent.config.responseStyle === 'brief'

    if (brief) {
      return `Here's my take on that:

Based on our conversation, I think the key points are:
1. The main concept you're exploring
2. The implications of that approach
3. Next steps to consider

Want me to elaborate on any of these?`
    }

    return `Let me provide a more detailed response to "${userMsg.substring(0, 50)}${userMsg.length > 50 ? '...' : ''}".

## Analysis

Looking at our conversation history and your current question, here are my thoughts:

**Context from previous messages:**
${context.slice(-3).map(m => `- ${getAuthorDisplayName(m.author)}: ${m.content.text?.substring(0, 30) || ''}...`).join('\n')}

**Detailed Response:**

${agent.personality.systemPrompt.includes('creative')
  ? "From a creative perspective, there are several interesting angles to explore here. The interplay between different concepts creates opportunities for innovative thinking."
  : "From an analytical standpoint, we can break this down into key components and examine each systematically."}

1. **First Consideration**: The initial aspect relates to the core of your question
2. **Second Point**: There's also the contextual element from our previous discussion
3. **Third Aspect**: We should consider the practical implications

## Recommendation

Based on ${agent.name}'s analysis, I'd suggest exploring this further. The approach you're considering has merit, and there are several directions this could go.

Would you like me to dive deeper into any specific aspect?`
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Conversation Header */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {conversation.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {messages.length} messages • Long-form view • {conversation.type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedAgent && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${selectedAgent.color || 'bg-purple-500'} bg-opacity-20`}>
                <div className={`w-6 h-6 rounded-full ${selectedAgent.color || 'bg-purple-500'} flex items-center justify-center text-white text-xs font-semibold`}>
                  {selectedAgent.name[0]}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedAgent.name}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Advanced options"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-6 mb-24">
        {messages.map((message, index) => {
          const isUser = message.author === 'user'
          const isAI = !isUser && typeof message.author === 'object' && message.author.type === 'ai-contact'

          return (
            <div
              key={message.id}
              className={`group ${isUser ? 'flex justify-end' : ''}`}
            >
              {!isUser && (
                <div className="flex items-start gap-3 max-w-3xl">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 ${
                    isAI && selectedAgent?.id === message.author.contactId
                      ? selectedAgent.color || 'bg-purple-500'
                      : 'bg-slate-400'
                  } flex items-center justify-center text-white text-sm font-semibold`}>
                    {isAI ? selectedAgent?.name[0] || 'AI' : 'S'}
                  </div>
                </div>
              )}

              <div className={`${isUser ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'} rounded-2xl ${isUser ? 'rounded-br-md' : 'rounded-bl-md'} px-6 py-4 shadow-sm max-w-3xl ${isUser ? '' : 'border border-slate-200 dark:border-slate-800'}`}>
                {message.content.systemNote ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                    {message.content.systemNote}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content.text && (
                      <p className="whitespace-pre-wrap">{message.content.text}</p>
                    )}
                  </div>
                )}

                {message.metadata.tokens && (
                  <div className={`mt-3 pt-3 border-t ${isUser ? 'border-blue-400' : 'border-slate-200 dark:border-slate-700'}`}>
                    <p className={`text-xs ${isUser ? 'text-blue-100' : 'text-slate-500'}`}>
                      {message.metadata.model} • {message.metadata.tokens.total} tokens
                    </p>
                  </div>
                )}
              </div>

              <div className={`ml-2 ${isUser ? 'text-right' : ''}`}>
                <span className="text-xs text-slate-400">{formatRelativeTime(message.timestamp)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-end gap-3">
            {/* Expand/Collapse */}
            <button
              onClick={() => router.push(`/messenger/${conversationId}`)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Switch to messenger view"
            >
              <Maximize2 className="w-5 h-5 text-slate-400" />
            </button>

            {/* Text Input */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={selectedAgent ? `Write a detailed message to ${selectedAgent.name}...` : 'Write a note...'}
                rows={2}
                className="w-full bg-transparent resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Voice Record */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-xl transition-colors ${
                isRecording
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send */}
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Mode indicator */}
          <div className="text-center mt-2">
            <p className="text-xs text-slate-500">
              📝 Long-form mode • Responses will be more detailed
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options Modal */}
      {showAdvanced && selectedAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
            tabIndex={-1}
            onKeyDown={handleModalKeyDown}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedAgent.name} Settings
              </h3>
              <button
                onClick={() => setShowAdvanced(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                aria-label="Close settings modal"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="response-style">
                  Response Style
                </label>
                <select
                  id="response-style"
                  value={selectedAgent.config.responseStyle}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="brief">Brief</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="temperature">
                  Temperature: {selectedAgent.config.temperature}
                </label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedAgent.config.temperature}
                  className="w-full"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={selectedAgent.config.temperature}
                  aria-valuetext={`Temperature set to ${selectedAgent.config.temperature}`}
                />
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced(false)}
              className="w-full mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              aria-label="Save settings and close modal"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
