/**
 * DAG Feature Onboarding
 *
 * First-time user tutorial for DAG-based task spreading.
 */

'use client'

import React, { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, GitBranch, Zap } from 'lucide-react'

interface DAGOnboardingProps {
  onClose: () => void
  onComplete: () => void
}

type OnboardingStep = {
  id: number
  title: string
  description: string
  example?: string
  icon: React.ReactNode
}

export function DAGOnboarding({ onClose, onComplete }: DAGOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [skipped, setSkipped] = useState(false)

  const steps: OnboardingStep[] = [
    {
      id: 0,
      title: 'Welcome to DAG Orchestration',
      description: 'Execute complex task workflows with automatic dependencies, parallel processing, and intelligent result merging.',
      icon: <Sparkles className="w-12 h-12 text-blue-500" />
    },
    {
      id: 1,
      title: 'Define Task Dependencies',
      description: 'Specify which tasks depend on others using simple syntax. The system automatically resolves the optimal execution order.',
      example: 'Example:\n"Spread this:\n  1) Research APIs\n  2) Design DB (depends on 1)\n  3) Write backend (depends on 1,2)"',
      icon: <GitBranch className="w-12 h-12 text-purple-500" />
    },
    {
      id: 2,
      title: 'Automatic DAG Visualization',
      description: 'Watch your task graph execute in real-time with a beautiful interactive visualization showing progress and dependencies.',
      icon: <Zap className="w-12 h-12 text-yellow-500" />
    },
    {
      id: 3,
      title: 'Smart Auto-Merge',
      description: 'When all tasks complete, results automatically merge into your main conversation with conflict detection and resolution.',
      icon: <Sparkles className="w-12 h-12 text-green-500" />
    },
    {
      id: 4,
      title: 'Context Optimization',
      description: 'The system optimizes context for each task, ensuring maximum relevance while staying within token limits.',
      icon: <Zap className="w-12 h-12 text-cyan-500" />
    },
    {
      id: 5,
      title: 'Error Recovery',
      description: 'Failed tasks automatically retry with exponential backoff. Partial success is analyzed and reported.',
      icon: <Sparkles className="w-12 h-12 text-orange-500" />
    }
  ]

  const step = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setSkipped(true)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
              {step.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {step.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Skip tutorial"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            {step.description}
          </p>

          {step.example && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                {step.example}
              </pre>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, index) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  index <= currentStep
                    ? 'bg-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Keyboard Shortcuts Hint */}
          {currentStep === steps.length - 1 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Quick Start
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                Try this example to see DAG execution in action:
              </p>
              <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-blue-900 dark:text-blue-300">
                Spread this: Research auth (1), Design DB (2) depends on 1, Write API (3) depends on 1,2
              </code>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              Skip tutorial
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to show onboarding for first-time DAG users
 */
export function useDAGOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  React.useEffect(() => {
    // Check if user has seen DAG onboarding
    const hasSeenOnboarding = localStorage.getItem('dag-onboarding-seen')
    if (!hasSeenOnboarding) {
      setShowOnboarding(true)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem('dag-onboarding-seen', 'true')
    setShowOnboarding(false)
  }

  const handleClose = () => {
    setShowOnboarding(false)
  }

  return {
    showOnboarding,
    handleComplete,
    handleClose
  }
}
