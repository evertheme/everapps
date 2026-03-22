import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: "variable",
});

export const metadata: Metadata = {
  title: "everapps — Requirements Backlog",
  description: "Convert requirement documents into reviewed, version-controlled backlogs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
