'use client'

/**
 * Model Setup Wizard Page
 *
 * Step-by-step wizard for adding AI models and creating AI contacts.
 * This is a thin wrapper around the SetupWizard component.
 */

import { SetupWizard } from '@/components/setup'

export default function SetupWizardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <SetupWizard />
    </div>
  )
}
