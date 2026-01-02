'use client'

/**
 * Setup Progress Indicator
 *
 * Shows the current step in the wizard with visual completion state.
 */

import { Check } from 'lucide-react'

export interface Step {
  id: string
  label: string
  current: boolean
  completed: boolean
}

interface SetupProgressProps {
  steps: Step[]
}

export function SetupProgress({ steps }: SetupProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              step.current
                ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                : step.completed
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {step.completed ? <Check className="w-5 h-5" /> : index + 1}
          </div>
          <span className={`ml-2 text-sm font-medium ${step.current ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className="mx-4 w-16 h-0.5 bg-slate-200 dark:bg-slate-800" />
          )}
        </div>
      ))}
    </div>
  )
}
