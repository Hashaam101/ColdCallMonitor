import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/components/notifications";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cold Calls Dashboard",
  description: "Team collaboration dashboard for cold call data management",
  icons: {
    icon: [
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/favicon/site.webmanifest",
  appleWebApp: {
    title: "Cold Calls Dashboard",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

