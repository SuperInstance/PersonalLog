/**
 * Accessibility Utilities
 *
 * Provides ARIA attributes, keyboard navigation, and accessibility testing
 */

export interface ARIAProps {
  role?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  ariaHidden?: boolean;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  ariaDisabled?: boolean;
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaAtomic?: boolean;
  ariaBusy?: boolean;
  ariaModal?: boolean;
  ariaHaspopup?: boolean | 'false' | 'true' | 'menu';
  ariaControls?: string;
  ariaCurrent?: boolean | 'step' | 'page' | 'location' | 'date' | 'time';
  ariaColindex?: number;
  ariaColspan?: number;
  ariaColindextype?: 'other' | 'ascending' | 'descending' | 'none';
  ariaRowindex?: number;
  ariaRowspan?: number;
  ariaSetsize?: number;
  ariaPosinset?: number;
  ariaLevel?: number;
  ariaOrientation?: 'horizontal' | 'vertical';
  ariaRelevant?: boolean;
  ariaMultiline?: boolean;
  ariaMultiselectable?: boolean;
  readonly?: boolean;
  disabled?: boolean;
}

/**
 * Create ARIA props object
 */
export function createARIAProps(props: Partial<ARIAProps>): ARIAProps {
  return {
    role: props.role,
    'aria-label': props.ariaLabel,
    'aria-labelledby': props.ariaLabelledby,
    'aria-describedby': props.ariaDescribedby,
    'aria-expanded': props.ariaExpanded,
    'aria-pressed': props.ariaPressed,
    'aria-hidden': props.ariaHidden,
    'aria-invalid': props.ariaInvalid,
    'aria-required': props.ariaRequired,
    'aria-disabled': props.ariaDisabled,
    'aria-live': props.ariaLive,
    'aria-atomic': props.ariaAtomic,
    'aria-busy': props.ariaBusy,
    'aria-modal': props.ariaModal,
    'aria-haspopup': props.ariaHaspopup,
    'aria-controls': props.ariaControls,
    'aria-current': props.ariaCurrent,
    'aria-colindex': props.ariaColindex,
    'aria-colspan': props.ariaColspan,
    'aria-colindextype': props.ariaColindextype,
    'aria-rowindex': props.ariaRowindex,
    'aria-rowspan': props.ariaRowspan,
    'aria-setsize': props.ariaSetsize,
    'aria-posinset': props.ariaPosinset,
    'aria-level': props.ariaLevel,
    'aria-orientation': props.ariaOrientation,
    'aria-relevant': props.ariaRelevant,
    'aria-multiline': props.ariaMultiline,
    'aria-multiselectable': props.ariaMultiselectable
  };
}

/**
 * Get ARIA role for component
 */
export function getComponentRole(component: string): string {
  const roleMap: Record<string, string> = {
    'button': 'button',
    'input': 'textbox',
    'textarea': 'textbox',
    'select': 'listbox',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'link': 'link',
    'dialog': 'dialog',
    'alert': 'alert',
    'list': 'list',
    'listitem': 'listitem',
    'tab': 'tab',
    'tabpanel': 'tabpanel',
    'menu': 'menu',
    'menuitem': 'menuitem',
    'slider': 'slider',
    'dropdown': 'listbox',
    'navigation': 'navigation',
    'main': 'main',
    'aside': 'complementary',
    'header': 'banner',
    'footer': 'contentinfo',
    'section': 'region',
    'article': 'article',
    'form': 'form',
    'label': 'label',
    'tooltip': 'tooltip',
    'progress': 'progressbar',
    'status': 'status',
    'modal': 'dialog',
    'dropdown': 'listbox',
    'listbox': 'listbox',
    'grid': 'grid',
    'gridcell': 'gridcell',
    'table': 'table',
    'cell': 'cell',
    'row': 'row',
    'columnheader': 'columnheader',
    'rowheader': 'rowheader',
    'switch': 'switch',
    'search': 'searchbox',
    'spinner': 'status',
    'toast': 'alert'
  };

  return roleMap[component] || 'generic';
}

/**
 * Get ARIA live region settings
 */
export function getARIALiveSettings(region: 'polite' | 'assertive' | 'off'): {
  'aria-live': string;
  'aria-atomic': boolean;
} {
  const liveSettings: Record<string, { 'aria-live': string; 'aria-atomic': boolean }> = {
    polite: { 'aria-live': 'polite', 'aria-atomic': 'false' },
    assertive: { 'aria-live': 'assertive', 'aria-atomic': 'true' },
    off: { 'aria-live': 'off', 'aria-atomic': 'false' }
  };

  return liveSettings[region];
}

/**
 * Focus management utilities
 */
export function focusFirstElement(container: HTMLElement | null): void {
  if (!container) return;

  const focusableElements = container.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length > 0) {
    (focusableElements[0] as HTMLElement).focus();
  }
}

export function focusNextElement(container: HTMLElement | null): void {
  if (!container) return;

  const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  ));

  const currentFocus = document.activeElement as HTMLElement;
  if (!currentFocus) {
    focusFirstElement(container);
    return;
  }

  const currentIndex = focusableElements.indexOf(currentFocus);
  const nextIndex = (currentIndex + 1) % focusableElements.length;

  focusableElements[nextIndex].focus();
}

