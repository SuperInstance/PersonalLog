/**
 * PersonalLog Plugin SDK - Utilities API Implementation
 *
 * Provides helper functions for plugins.
 *
 * @packageDocumentation
 */

import type { UtilsAPI } from '../types';

// ============================================================================
// UTILITIES API IMPLEMENTATION
// ============================================================================

/**
 * Utilities API implementation
 *
 * Provides common utility functions.
 */
class UtilsAPIImpl implements UtilsAPI {
  // ========================================================================
  // ID GENERATION
  // ========================================================================

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ========================================================================
  // FUNCTION DECORATORS
  // ========================================================================

  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func.apply(this, args);
        timeout = null;
      }, wait);
    };
  }

  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function (this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  // ========================================================================
  // DATE FORMATTING
  // ========================================================================

  formatDate(date: Date, format: string = 'ISO'): string {
    const d = new Date(date);

    switch (format) {
      case 'ISO':
        return d.toISOString();

      case 'locale':
        return d.toLocaleString();

      case 'locale-date':
        return d.toLocaleDateString();

      case 'locale-time':
        return d.toLocaleTimeString();

      case 'short':
        return d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

      case 'long':
        return d.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

      case 'relative':
        return this.formatRelative(d);

      case 'timestamp':
        return Math.floor(d.getTime() / 1000).toString();

      default:
        // Custom format using simple patterns
        return this.formatCustom(d, format);
    }
  }

  parseDate(dateString: string): Date | null {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  }

  private formatRelative(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(date, 'short');
    }
  }

  private formatCustom(date: Date, format: string): string {
    const tokens: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'YY': date.getFullYear().toString().slice(-2),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'M': String(date.getMonth() + 1),
      'DD': String(date.getDate()).padStart(2, '0'),
      'D': String(date.getDate()),
      'HH': String(date.getHours()).padStart(2, '0'),
      'H': String(date.getHours()),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'm': String(date.getMinutes()),
      'ss': String(date.getSeconds()).padStart(2, '0'),
      's': String(date.getSeconds()),
    };

    let result = format;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }

    return result;
  }

  // ========================================================================
  // OBJECT UTILITIES
  // ========================================================================

  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item)) as any;
    }

    if (obj instanceof Object) {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  deepMerge<T extends Record<string, any>>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  private isObject(item: any): item is Record<string, any> {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // ========================================================================
  // STRING UTILITIES
  // ========================================================================

  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  camelize(text: string): string {
    return text
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  // ========================================================================
  // VALIDATION UTILITIES
  // ========================================================================

  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidUUID(uuid: string): boolean {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return re.test(uuid);
  }

  // ========================================================================
  // ARRAY UTILITIES
  // ========================================================================

  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  // ========================================================================
  // NUMBER UTILITIES
  // ========================================================================

  clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  }

  random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random(min, max + 1));
  }

  round(num: number, precision: number = 0): number {
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
  }

  // ========================================================================
  // COLOR UTILITIES
  // ========================================================================

  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ========================================================================
  // ASYNC UTILITIES
  // ========================================================================

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await this.sleep(delay * (i + 1)); // Exponential backoff
      }
    }
    throw new Error('Retry failed');
  }

  async parallel<T>(
    tasks: Array<() => Promise<T>>,
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then((result) => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new Utilities API instance
 *
 * @returns Utilities API instance
 */
export function createUtilsAPI(): UtilsAPI {
  return new UtilsAPIImpl();
}

export default UtilsAPIImpl;
