/**
 * src/app/layout.tsx
 * -------------------
 * Defines the global App Router layout for Next.js. This file sets up global metadata,
 * loads shared fonts, imports global styles, and wraps every page with the common
 * <html>/<body> structure so nested routes inherit consistent styling.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load the Geist font families and expose them as CSS variables for use across the app.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Global <head> metadata used by Next.js for SEO and social previews.
export const metadata: Metadata = {
  title: "Games Research Map",
  description: "CHI PLAY institutions map",
};

// Wraps all pages/components rendered by the App Router. The font variables are applied
// on the <body> element so every descendant automatically picks up the typography styles.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}>
        {children}
      </body>
    </html>
  );
}
