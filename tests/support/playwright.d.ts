/**
 * Type declarations for Playwright test extensions
 */

import { AxeResults } from 'axe-core'

declare global {
  interface Window {
    axe: {
      run: (
        context?: Element | string | Document | null,
        options?: any
      ) => Promise<AxeResults>
    }
  }

  namespace PlaywrightTest {
    interface PageMetrics {
      Timestamp: number
      Documents: number
      Frames: number
      JSEventListeners: number
      Nodes: number
      JSCallStackSize: number
      JSHeapUsedSize: number
      JSHeapTotalSize: number
    }

    interface CoverageEntry {
      url: string
      text: string
      ranges: Array<{
        start: number
        end: number
      }>
    }

    interface Page {
      /**
       * Get page metrics (Chrome-only)
       * Note: This is a Chrome DevTools Protocol feature
       * In modern Playwright, use CDP session directly
       */
      metrics: () => Promise<PageMetrics>

      /**
       * Coverage tracking for JavaScript
       * Note: In modern Playwright, use CDP session directly
       */
      coverage: {
        startJSCoverage: () => Promise<void>
        stopJSCoverage: () => Promise<CoverageEntry[]>
      }
    }

    interface Response {
      /**
       * Get timing information for the response
       * Note: This method was removed in newer Playwright versions
       * Use Performance API in browser context instead
       */
      timing: () => {
        requestTime: number
        proxyStart: number
        proxyEnd: number
        dnsStart: number
        dnsEnd: number
        connectStart: number
        connectEnd: number
        sslStart: number
        sslEnd: number
        requestStart: number
        requestEnd: number
        responseStart: number
        responseEnd: number
      }
    }

    interface Download {
      /**
       * Create a readable stream for the download
       * Note: Use createReadStream() in modern Playwright
       */
      createStreamReader: () => NodeJS.ReadableStream
    }
  }
}

export {}
