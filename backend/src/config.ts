/**
 * Backend Configuration
 *
 * Centralized configuration for the backend functions.
 */

export const config = {
  // AI Model Configuration
  gemini: {
    model: "gemini-3-flash-preview",
  },

  // Feature Rate Limits (Daily)
  limits: {
    decompose: 100,
    refine: 100,
    research: 100,
  },

  // Google Cloud Options
  googleCloud: {
    disableGrpc: true, // GOOGLE_CLOUD_DISABLE_GRPC
  },
};
