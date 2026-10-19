import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TurnUp",
  description: "An event sharing platform for Students and Organisers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
