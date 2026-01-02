/**
 * Root Layout for PersonalLog
 *
 * Provides the base HTML structure and metadata for all pages.
 * Uses Inter font for consistent typography.
 *
 * Wraps the application with all provider systems for:
 * - Hardware-aware integration
 * - Privacy-first analytics
 * - A/B testing experiments
 * - Auto-optimization
 * - User personalization
 *
 * @module app/layout
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/layout/AppNav";
import { AppProviders } from "@/components/providers";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { KeyboardNavigationProvider } from "@/components/providers/KeyboardNavigationProvider";
import { LiveAnnouncerProvider } from "@/components/ui/LiveAnnouncer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Site configuration
const SITE_URL = "https://github.com/SuperInstance/PersonalLog";

export const metadata: Metadata = {
  title: "PersonalLog - Your AI-Powered Personal Log",
  description: "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration",
  keywords: [
    "personal log",
    "journal",
    "AI assistant",
    "knowledge management",
    "messenger",
    "productivity",
    "notes",
    "self-improvement",
  ],
  authors: [{ name: "SuperInstance" }],
  creator: "SuperInstance",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: "PersonalLog - Your AI-Powered Personal Log",
    description: "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration",
    siteName: "PersonalLog",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PersonalLog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PersonalLog - Your AI-Powered Personal Log",
    description: "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
  colorScheme: "light dark",
};

/**
 * Root layout component
 *
 * Initializes all provider systems and wraps the application.
 * Providers initialize in background, allowing immediate render.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PersonalLog",
              description: "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration",
              url: SITE_URL,
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "SuperInstance",
                url: "https://github.com/SuperInstance",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <KeyboardNavigationProvider trackFocusVisible enableSkipLinks>
            <LiveAnnouncerProvider cleanupDelay={7000}>
              <AppProviders
                config={{
                  // Integration: Hardware detection and feature flags
                  integration: {
                    debug: process.env.NODE_ENV === 'development',
                    runBenchmarks: true,
                    timeout: 10000,
                  },

                  // Analytics: Privacy-first local usage tracking
                  analytics: {
                    enabled: true,
                    requireConsent: false,
                    retentionDays: 90,
                  },

                  // Experiments: A/B testing framework
                  experiments: {
                    enabled: true,
                    trafficAllocation: 1.0,
                    storageKey: 'personallog-experiments',
                  },

                  // Optimization: Auto-performance tuning
                  optimization: {
                    enabled: true,
                    autoApply: false,
                    monitorInterval: 30000,
                  },

                  // Personalization: User preference learning
                  personalization: {
                    enabled: true,
                    userId: 'default',
                    autoSaveInterval: 60000,
                  },

                  // Initialization: Loading screen behavior
                  initialization: {
                    showLoader: true,
                    timeout: 5000,
                    fallbackOnTimeout: true,
                  },
                }}
                showLoader={true}
                initTimeout={5000}
              >
                <AppNav />
                {/* Main content landmark for accessibility */}
                <main id="main-content" role="main" tabIndex={-1}>
                  {children}
                </main>
              </AppProviders>
            </LiveAnnouncerProvider>
          </KeyboardNavigationProvider>
        </ErrorBoundary>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('[SW] Service worker registered:', registration.scope);

                      // Listen for updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New version available
                              if (confirm('A new version of PersonalLog is available. Reload to update?')) {
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch((error) => {
                      console.error('[SW] Service worker registration failed:', error);
                    });
                });

                // Listen for service worker messages
                navigator.serviceWorker.addEventListener('message', (event) => {
                  if (event.data.type === 'SYNC_MESSAGES') {
                    // Trigger sync if needed
                    console.log('[SW] Sync requested');
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
