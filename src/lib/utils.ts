/**
 * Utility functions for PersonalLog Messenger
 *
 * @module lib/utils
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MessageAuthor } from '@/types/conversation'

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;

  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get display name for message author
 */
export function getAuthorDisplayName(author: MessageAuthor): string {
  if (author === 'user') return 'You';
  if (typeof author === 'object' && author.type === 'ai-contact') return author.contactName;
  return 'System';
}

/**
 * Get color class for message author
 */
export function getAuthorColor(author: MessageAuthor): string {
  if (author === 'user') return 'bg-blue-500';
  if (typeof author === 'object' && author.type === 'ai-contact') {
    // Generate consistent color based on contact ID
    const hash = author.contactId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    const colors = [
      'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500',
      'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-cyan-500'
    ];
    return colors[Math.abs(hash) % colors.length];
  }
  return 'bg-gray-500';
}
