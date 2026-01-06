/**
 * History Management Utility
 *
 * Provides undo/redo functionality for editors and other components
 * Maintains history stack and state management
 */

export interface HistoryEntry<T> {
  id: string;
  timestamp: number;
  action: string;
  description?: string;
  previous: T;
  current: T;
  type?: 'create' | 'update' | 'delete' | 'move';
}

export interface HistoryState<T> {
  history: HistoryEntry<T>[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface HistoryManager<T> {
  current: T;
  undo: () => T;
  redo: () => T;
  push: (current: T, action: string, description?: string, type?: HistoryEntry<T>['type']) => void;
  reset: () => void;
  getState: () => HistoryState<T>;
  clear: () => void;
  getHistory: () => HistoryEntry<T>[];
  jumpTo: (index: number) => void;
}

const MAX_HISTORY_SIZE = 100;

/**
 * Create history manager with undo/redo capabilities
 */
export function createHistoryManager<T>(
  initialState: T,
  onStateChange: (state: T) => void
): HistoryManager<T> {
  let history: HistoryEntry<T>[] = [{
    id: generateId(),
    timestamp: Date.now(),
    action: 'initial',
    description: 'Initial state',
    previous: initialState,
    current: initialState
  }];

  let currentIndex = 0;

  const updateCanUndoRedo = () => {
    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;
    return { canUndo, canRedo };
  };

  const getCurrent = (): T => {
    return history[currentIndex].current;
  };

  const undo = (): T => {
    if (!updateCanUndoRedo().canUndo) {
      return getCurrent();
    }

    currentIndex--;
    const current = getCurrent();
    onStateChange(current);
    return current;
  };

  const redo = (): T => {
    if (!updateCanUndoRedo().canRedo) {
      return getCurrent();
    }

    currentIndex++;
    const current = getCurrent();
    onStateChange(current);
    return current;
  };

  const push = (
    current: T,
    action: string,
    description?: string,
    type?: HistoryEntry<T>['type']
  ): void => {
    const previous = getCurrent();

    const entry: HistoryEntry<T> = {
      id: generateId(),
      timestamp: Date.now(),
      action,
      description,
      previous,
      current,
      type
    };

    // Remove any redo history after this point
    history = [...history.slice(0, currentIndex + 1), entry];

    // Limit history size
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(-MAX_HISTORY_SIZE);
    }

    currentIndex = history.length - 1;
    onStateChange(current);
  };

  const reset = (): void => {
    history = [{
      id: generateId(),
      timestamp: Date.now(),
      action: 'reset',
      description: 'History reset to initial state',
      previous: initialState,
      current: initialState
    }];

    currentIndex = 0;
    onStateChange(initialState);
  };

  const clear = (): void => {
    history = [{
      id: generateId(),
      timestamp: Date.now(),
      action: 'cleared',
      description: 'History cleared',
      previous: initialState,
      current: initialState
    }];

    currentIndex = 0;
    onStateChange(initialState);
  };

  const getHistory = (): HistoryEntry<T>[] => {
    return [...history];
  };

  const jumpTo = (index: number): void => {
    if (index < 0 || index >= history.length) {
      return;
    }

    currentIndex = index;
    const current = history[index].current;
    onStateChange(current);
  };

  return {
    current: getCurrent(),
    undo,
    redo,
    push,
    reset,
    clear,
    getState: () => ({
      history: getHistory(),
      currentIndex,
      ...updateCanUndoRedo()
    }),
    getHistory,
    jumpTo
  };
}

/**
 * Generate unique ID for history entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create history manager for notes with automatic persistence
 */
export function createNoteHistoryManager(
  noteId: string,
  initialState: string,
  onStateChange: (content: string) => void
): HistoryManager<string> {
  const manager = createHistoryManager<string>(initialState, (content) => {
    onStateChange(content);

    // Auto-save to local storage (debounced)
    debouncedSaveToLocalStorage(noteId, content);
  });

  return manager;
}

/**
 * Debounced local storage save function
 */
const saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

function debouncedSaveToLocalStorage(noteId: string, content: string): void {
  // Clear existing timeout
  if (saveTimeouts.has(noteId)) {
    clearTimeout(saveTimeouts.get(noteId));
  }

  // Set new timeout
  const timeout = setTimeout(() => {
    try {
      const saved = localStorage.getItem(`note_${noteId}`);
      const savedContent = saved ? JSON.parse(saved).content : '';

      if (content !== savedContent) {
        localStorage.setItem(`note_${noteId}`, JSON.stringify({
          content,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Failed to save note to localStorage:', error);
    }

    saveTimeouts.delete(noteId);
  }, 1000); // 1 second debounce

  saveTimeouts.set(noteId, timeout);
}

/**
 * Load note content from local storage
 */
export function loadNoteFromLocalStorage(noteId: string): string | null {
  try {
    const saved = localStorage.getItem(`note_${noteId}`);
    if (saved) {
      return JSON.parse(saved).content;
    }
    return null;
  } catch (error) {
    console.error('Failed to load note from localStorage:', error);
    return null;
  }
}

/**
 * Clear all note history from local storage
 */
export function clearAllNoteHistory(): void {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('note_'))
      .forEach(key => localStorage.removeItem(key));

    saveTimeouts.forEach(timeout => clearTimeout(timeout));
    saveTimeouts.clear();
  } catch (error) {
    console.error('Failed to clear note history:', error);
  }
}

/**
 * Get history statistics
 */
export function getHistoryStats<T>(history: HistoryEntry<T>[]): {
  totalActions: number;
  createActions: number;
  updateActions: number;
  deleteActions: number;
  timeRange: {
    first: number;
    last: number;
    duration: number;
  };
} {
  if (history.length === 0) {
    return {
      totalActions: 0,
      createActions: 0,
      updateActions: 0,
      deleteActions: 0,
      timeRange: {
        first: Date.now(),
        last: Date.now(),
        duration: 0
      }
    };
  }

  const createActions = history.filter(h => h.type === 'create').length;
  const updateActions = history.filter(h => h.type === 'update').length;
  const deleteActions = history.filter(h => h.type === 'delete').length;

  const firstTimestamp = history[0].timestamp;
  const lastTimestamp = history[history.length - 1].timestamp;
  const duration = lastTimestamp - firstTimestamp;

  return {
    totalActions: history.length,
    createActions,
    updateActions,
    deleteActions,
    timeRange: {
      first: firstTimestamp,
      last: lastTimestamp,
      duration
    }
  };
}

/**
 * Create keyboard shortcut manager
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
}

export function createShortcutManager(
  shortcuts: KeyboardShortcut[],
  onShortcut: (shortcut: KeyboardShortcut) => void
): {
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
} {
  const pressedKeys: Set<string> = new Set();

  const normalizeKey = (event: KeyboardEvent): string => {
    const modifiers = [];

    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('meta');

    return [...modifiers, event.key].join('+');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const normalizedKey = normalizeKey(event);
    pressedKeys.add(normalizedKey);

    // Find matching shortcut
    const shortcut = shortcuts.find(s => {
      const expectedModifiers = [];

      if (s.ctrl) expectedModifiers.push('ctrl');
      if (s.shift) expectedModifiers.push('shift');
      if (s.alt) expectedModifiers.push('alt');
      if (s.meta) expectedModifiers.push('meta');

      const actualModifiers = [];

      if (event.ctrlKey || event.metaKey) actualModifiers.push('ctrl');
      if (event.shiftKey) actualModifiers.push('shift');
      if (event.altKey) actualModifiers.push('alt');
      if (event.metaKey) actualModifiers.push('meta');

      return expectedModifiers.length === actualModifiers.length &&
             expectedModifiers.every(m => actualModifiers.includes(m)) &&
             s.key.toLowerCase() === event.key.toLowerCase();
    });

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      onShortcut(shortcut);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const normalizedKey = normalizeKey(event);
    pressedKeys.delete(normalizedKey);
  };

  return {
    handleKeyDown,
    handleKeyUp
  };
}

/**
 * Default keyboard shortcuts for common actions
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'z',
    ctrl: true,
    description: 'Undo last action'
  },
  {
    key: 'y',
    ctrl: true,
    description: 'Redo last action'
  },
  {
    key: 's',
    ctrl: true,
    description: 'Save current state'
  },
  {
    key: 'f',
    ctrl: true,
    description: 'Find in current document'
  },
  {
    key: 'a',
    ctrl: true,
    description: 'Select all'
  },
  {
    key: 'c',
    ctrl: true,
    description: 'Copy selected content'
  },
  {
    key: 'v',
    ctrl: true,
    description: 'Paste content'
  },
  {
    key: 'n',
    ctrl: true,
    description: 'Create new item'
  },
  {
    key: 'd',
    ctrl: true,
    description: 'Delete selected item'
  },
  {
    key: 'Escape',
    description: 'Cancel current action'
  },
  {
    key: 'Enter',
    description: 'Confirm action'
  },
  {
    key: 'Space',
    alt: true,
    description: 'Preview'
  }
];
