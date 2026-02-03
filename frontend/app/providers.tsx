"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { ModalProvider } from "@/components/ModalProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="system">
        <ModalProvider>{children}</ModalProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
