/**
 * PersonalLog - UI Adapters
 *
 * Adapters that apply personalized preferences to UI components.
 */

import type { PreferenceModel } from './models'
import type { UIPreferences, CommunicationPreferences, ContentPreferences } from './types'

// ============================================================================
// THEME ADAPTER
// ============================================================================

export interface ThemeConfig {
  theme: 'light' | 'dark' | 'auto'
  colors: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    border: string
  }
}

export class ThemeAdapter {
  constructor(private preferences: PreferenceModel) {}

  /**
   * Get current theme configuration
   */
  getThemeConfig(): ThemeConfig {
    const theme = this.preferences.get<UIPreferences['theme']>('ui.theme')
    const actualTheme = this.resolveTheme(theme)

    return {
      theme: actualTheme,
      colors: this.getColors(actualTheme),
    }
  }

  /**
   * Resolve auto theme to actual theme
   */
  private resolveTheme(theme: UIPreferences['theme']): 'light' | 'dark' {
    if (theme !== 'auto') return theme

    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    return 'light'
  }

  /**
   * Get color palette for theme
   */
  private getColors(theme: 'light' | 'dark'): ThemeConfig['colors'] {
    if (theme === 'dark') {
      return {
        background: '#0a0a0a',
        foreground: '#ededed',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        muted: '#737373',
        border: '#404040',
      }
    }

    return {
      background: '#ffffff',
      foreground: '#171717',
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#0891b2',
      muted: '#a3a3a3',
      border: '#e5e5e5',
    }
  }

  /**
   * Apply theme to document
   */
  applyTheme(): void {
    if (typeof document === 'undefined') return

    const config = this.getThemeConfig()
    const root = document.documentElement

    // Set data attribute
    root.setAttribute('data-theme', config.theme)

    // Set CSS variables
    root.style.setProperty('--color-background', config.colors.background)
    root.style.setProperty('--color-foreground', config.colors.foreground)
    root.style.setProperty('--color-primary', config.colors.primary)
    root.style.setProperty('--color-secondary', config.colors.secondary)
    root.style.setProperty('--color-accent', config.colors.accent)
    root.style.setProperty('--color-muted', config.colors.muted)
    root.style.setProperty('--color-border', config.colors.border)
  }
}

// ============================================================================
// TYPOGRAPHY ADAPTER
// ============================================================================

export interface TypographyConfig {
  fontSize: number
  lineHeight: number
  letterSpacing: number
}

export class TypographyAdapter {
  constructor(private preferences: PreferenceModel) {}

  /**
   * Get typography configuration
   */
  getTypographyConfig(): TypographyConfig {
    const size = this.preferences.get<UIPreferences['fontSize']>('ui.fontSize')
    const density = this.preferences.get<UIPreferences['density']>('ui.density')

    return {
      fontSize: size,
      lineHeight: this.getLineHeight(density),
      letterSpacing: this.getLetterSpacing(density),
    }
  }

  /**
   * Get line height based on density
   */
  private getLineHeight(density: UIPreferences['density']): number {
    switch (density) {
      case 'compact':
        return 1.25
      case 'comfortable':
        return 1.5
      case 'spacious':
        return 1.75
    }
  }

  /**
   * Get letter spacing based on density
   */
  private getLetterSpacing(density: UIPreferences['density']): number {
    switch (density) {
      case 'compact':
        return -0.01
      case 'comfortable':
        return 0
      case 'spacious':
        return 0.02
    }
  }

  /**
   * Apply typography to document
   */
  applyTypography(): void {
    if (typeof document === 'undefined') return

    const config = this.getTypographyConfig()
    const root = document.documentElement

    root.style.setProperty('--font-size-base', config.fontSize.toString())
    root.style.setProperty('--line-height-base', config.lineHeight.toString())
    root.style.setProperty('--letter-spacing-base', config.letterSpacing.toString())
  }

  /**
   * Get CSS class for font size
   */
  getFontSizeClass(): string {
    const size = this.preferences.get<UIPreferences['fontSize']>('ui.fontSize')

    switch (size) {
      case 0.85:
        return 'text-sm'
      case 1.0:
        return 'text-base'
      case 1.15:
        return 'text-lg'
      case 1.3:
        return 'text-xl'
    }
  }
}

