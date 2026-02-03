import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

import { config } from "./config";

export const app = getApps().length === 0 ? initializeApp(config.firebase) : getApps()[0];
export const auth = getAuth(app);

// Analytics (Client-side only)
export const initAnalytics = async () => {
  if (typeof window !== "undefined") {
    const { getAnalytics, isSupported } = await import("firebase/analytics");

    if (await isSupported()) {
      return getAnalytics(app);
    }
  }

  return null;
};

// Connect to emulators in development
// Note: This assumes auth emulator is running on default port 9099.
// You might want to make this configurable via env var if needed.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  // Prevent connecting multiple times which can throw error
  // if (!auth.emulatorConfig) {
  //   connectAuthEmulator(auth, "http://127.0.0.1:9099");
  // }
  // Actually, connectAuthEmulator should only be called once.
  // Using (auth as any).emulatorConfig to check if already connected.
  if (!(auth as any).emulatorConfig) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
  }
}
