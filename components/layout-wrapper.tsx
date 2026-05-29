"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "sonner";

function isAgencyReviewWorkspace(pathname: string | null) {
  return Boolean(pathname?.match(/^\/projects\/[^/]+\/reviews\/[^/]+$/));
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isClientReview = pathname?.startsWith("/review/");
  const isImmersiveReview = isClientReview || isAgencyReviewWorkspace(pathname);

  if (isImmersiveReview) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background text-zinc-900">
        <main className="w-full min-h-screen min-h-[100dvh]">{children}</main>
        <Toaster position="top-right" closeButton richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-900 flex">
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
