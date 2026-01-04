/**
 * Mobile Bottom Navigation
 *
 * Bottom navigation bar for mobile devices.
 * Provides easy thumb-accessible navigation with active state indicators.
 *
 * @module mobile/navigation
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MessageSquare,
  FileText,
  Brain,
  Settings,
  Sparkles,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  matchPattern?: string
}

const navItems: NavItem[] = [
  {
    href: '/messenger',
    label: 'Chat',
    icon: MessageSquare,
    matchPattern: '/messenger',
  },
  {
    href: '/longform',
    label: 'Write',
    icon: FileText,
    matchPattern: '/longform',
  },
  {
    href: '/knowledge',
    label: 'Knowledge',
    icon: Brain,
    matchPattern: '/knowledge',
  },
  {
    href: '/forum',
    label: 'Forum',
    icon: Sparkles,
    matchPattern: '/forum',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    matchPattern: '/settings',
  },
]

interface MobileBottomNavProps {
  className?: string
}

export function MobileBottomNav({ className = '' }: MobileBottomNavProps) {
  const pathname = usePathname()

  // Don't show on desktop
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    return null
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 pb-safe ${className}`}
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.matchPattern
            ? pathname.startsWith(item.matchPattern)
            : pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full relative transition-colors
                ${isActive
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-600'
                }
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 dark:bg-blue-400 rounded-b-full"
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <Icon
                className={`w-6 h-6 transition-transform ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />

              {/* Label */}
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? 'font-semibold' : 'font-normal'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Safe area padding for iOS */}
      <style jsx>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </nav>
  )
}
