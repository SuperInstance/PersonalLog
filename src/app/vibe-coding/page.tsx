'use client'

/**
 * Vibe-Coding Page
 *
 * Full-page experience for creating custom AI agents through natural conversation.
 * Includes breadcrumbs, help sidebar, and the main conversation interface.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Lightbulb, Keyboard, ArrowRight, Home } from 'lucide-react'
import VibeCodingConversation from '@/components/vibe-coding/VibeCodingConversation'
import type { VibeCodingSession, GeneratedAgent } from '@/lib/vibe-coding/types'
import { VibeCodingState } from '@/lib/vibe-coding/types'

export default function VibeCodingPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string>('')
  const [initialSession, setInitialSession] = useState<VibeCodingSession | undefined>()
  const [showHelp, setShowHelp] = useState(true)

  // Initialize session on mount
  useEffect(() => {
    const newSessionId = `vibe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    setSessionId(newSessionId)

    // Check if there's a saved state (from navigating away and back)
    const savedSession = localStorage.getItem(`vibe-coding-${newSessionId}`)
    if (savedSession) {
      try {
        setInitialSession(JSON.parse(savedSession))
      } catch (error) {
        console.error('Failed to load saved session:', error)
      }
    }
  }, [])

  const handleSendMessage = async (response: string) => {
    // This is a mock implementation
    // In production, this would call the vibe-coding engine API
    return new Promise<{
      nextState: VibeCodingState
      questions?: string[]
      agentPreview?: GeneratedAgent
    }>((resolve) => {
      setTimeout(() => {
        // Mock response
        resolve({
          nextState: VibeCodingState.CLARIFYING_TURN_1,
          questions: [
            "Should the agent be more casual or professional in its communication style?",
            "Do you want it to ask for permission before taking actions, or act autonomously?",
          ],
        })
      }, 1000)
    })
  }

  const handleActivateAgent = async (agentData: GeneratedAgent) => {
    // This is a mock implementation
    // In production, this would register the agent in the agent registry
    console.log('Activating agent:', agentData)
    return Promise.resolve()
  }

  const handleStartOver = () => {
    if (confirm('Are you sure you want to start over? This will clear your current progress.')) {
      const newSessionId = `vibe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      setSessionId(newSessionId)
      setInitialSession(undefined)
      setShowHelp(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-medium">Create Agent</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-53px)]">
        {/* Help sidebar (collapsible) */}
        {showHelp && (
          <aside
            className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto scrollbar-thin hidden lg:block animate-slide-in-top"
            aria-label="Help and tips"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span>Guide</span>
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Hide guide"
                >
                  ✕
                </button>
              </div>

              {/* What is vibe-coding */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  What is Vibe-Coding?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Vibe-coding is a conversational way to create custom AI agents. Just describe what you want,
                  and I'll help you build it through a quick chat.
                </p>
              </section>

              {/* How it works */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  How It Works
                </h3>
                <ol className="space-y-3">
                  <StepItem
                    number={1}
                    title="Describe your needs"
                    description="Tell me what you want your agent to do in plain English."
                  />
                  <StepItem
                    number={2}
                    title="Answer questions"
                    description="I'll ask 2-3 questions to understand your requirements better."
                  />
                  <StepItem
                    number={3}
                    title="Review & customize"
                    description="I'll generate an agent draft that you can edit and refine."
                  />
                  <StepItem
                    number={4}
                    title="Activate"
                    description="Once you're happy, activate your agent and start using it!"
                  />
                </ol>
              </section>

              {/* Tips */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Tips for Best Results
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <TipItem text="Be specific about what you want the agent to do" />
                  <TipItem text="Mention the tone or personality you prefer" />
                  <TipItem text="Describe how it should handle errors or uncertainty" />
                  <TipItem text="Feel free to use examples or point to existing agents" />
                </ul>
              </section>

              {/* Keyboard shortcuts */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-slate-500" />
                  <span>Shortcuts</span>
                </h3>
                <div className="space-y-2 text-sm">
                  <ShortcutItem keys={['⌘', 'Enter']} description="Send message" />
                  <ShortcutItem keys={['Shift', 'Enter']} description="New line" />
                  <ShortcutItem keys={['Esc']} description="Close modals" />
                </div>
              </section>

              {/* Example agents */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Example Agents
                </h3>
                <div className="space-y-2">
                  <ExampleAgent
                    icon="📚"
                    name="Research Assistant"
                    description="Concise, fact-focused responses with web search"
                  />
                  <ExampleAgent
                    icon="🎨"
                    name="Creative Writer"
                    description="Imaginative storytelling with detailed descriptions"
                  />
                  <ExampleAgent
                    icon="🔧"
                    name="Code Reviewer"
                    description="Technical analysis with constructive feedback"
                  />
                </div>
              </section>
            </div>
          </aside>
        )}

        {/* Main conversation area */}
        <main className="flex-1 overflow-hidden" role="main">
          <VibeCodingConversation
            sessionId={sessionId}
            initialState={initialSession}
            onSendMessage={handleSendMessage}
            onActivateAgent={handleActivateAgent}
            onStartOver={handleStartOver}
          />
        </main>
      </div>

      {/* Mobile help toggle */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="lg:hidden fixed bottom-20 right-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform z-40"
        aria-label={showHelp ? 'Hide help' : 'Show help'}
      >
        <Info className="w-6 h-6" />
      </button>
    </div>
  )
}

/**
 * Step item for the guide
 */
interface StepItemProps {
  number: number
  title: string
  description: string
}

function StepItem({ number, title, description }: StepItemProps) {
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
        {number}
      </div>
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{title}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </li>
  )
}

/**
 * Tip item
 */
interface TipItemProps {
  text: string
}

function TipItem({ text }: TipItemProps) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
      <span>{text}</span>
    </li>
  )
}

/**
 * Keyboard shortcut item
 */
interface ShortcutItemProps {
  keys: string[]
  description: string
}

function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
      <span className="text-xs">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, idx) => (
          <span
            key={idx}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono font-medium"
          >
            {key}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Example agent card
 */
interface ExampleAgentProps {
  icon: string
  name: string
  description: string
}

function ExampleAgent({ icon, name, description }: ExampleAgentProps) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  )
}
