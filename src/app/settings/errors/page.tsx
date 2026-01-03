/**
 * Error Monitoring Page
 *
 * Settings and monitoring for the error handling system.
 */

import { Metadata } from 'next';
import { ErrorMonitoringDashboard } from '@/components/errors/ErrorMonitoringDashboard';

export const metadata: Metadata = {
  title: 'Error Monitoring - PersonalLog',
  description: 'Monitor and debug system errors',
};

export default function ErrorMonitoringPage() {
  return <ErrorMonitoringDashboard />;
}
