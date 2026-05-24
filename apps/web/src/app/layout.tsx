import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrdireOS",
  description: "Gestão operacional para facções têxteis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
