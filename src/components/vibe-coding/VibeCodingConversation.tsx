'use client'

/**
 * VibeCodingConversation Component
 *
 * Main conversational UI for creating custom agents through natural dialogue.
 * Shows conversation history, clarification questions, progress, and agent preview.
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Home, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ClarificationQuestions from './ClarificationQuestions'
import AgentPreview from './AgentPreview'
import ApprovalButtons from './ApprovalButtons'
import EditAgentModal from './EditAgentModal'
import { VibeCodingState } from '@/lib/vibe-coding/types'
import type {
  VibeCodingSession,
  ClarificationTurn,
  GeneratedAgent,
  UserResponse,
} from '@/lib/vibe-coding/types'

// Temporary compatibility types for old component structure
interface VibeCodingMessage {
  id: string
  role: string
  content: {
    text: string
    questions?: string[]
  }
  timestamp: string
}

interface VibeCodingResponse {
  id: string
  timestamp: string
  stage: VibeCodingState
  answers: string
}

interface VibeCodingConversationProps {
  sessionId: string
  initialState?: VibeCodingSession
  onSendMessage: (response: string) => Promise<{
    nextState: VibeCodingState
    questions?: string[]
    agentPreview?: GeneratedAgent
  }>
  onActivateAgent?: (agentData: GeneratedAgent) => Promise<void>
  onStartOver?: () => void
  className?: string
}

function VibeCodingConversation({
  sessionId,
  initialState,
  onSendMessage,
  onActivateAgent,
  onStartOver,
  className = '',
}: VibeCodingConversationProps) {
  const router = useRouter()
  const [session, setSession] = useState<VibeCodingSession>(
    initialState || {
      sessionId,
      conversationId: '',
      state: VibeCodingState.IDLE,
      turns: [],
      requirements: {
        personality: {
          tone: 'professional',
          verbosity: 'balanced',
          style: 'direct',
        },
        constraints: {
          briefByDefault: false,
          askForClarification: true,
          functionCallPermission: 'always_ask',
          functionPermissionTimeout: null,
          showReasoning: false,
        },
        capabilities: {
          canSeeWeb: false,
          canSeeFiles: false,
          canHearAudio: false,
          canGenerateImages: false,
        },
        useCase: '',
        specialInstructions: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  )
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentAgentData, setCurrentAgentData] = useState<GeneratedAgent | null>(null)
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([])
  const [userResponses, setUserResponses] = useState<UserResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Computed state for compatibility with old UI code
  const state = {
    stage: session.state,
    currentTurn: session.turns.length,
    messages: session.turns.flatMap(turn => [
      {
        id: `q-${turn.timestamp}`,
        role: 'assistant',
        content: {
          text: turn.questions.join('\n'),
          questions: turn.questions,
        },
        timestamp: turn.timestamp,
      },
      ...turn.responses.map((r, idx) => ({
        id: `r-${turn.timestamp}-${idx}`,
        role: 'user',
        content: { text: r },
        timestamp: turn.timestamp,
      }))
    ]),
    responses: userResponses.map((r, idx) => ({
      id: `resp-${idx}`,
      timestamp: r.timestamp,
      stage: session.state,
      answers: r.text,
    })),
    error,
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.turns])

  // Focus input on mount and after each response
  useEffect(() => {
    if (!isLoading && session.state !== VibeCodingState.COMPLETED) {
      inputRef.current?.focus()
    }
  }, [isLoading, session.state])

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) {
      return
    }

    const userMessage = inputText.trim()
    setInputText('')
    setIsLoading(true)

    // Add user response to local state
    const userResponse: UserResponse = {
      text: userMessage,
      timestamp: new Date().toISOString(),
    }
    setUserResponses(prev => [...prev, userResponse])

    try {
      // Send to AI and get next message
      const response = await onSendMessage(userMessage)

      // Update session state with new AI message
      setSession(prev => ({
        ...prev,
        state: response.nextState,
        updatedAt: new Date().toISOString(),
      }))

      // Update current questions
      if (response.questions) {
        setCurrentQuestions(response.questions)
      }

      // If agent preview received, store it
      if (response.agentPreview) {
        setCurrentAgentData(response.agentPreview)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleActivateAgent = async () => {
    if (!onActivateAgent || !currentAgentData) {
      return
    }

    setIsActivating(true)
    try {
      await onActivateAgent(currentAgentData)
      setSession(prev => ({ ...prev, state: VibeCodingState.COMPLETED, updatedAt: new Date().toISOString() }))
    } catch (error) {
      console.error('Failed to activate agent:', error)
    } finally {
      setIsActivating(false)
    }
  }

  const handleEditAgent = () => {
    setShowEditModal(true)
  }

  const handleSaveEditedAgent = async (editedAgent: { yaml?: string; fields?: Record<string, unknown> }) => {
    // In production, this would update the agent and regenerate preview
    setShowEditModal(false)
    // For now, just close the modal
  }

  const handleCancel = () => {
    router.push('/')
  }

  const getStageLabel = () => {
    switch (state.stage) {
      case VibeCodingState.CLARIFYING_TURN_1:
        return 'Step 1 of 3: Understanding your needs'
      case VibeCodingState.CLARIFYING_TURN_2:
        return `Step 2 of 3: Refining your agent`
      case VibeCodingState.GENERATING:
        return 'Generating your agent...'
      case VibeCodingState.PREVIEW:
        return 'Review your agent'
      case VibeCodingState.COMPLETED:
        return 'Agent activated!'
      default:
        return 'Creating your agent'
    }
  }

  const getProgressPercent = () => {
    switch (state.stage) {
      case VibeCodingState.CLARIFYING_TURN_1:
        return 33
      case VibeCodingState.CLARIFYING_TURN_2:
        return 55
      case VibeCodingState.GENERATING:
        return 95
      case VibeCodingState.PREVIEW:
      case VibeCodingState.COMPLETED:
        return 100
      default:
        return 0
    }
  }

  return (
    <div className={`vibe-coding-conversation h-full flex flex-col bg-white dark:bg-slate-950 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Go home"
            >
              <Home className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span>Create Your Agent</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Session: {sessionId.slice(0, 8)}...
              </p>
            </div>
          </div>

          {onStartOver && state.stage !== 'completed' && (
            <button
              onClick={onStartOver}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Start Over
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-4 md:px-6 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {getStageLabel()}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {getProgressPercent()}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 scrollbar-thin scroll-touch">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Welcome message (initial) */}
          {state.messages.length === 0 && state.responses.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-purple-500 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Let's create your perfect AI agent
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Tell me what you want your agent to do, and I'll help you build it through a quick conversation.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                <span className="font-mono">⌘</span>
                <span>+ Enter to send</span>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {state.messages.map((message) => (
            <AIMessage key={message.id} message={message} />
          ))}

          {/* User responses */}
          {state.responses.map((response, idx) => (
            <UserResponse key={`user-response-${idx}`} response={response} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                AI
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {state.stage === 'generating' ? 'Creating your agent...' : 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          {/* Agent preview (when ready) */}
          {state.stage === 'preview' && currentAgentData && (
            <AgentPreview agentData={currentAgentData as any} className="animate-fade-in" />
          )}

          {/* Approval buttons */}
          {state.stage === 'preview' && (
            <ApprovalButtons
              onActivate={handleActivateAgent}
              onEdit={handleEditAgent}
              onCancel={handleCancel}
              onStartOver={onStartOver}
              isActivating={isActivating}
              className="animate-slide-in-bottom"
            />
          )}

          {/* Completed state */}
          {state.stage === 'completed' && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-4xl">✨</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Your agent is ready!
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                You can now start conversations with your custom agent.
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Go to Messenger
              </button>
            </div>
          )}

          {/* Error state */}
          {state.error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-400">{state.error}</p>
            </div>
          )}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>

      {/* Input area (hidden in preview/completed states) */}
      {state.stage !== 'preview' && state.stage !== 'completed' && (
        <div className="flex-shrink-0 px-4 pb-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-slate-100 dark:bg-slate-900 rounded-2xl p-3">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Describe what you want your agent to do..."
                rows={1}
                className="flex-1 bg-transparent resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none max-h-32"
                style={{ minHeight: '24px' }}
                disabled={isLoading}
                aria-label="Your message"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && currentAgentData && (
        <EditAgentModal
          isOpen={showEditModal}
          agent={(currentAgentData as any).definition}
          yamlDefinition={(currentAgentData as any).yamlDefinition || ''}
          onSave={handleSaveEditedAgent}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

/**
 * AI message component
 */
interface AIMessageProps {
  message: VibeCodingMessage
}

function AIMessage({ message }: AIMessageProps) {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-md">
        AI
      </div>
      <div className="flex-1 max-w-[80%]">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl rounded-bl-md px-4 py-3">
          <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
            {message.content.text}
          </p>
          {message.content.questions && message.content.questions.length > 0 && (
            <div className="mt-4">
              <ClarificationQuestions questions={message.content.questions} />
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400 mt-1 ml-1 block">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

/**
 * User response component
 */
interface UserResponseProps {
  response: VibeCodingResponse
}

function UserResponse({ response }: UserResponseProps) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[80%]">
        <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3">
          <p className="whitespace-pre-wrap leading-relaxed">{response.answers}</p>
        </div>
        <div className="flex items-center justify-end gap-1 mt-1 px-1">
          <span className="text-xs text-slate-400">
            {new Date(response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default VibeCodingConversation
