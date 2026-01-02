'use client'

/**
 * Complete Step
 *
 * Final step showing success and the created contact.
 */

import { Check, Sparkles } from 'lucide-react'
import { type AIContact } from '@/lib/wizard/models'

interface CompleteStepProps {
  contactId: string | null
  contacts: AIContact[]
  onDone: () => void
  onCreateAnother: () => void
}

export function CompleteStep({
  contactId,
  contacts,
  onDone,
  onCreateAnother,
}: CompleteStepProps) {
  const contact = contacts.find(c => c.id === contactId)

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        AI Contact Created!
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        {contact?.nickname} is ready to join your conversations
      </p>

      {/* Contact Card */}
      {contact && (
        <div className="max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 mb-8">
          <div className={`w-16 h-16 rounded-full ${contact.color} flex items-center justify-center text-2xl mx-auto mb-3`}>
            {contact.firstName[0]}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {contact.nickname}
          </h3>
          <p className="text-sm text-slate-500">
            "{contact.firstName}"
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onCreateAnother}
          className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Add Another Contact
        </button>
        <button
          onClick={onDone}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2"
        >
          Go to Messenger
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
