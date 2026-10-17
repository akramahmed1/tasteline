import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TasteLine: the learning concierge with taste",
  description:
    "An executive learning concierge powered by Qloo's taste graph. Taste is the missing input to professional planning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
