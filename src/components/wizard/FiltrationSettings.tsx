/**
 * Filtration Settings Component
 *
 * UI for configuring prompt enhancement and response post-processing.
 */

'use client'

import { useState, useEffect } from 'react'
import { Slider } from '@/components/ui/Slider'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { FiltrationConfig } from '@/lib/wizard/models'
import { DEFAULT_FILTRATION } from '@/lib/wizard/models'
import { getFilterSettings, setFilterSettings } from '@/lib/wizard/model-store'

interface FiltrationSettingsProps {
  onSave?: (config: FiltrationConfig) => void
  className?: string
}

export function FiltrationSettings({ onSave, className = '' }: FiltrationSettingsProps) {
  const [config, setConfig] = useState<FiltrationConfig>(DEFAULT_FILTRATION)
  const [customInstructions, setCustomInstructions] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Load saved settings
  useEffect(() => {
    getFilterSettings().then(saved => {
      if (saved && Object.keys(saved).length > 0) {
        setConfig(saved)
        setCustomInstructions(saved.customInstructions || '')
      }
    })
  }, [])

  const updateConfig = (updates: Partial<FiltrationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const updatePromptEnhancement = (key: keyof FiltrationConfig['promptEnhancement'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      promptEnhancement: { ...prev.promptEnhancement, [key]: value },
    }))
    setHasChanges(true)
  }

  const updateResponseProcessing = (key: keyof FiltrationConfig['responsePostProcessing'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      responsePostProcessing: { ...prev.responsePostProcessing, [key]: value },
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    const toSave = {
      ...config,
      customInstructions: customInstructions.trim() || undefined,
    }
    await setFilterSettings(toSave)
    setHasChanges(false)
    onSave?.(toSave)
  }

  const handleReset = () => {
    setConfig(DEFAULT_FILTRATION)
    setCustomInstructions('')
    setHasChanges(true)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Smart Filtration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Make AI responses better and more suited to you
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Prompt Enhancement */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
          Prompt Enhancement
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Improve your questions before sending them to AI
        </p>

        <div className="space-y-4">
          <SettingRow
            title="Add Clarity"
            description="Expand abbreviations and clarify vague requests"
            enabled={config.promptEnhancement.addClarity}
            onToggle={(v) => updatePromptEnhancement('addClarity', v)}
          />

          <SettingRow
            title="Add Structure"
            description="Organize multi-part questions logically"
            enabled={config.promptEnhancement.addStructure}
            onToggle={(v) => updatePromptEnhancement('addStructure', v)}
          />

          <SettingRow
            title="Add Context"
            description="Include conversation history for better responses"
            enabled={config.promptEnhancement.addContext}
            onToggle={(v) => updatePromptEnhancement('addContext', v)}
          />
        </div>
      </Card>

      {/* Response Post-Processing */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
          Response Processing
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Clean up and improve AI responses
        </p>

        <div className="space-y-4">
          <SettingRow
            title="Remove Filler"
            description="Remove generic phrases like 'I'd be happy to help'"
            enabled={config.responsePostProcessing.removeFiller}
            onToggle={(v) => updateResponseProcessing('removeFiller', v)}
          />

          <SettingRow
            title="Improve Formatting"
            description="Fix bullet points, spacing, and structure"
            enabled={config.responsePostProcessing.improveFormatting}
            onToggle={(v) => updateResponseProcessing('improveFormatting', v)}
          />

          <SettingRow
            title="Extract Key Points"
            description="Pull out important information from long responses"
            enabled={config.responsePostProcessing.extractKeyPoints}
            onToggle={(v) => updateResponseProcessing('extractKeyPoints', v)}
          />
        </div>
      </Card>

      {/* Custom Instructions */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
          Custom Instructions
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add custom instructions that will be prepended to every message
        </p>

        <textarea
          value={customInstructions}
          onChange={(e) => {
            setCustomInstructions(e.target.value)
            setHasChanges(true)
          }}
          placeholder="Example: Always explain things step by step. Use simple language. Include examples."
          className="w-full min-h-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />

        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>These instructions will be added to every message you send</span>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          How It Works
        </h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
              1
            </div>
            <p>
              <strong>You type:</strong> "pls help me fix my code"
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
              2
            </div>
            <p>
              <strong>AI receives:</strong> "Please provide detailed guidance on how to fix my code"
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium">
              3
            </div>
            <p>
              <strong>AI responds:</strong> "I'd be happy to help! Let me show you..."
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-medium">
              4
            </div>
            <p>
              <strong>You see:</strong> "Let me show you..." <span className="text-gray-500">(filler removed)</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface SettingRowProps {
  title: string
  description: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

function SettingRow({ title, description, enabled, onToggle }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1 pr-4">
        <div className="font-medium text-gray-900 dark:text-white">{title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="flex-shrink-0"
      />
    </div>
  )
}
