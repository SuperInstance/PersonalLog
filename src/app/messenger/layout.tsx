/**
 * Messenger Layout
 *
 * Main layout for the messenger-style interface.
 * Includes sidebar for conversations and AI contacts, and main chat area.
 */

import { ReactNode } from 'react'

export default function MessengerLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen bg-white dark:bg-slate-950">
      {children}
    </div>
  )
}
