"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWebsiteIframeSrc, isMockReviewUrl } from "@/lib/websiteViewer";
import { WebsiteMockSite } from "@/components/review/website-mock-site";
import type { ReviewItem } from "@/lib/types";

type SimpleSiteViewerProps = {
  reviewUrl: string;
  mockVariant?: 1 | 2;
  items: ReviewItem[];
  activeItemId: string | null;
  pendingPin?: { x: number; y: number } | null;
  onSelectItem: (id: string) => void;
  onPlacePin: (x: number, y: number) => void;
  placingPin: boolean;
};

const LOAD_TIMEOUT_MS = 45_000;

export function SimpleSiteViewer({
  reviewUrl,
  mockVariant = 1,
  items,
  activeItemId,
  pendingPin = null,
  onSelectItem,
  onPlacePin,
  placingPin,
}: SimpleSiteViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [loadMode, setLoadMode] = useState<"proxy" | "direct">("proxy");
  const showMock = isMockReviewUrl(reviewUrl) || !reviewUrl.trim();

  useEffect(() => {
    loadedRef.current = false;
    setLoaded(false);
    setError(false);
    setLoadMode("proxy");
  }, [reviewUrl]);

  useEffect(() => {
    if (showMock) return;

    const timeout = window.setTimeout(() => {
      if (!loadedRef.current) {
        setError(true);
      }
    }, LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [reviewUrl, showMock, loadMode]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingPin || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPlacePin(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
  };

  const handleIframeLoad = () => {
    loadedRef.current = true;
    setLoaded(true);
    setError(false);
  };

  const switchLoadMode = () => {
    loadedRef.current = false;
    setLoaded(false);
    setError(false);
    setLoadMode((m) => (m === "proxy" ? "direct" : "proxy"));
  };

  const pins = items.filter(
    (i) => i.annotation && (i.annotation.xPercent != null || i.annotation.x != null)
  );

  const iframeSrc = showMock ? "" : getWebsiteIframeSrc(reviewUrl, loadMode);

  return (
    <div className="flex flex-col h-full bg-zinc-100">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white border-b border-zinc-200">
        <p className="flex-1 truncate text-xs text-zinc-600 font-mono" title={reviewUrl}>
          {showMock ? "Staging preview (demo)" : reviewUrl}
        </p>
        {!showMock && (
          <>
            <span className="text-[10px] text-zinc-400 shrink-0 hidden sm:inline">
              {loadMode === "proxy" ? "Proxy" : "Direct"}
            </span>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1 shrink-0"
            >
              Open site <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
        {placingPin && (
          <span className="text-xs font-medium text-indigo-600 shrink-0">
            Click on the page to mark an issue
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 flex justify-center p-4 overflow-auto">
        <div
          className="relative bg-white shadow-md rounded-lg overflow-hidden border border-zinc-200"
          style={{ width: "100%", maxWidth: 1280, aspectRatio: "16/10" }}
        >
          {showMock ? (
            <WebsiteMockSite
              variant={mockVariant}
              pageUrl="/"
              deviceType="desktop"
            />
          ) : (
            <>
              {iframeSrc && (
                <iframe
                  key={`${loadMode}-${reviewUrl}`}
                  src={iframeSrc}
                  title="Review site"
                  className={cn(
                    "w-full h-full min-h-[480px] border-0",
                    placingPin && "pointer-events-none"
                  )}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  onLoad={handleIframeLoad}
                />
              )}

              {!loaded && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/90 z-10 gap-2 pointer-events-none">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <span className="text-xs text-zinc-500">Loading live site…</span>
                </div>
              )}

              {error && !placingPin && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-zinc-600 z-20 bg-zinc-50/95 pointer-events-auto">
                  <p>Still loading or this site blocks embedding.</p>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Open site in a new tab <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    className="text-xs text-indigo-600 font-semibold underline"
                    onClick={switchLoadMode}
                  >
                    Try {loadMode === "proxy" ? "direct" : "proxy"} embed
                  </button>
                </div>
              )}
            </>
          )}

          <div
            ref={overlayRef}
            className={cn(
              "absolute inset-0 z-30",
              placingPin ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
            )}
            onClick={handleClick}
            onPointerDown={(e) => {
              if (placingPin) e.preventDefault();
            }}
          >
            {pendingPin && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold ring-2 ring-white shadow-md animate-pulse"
                style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                aria-hidden
              >
                +
              </span>
            )}
            {pins.map((item) => {
              const x = item.annotation!.xPercent ?? item.annotation!.x ?? 0;
              const y = item.annotation!.yPercent ?? item.annotation!.y ?? 0;
              const isActive = item.id === activeItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-full flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-md transition-transform ${
                    isActive
                      ? "bg-indigo-600 text-white ring-2 ring-white scale-110"
                      : "bg-rose-500 text-white hover:scale-105"
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(item.id);
                  }}
                >
                  {item.itemNumber}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
