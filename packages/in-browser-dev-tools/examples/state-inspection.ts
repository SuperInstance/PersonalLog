/**
 * Example: State Inspection
 *
 * Demonstrates state inspection, snapshotting, and diffing capabilities.
 */

import {
  stateInspector,
  registerInspector,
  inspectState,
  takeSnapshot,
  StateInspector,
  StateScope
} from '@superinstance/in-browser-dev-tools';

// Sample application state
interface AppState {
  user: {
    id: string;
    name: string;
    email: string;
  };
  settings: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  route: {
    path: string;
    params: Record<string, string>;
  };
}

// Create a simple state manager
class StateManager implements StateInspector {
  scope: StateScope = 'app';
  identifier = 'main-app';

  private state: AppState = {
    user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    settings: { theme: 'light', language: 'en', notifications: true },
    route: { path: '/dashboard', params: {} }
  };

  async getState(): Promise<AppState> {
    return { ...this.state };
  }

  async setState(value: Partial<AppState>): Promise<void> {
    this.state = { ...this.state, ...value };
  }

  async getKeys(): Promise<string[]> {
    return Object.keys(this.state);
  }

  // Helper methods
  updateUser(user: Partial<AppState['user']>) {
    this.state.user = { ...this.state.user, ...user };
  }

  updateSettings(settings: Partial<AppState['settings']>) {
    this.state.settings = { ...this.state.settings, ...settings };
  }

  updateRoute(route: Partial<AppState['route']>) {
    this.state.route = { ...this.state.route, ...route };
  }
}

// Register and inspect state
function demonstrateBasicInspection() {
  console.log('=== Basic State Inspection Demo ===\n');

  const stateManager = new StateManager();

  // Register inspector
  registerInspector('app-state', stateManager);

  // Inspect state
  inspectState('app-state').then((state) => {
    console.log('Current state:', JSON.stringify(state, null, 2));
  });
}

// Snapshotting state
async function demonstrateSnapshots() {
  console.log('\n=== State Snapshot Demo ===\n');

  const stateManager = new StateManager();
  registerInspector('app-state', stateManager);

  // Take initial snapshot
  const snapshot1 = await takeSnapshot('app-state');
  console.log('Snapshot 1:', snapshot1.id);
  console.log('State:', JSON.stringify(snapshot1.value, null, 2));

  // Modify state
  stateManager.updateUser({ name: 'Jane Doe' });
  stateManager.updateSettings({ theme: 'dark' });

  console.log('\nState modified');

  // Take second snapshot
  const snapshot2 = await takeSnapshot('app-state');
  console.log('Snapshot 2:', snapshot2.id);
  console.log('State:', JSON.stringify(snapshot2.value, null, 2));

  // Compare snapshots
  const diffs = stateInspector.compareSnapshots(snapshot1.id, snapshot2.id);
  console.log('\nDiffs:', diffs.length);
  diffs.forEach((diff) => {
    console.log(`  ${diff.path}: ${diff.type}`);
    console.log(`    Old:`, JSON.stringify(diff.oldValue));
    console.log(`    New:`, JSON.stringify(diff.newValue));
  });
}

// Multiple state inspectors
function demonstrateMultipleInspectors() {
  console.log('\n=== Multiple State Inspectors Demo ===\n');

  // Register multiple inspectors
  const appState = new StateManager();
  registerInspector('app-state', appState);

  const pluginState = new StateManager();
  pluginState.identifier = 'plugin-a';
  registerInspector('plugin-state', pluginState);

  // Get all states
  stateInspector.inspectAllStates().then((states) => {
    console.log('All states:');
    Object.entries(states).forEach(([id, state]) => {
      console.log(`  ${id}:`, state);
    });
  });

  // Get inspectors by scope
  const appInspectors = stateInspector.getInspectorsByScope('app');
  console.log(`\nFound ${appInspectors.length} app scope inspectors`);
}

