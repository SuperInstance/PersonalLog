'use client'

/**
 * Contact Step
 *
 * Third step where users customize their AI contact's personality.
 */

import { User, Sparkles } from 'lucide-react'

interface ContactForm {
  nickname: string
  firstName: string
  systemPrompt: string
  responseStyle: 'brief' | 'balanced' | 'detailed'
  temperature: number
  color: string
}

interface ContactStepProps {
  contactForm: ContactForm
  onChange: (form: ContactForm) => void
  onNext: () => void
  onBack: () => void
}

export function ContactStep({
  contactForm,
  onChange,
  onNext,
  onBack,
}: ContactStepProps) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500', 'bg-orange-500',
    'bg-amber-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-slate-600',
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className={`w-16 h-16 rounded-full ${contactForm.color} flex items-center justify-center mx-auto mb-3`}>
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create AI Contact
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Customize the personality of your AI assistant
        </p>
      </div>

      {/* Nickname */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Nickname
        </label>
        <input
          type="text"
          value={contactForm.nickname}
          onChange={(e) => onChange({ ...contactForm, nickname: e.target.value })}
          placeholder="e.g., Research Assistant"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* First Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          First Name
        </label>
        <input
          type="text"
          value={contactForm.firstName}
          onChange={(e) => onChange({ ...contactForm, firstName: e.target.value })}
          placeholder="e.g., Alex"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Short name to call into conversations
        </p>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Avatar Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onChange({ ...contactForm, color })}
              className={`w-10 h-10 rounded-full ${color} transition-transform hover:scale-110 ${
                contactForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Response Style */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Response Style
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['brief', 'balanced', 'detailed'] as const).map(style => (
            <button
              key={style}
              onClick={() => onChange({ ...contactForm, responseStyle: style })}
              className={`p-3 rounded-xl border-2 transition-all capitalize ${
                contactForm.responseStyle === style
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          System Prompt
        </label>
        <textarea
          value={contactForm.systemPrompt}
          onChange={(e) => onChange({ ...contactForm, systemPrompt: e.target.value })}
          placeholder="You are a helpful AI assistant..."
          rows={4}
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Define how this AI should behave. You can also vibe-fine-tune this later in conversations.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!contactForm.nickname}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        >
          Create Contact
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
