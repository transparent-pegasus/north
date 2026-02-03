// Set emulator env vars only if running in emulator
if (process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  // Disable gRPC to avoid Node 22 buffer issues (ERR_BUFFER_OUT_OF_BOUNDS)
  process.env.GOOGLE_CLOUD_DISABLE_GRPC = "true";

  // Ensure project ID is set for emulator to avoid signature issues
  if (!process.env.GCLOUD_PROJECT) {
    process.env.GCLOUD_PROJECT = "north-c409d";
  }

  console.log("DEBUG: setup.ts - Applied Emulator Settings");
  console.log("DEBUG: setup.ts - Project ID:", process.env.GCLOUD_PROJECT);
}
