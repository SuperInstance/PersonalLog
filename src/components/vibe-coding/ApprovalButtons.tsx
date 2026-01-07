'use client'

/**
 * ApprovalButtons Component
 *
 * Action buttons for approving, editing, or cancelling a generated agent.
 * Includes confirmation dialog before activation.
 */

import { useState } from 'react'
import { Check, Pencil, X, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import { memo } from 'react'

interface ApprovalButtonsProps {
  onActivate: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
  onStartOver?: () => void
  isActivating?: boolean
  className?: string
}

function ApprovalButtons({
  onActivate,
  onEdit,
  onCancel,
  onStartOver,
  isActivating = false,
  className = '',
}: ApprovalButtonsProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleActivateClick = () => {
    if (!showConfirm) {
      setShowConfirm(true)
    } else {
      onActivate()
    }
  }

  const handleCancelConfirm = () => {
    setShowConfirm(false)
  }

  if (showConfirm) {
    return (
      <div className={`approval-buttons-confirmation ${className}`}>
        {/* Confirmation Dialog */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-xl animate-scale-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Ready to activate your agent?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                This will add <strong>&quot;{isActivating ? 'your custom agent' : 'the agent'}&quot;</strong> to your available contacts.
                You can start conversations with it immediately.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Confirm activation */}
                <button
                  onClick={handleActivateClick}
                  disabled={isActivating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:transform-none hover:scale-105 active:scale-95"
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Yes, activate it!</span>
                    </>
                  )}
                </button>

                {/* Cancel confirmation */}
                <button
                  onClick={handleCancelConfirm}
                  disabled={isActivating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <X className="w-4 h-4" />
                  <span>Wait, let me review</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`approval-buttons ${className}`}>
      {/* Action buttons grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Primary: Activate Agent */}
        <button
          onClick={handleActivateClick}
          className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 animate-pulse-glow"
        >
          <Check className="w-5 h-5" strokeWidth={3} />
          <span>Activate Agent</span>
        </button>

        {/* Secondary: Edit */}
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
        >
          <Pencil className="w-4 h-4" />
          <span>Edit</span>
        </button>

        {/* Tertiary: Cancel */}
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Start Over (optional, secondary action) */}
      {onStartOver && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start over</span>
          </button>
        </div>
      )}

      {/* Info hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          💡 Tip: You can always edit your agent later or create multiple versions
        </p>
      </div>
    </div>
  )
}

/**
 * Memoized component to prevent unnecessary re-renders
 */
export default memo(ApprovalButtons, (prevProps, nextProps) => {
  return (
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onCancel === nextProps.onCancel &&
    prevProps.onStartOver === nextProps.onStartOver &&
    prevProps.isActivating === nextProps.isActivating &&
    prevProps.className === nextProps.className
  )
})
