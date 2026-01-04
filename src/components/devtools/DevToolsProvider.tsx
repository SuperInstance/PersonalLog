/**
 * DevTools Provider - Integration Provider for Developer Tools
 *
 * Integrates DevTools with plugin system, theme system, and app state.
 * Provides state inspection capabilities for all major systems.
 *
 * @component components/devtools/DevToolsProvider
 */

'use client';

import React, { useEffect } from 'react';
import { DevToolsPanel } from './DevToolsPanel';
import { stateInspector, registerInspector, type StateInspector } from '../../lib/devtools/state';
import { logger } from '../../lib/devtools/logger';
import { getPluginManager } from '../../lib/plugin/manager';
import { getThemeRegistry } from '../../lib/theme/registry';
import type { PluginId } from '../../lib/plugin/types';
import type { ThemeId } from '../../lib/theme/types';

interface DevToolsProviderProps {
  children: React.ReactNode;
  /** Enable DevTools in production (default: false) */
  enableInProduction?: boolean;
  /** Show by default (default: false) */
  defaultOpen?: boolean;
}

/**
 * DevTools Provider Component
 *
 * Wraps the app and provides comprehensive debugging capabilities.
 */
export function DevToolsProvider({
  children,
  enableInProduction = false,
  defaultOpen = false,
}: DevToolsProviderProps) {
  // Check if DevTools should be enabled
  const isEnabled = enableInProduction || process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isEnabled) return;

    logger.info('DevTools initializing', {}, 'system', 'DevToolsProvider');

    // Register plugin state inspector
    const registerPluginInspector = async () => {
      try {
        const pluginManager = getPluginManager();

        const inspector: StateInspector = {
          scope: 'plugin',
          identifier: 'plugins',
          async getState() {
            const plugins = await pluginManager.getInstalledPlugins();
            const states: Record<string, any> = {};

            for (const plugin of plugins) {
              const state = await pluginManager.getPluginState(plugin.id);
              if (state) {
                states[plugin.id] = {
                  manifest: plugin,
                  runtime: state,
                };
              }
            }

            return states;
          },
          async setState(value) {
            // Plugin state is mostly read-only through DevTools
            logger.warn('Cannot set plugin state through DevTools', {}, 'plugin', 'DevToolsProvider');
          },
          getKeys() {
            return pluginManager.getInstalledPlugins().then((plugins) =>
              plugins.map((p) => p.id)
            );
          },
        };

        registerInspector('plugins', inspector);
        logger.info('Plugin state inspector registered', {}, 'plugin', 'DevToolsProvider');
      } catch (error) {
        logger.error('Failed to register plugin inspector', { error }, 'plugin', 'DevToolsProvider', error as Error);
      }
    };

    // Register theme state inspector
    const registerThemeInspector = async () => {
      try {
        const themeRegistry = getThemeRegistry();

        const inspector: StateInspector = {
          scope: 'theme',
          identifier: 'themes',
          async getState() {
            const themes = themeRegistry.getAllThemes();
            const activeTheme = themeRegistry.getActiveTheme();

            return {
              allThemes: themes,
              activeTheme: activeTheme?.metadata?.id || null,
              settings: await themeRegistry.getSettings(),
            };
          },
          getKeys() {
            const themes = themeRegistry.getAllThemes();
            return Promise.resolve(themes.map((t) => t.metadata.id));
          },
        };

        registerInspector('themes', inspector);
        logger.info('Theme state inspector registered', {}, 'theme', 'DevToolsProvider');
      } catch (error) {
        logger.error('Failed to register theme inspector', { error }, 'theme', 'DevToolsProvider', error as Error);
      }
    };

    // Register app state inspector
    const registerAppStateInspector = () => {
      try {
        const inspector: StateInspector = {
          scope: 'app',
          identifier: 'app',
          async getState() {
            return {
              url: window.location.href,
              userAgent: navigator.userAgent,
              language: navigator.language,
              cookieEnabled: navigator.cookieEnabled,
              onLine: navigator.onLine,
              platform: navigator.platform,
              timestamp: Date.now(),
            };
          },
        };

        registerInspector('app', inspector);
        logger.info('App state inspector registered', {}, 'system', 'DevToolsProvider');
      } catch (error) {
        logger.error('Failed to register app inspector', { error }, 'system', 'DevToolsProvider', error as Error);
      }
    };

    // Initialize inspectors
    registerPluginInspector();
    registerThemeInspector();
    registerAppStateInspector();

    logger.info('DevTools initialized successfully', {}, 'system', 'DevToolsProvider');
  }, [isEnabled]);

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <DevToolsPanel defaultOpen={defaultOpen} showToggle={true} />
    </>
  );
}

/**
 * Hook to access DevTools programmatically
 */
export function useDevTools() {
  return {
    logger,
    stateInspector,
    isEnabled: process.env.NODE_ENV === 'development',
  };
}
