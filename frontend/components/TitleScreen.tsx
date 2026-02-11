"use client";

import { GoogleAuthProvider, signInAnonymously, signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { config } from "@/lib/config";
import { auth } from "@/lib/firebase";

function CompassLogoLarge() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 24 24"
      fill="none"
      className="text-stone-800 dark:text-stone-100"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0.8" />
      <path d="M12 5L16 16H8L12 5Z" fill="currentColor" opacity="0.9" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ... imports ... lines removed

// ... (TitleScreen component logic) lines removed

// ...

import { Button, Card, CardBody } from "@heroui/react";

export default function TitleScreen() {
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with Google.");
      setGoogleLoading(false);
    }
    // Note: We don't set loading back to false on success because the page will redirect/unmount
  };

  const handleAnonymousLogin = async () => {
    setAnonLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in anonymously.");
      setAnonLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full animate-in fade-in zoom-in duration-500 shadow-xl">
        <CardBody className="flex flex-col items-center gap-8 py-10">
          {/* Logo Area */}
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-default-100 dark:bg-default-50 border border-default-200">
              <CompassLogoLarge />
            </div>
            <h1 className="text-5xl font-bold tracking-tighter text-foreground">North</h1>
            <p className="text-default-500 font-medium tracking-wide text-center">
              Navigate your thoughts to the ideal state
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
            <Button
              onPress={handleGoogleLogin}
              isDisabled={googleLoading}
              size="lg"
              variant="bordered"
              color="default"
              startContent={<GoogleIcon />}
              className="w-full h-14 font-bold bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700 flex items-center justify-center gap-3"
            >
              Googleでログイン
            </Button>

            <Button
              onPress={handleAnonymousLogin}
              isLoading={anonLoading}
              variant="flat"
              color="default"
              className="w-full h-12 font-medium text-stone-600 dark:text-stone-400 flex items-center justify-center"
            >
              ゲストとして始める
            </Button>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          {config.showDebug && (
            <div className="mt-4 text-xs text-center text-default-400">
              <p>
                Mode: {config.isProduction ? "Local Build (Debug)" : "Development (Hot Reload)"}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