// State restoration
async function demonstrateRestoration() {
  console.log('\n=== State Restoration Demo ===\n');

  const stateManager = new StateManager();
  registerInspector('app-state', stateManager);

  // Take snapshot
  const snapshot = await takeSnapshot('app-state');
  console.log('Original state:', snapshot.value);

  // Modify state
  stateManager.updateUser({ name: 'Modified User' });
  stateManager.updateSettings({ theme: 'dark' });

  const currentState = await stateManager.getState();
  console.log('Modified state:', currentState);

  // Restore from snapshot
  await stateInspector.restoreFromSnapshot(snapshot.id);

  const restoredState = await stateManager.getState();
  console.log('Restored state:', restoredState);
}

// Snapshot management
async function demonstrateSnapshotManagement() {
  console.log('\n=== Snapshot Management Demo ===\n');

  const stateManager = new StateManager();
  registerInspector('app-state', stateManager);

  // Take multiple snapshots
  for (let i = 0; i < 5; i++) {
    stateManager.updateUser({ name: `User ${i}` });
    await takeSnapshot('app-state');
  }

  // Get all snapshots
  const snapshots = stateInspector.getSnapshots();
  console.log(`Total snapshots: ${snapshots.length}`);

  // Get snapshots by scope
  const appSnapshots = stateInspector.getSnapshotsByScope('app');
  console.log(`App scope snapshots: ${appSnapshots.length}`);

  // Get snapshots by key
  const keySnapshots = stateInspector.getSnapshotsByKey('app-state');
  console.log(`App-state snapshots: ${keySnapshots.length}`);

  // Clear snapshots
  stateInspector.clearSnapshots();
  console.log('Snapshots cleared');
}

// Manual diffing
function demonstrateManualDiffing() {
  console.log('\n=== Manual State Diffing Demo ===\n');

  const oldState = {
    user: { id: '1', name: 'John', email: 'john@example.com' },
    settings: { theme: 'light', language: 'en' }
  };

  const newState = {
    user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    settings: { theme: 'dark', language: 'en' }
  };

  const diffs = stateInspector.compare(oldState, newState);

  console.log('Diffs found:', diffs.length);
  diffs.forEach((diff) => {
    console.log(`  ${diff.path}: ${diff.type}`);
    if (diff.type === 'modified') {
      console.log(`    Old:`, diff.oldValue);
      console.log(`    New:`, diff.newValue);
    }
  });
}

// Complex state diffing
function demonstrateComplexDiffing() {
  console.log('\n=== Complex State Diffing Demo ===\n');

  const oldState = {
    items: [
      { id: 1, name: 'Item 1', active: true },
      { id: 2, name: 'Item 2', active: false },
    ],
    metadata: { version: 1, tags: ['a', 'b'] }
  };

  const newState = {
    items: [
      { id: 1, name: 'Item 1', active: true },
      { id: 2, name: 'Item 2 Updated', active: true },
      { id: 3, name: 'Item 3', active: true },
    ],
    metadata: { version: 2, tags: ['a', 'b', 'c'] }
  };

  const diffs = stateInspector.compare(oldState, newState);

  console.log('Complex diffs found:', diffs.length);
  diffs.forEach((diff) => {
    console.log(`  ${diff.path}: ${diff.type}`);
  });
}

// Run all demonstrations
async function main() {
  demonstrateBasicInspection();
  await demonstrateSnapshots();
  demonstrateMultipleInspectors();
  await demonstrateRestoration();
  await demonstrateSnapshotManagement();
  demonstrateManualDiffing();
  demonstrateComplexDiffing();

  console.log('\n=== Demo Complete ===');
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateBasicInspection,
  demonstrateSnapshots,
  demonstrateMultipleInspectors,
  demonstrateRestoration,
  demonstrateSnapshotManagement,
  demonstrateManualDiffing,
  demonstrateComplexDiffing,
};