// ============================================================================
// LAYOUT ADAPTER
// ============================================================================

export interface LayoutConfig {
  density: 'compact' | 'comfortable' | 'spacious'
  sidebarPosition: 'left' | 'right' | 'hidden'
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
}

export class LayoutAdapter {
  constructor(private preferences: PreferenceModel) {}

  /**
   * Get layout configuration
   */
  getLayoutConfig(): LayoutConfig {
    const density = this.preferences.get<UIPreferences['density']>('ui.density')
    const sidebarPosition = this.preferences.get<UIPreferences['sidebarPosition']>('ui.sidebarPosition')

    return {
      density,
      sidebarPosition,
      spacing: this.getSpacing(density),
    }
  }

  /**
   * Get spacing scale based on density
   */
  private getSpacing(density: UIPreferences['density']): LayoutConfig['spacing'] {
    switch (density) {
      case 'compact':
        return {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '0.75rem',
          lg: '1rem',
          xl: '1.25rem',
        }
      case 'comfortable':
        return {
          xs: '0.5rem',
          sm: '0.75rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
        }
      case 'spacious':
        return {
          xs: '0.75rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem',
        }
    }
  }

  /**
   * Apply layout to document
   */
  applyLayout(): void {
    if (typeof document === 'undefined') return

    const config = this.getLayoutConfig()
    const root = document.documentElement

    root.style.setProperty('--spacing-xs', config.spacing.xs)
    root.style.setProperty('--spacing-sm', config.spacing.sm)
    root.style.setProperty('--spacing-md', config.spacing.md)
    root.style.setProperty('--spacing-lg', config.spacing.lg)
    root.style.setProperty('--spacing-xl', config.spacing.xl)
  }

  /**
   * Get CSS class for density
   */
  getDensityClass(): string {
    const density = this.preferences.get<UIPreferences['density']>('ui.density')

    switch (density) {
      case 'compact':
        return 'density-compact'
      case 'comfortable':
        return 'density-comfortable'
      case 'spacious':
        return 'density-spacious'
    }
  }
}

// ============================================================================
// CONTENT ADAPTER
// ============================================================================

export class ContentAdapter {
  constructor(private preferences: PreferenceModel) {}

  /**
   * Get response length configuration
   */
  getResponseLength(): CommunicationPreferences['responseLength'] {
    return this.preferences.get<CommunicationPreferences['responseLength']>('communication.responseLength')
  }

  /**
   * Get tone configuration
   */
  getTone(): CommunicationPreferences['tone'] {
    return this.preferences.get<CommunicationPreferences['tone']>('communication.tone')
  }

  /**
   * Check if emojis should be used
   */
  shouldUseEmojis(): boolean {
    return this.preferences.get<CommunicationPreferences['useEmojis']>('communication.useEmojis')
  }

  /**
   * Get formatting preference
   */
  getFormatting(): CommunicationPreferences['formatting'] {
    return this.preferences.get<CommunicationPreferences['formatting']>('communication.formatting')
  }

  /**
   * Get reading level
   */
  getReadingLevel(): ContentPreferences['readingLevel'] {
    return this.preferences.get<ContentPreferences['readingLevel']>('content.readingLevel')
  }

  /**
   * Get language preference
   */
  getLanguage(): ContentPreferences['language'] {
    return this.preferences.get<ContentPreferences['language']>('content.language')
  }

  /**
   * Check if media should autoplay
   */
  shouldAutoPlayMedia(): boolean {
    return this.preferences.get<ContentPreferences['autoPlayMedia']>('content.autoPlayMedia')
  }

  /**
   * Adapt content based on preferences
   */
  adaptContent(content: string): string {
    const tone = this.getTone()
    const useEmojis = this.shouldUseEmojis()
    const formatting = this.getFormatting()

    let adapted = content

    // Apply tone adjustments (simplified example)
    if (tone === 'casual' && !useEmojis) {
      // Already casual, no emojis needed
    } else if (tone === 'formal') {
      // Would make more formal
    }

    return adapted
  }
}

// ============================================================================
// ANIMATION ADAPTER
// ============================================================================

export class AnimationAdapter {
  constructor(private preferences: PreferenceModel) {}

