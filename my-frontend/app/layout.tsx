import type { Metadata } from "next";
import { Noto_Sans_JP, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import "./globals.css";

const vvSans = Noto_Sans_JP({
  variable: "--font-vv-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

const vvDisplay = Playfair_Display({
  variable: "--font-vv-display",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "VietVibe",
  description: "Vietnamese listening practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${vvSans.variable} ${vvDisplay.variable} h-full antialiased `}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
