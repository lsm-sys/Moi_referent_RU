import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moi referent RU",
  description: "Обработка франкоязычных статей для соцсетей",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
