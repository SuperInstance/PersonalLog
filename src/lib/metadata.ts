/**
 * Metadata Helper Functions
 *
 * Utilities for generating dynamic metadata for pages.
 * Provides consistent SEO meta tags across the application.
 *
 * @module lib/metadata
 */

import type { Metadata, Viewport } from "next";

/**
 * Site configuration
 */
const SITE_CONFIG = {
  name: "PersonalLog",
  title: "PersonalLog - Your AI-Powered Personal Log",
  description:
    "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration. Your personal AI assistant for everyday life.",
  url: "https://github.com/SuperInstance/PersonalLog",
  repository: "https://github.com/SuperInstance/PersonalLog",
  author: "SuperInstance",
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
  locale: "en_US",
  type: "website",
  themeColor: "#3b82f6",
  backgroundColor: "#ffffff",
};

/**
 * Open Graph image configuration
 */
const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: SITE_CONFIG.title,
};

/**
 * Twitter card configuration
 */
const TWITTER_CARD = {
  card: "summary_large_image",
  site: "@superinstance",
  creator: "@superinstance",
};

/**
 * Generate page metadata
 *
 * Creates metadata object for a page with optional overrides.
 *
 * @param params - Metadata configuration
 * @returns Next.js Metadata object
 *
 * @example
 * ```ts
 * export const metadata = getPageMetadata({
 *   title: "My Page",
 *   description: "Page description",
 *   path: "/my-page",
 * });
 * ```
 */
export function getPageMetadata(params: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
}): Metadata {
  const {
    title = SITE_CONFIG.title,
    description = SITE_CONFIG.description,
    path = "/",
    image = OG_IMAGE.url,
    noIndex = false,
    keywords = [],
  } = params;

  const url = `${SITE_CONFIG.url}${path}`;
  const fullTitle = title.includes(SITE_CONFIG.name) ? title : `${title} | ${SITE_CONFIG.name}`;

  return {
    title: fullTitle,
    description,
    keywords: [...SITE_CONFIG.keywords, ...keywords],
    authors: [{ name: SITE_CONFIG.author }],
    creator: SITE_CONFIG.author,
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Open Graph
    openGraph: {
      type: SITE_CONFIG.type as "website",
      locale: SITE_CONFIG.locale,
      url,
      title: fullTitle,
      description,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: image,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: fullTitle,
        },
      ],
    },

    // Twitter
    twitter: {
      card: TWITTER_CARD.card as "summary_large_image",
      site: TWITTER_CARD.site,
      creator: TWITTER_CARD.creator,
      title: fullTitle,
      description,
      images: [image],
    },

    // Alternates
    alternates: {
      canonical: url,
    },

    // Icons
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },

    // Manifest
    manifest: "/manifest.json",
  };
}

/**
 * Generate viewport configuration
 *
 * @returns Next.js Viewport object
 */
export function getViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: SITE_CONFIG.themeColor,
    colorScheme: "light dark",
  };
}

/**
 * Generate JSON-LD structured data
 *
 * Creates structured data for SEO and rich snippets.
 *
 * @param params - Structured data configuration
 * @returns JSON-LD script tag
 *
 * @example
 * ```tsx
 * export default function Page() {
 *   return (
 *     <>
 *       {getJsonLd({
 *         type: "WebPage",
 *         name: "My Page",
 *         description: "Page description",
 *       })}
 *       <div>Page content</div>
 *     </>
 *   );
 * }
 * ```
 */
export function getJsonLd(params: {
  type: "WebPage" | "Article" | "BreadcrumbList" | "Organization";
  name: string;
  description?: string;
  url?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  breadcrumbs?: { name: string; url: string }[];
}) {
  const baseUrl = SITE_CONFIG.url;

  let structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": params.type,
    name: params.name,
  };

  if (params.description) {
    structuredData.description = params.description;
  }

  if (params.url) {
    structuredData.url = `${baseUrl}${params.url}`;
  }

  if (params.image) {
    structuredData.image = params.image;
  }

  if (params.datePublished) {
    structuredData.datePublished = params.datePublished;
  }

  if (params.dateModified) {
    structuredData.dateModified = params.dateModified;
  }

  if (params.author) {
    structuredData.author = {
      "@type": "Organization",
      name: params.author,
    };
  }

  if (params.type === "BreadcrumbList" && params.breadcrumbs) {
    structuredData.itemListElement = params.breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`,
    }));
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}

/**
 * Generate conversation page metadata
 *
 * Specialized metadata for conversation pages.
 *
 * @param params - Conversation metadata
 * @returns Metadata object
 */
export function getConversationMetadata(params: {
  id: string;
  title?: string;
  participant?: string;
}): Metadata {
  const { id, title, participant } = params;

  const pageTitle = title || `Conversation with ${participant || "AI"}`;
  const description = participant
    ? `Your conversation with ${participant} in PersonalLog`
    : "A conversation in your PersonalLog";

  return getPageMetadata({
    title: pageTitle,
    description,
    path: `/messenger/conversation/${id}`,
    keywords: participant ? [participant, "conversation", "chat"] : ["conversation", "chat"],
  });
}

/**
 * Generate knowledge page metadata
 *
 * Specialized metadata for knowledge base pages.
 *
 * @param params - Knowledge metadata
 * @returns Metadata object
 */
export function getKnowledgeMetadata(params: {
  query?: string;
  category?: string;
}): Metadata {
  const { query, category } = params;

  const title = query
    ? `Search: ${query}`
    : category
    ? `${category} - Knowledge Base`
    : "Knowledge Base";

  const description = query
    ? `Search results for "${query}" in your PersonalLog knowledge base`
    : category
    ? `Browse ${category} articles and resources in your knowledge base`
    : "Search and explore your PersonalLog knowledge base";

  return getPageMetadata({
    title,
    description,
    path: "/knowledge",
    keywords: ["knowledge", "search", "notes", category || ""].filter(Boolean),
  });
}

/**
 * Generate error page metadata
 *
 * Specialized metadata for error pages (always no-index).
 *
 * @param params - Error metadata
 * @returns Metadata object
 */
export function getErrorMetadata(params: {
  statusCode: number;
  message?: string;
}): Metadata {
  const { statusCode, message } = params;

  return getPageMetadata({
    title: `Error ${statusCode}`,
    description: message || `An error occurred (Status: ${statusCode})`,
    path: "/error",
    noIndex: true,
  });
}
