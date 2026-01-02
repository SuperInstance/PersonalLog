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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/layout/AppNav";
import { AppProviders } from "@/components/providers";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PersonalLog - Your AI-Powered Personal Log",
  description: "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration",
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
      <body className={inter.className}>
        <ErrorBoundary>
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
            {children}
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
