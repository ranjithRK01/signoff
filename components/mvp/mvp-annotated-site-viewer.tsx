"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, Square, ArrowRight, MousePointer, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  annotationToViewportPercent,
  DEFAULT_FRAME_SCROLL,
  isDocumentAnchored,
  pendingToViewportPercent,
  readIframeScrollMetrics,
  resolveItemPosition,
  type FrameScrollState,
} from "@/lib/annotationGeometry";
import {
  getWebsiteIframeSrc,
  getInitialWebsiteLoadMode,
  isMockReviewUrl,
  normalizeReviewUrl,
} from "@/lib/websiteViewer";
import { WebsiteMockSite } from "@/components/review/website-mock-site";
import type { PendingAnnotation } from "@/components/review/image-annotation-canvas";
import type { AnnotationKind } from "@/lib/api";
import { itemsToIframeMarkers } from "@/lib/iframeMarkers";
import type { DocumentAnchor } from "@/lib/annotationGeometry";
import type { AnnotationCapture, ReviewItem } from "@/lib/types";

type MvpAnnotatedSiteViewerProps = {
  reviewUrl: string;
  mockVariant?: 1 | 2;
  items: ReviewItem[];
  activeItemId: string | null;
  tool: AnnotationKind;
  onToolChange: (t: AnnotationKind) => void;
  pending: PendingAnnotation | null;
  onPendingChange: (p: PendingAnnotation | null) => void;
  onSelectItem: (id: string) => void;
  framePageUrl: string;
  onFramePageUrlChange: (url: string) => void;
  viewportCaptureRef?: React.MutableRefObject<HTMLDivElement | null>;
  iframeRef?: React.MutableRefObject<HTMLIFrameElement | null>;
  onFrameScrollChange?: (frame: FrameScrollState) => void;
  /** False when viewing an older version — pins are hidden for that version only */
  canAnnotate?: boolean;
};

const DIRECT_LOAD_TIMEOUT_MS = 12_000;
const PROXY_LOAD_TIMEOUT_MS = 45_000;

