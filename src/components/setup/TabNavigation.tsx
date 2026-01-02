'use client'

/**
 * Tab Navigation
 *
 * Tab switcher for the agent editor.
 */

import { MessageSquare, Sparkles, FileText, Sliders } from 'lucide-react'

export type EditorTab = 'personality' | 'vibe' | 'context' | 'advanced'

interface TabNavigationProps {
  activeTab: EditorTab
  onTabChange: (tab: EditorTab) => void
}

const tabs = [
  { id: 'personality' as EditorTab, label: 'Personality', icon: MessageSquare },
  { id: 'vibe' as EditorTab, label: 'Vibe Tuning', icon: Sparkles },
  { id: 'context' as EditorTab, label: 'Context Files', icon: FileText },
  { id: 'advanced' as EditorTab, label: 'Advanced', icon: Sliders },
]

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {tabs.map(tab => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
