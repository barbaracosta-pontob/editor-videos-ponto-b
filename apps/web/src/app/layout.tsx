import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ponto B — Editor de Reels",
  description: "Ponto B — gerador de reels",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
