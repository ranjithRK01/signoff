import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "QuickQA | Live App Review & Signoff",
  description: "Review → Fix → Validate → Approve → Signoff for live web applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
      <body className="bg-background min-h-screen">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ClerkProvider>
      </body>
    </html>
  );
}
