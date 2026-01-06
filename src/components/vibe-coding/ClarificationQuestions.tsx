'use client'

/**
 * ClarificationQuestions Component
 *
 * Displays clarification questions from the AI in a clean, readable format.
 * Shows numbered questions with optional hints and examples.
 */

import { memo } from 'react'

interface ClarificationQuestion {
  number: number
  question: string
  hint?: string
  examples?: string[]
}

interface ClarificationQuestionsProps {
  questions: string[]
  className?: string
}

function ClarificationQuestions({ questions, className = '' }: ClarificationQuestionsProps) {
  if (!questions || questions.length === 0) {
    return null
  }

  // Convert string questions to ClarificationQuestion format
  const questionObjects: ClarificationQuestion[] = questions.map((q, idx) => ({
    number: idx + 1,
    question: q,
  }))

  return (
    <div className={`clarification-questions ${className}`}>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        <span className="text-blue-500" aria-hidden="true">💭</span>
        <span>I need to understand a few things:</span>
      </h4>

      <div className="space-y-3">
        {questionObjects.map((q) => (
          <QuestionCard key={q.number} question={q} />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual question card component
 */
interface QuestionCardProps {
  question: ClarificationQuestion
}

function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="question-card group relative bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 animate-fade-in">
      {/* Question number badge */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
          {question.number}
        </div>

        <div className="flex-1 min-w-0">
          {/* Question text */}
          <p className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
            {question.question}
          </p>

          {/* Hint/example (if provided) */}
          {question.hint && (
            <div className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
              <span className="text-blue-500 flex-shrink-0" aria-hidden="true">
                💡
              </span>
              <span>{question.hint}</span>
            </div>
          )}

          {/* Examples (if provided) */}
          {question.examples && question.examples.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-500 font-medium px-1">
                Example answers:
              </p>
              {question.examples.map((example, idx) => (
                <div
                  key={idx}
                  className="text-sm text-slate-600 dark:text-slate-400 bg-white/30 dark:bg-slate-800/30 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700"
                >
                  "{example}"
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Memoized component to prevent unnecessary re-renders
 */
export default memo(ClarificationQuestions, (prevProps, nextProps) => {
  // Only re-render if questions array reference or content changes
  return (
    prevProps.questions === nextProps.questions &&
    prevProps.className === nextProps.className
  )
})
