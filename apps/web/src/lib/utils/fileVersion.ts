/**
 * Utilities for managing file versions in URLs
 * These are shared between client and server code
 */

/**
 * Get the version number from a URL
 * @param url - The URL to extract version from
 * @returns The version number, or 0 if no version found
 */
export function getVersionFromUrl(url: string | null | undefined): number {
  if (!url) return 0;

  const match = url.match(/[?&]v=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Increment the version in a URL
 * @param currentUrl - The current URL (may include version)
 * @param basePath - The base path without version (e.g., "fog/123.png")
 * @returns The new URL with incremented version
 */
export function incrementUrlVersion(currentUrl: string | null | undefined, basePath: string): string {
  const currentVersion = getVersionFromUrl(currentUrl);
  const newVersion = currentVersion + 1;
  return `${basePath}?v=${newVersion}`;
}

/**
 * Remove version parameter from URL
 * @param url - The URL to remove version from
 * @returns The URL without version parameter
 */
export function removeVersionFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/[?&]v=\d+/, '');
}

/**
 * Set a specific version on a URL
 * @param url - The URL to set version on
 * @param version - The version number to set
 * @returns The URL with the specified version
 */
export function setUrlVersion(url: string, version: number): string {
  const baseUrl = removeVersionFromUrl(url);
  return `${baseUrl}?v=${version}`;
}
