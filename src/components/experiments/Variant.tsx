/**
 * Variant Component
 *
 * Declarative component for rendering different variants
 * based on A/B test assignment.
 */

'use client';

import React, { useEffect, ReactNode } from 'react';
import { useVariant, useExposeVariant, useMetricTracker } from '@/lib/experiments/hooks';
import type { Variant as VariantType } from '@/lib/experiments/types';

interface VariantProps {
  /** Experiment ID */
  experiment: string;

  /** Variant ID */
  variant: string;

  /** User ID (optional, will be auto-generated) */
  userId?: string;

  /** Content to render when this variant is active */
  children: ReactNode;

  /** Whether to automatically track exposure */
  trackExposure?: boolean;

  /** Custom exposure metric ID */
  exposureMetricId?: string;

  /** Callback when variant is rendered */
  onRender?: () => void;

  /** Callback when variant is not rendered */
  onSkip?: () => void;
}

interface ExperimentProps {
  /** Experiment ID */
  experiment: string;

  /** User ID (optional) */
  userId?: string;

  /** Fallback content if no variant is assigned */
  fallback?: ReactNode;

  /** Variant components */
  children: ReactNode;
}

/**
 * Single variant component
 */
export function Variant({
  experiment,
  variant,
  userId,
  children,
  trackExposure = true,
  exposureMetricId = 'exposure',
  onRender,
  onSkip,
}: VariantProps): React.ReactElement | null {
  const assignedVariant = useVariant(experiment, userId);
  const trackMetric = useMetricTracker();
  const isActive = assignedVariant?.id === variant;

  useEffect(() => {
    if (isActive && trackExposure && userId) {
      // Track exposure
      trackMetric(experiment, variant, exposureMetricId, 1);
    }

    if (isActive) {
      onRender?.();
    } else {
      onSkip?.();
    }
  }, [isActive, trackExposure, experiment, variant, userId, exposureMetricId, trackMetric, onRender, onSkip]);

  if (!isActive) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Control variant shorthand
 */
export function Control(props: Omit<VariantProps, 'variant'>): React.ReactElement | null {
  const assigned = useVariant(props.experiment, props.userId);
  const controlVariant = assigned?.isControl ? assigned : null;

  if (!controlVariant) {
    return null;
  }

  return <Variant {...props} variant={controlVariant.id} />;
}

/**
 * Experiment wrapper component
 * Renders the first matching variant
 */
export function Experiment({ experiment, userId, fallback, children }: ExperimentProps): React.ReactElement {
  const assignedVariant = useVariant(experiment, userId);

  // Track exposure if a variant is assigned (ALWAYS call hook, even if no match)
  const matchingVariant = React.useMemo(() => {
    if (!assignedVariant) return null;

    // Find the matching variant child
    const childrenArray = React.Children.toArray(children);

    for (const child of childrenArray) {
      if (React.isValidElement(child)) {
        const childVariant = (child.props as any).variant;
        if (childVariant === assignedVariant.id) {
          return child;
        }
      }
    }

    return null;
  }, [assignedVariant, children]);

  // Always call the hook (unconditionally)
  useExposeVariant(experiment, assignedVariant?.id || '', userId);

  if (!assignedVariant) {
    return <>{fallback || null}</>;
  }

  // Return the matching variant or fallback
  return <>{matchingVariant || fallback || null}</>;
}

/**
 * Variant group for rendering different content based on variant
 */
interface VariantGroupProps {
  experiment: string;
  userId?: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
}

export function VariantGroup({ experiment, userId, variants, fallback }: VariantGroupProps): React.ReactElement {
  const assignedVariant = useVariant(experiment, userId);

  // Always call the hook (unconditionally)
  useExposeVariant(experiment, assignedVariant?.id || '', userId);

  if (!assignedVariant) {
    return <>{fallback || null}</>;
  }

  const content = variants[assignedVariant.id];

  if (!content) {
    return <>{fallback || null}</>;
  }

  return <>{content}</>;
}

/**
 * Hook-based variant renderer for more complex scenarios
 */
interface UseVariantRendererOptions {
  experiment: string;
  userId?: string;
  trackExposure?: boolean;
}

interface VariantRenderer {
  variant: VariantType | null;
  isControl: boolean;
  exposed: boolean;
  trackMetric: (metricId: string, value: number) => void;
  trackSuccess: () => void;
  trackFailure: () => void;
}

export function useVariantRenderer({
  experiment,
  userId,
  trackExposure = true,
}: UseVariantRendererOptions): VariantRenderer {
  const variant = useVariant(experiment, userId);
  const trackMetric = useMetricTracker();

  useEffect(() => {
    if (variant && trackExposure && userId) {
      trackMetric(experiment, variant.id, 'exposure', 1);
    }
  }, [variant, trackExposure, experiment, userId, trackMetric]);

  const trackSuccess = () => {
    if (variant && userId) {
      trackMetric(experiment, variant.id, 'success', 1);
    }
  };

  const trackFailure = () => {
    if (variant && userId) {
      trackMetric(experiment, variant.id, 'success', 0);
    }
  };

  return {
    variant,
    isControl: variant?.isControl || false,
    exposed: !!variant,
    trackMetric: (metricId: string, value: number) => {
      if (variant && userId) {
        trackMetric(experiment, variant.id, metricId, value);
      }
    },
    trackSuccess,
    trackFailure,
  };
}

/**
 * Higher-order component for A/B testing
 */
export function withVariant<P extends object>(
  experimentId: string,
  variantRenderers: Record<string, React.ComponentType<P>>
) {
  return function WrappedComponent(props: P): React.ReactElement {
    const variant = useVariant(experimentId);

    if (!variant) {
      return <div>No variant assigned</div>;
    }

    const Renderer = variantRenderers[variant.id];

    if (!Renderer) {
      return <div>No renderer for variant: {variant.id}</div>;
    }

    return <Renderer {...props} />;
  };
}
