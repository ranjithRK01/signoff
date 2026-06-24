"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "sonner";
import { SyncUser } from "@/components/auth/SyncUser";
import { ExtensionAuthSync } from "@/components/auth/ExtensionAuthSync";

function isAgencyReviewWorkspace(pathname: string | null) {
  return Boolean(pathname?.match(/^\/projects\/[^/]+\/reviews\/[^/]+/));
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  const isClientReview = pathname?.startsWith("/review/");
  const isImmersiveReview = isClientReview || isAgencyReviewWorkspace(pathname);
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  // Loading state to prevent flicker
  if (!isLoaded) return null;

  // Show only content for landing page, auth pages, or immersive reviews
  if (isImmersiveReview || isAuthPage || isLandingPage) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background text-zinc-900">
        <SyncUser />
        <ExtensionAuthSync />
        <main className="w-full min-h-screen min-h-[100dvh]">{children}</main>
        <Toaster position="top-right" closeButton richColors />
      </div>
    );
  }

  // Redirect logic is handled by middleware, so we just render the dashboard layout if signed in
  return (
    <div className="min-h-screen bg-background text-zinc-900 flex">
      <SyncUser />
      <ExtensionAuthSync />
      {/* Fixed Sidebar */}
      <Sidebar />
      
      {/* Content Area */}
      <div className="flex-1 pl-60 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-8 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      
      <Toaster position="top-right" closeButton richColors />
    </div>
  );
}
