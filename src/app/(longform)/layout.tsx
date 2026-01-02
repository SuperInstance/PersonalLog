/**
 * Long-Form Layout
 *
 * Layout for long-form, detailed conversation view.
 */

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Settings } from 'lucide-react'

export default function LongFormLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/messenger"
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to messenger</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Long-form view</span>
              <MessageSquare className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}
