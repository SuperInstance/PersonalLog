/**
 * Fitness Coach Template
 *
 * Creates workout plans, provides form tips, and tracks progress.
 * Ideal for fitness enthusiasts and anyone looking to stay active.
 */

import type { AgentDefinition } from '../types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

export const FitnessCoachTemplate: AgentDefinition = {
  id: 'template-fitness-coach',
  name: 'Fitness Coach',
  description: 'Your personal AI fitness trainer. Creates custom workout plans, demonstrates proper form, tracks progress, and keeps you motivated. Reach your fitness goals faster.',
  icon: '💪',
  category: AgentCategory.AUTOMATION,
  requirements: {
    // No special hardware requirements
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      workouts: [],
      progress: [],
      goals: [],
      stats: [],
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['fitness', 'workout', 'health', 'exercise', 'training', 'wellness'],
    documentation: 'https://docs.personallog.ai/templates/fitness-coach',
    license: 'MIT',
  },
  configSchema: {
    fitnessLevel: {
      type: 'string',
      description: 'Current fitness level',
      default: 'intermediate',
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    goal: {
      type: 'string',
      description: 'Primary fitness goal',
      default: 'general',
      enum: ['general', 'weight-loss', 'muscle-gain', 'endurance', 'strength', 'flexibility'],
    },
    workoutDuration: {
      type: 'number',
      description: 'Preferred workout duration in minutes',
      default: 45,
      min: 15,
      max: 120,
    },
    equipment: {
      type: 'string',
      description: 'Available equipment',
      default: 'full-gym',
      enum: ['no-equipment', 'minimal', 'home-gym', 'full-gym'],
    },
    frequency: {
      type: 'number',
      description: 'Workouts per week',
      default: 3,
      min: 1,
      max: 7,
    },
  },
  examples: [
    {
      name: 'Home Workout',
      description: 'No equipment needed, perfect for beginners',
      config: {
        fitnessLevel: 'beginner',
        goal: 'general',
        workoutDuration: 30,
        equipment: 'no-equipment',
        frequency: 3,
      },
    },
    {
      name: 'Muscle Building',
      description: 'Build strength and muscle mass',
      config: {
        fitnessLevel: 'intermediate',
        goal: 'muscle-gain',
        workoutDuration: 60,
        equipment: 'full-gym',
        frequency: 4,
      },
    },
    {
      name: 'Weight Loss',
      description: 'Burn calories and improve cardiovascular health',
      config: {
        fitnessLevel: 'beginner',
        goal: 'weight-loss',
        workoutDuration: 45,
        equipment: 'minimal',
        frequency: 5,
      },
    },
  ],
};
