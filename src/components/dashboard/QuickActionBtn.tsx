'use client';

/**
 * Dashboard Quick Action Button Component
 *
 * Button component for common actions in the intelligence dashboard.
 * Supports primary, secondary, and danger variants with icons.
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type QuickActionVariant = 'primary' | 'secondary' | 'danger' | 'success';

export interface QuickActionBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ElementType;
  label: string;
  variant?: QuickActionVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export const QuickActionBtn = forwardRef<HTMLButtonElement, QuickActionBtnProps>(
  (
    {
      icon: Icon,
      label,
      variant = 'primary',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantConfig = {
      primary: {
        base: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 border-transparent',
        disabled: 'opacity-50 cursor-not-allowed',
      },
      secondary: {
        base: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
        disabled: 'opacity-50 cursor-not-allowed',
      },
      danger: {
        base: 'bg-red-500 text-white hover:bg-red-600 border-transparent',
        disabled: 'opacity-50 cursor-not-allowed',
      },
      success: {
        base: 'bg-green-500 text-white hover:bg-green-600 border-transparent',
        disabled: 'opacity-50 cursor-not-allowed',
      },
    };

    const config = variantConfig[variant];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          px-4 py-2.5 text-sm font-medium rounded-lg
          border-2 transition-all
          ${config.base}
          ${isDisabled ? config.disabled : 'shadow-sm hover:shadow'}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : Icon ? (
          <Icon className="w-4 h-4" />
        ) : null}
        <span>{label}</span>
      </button>
    );
  }
);

QuickActionBtn.displayName = 'QuickActionBtn';
