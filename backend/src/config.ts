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
    decompose: process.env.LIMIT_DECOMPOSE ? Number(process.env.LIMIT_DECOMPOSE) : 3,
    refine: process.env.LIMIT_REFINE ? Number(process.env.LIMIT_REFINE) : 3,
    research: process.env.LIMIT_RESEARCH ? Number(process.env.LIMIT_RESEARCH) : 3,
    maxTrees: process.env.LIMIT_MAX_TREES ? Number(process.env.LIMIT_MAX_TREES) : 10,
  },

  // Google Cloud Options
  googleCloud: {
    disableGrpc: true, // GOOGLE_CLOUD_DISABLE_GRPC
  },
};
