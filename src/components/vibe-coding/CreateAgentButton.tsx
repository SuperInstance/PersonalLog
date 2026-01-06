'use client'

/**
 * CreateAgentButton Component
 *
 * Button that navigates to the Vibe-Coding page for creating custom agents.
 * Uses Next.js router for navigation to match existing architecture.
 */

import React, { useCallback } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AgentDefinition } from '@/lib/agents/types';

interface CreateAgentButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom button text */
  label?: string;
  /** Additional className */
  className?: string;
}

export function CreateAgentButton({
  variant = 'primary',
  size = 'md',
  label = 'Create Agent',
  className = '',
}: CreateAgentButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    // Navigate to vibe-coding page
    router.push('/vibe-coding');
  }, [router]);

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95';

    const variantStyles = {
      primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-md hover:shadow-lg',
      secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();
  };

  const getIconSize = () => {
    return size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  };

  return (
    <button
      onClick={handleClick}
      className={getButtonStyles()}
      aria-label="Create new AI agent"
    >
      {variant === 'primary' ? (
        <Sparkles className={getIconSize()} />
      ) : (
        <Plus className={getIconSize()} />
      )}
      <span>{label}</span>
    </button>
  );
}

/**
 * Compact version of CreateAgentButton for use in tight spaces
 */
export function CreateAgentButtonCompact({
  className = '',
}: {
  className?: string;
}) {
  return (
    <CreateAgentButton
      variant="ghost"
      size="sm"
      label="✨ Create Agent"
      className={className}
    />
  );
}

export default CreateAgentButton;
