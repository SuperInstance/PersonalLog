/**
 * SmartCost Dashboard - Basic Usage Example
 *
 * Simple example demonstrating the basic dashboard setup
 */

'use client';

import React from 'react';
import { SmartCostDashboard } from '../index';

export default function BasicUsageExample() {
  return (
    <SmartCostDashboard
      budget={500}
      websocketUrl="ws://localhost:3000"
      enableRealTime={true}
    />
  );
}

// With custom configuration
export function CustomConfigExample() {
  const customConfig = {
    theme: {
      darkMode: true,
      colors: {
        primary: '#8b5cf6', // Purple
        secondary: '#ec4899', // Pink
      },
    },
    layout: {
      mode: 'grid' as const,
      cardSize: 'large' as const,
      showComponents: {
        costOverview: true,
        savingsDisplay: true,
        providerComparison: true,
        costTrends: true,
        budgetProgress: true,
        alerts: true,
        cacheStats: false,
        routingStats: false,
      },
    },
    alerts: {
      enableSound: true,
      enableNotifications: true,
      autoDismiss: 10000,
    },
  };

  return (
    <SmartCostDashboard
      budget={1000}
      config={customConfig}
      websocketUrl="wss://api.smartcost.dev"
      onConfigChange={(config) => console.log('Config changed:', config)}
    />
  );
}

// With error handling
export function WithErrorHandlingExample() {
  return (
    <SmartCostDashboard
      budget={500}
      enableRealTime={false} // Start disabled
      onConfigChange={(config) => {
        // Handle configuration changes
        console.log('Configuration updated:', config);
      }}
    />
  );
}
