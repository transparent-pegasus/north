import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "north-c409d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
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