function getPercentFromEvent(e: React.MouseEvent, rect: DOMRect) {
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function MvpAnnotatedSiteViewer({
  reviewUrl,
  mockVariant = 1,
  items,
  activeItemId,
  tool,
  onToolChange,
  pending,
  onPendingChange,
  onSelectItem,
  framePageUrl,
  onFramePageUrlChange,
  viewportCaptureRef,
  iframeRef: iframeRefProp,
  onFrameScrollChange,
  canAnnotate = true,
}: MvpAnnotatedSiteViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const localIframeRef = useRef<HTMLIFrameElement>(null);
  const [frameScroll, setFrameScroll] = useState<FrameScrollState>(DEFAULT_FRAME_SCROLL);
  const [overlaySize, setOverlaySize] = useState({ width: 1280, height: 720 });
  const setIframeRef = (el: HTMLIFrameElement | null) => {
    (localIframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    if (iframeRefProp) {
      (iframeRefProp as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    }
  };
  const loadedRef = useRef(false);

  const canonicalUrl = normalizeReviewUrl(reviewUrl);
  const showMock = isMockReviewUrl(reviewUrl) || !canonicalUrl;
  const invalidUrl = Boolean(reviewUrl.trim()) && !canonicalUrl && !isMockReviewUrl(reviewUrl);
  const [loadMode, setLoadMode] = useState<"direct" | "proxy">(() =>
    getInitialWebsiteLoadMode(reviewUrl)
  );
  const [loaded, setLoaded] = useState(showMock);
  const [error, setError] = useState(false);
  const [browseMode, setBrowseMode] = useState(true);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<PendingAnnotation | null>(null);

  const iframeSrc = showMock || invalidUrl ? "" : getWebsiteIframeSrc(reviewUrl, loadMode);
  const annotateMode = canAnnotate && !browseMode && !showMock;
  const useIframeMarkers = !showMock && loadMode === "proxy" && loaded;
  const scrollAnchoringActive = useIframeMarkers && frameScroll.viewportWidth > 0;

  const visibleItems = items.filter((item) => {
    if (!item.annotation) return false;
    if (
      !isDocumentAnchored(item.annotation) &&
      (frameScroll.scrollY > 0 || frameScroll.scrollX > 0)
    ) {
      return false;
    }
    return true;
  });

  const getOverlayRect = useCallback(() => {
    const rect = overlayRef.current?.getBoundingClientRect();
    return {
      width: rect?.width ?? overlaySize.width,
      height: rect?.height ?? overlaySize.height,
    };
  }, [overlaySize]);

  const attachDocumentAnchor = useCallback(
    (vp: PendingAnnotation): PendingAnnotation => {
      if (!scrollAnchoringActive) return vp;
      const size = getOverlayRect();
      
      const vw = frameScroll.viewportWidth || size.width || 1;
      const vh = frameScroll.viewportHeight || size.height || 1;
      const sx = frameScroll.scrollX;
      const sy = frameScroll.scrollY;

      // vp.x/y are percentages (0-100)
      const anchor = {
        x: sx + (vp.x / 100) * vw,
        y: sy + (vp.y / 100) * vh,
        width: vp.width != null ? (vp.width / 100) * vw : undefined,
        height: vp.height != null ? (vp.height / 100) * vh : undefined,
        scroll: { x: sx, y: sy },
        documentSize: {
          width: frameScroll.scrollWidth || vw,
          height: frameScroll.scrollHeight || vh,
        },
        viewport: { width: vw, height: vh },
      };

      return {
        ...vp,
        anchor,
      };
    },
    [frameScroll, getOverlayRect, scrollAnchoringActive]
  );

  const resolveItemPositionLocal = useCallback(
    (annotation: AnnotationCapture) =>
      annotationToViewportPercent(annotation, frameScroll, getOverlayRect()),
    [frameScroll, getOverlayRect]
  );

  const displayPreview = (() => {
    const p = dragPreview || pending;
    if (!p) return null;
    if (p.anchor && scrollAnchoringActive) {
      return pendingToViewportPercent(p, frameScroll, getOverlayRect());
    }
    return { x: p.x, y: p.y, width: p.width, height: p.height, endX: p.endX, endY: p.endY };
  })();

  useEffect(() => {
    loadedRef.current = false;
    setLoaded(showMock);
    setError(false);
    setLoadMode(getInitialWebsiteLoadMode(reviewUrl));
    setBrowseMode(true);
    onFramePageUrlChange(canonicalUrl ?? reviewUrl);
  }, [reviewUrl, canonicalUrl, showMock, onFramePageUrlChange]);

  useEffect(() => {
    if (showMock) return;
    const timeoutMs =
      loadMode === "direct" ? DIRECT_LOAD_TIMEOUT_MS : PROXY_LOAD_TIMEOUT_MS;
    const timeout = window.setTimeout(() => {
      if (loadedRef.current) return;
      if (loadMode === "direct") {
        setLoadMode("proxy");
        setLoaded(false);
        return;
      }
      setError(true);
    }, timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [reviewUrl, showMock, loadMode]);

  const buildPendingFromIframeDoc = useCallback(
    (data: {
      kind: "pin" | "rectangle" | "arrow";
      x: number;
      y: number;
      width?: number;
      height?: number;
      endX?: number;
      endY?: number;
    }): PendingAnnotation => {
      const vw = frameScroll.viewportWidth || overlaySize.width || 1;
      const vh = frameScroll.viewportHeight || overlaySize.height || 1;

      const anchor: DocumentAnchor = {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        endX: data.endX,
        endY: data.endY,
        scroll: { x: frameScroll.scrollX, y: frameScroll.scrollY },
        scrollRoot: frameScroll.scrollRoot,
        documentSize: {
          width: frameScroll.scrollWidth || vw,
          height: frameScroll.scrollHeight || vh,
        },
        viewport: { width: vw, height: vh },
      };

      // In the bridge script, data.x/y are already document pixels
      // We need to convert them to viewport percentages for the parent overlay
      const rx = data.x - frameScroll.scrollX;
      const ry = data.y - frameScroll.scrollY;

      return {
        kind: data.kind,
        x: (rx / vw) * 100,
        y: (ry / vh) * 100,
        width: data.width != null ? (data.width / vw) * 100 : undefined,
        height: data.height != null ? (data.height / vh) * 100 : undefined,
        endX: data.endX != null ? ((data.endX - frameScroll.scrollX) / vw) * 100 : undefined,
        endY: data.endY != null ? ((data.endY - frameScroll.scrollY) / vh) * 100 : undefined,
        anchor,
      };
    },
    [frameScroll, overlaySize]
  );

  const postMarkersToIframe = useCallback(() => {
    if (!useIframeMarkers) return;
    const win = localIframeRef.current?.contentWindow;
    if (!win) return;

    let preview: ReturnType<typeof itemsToIframeMarkers>[0] | null = null;
    if (pending?.anchor) {
      preview = {
        id: "preview",
        itemNumber: 0,
        kind: pending.kind,
        x: pending.anchor.x,
        y: pending.anchor.y,
        width: pending.anchor.width,
        height: pending.anchor.height,
        endX: pending.anchor.endX,
        endY: pending.anchor.endY,
      };
    }

    win.postMessage(
      {
        type: "signoff-sync-markers",
        markers: itemsToIframeMarkers(visibleItems, activeItemId),
        annotateMode,
        tool,
        preview,
      },
      "*"
    );
  }, [useIframeMarkers, visibleItems, activeItemId, annotateMode, tool, pending]);

  useEffect(() => {
    postMarkersToIframe();
  }, [postMarkersToIframe]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "signoff-annotate") {
        const d = ev.data as {
          kind: "pin" | "rectangle" | "arrow";
          x: number;
          y: number;
          width?: number;
          height?: number;
          endX?: number;
          endY?: number;
        };
        onPendingChange(buildPendingFromIframeDoc(d));
        return;
      }
      if (ev.data?.type === "signoff-switch-load-mode") {
        setLoadMode(ev.data.mode);
        setLoaded(false);
        loadedRef.current = false;
        return;
      }
      if (ev.data?.type === "signoff-marker-click" && typeof ev.data.id === "string") {
        onSelectItem(ev.data.id);
        return;
      }
      if (ev.data?.type === "signoff-frame-nav" && typeof ev.data.href === "string") {
        const href = ev.data.href as string;
        if (href.includes("/api/website-proxy")) return;
        if (canonicalUrl) {
          try {
            const base = new URL(canonicalUrl);
            const reported = new URL(href);
            if (reported.origin === base.origin) {
              onFramePageUrlChange(reported.toString());
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (ev.data?.type === "signoff-frame-scroll") {
        const next: FrameScrollState = {
          scrollX: Number(ev.data.scrollX) || 0,
          scrollY: Number(ev.data.scrollY) || 0,
          scrollWidth: Number(ev.data.scrollWidth) || 0,
          scrollHeight: Number(ev.data.scrollHeight) || 0,
          viewportWidth: Number(ev.data.viewportWidth) || 0,
          viewportHeight: Number(ev.data.viewportHeight) || 0,
          scrollRoot:
            typeof ev.data.scrollRoot === "string" ? ev.data.scrollRoot : undefined,
        };
        setFrameScroll(next);
        onFrameScrollChange?.(next);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    onFramePageUrlChange,
    onFrameScrollChange,
    buildPendingFromIframeDoc,
    onPendingChange,
    onSelectItem,
  ]);

  useEffect(() => {
    if (showMock || !loaded) return;
    let raf = 0;
    const poll = () => {
      const next = readIframeScrollMetrics(localIframeRef.current);
      if (next) {
        setFrameScroll((prev) => {
          if (
            prev.scrollX === next.scrollX &&
            prev.scrollY === next.scrollY &&
            prev.scrollRoot === next.scrollRoot
          ) {
            return prev;
          }
          onFrameScrollChange?.(next);
          return next;
        });
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [showMock, loaded, loadMode, onFrameScrollChange]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setOverlaySize({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loaded, showMock]);

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (useIframeMarkers || !annotateMode || !overlayRef.current || pending) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);

    if (tool === "pin") {
      onPendingChange(attachDocumentAnchor({ kind: "pin", x, y }));
      return;
    }
    setDragStart({ x, y });
    if (tool === "rectangle") {
      setDragPreview({ kind: "rectangle", x, y, width: 0, height: 0 });
    } else if (tool === "arrow") {
      setDragPreview({ kind: "arrow", x, y, endX: x, endY: y });
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (useIframeMarkers || !overlayRef.current || !dragStart || !annotateMode) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);
    if (tool === "rectangle") {
      const n = normalizeRect(dragStart.x, dragStart.y, x, y);
      setDragPreview({ kind: "rectangle", x: n.x, y: n.y, width: n.width, height: n.height });
    } else if (tool === "arrow") {
      setDragPreview({ kind: "arrow", x: dragStart.x, y: dragStart.y, endX: x, endY: y });
    }
  };

  const handleOverlayMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (useIframeMarkers || !overlayRef.current || !dragStart || !annotateMode) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);

    if (tool === "rectangle") {
      const n = normalizeRect(dragStart.x, dragStart.y, x, y);
      if (n.width > 1 && n.height > 1) {
        onPendingChange(
          attachDocumentAnchor({
            kind: "rectangle",
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
          })
        );
      }
    } else if (tool === "arrow") {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 2) {
        onPendingChange(
          attachDocumentAnchor({
            kind: "arrow",
            x: dragStart.x,
            y: dragStart.y,
            endX: x,
            endY: y,
          })
        );
      }
    }
    setDragStart(null);
    setDragPreview(null);
  };

  const retryLoad = () => {
    loadedRef.current = false;
    setLoaded(false);
    setError(false);
    setLoadMode(getInitialWebsiteLoadMode(reviewUrl));
  };

  const toolBtn = (t: AnnotationKind, label: string, Icon: typeof MapPin) => (
    <button
      type="button"
      onClick={() => {
        onToolChange(t);
        setBrowseMode(false);
        onPendingChange(null);
      }}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border transition-colors",
        tool === t && !browseMode
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-zinc-700 border-zinc-200"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  const loadStatusLabel = showMock
    ? "Built-in demo preview"
    : !loaded && !error
      ? loadMode === "direct"
        ? "Loading site (direct)…"
        : "Loading site (proxy)…"
      : loadMode === "proxy"
        ? "Stable pins (proxy)"
        : "Direct embed — pins may drift on scroll";

  return (
    <div className="flex flex-col h-full bg-zinc-100">
      <div
        className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 bg-white border-b border-zinc-200"
        data-signoff-capture-hide="true"
      >
        {canAnnotate && toolBtn("pin", "Pin", MapPin)}
        {canAnnotate && toolBtn("rectangle", "Crop", Square)}
        {canAnnotate && toolBtn("arrow", "Arrow", ArrowRight)}
        {!showMock && (
          <button
            type="button"
            onClick={() => {
              setBrowseMode((b) => !b);
              onPendingChange(null);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border",
              browseMode
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-zinc-700 border-zinc-200"
            )}
          >
            <MousePointer className="h-3.5 w-3.5" />
            Browse
          </button>
        )}
        <p
          className="flex-1 min-w-[120px] truncate text-xs text-zinc-500 font-mono"
          title={canonicalUrl ?? framePageUrl}
        >
          {showMock ? "Demo staging preview" : canonicalUrl ?? framePageUrl}
        </p>
        {!showMock && (
          <>
            <span className="text-[10px] text-zinc-400 shrink-0 hidden sm:inline">
              {loadStatusLabel}
            </span>
            {loadMode === "direct" && canAnnotate && (
              <button
                type="button"
                onClick={() => {
                  loadedRef.current = false;
                  setLoaded(false);
                  setLoadMode("proxy");
                }}
                className="text-[10px] font-semibold text-indigo-600 hover:underline shrink-0"
              >
                Lock pins
              </button>
            )}
            <button
              type="button"
              onClick={retryLoad}
              className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1 shrink-0"
              title="Reload embed"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
            <a
              href={canonicalUrl ?? reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1 shrink-0"
            >
              Open site <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
      </div>

      {!showMock && !canAnnotate && (
        <p className="shrink-0 px-3 py-1.5 text-[11px] bg-amber-50 text-amber-900 border-b border-amber-100">
          <strong>Older version (read-only)</strong> — only issues filed on this version are shown. Switch to
          the latest version to add new markers.
        </p>
      )}

      {!showMock && canAnnotate && loadMode === "direct" && loaded && (
        <p className="shrink-0 px-3 py-1.5 text-[11px] bg-amber-50 text-amber-900 border-b border-amber-100">
          <strong>Direct embed:</strong> markers can move when you scroll. Click <strong>Lock pins</strong> in
          the toolbar for scroll-stable review (proxy).
        </p>
      )}

      {!showMock && canAnnotate && browseMode && useIframeMarkers && (
        <p className="shrink-0 px-3 py-1.5 text-[11px] bg-emerald-50 text-emerald-900 border-b border-emerald-100">
          <strong>Browse mode</strong> — scroll the page; pins are anchored inside the page. Switch to Pin /
          Crop / Arrow to add issues.
        </p>
      )}

      {!showMock && !browseMode && (
        <p className="shrink-0 px-3 py-1.5 text-[11px] bg-indigo-50 text-indigo-900 border-b border-indigo-100">
          <strong>Annotate mode</strong> — click or drag on the page. Press <strong>Browse</strong> to use
          the site again before saving a screenshot.
        </p>
      )}

      <div className="flex-1 min-h-0 flex justify-center p-4 overflow-auto">
        <div
            ref={(el) => {
              if (viewportCaptureRef) viewportCaptureRef.current = el;
              // @ts-ignore
              overlayRef.current = el;
            }}
            className="relative bg-white shadow-md rounded-lg overflow-hidden border border-zinc-200"
            style={{ width: "100%", maxWidth: 1280, aspectRatio: "16/10" }}
          >
            {showMock ? (
              <WebsiteMockSite variant={mockVariant} pageUrl="/" deviceType="desktop" />
            ) : invalidUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-zinc-600">
                <p className="font-medium text-zinc-800">Invalid review URL</p>
                <p className="text-xs max-w-md">
                  Use a full URL starting with <strong>https://</strong> (not only a path like{" "}
                  <code className="bg-zinc-100 px-1 rounded">/sb/ssci/…</code>).
                </p>
                <p className="text-xs font-mono text-zinc-500 break-all">{reviewUrl}</p>
              </div>
            ) : (
              <>
                {iframeSrc && (
                  <iframe
                    key={`${loadMode}-${reviewUrl}`}
                    ref={setIframeRef}
                    src={iframeSrc}
                    title="Review site"
                    className={cn(
                      "w-full h-full min-h-[480px] border-0",
                      annotateMode && !useIframeMarkers && "pointer-events-none"
                    )}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                    onLoad={() => {
                      loadedRef.current = true;
                      setLoaded(true);
                      setError(false);
                      setTimeout(() => postMarkersToIframe(), 300);
                    }}
                    onError={() => {
                      if (loadMode === "direct") {
                        setLoadMode("proxy");
                        setLoaded(false);
                        loadedRef.current = false;
                      } else {
                        setError(true);
                      }
                    }}
                  />
                )}
                {!loaded && !error && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/90 z-10 gap-2 pointer-events-none"
                    data-signoff-ignore-capture="true"
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-xs text-zinc-600 font-medium">
                      {loadMode === "direct" ? "Connecting to live site…" : "Loading via proxy…"}
                    </span>
                    <span className="text-[10px] text-zinc-500 max-w-sm text-center px-4">
                      {loadMode === "direct"
                        ? "If this site blocks embedding, we will retry automatically with the proxy."
                        : "Single-page apps (Angular, React) may take up to a minute on first load."}
                    </span>
                  </div>
                )}
                {error && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-zinc-600 z-20 bg-zinc-50/95"
                    data-signoff-ignore-capture="true"
                  >
                    <p className="font-medium text-zinc-800">Could not load this URL in the reviewer</p>
                    <p className="text-xs max-w-md">
                      The staging site may block iframes or require VPN. Open it in a new tab to verify, then
                      use Pin/Crop on whatever is visible here, or retry proxy load.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        type="button"
                        onClick={retryLoad}
                        className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold"
                      >
                        Retry Proxy
                      </button>
                      {loadMode === "proxy" && (
                        <button
                          type="button"
                          onClick={() => {
                            setLoadMode("direct");
                            setLoaded(false);
                            loadedRef.current = false;
                          }}
                          className="px-3 py-1.5 rounded-md border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-white"
                        >
                          Try Direct Embed
                        </button>
                      )}
                      <a
                        href={canonicalUrl ?? reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-md border border-zinc-300 text-xs font-semibold text-indigo-600 hover:bg-white"
                      >
                        Open in new tab
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            <div
              className={cn(
                "absolute inset-0 z-30 annotation-layer",
                useIframeMarkers
                  ? "pointer-events-none"
                  : annotateMode
                    ? tool === "pin"
                      ? "cursor-crosshair pointer-events-auto"
                      : "cursor-cell pointer-events-auto"
                    : "pointer-events-none"
              )}
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={handleOverlayMouseMove}
              onMouseUp={handleOverlayMouseUp}
              onMouseLeave={() => {
                setDragStart(null);
                setDragPreview(null);
              }}
            >
              {/* Only show the current pending annotation during creation */}
              {pending && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${pending.x}%`,
                    top: `${pending.y}%`,
                    width: pending.width != null ? `${pending.width}%` : undefined,
                    height: pending.height != null ? `${pending.height}%` : undefined,
                  }}
                >
                  {pending.kind === "pin" ? (
                    <div className="w-6 h-6 -translate-x-1/2 -translate-y-full bg-indigo-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">+</span>
                    </div>
                  ) : pending.kind === "rectangle" ? (
                    <div className="w-full h-full border-2 border-indigo-600 bg-indigo-600/10" />
                  ) : (
                    <div className="w-full h-full relative">
                       <ArrowRight className="w-full h-full text-indigo-600" />
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
