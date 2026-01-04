'use client';

/**
 * Extension Provider
 *
 * React context provider for extension system.
 * Makes extensions available throughout the app.
 *
 * @module components/providers/ExtensionProvider
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getExtensionManager } from '@/lib/extensions/manager';
import type {
  Extension,
  ExtensionPoint,
  ExtensionRegistryEntry,
  Message,
  CommandContext,
  CommandResult,
} from '@/lib/extensions/types';

// ============================================================================
// CONTEXT
// ============================================================================

interface ExtensionContextValue {
  // Extensions
  extensions: ExtensionRegistryEntry[];
  getExtensionsByPoint: (point: ExtensionPoint) => Extension[];

  // Commands
  commands: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    keybinding?: string;
    category?: string;
  }>;
  executeCommand: (commandId: string, context: CommandContext) => Promise<CommandResult>;

  // Messages
  processMessage: (message: Message, context: any) => Promise<Message>;
  filterMessage: (message: Message, context: any) => Promise<boolean>;
  enrichMessage: (message: Message, context: any) => Promise<Record<string, any>>;

  // Data
  exportFormats: Array<{ id: string; name: string; extension: string }>;
  importSources: Array<{ id: string; name: string; formats: string[] }>;
  aiProviders: Array<{ id: string; name: string; type: string; models: string[] }>;

  // Lifecycle
  refresh: () => void;

  // Loading
  loading: boolean;
}

const ExtensionContext = createContext<ExtensionContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ExtensionProviderProps {
  children: ReactNode;
}

export function ExtensionProvider({ children }: ExtensionProviderProps) {
  const [extensions, setExtensions] = useState<ExtensionRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const manager = getExtensionManager();

  // Refresh extensions from registry
  const refresh = useCallback(() => {
    const allExtensions = manager.getAll();
    setExtensions(allExtensions);
    setLoading(false);
  }, [manager]);

  // Initialize
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Get extensions by point
  const getExtensionsByPoint = useCallback(
    (point: ExtensionPoint): Extension[] => {
      return manager.getByPoint(point).map((e) => e.extension);
    },
    [manager]
  );

  // Get commands
  const commands = useCallback(() => {
    return manager.getCommands();
  }, [manager]);

  // Execute command
  const executeCommand = useCallback(
    async (commandId: string, context: CommandContext): Promise<CommandResult> => {
      return await manager.executeCommandById(commandId, context);
    },
    [manager]
  );

  // Process message
  const processMessage = useCallback(
    async (message: Message, context: any): Promise<Message> => {
      return await manager.processMessage(message, context);
    },
    [manager]
  );

  // Filter message
  const filterMessage = useCallback(
    async (message: Message, context: any): Promise<boolean> => {
      return await manager.filterMessage(message, context);
    },
    [manager]
  );

  // Enrich message
  const enrichMessage = useCallback(
    async (message: Message, context: any): Promise<Record<string, any>> => {
      return await manager.enrichMessage(message, context);
    },
    [manager]
  );

  // Get export formats
  const exportFormats = useCallback(() => {
    return manager.getExportFormats();
  }, [manager]);

  // Get import sources
  const importSources = useCallback(() => {
    return manager.getImportSources();
  }, [manager]);

  // Get AI providers
  const aiProviders = useCallback(() => {
    return manager.getAIProviders();
  }, [manager]);

  // Context value
  const value: ExtensionContextValue = {
    extensions,
    getExtensionsByPoint,
    commands: commands(),
    executeCommand,
    processMessage,
    filterMessage,
    enrichMessage,
    exportFormats: exportFormats(),
    importSources: importSources(),
    aiProviders: aiProviders(),
    refresh,
    loading,
  };

  return <ExtensionContext.Provider value={value}>{children}</ExtensionContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Use extension context
 */
export function useExtensions() {
  const context = useContext(ExtensionContext);

  if (!context) {
    throw new Error('useExtensions must be used within ExtensionProvider');
  }

  return context;
}

/**
 * Use extensions by point
 */
export function useExtensionsByPoint(point: ExtensionPoint): Extension[] {
  const { getExtensionsByPoint } = useExtensions();
  return getExtensionsByPoint(point);
}

/**
 * Use commands
 */
export function useCommands() {
  const { commands, executeCommand } = useExtensions();
  return { commands, executeCommand };
}

/**
 * Use message extensions
 */
export function useMessageExtensions() {
  const { processMessage, filterMessage, enrichMessage } = useExtensions();
  return { processMessage, filterMessage, enrichMessage };
}

/**
 * Use data extensions
 */
export function useDataExtensions() {
  const { exportFormats, importSources } = useExtensions();
  return { exportFormats, importSources };
}

/**
 * Use AI provider extensions
 */
export function useAIProviderExtensions() {
  const { aiProviders } = useExtensions();
  return { aiProviders };
}
