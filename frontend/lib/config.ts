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
    apiKey: "AIzaSyBzRQyIn6Hoa8KqEb8NVgebjO_FwIPk-ug",
    authDomain: "north-c409d.firebaseapp.com",
    projectId: "north-c409d",
    storageBucket: "north-c409d.firebasestorage.app",
    messagingSenderId: "895054828509",
    appId: "1:895054828509:web:80f2200ad7d2b246bedc34",
    measurementId: "G-WPLRCNH856",
  },

  // Feature Limits (Client-side mirror of backend limits for UI)
  limits: {
    decompose: parseLimit(process.env.NEXT_PUBLIC_LIMIT_DECOMPOSE, 3),
    refine: parseLimit(process.env.NEXT_PUBLIC_LIMIT_REFINE, 3),
    research: parseLimit(process.env.NEXT_PUBLIC_LIMIT_RESEARCH, 3),
    maxTrees: parseLimit(process.env.NEXT_PUBLIC_LIMIT_MAX_TREES, 10),
  },
};
