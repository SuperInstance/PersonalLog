/**
 * App Providers
 *
 * Combined provider wrapper for easy composition.
 * Wraps all providers in the correct order with proper nesting.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { AppProviders } from '@/components/providers'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AppProviders>
 *           {children}
 *         </AppProviders>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */

'use client'

import React from 'react'
import { IntegrationProvider } from './IntegrationProvider'
import { AnalyticsProvider } from './AnalyticsProvider'
import { ExperimentsProvider } from './ExperimentsProvider'
import { OptimizationProvider } from './OptimizationProvider'
import { PersonalizationProvider } from './PersonalizationProvider'
import { ExtensionProvider } from './ExtensionProvider'
import type { ProvidersConfig } from './types'

export interface AppProvidersProps {
  /** Children components */
  children: React.ReactNode

  /** Provider configuration */
  config?: ProvidersConfig

  /** Show initialization loader */
  showLoader?: boolean

  /** Initialization timeout in ms */
  initTimeout?: number
}

/**
 * Combined App Providers Component
 *
 * Wraps all providers in the optimal nesting order.
 * Providers are nested from outermost to innermost:
 *
 * 1. Integration - hardware capabilities (foundational)
 * 2. Analytics - usage tracking (needs integration)
 * 3. Experiments - A/B testing (needs analytics)
 * 4. Optimization - performance (needs integration + analytics)
 * 5. Personalization - user preferences (needs all above)
 * 6. Extension - plugin extensions (needs all above)
 */
export function AppProviders({
  children,
  config,
  showLoader = true,
  initTimeout = 5000,
}: AppProvidersProps) {
  // Extract configs for each provider
  const integrationConfig = config?.integration
  const analyticsConfig = config?.analytics
  const experimentsConfig = config?.experiments
  const optimizationConfig = config?.optimization
  const personalizationConfig = config?.personalization

  // If loader is disabled, just render providers
  if (!showLoader) {
    return (
      <IntegrationProvider config={integrationConfig}>
        <AnalyticsProvider config={analyticsConfig}>
          <ExperimentsProvider config={experimentsConfig}>
            <OptimizationProvider config={optimizationConfig}>
              <PersonalizationProvider config={personalizationConfig}>
                <ExtensionProvider>
                  {children}
                </ExtensionProvider>
              </PersonalizationProvider>
            </OptimizationProvider>
          </ExperimentsProvider>
        </AnalyticsProvider>
      </IntegrationProvider>
    )
  }

  // Otherwise, wrap with InitializationLoader
  const { InitializationLoader } = require('./InitializationLoader')

  return (
    <IntegrationProvider config={integrationConfig}>
      <AnalyticsProvider config={analyticsConfig}>
        <ExperimentsProvider config={experimentsConfig}>
          <OptimizationProvider config={optimizationConfig}>
            <PersonalizationProvider config={personalizationConfig}>
              <ExtensionProvider>
                <InitializationLoader
                  timeout={initTimeout}
                  fallbackOnTimeout={config?.initialization?.fallbackOnTimeout ?? true}
                  showProgress={config?.initialization?.showLoader ?? true}
                >
                  {children}
                </InitializationLoader>
              </ExtensionProvider>
            </PersonalizationProvider>
          </OptimizationProvider>
        </ExperimentsProvider>
      </AnalyticsProvider>
    </IntegrationProvider>
  )
}

/**
 * Simplified version without loader
 *
 * Use this if you want to handle loading state yourself.
 */
export function AppProvidersNoLoader({ children, config }: Omit<AppProvidersProps, 'showLoader' | 'initTimeout'>) {
  const integrationConfig = config?.integration
  const analyticsConfig = config?.analytics
  const experimentsConfig = config?.experiments
  const optimizationConfig = config?.optimization
  const personalizationConfig = config?.personalization

  return (
    <IntegrationProvider config={integrationConfig}>
      <AnalyticsProvider config={analyticsConfig}>
        <ExperimentsProvider config={experimentsConfig}>
          <OptimizationProvider config={optimizationConfig}>
            <PersonalizationProvider config={personalizationConfig}>
              <ExtensionProvider>
                {children}
              </ExtensionProvider>
            </PersonalizationProvider>
          </OptimizationProvider>
        </ExperimentsProvider>
      </AnalyticsProvider>
    </IntegrationProvider>
  )
}

/**
 * Minimal version with only core providers
 *
 * Use this for faster initial load, lazy-load other providers later.
 */
export function CoreProviders({ children, config }: Omit<AppProvidersProps, 'showLoader' | 'initTimeout'>) {
  const integrationConfig = config?.integration
  const analyticsConfig = config?.analytics

  return (
    <IntegrationProvider config={integrationConfig}>
      <AnalyticsProvider config={analyticsConfig}>
        <ExtensionProvider>
          {children}
        </ExtensionProvider>
      </AnalyticsProvider>
    </IntegrationProvider>
  )
}

export default AppProviders
