/**
 * API Version Management
 *
 * Provides version control for API endpoints
 * Supports versioned endpoints and deprecation warnings
 */

export const API_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  preRelease: '' // '', 'alpha', 'beta', 'rc.1'
} as const;

/**
 * Get full version string
 */
export function getVersion(): string {
  const { major, minor, patch, preRelease } = API_VERSION;

  const version = `${major}.${minor}.${patch}`;
  return preRelease ? `${version}-${preRelease}` : version;
}

/**
 * Get package version from package.json
 */
export async function getPackageVersion(): Promise<string> {
  try {
    const packageJson = await import('../package.json');
    return packageJson.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

/**
 * Compare two version strings
 * Returns: -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  // Compare major
  if (v1.major !== v2.major) {
    return v1.major < v2.major ? -1 : 1;
  }

  // Compare minor
  if (v1.minor !== v2.minor) {
    return v1.minor < v2.minor ? -1 : 1;
  }

  // Compare patch
  if (v1.patch !== v2.patch) {
    return v1.patch < v2.patch ? -1 : 1;
  }

  // Compare pre-release
  const prerelease1 = v1.preRelease || '';
  const prerelease2 = v2.preRelease || '';

  if (prerelease1 !== prerelease2) {
    return prerelease1 < prerelease2 ? -1 : 1;
  }

  return 0;
}

/**
 * Parse version string into components
 */
interface VersionComponents {
  major: number;
  minor: number;
  patch: number;
  preRelease: string;
}

function parseVersion(version: string): VersionComponents {
  const main = version.split('-')[0]; // Remove pre-release suffix
  const [majorStr, minorStr = '0', patchStr = '0'] = main.split('.');
  const preRelease = version.includes('-') ? version.split('-')[1] : '';

  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    preRelease
  };
}

/**
 * Check if client version meets minimum required version
 */
export function checkMinimumVersion(
  clientVersion: string,
  minimumVersion: string
): { meetsMinimum: boolean; message: string } {
  const comparison = compareVersions(clientVersion, minimumVersion);

  if (comparison < 0) {
    return {
      meetsMinimum: false,
      message: `Client version ${clientVersion} is below minimum required version ${minimumVersion}. Please update your client.`
    };
  }

  if (comparison === 0) {
    return {
      meetsMinimum: true,
      message: `Client version ${clientVersion} meets minimum requirements.`
    };
  }

  return {
    meetsMinimum: true,
    message: `Client version ${clientVersion} exceeds minimum requirements.`
  };
}

/**
 * Check if client version is deprecated
 */
export interface DeprecationInfo {
  isDeprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  message: string;
}

export function checkDeprecation(
  clientVersion: string,
  apiDeprecation: {
    version: string;
    deprecationDate?: string;
    sunsetDate?: string;
  } = {}
): DeprecationInfo {
  if (!apiDeprecation.version || !apiDeprecation.sunsetDate) {
    return {
      isDeprecated: false,
      message: 'This version is not deprecated.'
    };
  }

  const comparison = compareVersions(clientVersion, apiDeprecation.version);

  if (comparison < 0) {
    // Client version is older than deprecated version
    return {
      isDeprecated: true,
      deprecationDate: apiDeprecation.deprecationDate,
      sunsetDate: apiDeprecation.sunsetDate,
      message: `Client version ${clientVersion} is deprecated. Please update to version ${apiDeprecation.version} or later. Sunset date: ${apiDeprecation.sunsetDate || 'TBD'}.`
    };
  }

  // Client version is same as or newer than deprecated version
  return {
    isDeprecated: false,
    message: 'This version is not deprecated.'
  };
}

/**
 * Get version compatibility headers
 */
export function getVersionHeaders(): Record<string, string> {
  const version = getVersion();

  return {
    'API-Version': version,
    'X-Api-Version': version,
    'X-Minimum-Version': '1.0.0', // Minimum supported version
    'X-Latest-Version': await getPackageVersion(), // Latest available version
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
}

/**
 * Version types for endpoint versioning
 */
export enum EndpointVersion {
  V1 = 'v1',
  V2 = 'v2',
  LATEST = 'latest'
}

/**
 * Get version for specific endpoint
 */
export function getEndpointVersion(endpoint: string, requestedVersion?: string): string {
  // Map endpoints to their versions
  const endpointVersions: Record<string, EndpointVersion> = {
    '/api/comfyui/chat': EndpointVersion.V1,
    '/api/comfyui/chat-advanced': EndpointVersion.V1,
    '/api/comfyui/templates': EndpointVersion.V1,
    '/api/comfyui/assets': EndpointVersion.V1,
    '/api/comfyui/memory': EndpointVersion.V1,
    '/api/comfyui/cross-project': EndpointVersion.V1,
    '/api/notes': EndpointVersion.V1,
    '/api/notes/files': EndpointVersion.V1,
    '/api/notes/transcribe': EndpointVersion.V1
  };

  const version = endpointVersions[endpoint] || EndpointVersion.LATEST;

  // If client requests specific version, check compatibility
  if (requestedVersion) {
    const parsed = parseVersion(requestedVersion);
    const current = parseVersion(getVersion());

    if (parsed.major < current.major || parsed.minor < current.minor) {
      return EndpointVersion.V1; // Fallback to v1 for old clients
    }

    return version;
  }

  return version;
}

/**
 * Version response wrapper
 */
export interface VersionedResponse<T> {
  version: string;
  data: T;
  deprecation?: DeprecationInfo;
  compatibility?: {
    minimumVersion: string;
    recommendedVersion: string;
  };
}

export function createVersionedResponse<T>(
  data: T,
  deprecation?: DeprecationInfo
): VersionedResponse<T> {
  return {
    version: getVersion(),
    data,
    ...(deprecation && { deprecation }),
    compatibility: {
      minimumVersion: '1.0.0',
      recommendedVersion: await getPackageVersion()
    }
  };
}

/**
 * Format deprecation warning for API responses
 */
export function formatDeprecationWarning(
  deprecationDate?: string,
  sunsetDate?: string
): string | null {
  if (!sunsetDate) return null;

  const now = new Date();
  const sunset = new Date(sunsetDate);

  const daysUntilSunset = Math.ceil((sunset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilSunset < 0) {
    return `⚠️ This API version was sunset on ${sunsetDate}. Please update immediately.`;
  }

  if (daysUntilSunset < 30) {
    return `⚠️ This API version will be sunset on ${sunsetDate} (${daysUntilSunset} days remaining). Please update soon.`;
  }

  if (daysUntilSunset < 90) {
    return `ℹ️ This API version will be sunset on ${sunsetDate} (${daysUntilSunset} days remaining). Please plan to update.`;
  }

  return null;
}

/**
 * Check if endpoint requires API version header
 */
export function requiresVersionHeader(endpoint: string): boolean {
  const endpointsRequiringVersion = [
    '/api/comfyui/chat',
    '/api/comfyui/chat-advanced',
    '/api/notes/transcribe',
    '/api/comfyui/memory',
    '/api/comfyui/cross-project'
  ];

  return endpointsRequiringVersion.includes(endpoint);
}
