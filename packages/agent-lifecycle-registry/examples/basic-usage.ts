/**
 * Basic Usage Example
 *
 * This example demonstrates basic agent registration and management.
 */

import {
  agentRegistry,
  AgentCategory,
  ActivationMode,
  AgentState,
} from '@superinstance/agent-lifecycle-registry';

async function main() {
  console.log('=== Agent Lifecycle Registry - Basic Usage ===\n');

  // 1. Register a custom agent
  console.log('1. Registering a custom agent...');
  agentRegistry.registerAgent({
    id: 'text-analyzer-v1',
    name: 'Text Analyzer',
    description: 'Analyzes text for sentiment and key topics',
    icon: '📊',
    category: AgentCategory.ANALYSIS,
    activationMode: ActivationMode.BACKGROUND,
    initialState: {
      status: AgentState.IDLE,
      confidence: 0.8,
    },
    metadata: {
      version: '1.0.0',
      author: 'Example User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['analysis', 'text', 'nlp'],
    },
  });
  console.log('✓ Agent registered successfully\n');

  // 2. Get all agents
  console.log('2. Getting all registered agents...');
  const allAgents = agentRegistry.getAllAgents();
  console.log(`✓ Found ${allAgents.length} agent(s):\n`);
  allAgents.forEach((agent) => {
    console.log(`   - ${agent.name} (${agent.id})`);
    console.log(`     Category: ${agent.category}`);
    console.log(`     Description: ${agent.description}\n`);
  });

  // 3. Search for agents
  console.log('3. Searching for agents...');
  const results = agentRegistry.searchAgents('text');
  console.log(`✓ Found ${results.length} agent(s) matching "text":\n`);
  results.forEach((agent) => {
    console.log(`   - ${agent.name}: ${agent.description}\n`);
  });

  // 4. Check availability (with minimal hardware profile)
  console.log('4. Checking agent availability...');
  const hardwareProfile = {
    cpu: { cores: 4 },
    memory: { totalGB: 8 },
    gpu: {
      available: false,
      webgpu: { supported: false },
      webgl: { supported: false },
    },
    features: { webassembly: true },
  };

  const availability = await agentRegistry.checkAvailability(
    'text-analyzer-v1',
    hardwareProfile
  );
  console.log(`✓ Agent "text-analyzer-v1" availability:`);
  console.log(`   Available: ${availability.available}`);
  if (availability.reason) {
    console.log(`   Reason: ${availability.reason}`);
  }
  console.log('');

  // 5. Activate the agent
  console.log('5. Activating the agent...');
  const activated = agentRegistry.activateAgent('text-analyzer-v1');
  console.log(`✓ Agent ${activated ? 'activated' : 'already active'}\n`);

  // 6. Get agent state
  console.log('6. Getting agent state...');
  const state = agentRegistry.getAgentState('text-analyzer-v1');
  if (state) {
    console.log('✓ Agent state:');
    console.log(`   Status: ${state.status}`);
    console.log(`   Confidence: ${state.confidence}`);
    console.log(`   Last Active: ${state.lastActive}\n`);
  }

  // 7. Update agent state
  console.log('7. Updating agent state...');
  agentRegistry.updateAgentState('text-analyzer-v1', {
    confidence: 0.95,
    customData: { processedCount: 42 },
  });
  console.log('✓ Agent state updated\n');

  // 8. Get all active agents
  console.log('8. Getting all active agents...');
  const activeAgents = agentRegistry.getActiveAgents();
  console.log(`✓ Found ${activeAgents.size} active agent(s):\n`);
  activeAgents.forEach((state, agentId) => {
    console.log(`   - ${agentId}: ${state.status}\n`);
  });

  // 9. Deactivate the agent
  console.log('9. Deactivating the agent...');
  const deactivated = agentRegistry.deactivateAgent('text-analyzer-v1');
  console.log(`✓ Agent ${deactivated ? 'deactivated' : 'not active'}\n`);

  // 10. Unregister the agent
  console.log('10. Unregistering the agent...');
  const unregistered = agentRegistry.unregisterAgent('text-analyzer-v1');
  console.log(`✓ Agent ${unregistered ? 'unregistered' : 'not found'}\n`);

  console.log('=== Example Complete ===');
}

// Run the example
main().catch(console.error);
