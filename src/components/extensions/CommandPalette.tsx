'use client';

/**
 * Command Palette Extension Component
 *
 * Command palette that integrates with command extensions.
 * Provides keyboard shortcut access to commands.
 *
 * @module components/extensions/CommandPalette
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Command as CommandIcon } from 'lucide-react';
import { useCommands } from '@/hooks/useExtensions';
import type { CommandContext } from '@/lib/extensions/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  context?: Partial<CommandContext>;
}

export function CommandPalette({ isOpen, onClose, context = {} }: CommandPaletteProps) {
  const { commands, executeCommand } = useCommands();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [executing, setExecuting] = useState(false);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query) {
      return commands;
    }

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.category?.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, typeof commands> = {};

    for (const cmd of filteredCommands) {
      const category = cmd.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
    }

    return groups;
  }, [filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
          e.preventDefault();
        }
      }

      if (e.key === 'ArrowDown') {
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        await handleExecute(filteredCommands[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Execute command
  const handleExecute = async (command: typeof commands[0]) => {
    if (executing) return;

    setExecuting(true);
    try {
      const result = await executeCommand(command.id, {
        extensionId: command.id as any,
        args: {},
        ...context,
      } as CommandContext);

      if (result.success) {
        onClose();
        setQuery('');
      } else {
        console.error('Command failed:', result.error);
      }
    } catch (error) {
      console.error('Command error:', error);
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Commands */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4 last:mb-0">
                <div className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {category}
                </div>
                {cmds.map((cmd, idx) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleExecute(cmd)}
                      disabled={executing}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {cmd.icon && (
                        <span className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {/* TODO: Render icon by name */}
                          <CommandIcon className="w-5 h-5" />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{cmd.title}</div>
                        {cmd.description && (
                          <div
                            className={`text-sm truncate ${
                              isSelected ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.keybinding && (
                        <div
                          className={`flex gap-1 text-xs ${
                            isSelected ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {cmd.keybinding.split('+').map((key) => (
                            <kbd
                              key={key}
                              className={`px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-blue-600'
                                  : 'bg-slate-100 dark:bg-slate-800'
                              }`}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↑↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <div>{filteredCommands.length} commands</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Command palette trigger button
 */
export function CommandPaletteTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
    >
      <Search className="w-4 h-4" />
      <span>Search...</span>
      <div className="flex gap-1 ml-auto">
        <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">⌘</kbd>
        <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">K</kbd>
      </div>
    </button>
  );
}
