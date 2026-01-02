/**
 * Robots.txt Generator
 *
 * Generates robots.txt dynamically for SEO.
 * Prevents indexing of API routes and private areas.
 *
 * @module app/robots
 */

import type { MetadataRoute } from "next";

/**
 * Generate robots.txt
 *
 * @returns robots.txt configuration
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://github.com/SuperInstance/PersonalLog";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/static/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