export function focusPreviousElement(container: HTMLElement | null): void {
  if (!container) return;

  const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  ));

  const currentFocus = document.activeElement as HTMLElement;
  if (!currentFocus) {
    return;
  }

  const currentIndex = focusableElements.indexOf(currentFocus);
  const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;

  focusableElements[previousIndex].focus();
}

/**
 * Trap focus within container
 */
export function createFocusTrap(container: HTMLElement, onEscape: () => void): () => void {
  const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  ));

  let currentFocusIndex = -1;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onEscape();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();

      if (event.shiftKey) {
        // Focus previous
        currentFocusIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
      } else {
        // Focus next
        currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
      }

      focusableElements[currentFocusIndex].focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
      focusableElements[currentFocusIndex].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      currentFocusIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
      focusableElements[currentFocusIndex].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      currentFocusIndex = 0;
      focusableElements[currentFocusIndex].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      currentFocusIndex = focusableElements.length - 1;
      focusableElements[currentFocusIndex].focus();
    }
  };

  const activate = () => {
    container.addEventListener('keydown', handleKeyDown);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      currentFocusIndex = 0;
    }
  };

  const deactivate = () => {
    container.removeEventListener('keydown', handleKeyDown);
    currentFocusIndex = -1;
  };

  return { activate, deactivate };
}

/**
 * Screen reader announcement utilities
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.textContent = message;
  announcement.style.position = 'absolute';
  announcement.style.left = '-9999px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export function announceError(message: string): void {
  announceToScreenReader(`Error: ${message}`, 'assertive');
}

export function announceSuccess(message: string): void {
  announceToScreenReader(`Success: ${message}`, 'polite');
}

/**
 * Keyboard navigation utilities
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"]), [tabindex]:not([tabindex="0"])'
  ));
}

export function isElementFocusable(element: HTMLElement): boolean {
  if (!element) return false;

  // Check if element is visible
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Check if element is disabled
  if (element.hasAttribute('disabled') || element.hasAttribute('aria-disabled')) {
    return false;
  }

  // Check if element is focusable
  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'textarea', 'select', 'option'];

  return focusableTags.includes(tagName) || element.getAttribute('tabindex') !== null;
}

/**
 * Color contrast utilities
 */
export function getContrastRatio(foreground: string, background: string): number {
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    return { r: r / 255, g: g / 255, b: b / 255 };
  };

  const fg = hex2rgb(foreground);
  const bg = hex2rgb(background);

  const luminance = (r: number, g: number, b: number) => {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fgLuminance = luminance(fg.r, fg.g, fg.b);
  const bgLuminance = luminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastRatioString(foreground: string, background: string): string {
  const ratio = getContrastRatio(foreground, background);

  if (ratio < 3) {
    return 'Poor (1:1 - 3:1)';
  } else if (ratio < 4.5) {
    return 'Low (3:1 - 4.5:1)';
  } else if (ratio < 7) {
    return 'Good (4.5:1 - 7:1)';
  } else if (ratio < 12) {
    return 'Very Good (7:1 - 12:1)';
  } else {
    return 'Excellent (12:1+)';
  }
}

export function meetsWCAGContrast(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minimumRatio = level === 'AA' ? 4.5 : 7;

  return ratio >= minimumRatio;
}

/**
 * Reduced motion preference check
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * High contrast mode utilities
 */
export function applyHighContrastMode(): void {
  document.documentElement.setAttribute('data-high-contrast', 'true');
}

export function removeHighContrastMode(): void {
  document.documentElement.removeAttribute('data-high-contrast');
}

export function toggleHighContrastMode(): void {
  const isEnabled = document.documentElement.hasAttribute('data-high-contrast');
  if (isEnabled) {
    removeHighContrastMode();
  } else {
    applyHighContrastMode();
  }
}

/**
 * Screen reader detection
 */
export function isScreenReaderActive(): boolean {
  // Check for screen reader specific patterns
  const body = document.body;

  // Check for reduced motion preference (often used with screen readers)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check for touch device (screen readers often on touch)
  const isTouch = 'ontouchstart' in window;

  return reducedMotion || isTouch;
}

/**
 * Font size utilities
 */
export function getCurrentFontSize(): string {
  return window.getComputedStyle(document.body).fontSize;
}

export function getDefaultFontSize(): string {
  return window.getComputedStyle(document.documentElement).fontSize;
}

/**
 * Skip link utilities
 */
export function addSkipLink(id: string, text: string, target?: string): HTMLAnchorElement | null {
  const skipLink = document.createElement('a');
  skipLink.href = target || '#main';
  skipLink.id = id;
  skipLink.textContent = text;
  skipLink.className = 'sr-only focus-visible';
  skipLink.setAttribute('aria-label', text);

  document.body.insertBefore(skipLink, document.body.firstChild);

  return skipLink;
}

/**
 * ARIA live region management
 */
export function createLiveRegion(id: string, role: string = 'status', priority: 'polite' | 'assertive' = 'polite'): void {
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('role', role);
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';

    document.body.appendChild(region);
  }
}

export function updateLiveRegion(id: string, message: string): void {
  const region = document.getElementById(id);

  if (region) {
    region.textContent = message;
  }
}

export function removeLiveRegion(id: string): void {
  const region = document.getElementById(id);

  if (region) {
    document.body.removeChild(region);
  }
}
