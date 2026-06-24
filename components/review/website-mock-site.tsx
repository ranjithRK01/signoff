"use client";

import Link from "next/link";

type WebsiteMockSiteProps = {
  variant: 1 | 2;
  pageUrl: string;
  deviceType: "desktop" | "laptop" | "tablet" | "mobile" | "custom";
  onNavigate?: (path: string) => void;
};

export function WebsiteMockSite({ variant, pageUrl, deviceType, onNavigate }: WebsiteMockSiteProps) {
  const isMobile = deviceType === "mobile";
  const heroCtaLarge = variant >= 2;
  const mobileOverlap = variant >= 2 && isMobile;

  const nav = (path: string, label: string) => (
    <button
      type="button"
      onClick={() => onNavigate?.(path)}
      className={`text-sm font-medium transition-colors ${
        pageUrl === path ? "text-indigo-600" : "text-zinc-600 hover:text-zinc-900"
      }`}
    >
      {label}
    </button>
  );

  if (pageUrl === "/pricing") {
    return (
      <div className="min-h-full bg-white text-zinc-900 font-sans">
        <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-lg">ClientCo</span>
          <nav className="flex gap-4">
            {nav("/", "Home")}
            {nav("/pricing", "Pricing")}
          </nav>
        </header>
        <main className="px-6 py-10 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6" id="pricing-title">
            Pricing
          </h1>
          <div
            id="pricing-section"
            className={`grid gap-4 ${variant >= 2 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}
          >
            {["Starter", "Pro", "Team", ...(variant >= 2 ? ["Enterprise"] : [])].map((tier) => (
              <div
                key={tier}
                data-signoff-id={`tier-${tier.toLowerCase()}`}
                className="border border-zinc-200 rounded-xl p-5 shadow-sm"
              >
                <h3 className="font-semibold">{tier}</h3>
                <p className="text-2xl font-bold mt-2">${tier === "Enterprise" ? "Custom" : "49"}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 to-white text-zinc-900 font-sans">
      <header
        className={`border-b border-zinc-200 px-4 md:px-6 py-3 flex items-center justify-between ${
          mobileOverlap ? "relative z-0" : ""
        }`}
      >
        <span className="font-bold text-lg shrink-0">ClientCo</span>
        <nav className={`flex gap-3 ${isMobile ? "text-xs gap-2" : ""}`}>
          {nav("/", "Home")}
          {nav("/pricing", "Pricing")}
        </nav>
      </header>

      <section
        id="hero-section"
        className={`px-4 md:px-6 py-10 md:py-16 text-center ${mobileOverlap ? "pt-16" : ""}`}
      >
        <h1 className={`font-extrabold tracking-tight ${isMobile ? "text-2xl" : "text-4xl md:text-5xl"}`}>
          Ship faster with ClientCo
        </h1>
        <p className="mt-3 text-zinc-600 max-w-lg mx-auto text-sm md:text-base">
          {variant === 1
            ? "The all-in-one platform for agencies and product teams."
            : "Now with improved onboarding and clearer pricing."}
        </p>
        <div className={`mt-6 flex justify-center ${mobileOverlap ? "relative -mt-4 z-20" : ""}`}>
          <button
            id="hero-button"
            type="button"
            data-signoff-id="hero-cta"
            className={`rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg ${
              heroCtaLarge
                ? isMobile
                  ? "px-8 py-4 text-base w-full max-w-xs"
                  : "px-10 py-4 text-lg"
                : isMobile
                  ? "px-5 py-2.5 text-sm"
                  : "px-6 py-3 text-sm"
            }`}
          >
            {variant >= 2 ? "Get Started Free" : "Get Started"}
          </button>
        </div>
        {mobileOverlap && (
          <p className="mt-2 text-[10px] text-amber-600 font-medium">POC: mobile CTA overlap demo (v2)</p>
        )}
      </section>

      <section
        id="pricing-section"
        className="px-4 md:px-6 py-12 border-t border-zinc-100 bg-white"
      >
        <h2 className="text-xl font-bold text-center mb-6">Simple pricing</h2>
        <div className={`grid gap-4 max-w-3xl mx-auto ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          {["Starter", "Pro", "Team"].map((tier) => (
            <div key={tier} className="border border-zinc-200 rounded-lg p-4 text-center">
              <p className="font-semibold">{tier}</p>
              <p className="text-indigo-600 font-bold mt-1">$29/mo</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-4 text-sm text-zinc-500">
          <Link href="#" onClick={(e) => e.preventDefault()} className="text-indigo-600">
            See full pricing →
          </Link>{" "}
          (navigate via Pricing tab)
        </p>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-zinc-400 border-t border-zinc-100">
        Mock staging site • Version {variant} • Signoff.AI POC
      </footer>
    </div>
  );
}
