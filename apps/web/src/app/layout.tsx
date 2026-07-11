import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Fontes self-hosted pelo Next (zero requisição a CDN externo — importante
// para Android de entrada em rede de fábrica instável). O preload de fonte
// crítica e o font-display: swap já vêm automáticos com next/font.
const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const data = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrdireOS",
  description: "Gestão operacional para facções têxteis",
};

// themeColor/colorScheme viram <meta> automaticamente via Next — não
// desabilita zoom (sem maximum-scale/user-scalable=no).
export const viewport: Viewport = {
  themeColor: "#F7F4EE",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable} ${data.variable}`}>
      <body>{children}</body>
    </html>
  );
}
