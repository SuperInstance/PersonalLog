'use client'

/**
 * AdvancedOptions Component
 *
 * Modal for configuring AI settings in a conversation.
 */

import { useState, useEffect } from 'react'
import { X, Settings as SettingsIcon, Sparkles, Sliders, MessageSquare, Zap } from 'lucide-react'
import type { AIAgent, AIConfig, ResponseStyle } from '@/types/conversation'

interface AdvancedOptionsProps {
  isOpen: boolean
  onClose: () => void
  agent: AIAgent | null
  conversationAgents: AIAgent[]
  onUpdateAgent: (agent: AIAgent) => void
  onAddAgent: (agent: AIAgent) => void
  onRemoveAgent: (agentId: string) => void
}

export default function AdvancedOptions({
  isOpen,
  onClose,
  agent,
  conversationAgents,
  onUpdateAgent,
  onAddAgent,
  onRemoveAgent,
}: AdvancedOptionsProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'personality' | 'vibe' | 'multi'>('basic')
  const [localConfig, setLocalConfig] = useState<AIConfig | null>(null)
  const [localSystemPrompt, setLocalSystemPrompt] = useState('')

  useEffect(() => {
    if (agent) {
      setLocalConfig({ ...agent.config })
      setLocalSystemPrompt(agent.personality.systemPrompt)
    }
  }, [agent])

  if (!isOpen) return null
  if (!agent) return null

  const handleSave = () => {
    if (localConfig) {
      onUpdateAgent({
        ...agent,
        config: localConfig,
        personality: {
          ...agent.personality,
          systemPrompt: localSystemPrompt,
        },
      })
    }
    onClose()
  }

  const handleVibeAdjust = (attribute: string, newValue: number) => {
    setLocalConfig(prev => prev ? {
      ...prev,
      temperature: newValue, // Map vibe to temperature for now
    } : null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${agent.color || 'bg-purple-500'} flex items-center justify-center text-white font-semibold`}>
              {agent.name[0]}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {agent.name}
              </h3>
              <p className="text-sm text-slate-500">Advanced Options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-200 dark:border-slate-800">
          <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={<SettingsIcon className="w-4 h-4" />}>
            Basic
          </TabButton>
          <TabButton active={activeTab === 'personality'} onClick={() => setActiveTab('personality')} icon={<MessageSquare className="w-4 h-4" />}>
            Personality
          </TabButton>
          <TabButton active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Sparkles className="w-4 h-4" />}>
            Vibe Tuning
          </TabButton>
          <TabButton active={activeTab === 'multi'} onClick={() => setActiveTab('multi')} icon={<Zap className="w-4 h-4" />}>
            Multi-Bot
          </TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <BasicSettings config={localConfig} onChange={setLocalConfig} />
          )}

          {activeTab === 'personality' && (
            <PersonalitySettings
              systemPrompt={localSystemPrompt}
              onChange={setLocalSystemPrompt}
              agent={agent}
            />
          )}

          {activeTab === 'vibe' && (
            <VibeTuning
              config={localConfig}
              agent={agent}
              onAdjust={handleVibeAdjust}
            />
          )}

          {activeTab === 'multi' && (
            <MultiBotSettings
              agent={agent}
              allAgents={conversationAgents}
              config={localConfig}
              onChange={setLocalConfig}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
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
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function BasicSettings({
  config,
  onChange,
}: {
  config: AIConfig | null
  onChange: (config: AIConfig) => void
}) {
  if (!config) return null

  return (
    <div className="space-y-6">
      {/* Response Style */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Response Style
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['brief', 'balanced', 'detailed'] as ResponseStyle[]).map(style => (
            <button
              key={style}
              onClick={() => onChange({ ...config, responseStyle: style })}
              className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                config.responseStyle === style
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
          Temperature: {config.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature}
          onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
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
          value={config.maxTokens}
          onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) })}
          className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
        >
          <option value={100}>Brief (~100 tokens)</option>
          <option value={300}>Medium (~300 tokens)</option>
          <option value={500}>Long (~500 tokens)</option>
          <option value={1000}>Detailed (~1000 tokens)</option>
        </select>
      </div>

      {/* Escalation */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Escalation Settings</h4>

        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={config.escalateToCloud || false}
            onChange={(e) => onChange({ ...config, escalateToCloud: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Escalate to cloud if local takes too long
          </span>
        </label>

        {config.escalateToCloud && (
          <div className="ml-6 space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Patience (seconds)</label>
              <input
                type="number"
                value={config.escalationPatience || 30}
                onChange={(e) => onChange({ ...config, escalationPatience: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                min="5"
                max="120"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PersonalitySettings({
  systemPrompt,
  onChange,
  agent,
}: {
  systemPrompt: string
  onChange: (prompt: string) => void
  agent: AIAgent
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          System Prompt
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Define how this AI should behave and respond. The AI will use this as its core personality.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="You are a helpful AI assistant..."
        />
      </div>

      {/* Vibe Attributes */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Personality Attributes
        </h4>
        <div className="space-y-2">
          {agent.personality.vibeAttributes.map(attr => (
            <div key={attr.attribute} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm capitalize text-slate-700 dark:text-slate-300">
                {attr.attribute}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${attr.value * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-10 text-right">
                  {Math.round(attr.value * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Context Conversations */}
      {agent.personality.contextConversationIds.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Learning From
          </h4>
          <p className="text-xs text-slate-500">
            {agent.personality.contextConversationIds.length} conversations shaping this AI
          </p>
        </div>
      )}
    </div>
  )
}

function VibeTuning({
  config,
  agent,
  onAdjust,
}: {
  config: AIConfig | null
  agent: AIAgent
  onAdjust: (attribute: string, value: number) => void
}) {
  if (!config) return null

  const vibes = [
    { attribute: 'creativity', label: 'Creativity', icon: '🎨' },
    { attribute: 'friendliness', label: 'Friendliness', icon: '😊' },
    { attribute: 'conciseness', label: 'Conciseness', icon: '💬' },
    { attribute: 'formality', label: 'Formality', icon: '🎩' },
    { attribute: 'humor', label: 'Humor', icon: '😄' },
    { attribute: 'empathy', label: 'Empathy', icon: '💚' },
  ]

  return (
    <div className="space-y-6">
      {/* Natural Language Vibe Adjustment */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
              Vibe-Fine-Tuning
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tell the AI to adjust its personality during chat. For example:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 space-y-1 ml-4">
              <li>• "Be more enthusiastic"</li>
              <li>• "Keep it shorter"</li>
              <li>• "Sound more professional"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Manual Vibe Sliders */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Manual Adjustment
        </h4>
        <div className="space-y-4">
          {vibes.map(vibe => {
            const currentAttr = agent.personality.vibeAttributes.find(a => a.attribute === vibe.attribute)
            const currentValue = currentAttr?.value ?? 0.5

            return (
              <div key={vibe.attribute}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {vibe.icon} {vibe.label}
                  </span>
                  <span className="text-xs text-slate-500">{Math.round(currentValue * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentValue}
                  onChange={(e) => onAdjust(vibe.attribute, parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Vibe Summary */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          Current Vibe
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {generateVibeDescription(agent, config)}
        </p>
      </div>
    </div>
  )
}

function MultiBotSettings({
  agent,
  allAgents,
  config,
  onChange,
}: {
  agent: AIAgent
  allAgents: AIAgent[]
  config: AIConfig | null
  onChange: (config: AIConfig) => void
}) {
  if (!config) return null

  const otherAgents = allAgents.filter(a => a.id !== agent.id)

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Collaboration Mode
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChange({ ...config, arrangement: 'parallel' })}
            className={`p-4 rounded-xl border-2 transition-all ${
              config.arrangement === 'parallel'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl mb-2">🔀</div>
            <h5 className="font-medium text-slate-900 dark:text-slate-100">Parallel</h5>
            <p className="text-xs text-slate-500 mt-1">
              All AIs respond simultaneously
            </p>
          </button>

          <button
            onClick={() => onChange({ ...config, arrangement: 'series' })}
            className={`p-4 rounded-xl border-2 transition-all ${
              config.arrangement === 'series'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl mb-2">🔄</div>
            <h5 className="font-medium text-slate-900 dark:text-slate-100">Series</h5>
            <p className="text-xs text-slate-500 mt-1">
              Each AI builds on the previous
            </p>
          </button>
        </div>
      </div>

      {/* Collaborators */}
      {config.arrangement && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Collaborators
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Select other AI contacts to collaborate with
          </p>
          <div className="space-y-2">
            {otherAgents.map(otherAgent => {
              const isSelected = config.collaboratorIds?.includes(otherAgent.id)
              return (
                <button
                  key={otherAgent.id}
                  onClick={() => {
                    const current = config.collaboratorIds || []
                    const updated = isSelected
                      ? current.filter(id => id !== otherAgent.id)
                      : [...current, otherAgent.id]
                    onChange({ ...config, collaboratorIds: updated })
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${otherAgent.color || 'bg-purple-500'} flex items-center justify-center text-white text-sm font-semibold`}>
                    {otherAgent.name[0]}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {otherAgent.name}
                  </span>
                  {isSelected && (
                    <span className="ml-auto text-blue-600">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function generateVibeDescription(agent: AIAgent, config: AIConfig): string {
  const { temperature, responseStyle } = config
  const attrs = agent.personality.vibeAttributes

  const parts: string[] = []

  // Based on temperature
  if (temperature < 0.3) parts.push('very precise and factual')
  else if (temperature < 0.6) parts.push('balanced and thoughtful')
  else parts.push('creative and exploratory')

  // Based on response style
  if (responseStyle === 'brief') parts.push('keeps responses concise')
  else if (responseStyle === 'detailed') parts.push('gives thorough responses')

  // Based on attributes
  const friendly = attrs.find(a => a.attribute === 'friendliness')
  if (friendly && friendly.value > 0.7) parts.push('very friendly')

  const formal = attrs.find(a => a.attribute === 'formality')
  if (formal && formal.value > 0.7) parts.push('professional tone')

  return parts.length > 0
    ? `${agent.name} is ${parts.join(', ')}.`
    : `${agent.name} responds in a balanced manner.`
}
