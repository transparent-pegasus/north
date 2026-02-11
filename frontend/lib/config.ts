/**
 * Application Configuration
 *
 * All static configuration values and environment variable lookups should be centralized here.
 * This file replaces the need for .env files for common/public settings.
 */

const isProduction = process.env.NODE_ENV === "production";
const isDebug = process.env.NEXT_PUBLIC_SHOW_DEBUG === "true";

// Helper to safely parse limits
const parseLimit = (val: string | undefined, defaultVal: number) => {
  if (val === undefined || val === "") return defaultVal;
  const n = Number(val);
  return Number.isNaN(n) ? defaultVal : n;
};

export const config = {
  // Environment flags
  isProduction,
  isDebug,
  showDebug: isDebug,

  // API Configuration
  api: {
    // In production (without debug flag), we should NEVER use a localhost URL.
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "",
  },

  // Firebase Client Configuration
  // These values are public and safe to be exposed in the client bundle.
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  },

  // Feature Limits (Client-side mirror of backend limits for UI)
  limits: {
    decompose: parseLimit(process.env.NEXT_PUBLIC_LIMIT_DECOMPOSE, 3),
    refine: parseLimit(process.env.NEXT_PUBLIC_LIMIT_REFINE, 3),
    research: parseLimit(process.env.NEXT_PUBLIC_LIMIT_RESEARCH, 3),
    maxTrees: parseLimit(process.env.NEXT_PUBLIC_LIMIT_MAX_TREES, 10),
  },
};
