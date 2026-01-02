'use client'

/**
 * AIContactsPanel Component
 *
 * Sidebar panel showing AI contacts/personas.
 */

import { useState, useEffect } from 'react'
import { Plus, Bot, Sparkles, MoreHorizontal } from 'lucide-react'
import { listAgents, createAgent, getAgentInitials } from '@/lib/storage/ai-contact-store'
import type { AIAgent } from '@/types/conversation'

interface AIContactsPanelProps {
  onAddAgentToConversation?: (agent: AIAgent) => void
}

export default function AIContactsPanel({ onAddAgentToConversation }: AIContactsPanelProps) {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const agentList = await listAgents()
      setAgents(agentList)
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return

    try {
      const newAgent = await createAgent(newAgentName.trim())
      setAgents(prev => [...prev, newAgent])
      setNewAgentName('')
      setShowCreate(false)
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          AI Contacts
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Create new AI contact"
        >
          <Plus className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Create New Agent */}
      {showCreate && (
        <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <input
            type="text"
            placeholder="Agent name..."
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAgent()}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setShowCreate(false)
                setNewAgentName('')
              }}
              className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={!newAgentName.trim()}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="space-y-1">
        {agents.map(agent => (
          <div
            key={agent.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-full ${agent.color || 'bg-purple-500'} flex items-center justify-center text-white text-sm font-semibold`}>
              {getAgentInitials(agent.name)}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {agent.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {agent.config.provider} • {agent.config.responseStyle}
              </p>
            </div>

            {/* Actions */}
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all">
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ))}

        {/* Empty State */}
        {agents.length === 0 && !showCreate && (
          <div className="py-4 text-center">
            <Bot className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No AI contacts yet</p>
            <p className="text-xs text-slate-400 mt-1">Create one to get started</p>
          </div>
        )}
      </div>

      {/* Vibe Fine-Tuning Hint */}
      {agents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3 h-3" />
            <span>Tell AI to adjust its vibe</span>
          </div>
        </div>
      )}
    </div>
  )
}
