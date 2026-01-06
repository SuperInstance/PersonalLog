/**
 * App Navigation Component
 *
 * Provides navigation between main sections of PersonalLog.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageSquare,
  FileText,
  Settings,
  Brain,
  Sparkles,
  Menu,
  X,
  Mic,
  Store,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  description: string
}

const navItems: NavItem[] = [
  {
    href: '/messenger',
    label: 'Messenger',
    icon: MessageSquare,
    description: 'Chat with AI contacts',
  },
  {
    href: '/longform',
    label: 'Long-form',
    icon: FileText,
    description: 'Extended conversations',
  },
  {
    href: '/knowledge',
    label: 'Knowledge',
    icon: Brain,
    description: 'Browse and edit knowledge base',
  },
  {
    href: '/marketplace',
    label: 'Marketplace',
    icon: Store,
    description: 'Discover and install agents',
  },
  {
    href: '/jepa',
    label: 'JEPA',
    icon: Mic,
    description: 'Audio transcription (Beta)',
  },
  {
    href: '/setup',
    label: 'Setup',
    icon: Settings,
    description: 'Configure AI models and contacts',
  },
  {
    href: '/forum',
    label: 'Forum',
    icon: Sparkles,
    description: 'Self-populated discussions',
  },
]

export function AppNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Desktop Nav */}
      <nav
        className="hidden md:flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
        role="navigation"
        aria-label="Main navigation"
        id="main-navigation"
      >
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center" aria-hidden="true">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">PersonalLog</span>
        </div>

        <div className="flex items-center gap-1" role="menubar">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }
                `}
                title={item.description}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex-1" />
      </nav>

      {/* Mobile Nav */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center" aria-hidden="true">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">PersonalLog</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -mr-2 text-slate-600 dark:text-slate-400"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
            id="mobile-menu"
            role="menu"
          >
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400'
                    }
                  `}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
