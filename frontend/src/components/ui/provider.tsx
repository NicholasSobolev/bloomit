"use client";

import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import "@fontsource-variable/rubik/index.css";

// Create custom system with Rubik
const customSystem = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        heading: { value: "Rubik" },
        body: { value: "Rubik" },
      },
    },
  },
});

interface ProviderProps {
  children: ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return (
    <ChakraProvider value={customSystem}>
      <ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </ChakraProvider>
  );
}
