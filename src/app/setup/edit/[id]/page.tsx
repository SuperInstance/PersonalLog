'use client'

/**
 * Edit AI Contact Page
 *
 * Edit existing AI contacts, vibe-fine-tune from conversations, and create versions.
 * This is a thin wrapper around the AgentEditor component.
 */

import { AgentEditor } from '@/components/setup'

export default function EditContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <AgentEditor />
    </div>
  )
}