  /**
   * Get animation level
   */
  getAnimationLevel(): UIPreferences['animations'] {
    return this.preferences.get<UIPreferences['animations']>('ui.animations')
  }

  /**
   * Check if animations are enabled
   */
  areAnimationsEnabled(): boolean {
    const level = this.getAnimationLevel()
    return level !== 'none'
  }

  /**
   * Check if reduced animations should be used
   */
  useReducedMotion(): boolean {
    const level = this.getAnimationLevel()

    // Respect system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return true
    }

    return level === 'none' || level === 'reduced'
  }

  /**
   * Get animation duration multiplier
   */
  getDurationMultiplier(): number {
    const level = this.getAnimationLevel()

    switch (level) {
      case 'none':
        return 0
      case 'reduced':
        return 0.5
      case 'full':
        return 1.0
    }
  }

  /**
   * Apply animation settings to document
   */
  applyAnimations(): void {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const multiplier = this.getDurationMultiplier()

    root.style.setProperty('--animation-duration-multiplier', multiplier.toString())

    if (this.useReducedMotion()) {
      root.setAttribute('data-reduced-motion', 'true')
    } else {
      root.removeAttribute('data-reduced-motion')
    }
  }
}

// ============================================================================
// COMPREHENSIVE ADAPTER
// ============================================================================

/**
 * Main adapter that applies all personalization preferences
 */
export class PersonalizationAdapter {
  private theme: ThemeAdapter
  private typography: TypographyAdapter
  private layout: LayoutAdapter
  private content: ContentAdapter
  private animation: AnimationAdapter

  constructor(preferences: PreferenceModel) {
    this.theme = new ThemeAdapter(preferences)
    this.typography = new TypographyAdapter(preferences)
    this.layout = new LayoutAdapter(preferences)
    this.content = new ContentAdapter(preferences)
    this.animation = new AnimationAdapter(preferences)
  }

  /**
   * Apply all UI preferences to document
   */
  applyAll(): void {
    this.theme.applyTheme()
    this.typography.applyTypography()
    this.layout.applyLayout()
    this.animation.applyAnimations()
  }

  /**
   * Get theme adapter
   */
  getTheme(): ThemeAdapter {
    return this.theme
  }

  /**
   * Get typography adapter
   */
  getTypography(): TypographyAdapter {
    return this.typography
  }

  /**
   * Get layout adapter
   */
  getLayout(): LayoutAdapter {
    return this.layout
  }

  /**
   * Get content adapter
   */
  getContent(): ContentAdapter {
    return this.content
  }

  /**
   * Get animation adapter
   */
  getAnimation(): AnimationAdapter {
    return this.animation
  }

  /**
   * Apply preferences when system preference changes
   */
  handleSystemPreferenceChange(): void {
    this.applyAll()
  }
}

// ============================================================================
// REACT HOOK HELPERS
// ============================================================================

/**
 * Generate CSS variables object for inline styles
 */
export function generateCSSVariables(adapter: PersonalizationAdapter): Record<string, string> {
  const theme = adapter.getTheme().getThemeConfig()
  const typography = adapter.getTypography().getTypographyConfig()
  const layout = adapter.getLayout().getLayoutConfig()

  return {
    // Theme colors
    '--color-background': theme.colors.background,
    '--color-foreground': theme.colors.foreground,
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--color-muted': theme.colors.muted,
    '--color-border': theme.colors.border,

    // Typography
    '--font-size-base': typography.fontSize.toString(),
    '--line-height-base': typography.lineHeight.toString(),
    '--letter-spacing-base': typography.letterSpacing.toString(),

    // Spacing
    '--spacing-xs': layout.spacing.xs,
    '--spacing-sm': layout.spacing.sm,
    '--spacing-md': layout.spacing.md,
    '--spacing-lg': layout.spacing.lg,
    '--spacing-xl': layout.spacing.xl,

    // Animation
    '--animation-duration-multiplier': adapter.getAnimation().getDurationMultiplier().toString(),
  }
}

/**
 * Generate className for density
 */
export function getDensityClassName(adapter: PersonalizationAdapter): string {
  return adapter.getLayout().getDensityClass()
}

/**
 * Generate className for font size
 */
export function getFontSizeClassName(adapter: PersonalizationAdapter): string {
  return adapter.getTypography().getFontSizeClass()
}
