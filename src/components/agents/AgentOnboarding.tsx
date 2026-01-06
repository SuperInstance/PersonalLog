'use client'

/**
 * AgentOnboarding Component
 *
 * Simple onboarding tour for new agent features.
 * Shows first time user visits agent section, with localStorage tracking.
 */

import { useEffect, useState } from 'react'
import { X, Sparkles, Grid3x3, Store, Upload, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

const ONBOARDING_STORAGE_KEY = 'agent-onboarding-completed'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ElementType
  action?: string
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Create Custom Agents',
    description: 'Use Vibe-Coding to create personalized AI agents through natural conversation. Just describe what you need!',
    icon: Sparkles,
    action: 'Try Vibe-Coding',
  },
  {
    title: 'Browse Templates',
    description: 'Get started quickly with our curated collection of pre-built agent templates for common use cases.',
    icon: Grid3x3,
    action: 'Browse Templates',
  },
  {
    title: 'Explore Marketplace',
    description: 'Discover and install agents created by the community. Find the perfect agent for your needs.',
    icon: Store,
    action: 'Visit Marketplace',
  },
  {
    title: 'Import & Export',
    description: 'Share your agents with others or import agents from files. Transfer agents between devices easily.',
    icon: Upload,
  },
]

interface AgentOnboardingProps {
  /** Whether to show the onboarding */
  isOpen: boolean
  /** Callback when onboarding is closed or completed */
  onClose: () => void
}

export function AgentOnboarding({ isOpen, onClose }: AgentOnboardingProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  // Check if onboarding was already completed
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (completed && isOpen) {
      // Don't show again
      onClose()
    }
  }, [isOpen, onClose])

  const handleComplete = () => {
    // Mark as completed
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleAction = () => {
    const step = onboardingSteps[currentStep]

    // Navigate based on action
    if (step.action === 'Try Vibe-Coding') {
      router.push('/vibe-coding')
    } else if (step.action === 'Visit Marketplace') {
      router.push('/marketplace')
    }

    // Move to next step or complete
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const step = onboardingSteps[currentStep]
  const StepIcon = step.icon
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100

  return (
    <Modal
      isOpen={isOpen && !isClosing}
      onClose={onClose}
      size="lg"
      showCloseButton={true}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      className="animate-fade-in"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-purple-500 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Welcome to AI Agents!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Step {currentStep + 1} of {onboardingSteps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
              <StepIcon className="w-6 h-6 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          {/* Back button */}
          <Button
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            Back
          </Button>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {step.action && (
              <Button
                variant="default"
                size="md"
                onClick={handleAction}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {step.action}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {!step.action && (
              <Button
                variant="default"
                size="md"
                onClick={handleNext}
              >
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="md"
              onClick={handleSkip}
              className="text-slate-500 dark:text-slate-400"
            >
              Skip
            </Button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {onboardingSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                idx === currentStep
                  ? 'w-8 bg-purple-500'
                  : idx < currentStep
                  ? 'bg-purple-300 dark:bg-purple-700'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}

/**
 * Hook to check if onboarding should be shown
 */
export function useAgentOnboarding() {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    setShouldShow(!completed)
  }, [])

  return { shouldShow }
}

/**
 * Hook to reset onboarding (for testing/debugging)
 */
export function resetAgentOnboarding() {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY)
}
