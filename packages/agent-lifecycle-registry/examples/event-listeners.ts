/**
 * Event Listeners Example
 *
 * This example demonstrates how to listen to agent lifecycle events.
 */

import {
  agentRegistry,
  AgentRegistryEventType,
  AgentCategory,
  ActivationMode,
  AgentState,
  type AgentRegistryEvent,
} from '@superinstance/agent-lifecycle-registry';

function main() {
  console.log('=== Event Listeners Example ===\n');

  // 1. Listen to agent registration events
  console.log('1. Setting up event listeners...\n');

  agentRegistry.addEventListener(
    AgentRegistryEventType.AGENT_REGISTERED,
    (event: AgentRegistryEvent) => {
      console.log(`📝 Agent Registered:`);
      console.log(`   ID: ${event.agentId}`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
      if (event.data?.definition) {
        const def = event.data.definition as any;
        console.log(`   Name: ${def.name}`);
        console.log(`   Category: ${def.category}`);
      }
      console.log('');
    }
  );

  // 2. Listen to agent activation events
  agentRegistry.addEventListener(
    AgentRegistryEventType.AGENT_ACTIVATED,
    (event: AgentRegistryEvent) => {
      console.log(`▶️  Agent Activated:`);
      console.log(`   ID: ${event.agentId}`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
      if (event.data?.state) {
        const state = event.data.state as any;
        console.log(`   Status: ${state.status}`);
        console.log(`   Confidence: ${state.confidence}`);
      }
      console.log('');
    }
  );

  // 3. Listen to state change events
  agentRegistry.addEventListener(
    AgentRegistryEventType.AGENT_STATE_CHANGED,
    (event: AgentRegistryEvent) => {
      console.log(`🔄 Agent State Changed:`);
      console.log(`   ID: ${event.agentId}`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
      if (event.data?.state) {
        const state = event.data.state as any;
        console.log(`   New Status: ${state.status}`);
        console.log(`   Confidence: ${state.confidence}`);
        if (state.customData) {
          console.log(`   Custom Data:`, state.customData);
        }
      }
      console.log('');
    }
  );

  // 4. Listen to deactivation events
  agentRegistry.addEventListener(
    AgentRegistryEventType.AGENT_DEACTIVATED,
    (event: AgentRegistryEvent) => {
      console.log(`⏸️  Agent Deactivated:`);
      console.log(`   ID: ${event.agentId}`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
      console.log('');
    }
  );

  // 5. Listen to unregistration events
  agentRegistry.addEventListener(
    AgentRegistryEventType.AGENT_UNREGISTERED,
    (event: AgentRegistryEvent) => {
      console.log(`🗑️  Agent Unregistered:`);
      console.log(`   ID: ${event.agentId}`);
      console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);
      console.log('');
    }
  );

  // Now trigger some events to demonstrate

  console.log('2. Registering agents (should trigger AGENT_REGISTERED events)...\n');

  agentRegistry.registerAgent({
    id: 'event-demo-v1',
    name: 'Event Demo Agent',
    description: 'Demonstrates event handling',
    icon: '🎪',
    category: AgentCategory.CUSTOM,
    activationMode: ActivationMode.FOREGROUND,
    initialState: {
      status: AgentState.IDLE,
      confidence: 0.5,
    },
    metadata: {
      version: '1.0.0',
      author: 'Event Demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['demo', 'events'],
    },
  });

  agentRegistry.registerAgent({
    id: 'processor-v1',
    name: 'Data Processor',
    description: 'Processes data events',
    icon: '⚙️',
    category: AgentCategory.AUTOMATION,
    activationMode: ActivationMode.BACKGROUND,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '1.0.0',
      author: 'Event Demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['processing', 'automation'],
    },
  });

  console.log('\n3. Activating agents (should trigger AGENT_ACTIVATED events)...\n');

  agentRegistry.activateAgent('event-demo-v1');
  agentRegistry.activateAgent('processor-v1');

  console.log('\n4. Updating agent state (should trigger AGENT_STATE_CHANGED events)...\n');

  agentRegistry.updateAgentState('event-demo-v1', {
    confidence: 0.85,
    customData: { eventCount: 1 },
  });

  agentRegistry.updateAgentState('event-demo-v1', {
    confidence: 0.95,
    customData: { eventCount: 2, lastEvent: 'state_update' },
  });

  console.log('\n5. Deactivating agents (should trigger AGENT_DEACTIVATED events)...\n');

  agentRegistry.deactivateAgent('processor-v1');
  agentRegistry.deactivateAgent('event-demo-v1');

  console.log('\n6. Unregistering agents (should trigger AGENT_UNREGISTERED events)...\n');

  agentRegistry.unregisterAgent('event-demo-v1');
  agentRegistry.unregisterAgent('processor-v1');

  console.log('=== Event Listeners Example Complete ===');
}

// Run the example
main();
