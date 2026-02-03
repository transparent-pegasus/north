// Force disable gRPC BEFORE any imports
process.env.GOOGLE_CLOUD_DISABLE_GRPC = "true";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "north-c409d";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

console.log("Initializing App...");
initializeApp();

console.log("Initializing Firestore...");
const db = getFirestore();

// Try to make a settings change to force connection initialization
db.settings({ ignoreUndefinedProperties: true });

async function test() {
  console.log("Test: Fetching trees...");
  try {
    const snapshot = await db.collection("users").limit(1).get();

    console.log("Success! Docs found:", snapshot.size);
  } catch (e) {
    console.error("Failed:", e);
  }
}

test();
