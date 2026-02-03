/**
 * API client configuration.
 * In production, API calls go to Firebase Functions.
 * In development, API calls go to the local Next.js API routes or Functions emulator.
 */

import { config } from "./config";

// In production (without debug flag), we should NEVER use a localhost URL.
// If NEXT_PUBLIC_API_URL is set to localhost but we are in production, ignore it.
const rawApiUrl = config.api.baseUrl;
const isLocalhostUrl = rawApiUrl.includes("localhost") || rawApiUrl.includes("127.0.0.1");

const API_BASE_URL = config.isProduction && !config.isDebug && isLocalhostUrl ? "" : rawApiUrl;

/**
 * Get the full URL for an API endpoint.
 * @param path - API path (e.g., "/api/trees")
 * @returns Full URL for the API endpoint
 */
export function getApiUrl(path: string): string {
  // If in production/hosting (empty base URL), use relative path
  if (!API_BASE_URL) {
    return path.startsWith("/api") ? path : `/api${path}`;
  }

  // Normalize base URL (remove trailing slash)
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  // Normalize path (ensure leading slash)
  const endpoint = path.startsWith("/") ? path : `/${path}`;

  // If baseUrl ends with /api and endpoint starts with /api, avoid duplication
  // e.g. baseUrl=.../api, endpoint=/api/trees -> .../api/trees
  if (baseUrl.endsWith("/api") && endpoint.startsWith("/api")) {
    return `${baseUrl.slice(0, -4)}${endpoint}`;
  }

  return `${baseUrl}${endpoint}`;
}

import { auth } from "./firebase";

/**
 * Fetch wrapper that automatically uses the correct API base URL, adds Auth token, and handles timeout.
 * @param path - API path (e.g., "/api/trees")
 * @param init - Fetch init options including an optional timeout (ms)
 * @returns Fetch response promise
 */
export async function apiFetch(
  path: string,
  init?: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = 300000, ...fetchInit } = init || {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const headers = new Headers(fetchInit.headers);

  // Add Firebase ID Token if user is logged in
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();

    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(getApiUrl(path), {
      ...fetchInit,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);

    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}
