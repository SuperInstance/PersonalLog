/**
 * Hardware Availability Checking Example
 *
 * This example demonstrates how to check agent availability
 * based on hardware requirements.
 */

import {
  agentRegistry,
  registerPresetAgents,
  AgentCategory,
  ActivationMode,
  AgentState,
  type HardwareProfile,
} from '@superinstance/agent-lifecycle-registry';

async function main() {
  console.log('=== Hardware Availability Checking ===\n');

  // Register preset agents
  registerPresetAgents();

  // Register a GPU-intensive agent
  console.log('1. Registering GPU-intensive agent...');
  agentRegistry.registerAgent({
    id: 'gpu-processor-v1',
    name: 'GPU Processor',
    description: 'Performs GPU-accelerated data processing',
    icon: '⚡',
    category: AgentCategory.DATA,
    activationMode: ActivationMode.BACKGROUND,
    initialState: { status: AgentState.IDLE },
    metadata: {
      version: '1.0.0',
      author: 'Example User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['gpu', 'processing', 'acceleration'],
    },
    requirements: {
      hardware: {
        minJEPAScore: 50, // Requires decent hardware
        minRAM: 16, // Requires 16GB RAM
        minCores: 8, // Requires 8 CPU cores
        requiresGPU: true, // Requires GPU
        features: ['gpu-acceleration', 'webassembly'],
      },
      dependencies: ['data-source-v1'], // Requires other agent (will be missing)
    },
  });
  console.log('✓ Agent registered\n');

  // Define different hardware profiles
  const profiles: Record<string, HardwareProfile> = {
    minimal: {
      cpu: { cores: 4 },
      memory: { totalGB: 8 },
      gpu: {
        available: false,
        webgpu: { supported: false },
        webgl: { supported: false },
      },
      features: { webassembly: true },
    },
    moderate: {
      cpu: { cores: 8 },
      memory: { totalGB: 16 },
      gpu: {
        available: true,
        webgpu: { supported: false },
        webgl: { supported: true },
      },
      features: { webassembly: true },
    },
    high: {
      cpu: { cores: 16 },
      memory: { totalGB: 32 },
      gpu: {
        available: true,
        webgpu: { supported: true },
        webgl: { supported: true },
      },
      features: { webassembly: true },
    },
  };

  // Test each profile
  for (const [profileName, hardwareProfile] of Object.entries(profiles)) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing with ${profileName.toUpperCase()} hardware profile:`);
    console.log('='.repeat(50));

    console.log(`\nHardware Profile:`);
    console.log(`  CPU Cores: ${hardwareProfile.cpu.cores}`);
    console.log(`  RAM: ${hardwareProfile.memory.totalGB}GB`);
    console.log(`  GPU: ${hardwareProfile.gpu.available ? 'Available' : 'Not Available'}`);
    console.log(`  WebGPU: ${hardwareProfile.gpu.webgpu.supported ? 'Supported' : 'Not Supported'}`);
    console.log(`  WebGL: ${hardwareProfile.gpu.webgl.supported ? 'Supported' : 'Not Supported'}`);
    console.log(`  WebAssembly: ${hardwareProfile.features.webassembly ? 'Supported' : 'Not Supported'}`);

    // Check all agents
    console.log(`\nChecking agent availability:`);

    const agents = agentRegistry.getAllAgents();
    for (const agent of agents) {
      const availability = await agentRegistry.checkAvailability(
        agent.id,
        hardwareProfile
      );

      console.log(`\n  ${agent.name} (${agent.id}):`);
      console.log(`    Status: ${availability.available ? '✓ Available' : '✗ Unavailable'}`);

      if (!availability.available) {
        console.log(`    Reason: ${availability.reason}`);

        if (availability.missingRequirements.hardware.length > 0) {
          console.log(`    Missing Hardware:`);
          availability.missingRequirements.hardware.forEach((hw) => {
            console.log(`      - ${hw}`);
          });
        }

        if (availability.missingRequirements.flags.length > 0) {
          console.log(`    Missing Flags:`);
          availability.missingRequirements.flags.forEach((flag) => {
            console.log(`      - ${flag}`);
          });
        }

        if (availability.missingRequirements.dependencies.length > 0) {
          console.log(`    Missing Dependencies:`);
          availability.missingRequirements.dependencies.forEach((dep) => {
            console.log(`      - ${dep}`);
          });
        }
      }
    }

    // Get available agents
    const availableAgents = await agentRegistry.getAvailableAgents(hardwareProfile);
    console.log(`\n✓ Total available agents: ${availableAgents.length} / ${agents.length}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('=== Example Complete ===');
}

// Run the example
main().catch(console.error);
