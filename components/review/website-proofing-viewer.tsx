"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  MapPin,
  Square,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  MousePointer,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { AnnotationKind, LegacyComment } from "@/lib/api";
import {
  DEVICE_PRESETS,
  filterCommentsForViewport,
  getCommentOverlayPercents,
  isWebsiteComment,
  type ViewportPreset,
} from "@/lib/websiteProofing";
import { getWebsiteIframeSrc } from "@/lib/websiteViewer";
import { WebsiteMockSite } from "@/components/review/website-mock-site";
import { htmlToPlainText } from "@/lib/commentText";
import type { PendingAnnotation } from "@/components/review/image-annotation-canvas";

export type WebsiteAnnotationTool = AnnotationKind;

type WebsiteProofingViewerProps = {
  reviewUrl: string;
  mockVariant?: 1 | 2;
  useMockFallback?: boolean;
  comments: LegacyComment[];
  viewport: ViewportPreset;
  onViewportChange: (v: ViewportPreset) => void;
  tool: WebsiteAnnotationTool;
  onToolChange: (t: WebsiteAnnotationTool) => void;
  pending: PendingAnnotation | null;
  onPendingChange: (p: PendingAnnotation | null) => void;
  hoveredPinId: string | null;
  onHoveredPinIdChange: (id: string | null) => void;
  compareOpen?: boolean;
};

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

export function WebsiteProofingViewer({
  reviewUrl,
  mockVariant = 1,
  useMockFallback = false,
  comments,
  viewport,
  onViewportChange,
  tool,
  onToolChange,
  pending,
  onPendingChange,
  hoveredPinId,
  onHoveredPinIdChange,
}: WebsiteProofingViewerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loadMode, setLoadMode] = useState<"direct" | "proxy">("direct");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<PendingAnnotation | null>(null);
  const [frameNavUrl, setFrameNavUrl] = useState(reviewUrl);

  const showMock = useMockFallback || !reviewUrl.trim();

  const websiteAnnotations = filterCommentsForViewport(
    comments.filter((c) => isWebsiteComment(c)),
    viewport
  );

  const getPinNumber = useCallback(
    (comment: LegacyComment) =>
      comment.pinNumber ||
      websiteAnnotations.findIndex((c) => c.id === comment.id) + 1,
    [websiteAnnotations]
  );

  useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
    setFrameNavUrl(reviewUrl);
  }, [reviewUrl, loadMode]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "signoff-frame-nav" && typeof ev.data.href === "string") {
        setFrameNavUrl(ev.data.href);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (browseMode || !overlayRef.current || pending) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);

    if (tool === "pin") {
      onPendingChange({ kind: "pin", x, y });
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
    if (!overlayRef.current || !dragStart || browseMode) return;
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
    if (!overlayRef.current || !dragStart || browseMode) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);

    if (tool === "rectangle") {
      const n = normalizeRect(dragStart.x, dragStart.y, x, y);
      if (n.width > 1 && n.height > 1) {
        onPendingChange({ kind: "rectangle", x: n.x, y: n.y, width: n.width, height: n.height });
      }
    } else if (tool === "arrow") {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 2) {
        onPendingChange({ kind: "arrow", x: dragStart.x, y: dragStart.y, endX: x, endY: y });
      }
    }

    setDragStart(null);
    setDragPreview(null);
  };

  const preview = dragPreview || pending;
  const iframeSrc = showMock ? "" : getWebsiteIframeSrc(reviewUrl, loadMode);

  const toolBtnClass = (t: WebsiteAnnotationTool) =>
    `flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
      tool === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-zinc-700 border-border"
    }`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-white">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Globe className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span className="truncate font-mono text-[10px] text-zinc-700" title={frameNavUrl}>
            {showMock ? "Mock staging (no URL)" : frameNavUrl}
          </span>
        </div>

        {!showMock && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBrowseMode(!browseMode)}
              className={`text-[10px] font-bold px-2 py-1 rounded border ${
                browseMode
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-zinc-700 border-border"
              }`}
            >
              <MousePointer className="h-3 w-3 inline mr-0.5" />
              {browseMode ? "Browsing" : "Annotate"}
            </button>
            <button
              type="button"
              onClick={() => setLoadMode(loadMode === "direct" ? "proxy" : "direct")}
              className="text-[10px] font-bold px-2 py-1 rounded border border-border bg-white hover:bg-zinc-50"
              title="Switch direct iframe vs proxy (if site won't embed)"
            >
              {loadMode === "direct" ? "Proxy" : "Direct"}
            </button>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold px-2 py-1 rounded border border-border bg-white hover:bg-zinc-50 flex items-center gap-0.5"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={() => {
                setIframeLoaded(false);
                setIframeError(false);
              }}
              className="text-[10px] p-1 rounded border border-border bg-white"
              aria-label="Reload"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        )}

        {DEVICE_PRESETS.map((preset) => (
          <button
            key={preset.deviceType}
            type="button"
            onClick={() => onViewportChange(preset)}
            className={`text-[10px] font-bold px-2 py-1 rounded border ${
              viewport.deviceType === preset.deviceType
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-zinc-700 border-border"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-1.5 bg-zinc-50 border-b border-border">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Annotate</span>
        <button type="button" className={toolBtnClass("pin")} onClick={() => onToolChange("pin")}>
          <MapPin className="h-3 w-3" /> Pin
        </button>
        <button type="button" className={toolBtnClass("rectangle")} onClick={() => onToolChange("rectangle")}>
          <Square className="h-3 w-3" /> Crop
        </button>
        <button type="button" className={toolBtnClass("arrow")} onClick={() => onToolChange("arrow")}>
          <ArrowRight className="h-3 w-3" /> Arrow
        </button>
        <span className="text-[10px] text-muted-foreground">
          {browseMode
            ? "Browse the live site — switch to Annotate to add feedback"
            : tool === "pin"
              ? "Click to place a pin"
              : tool === "rectangle"
                ? "Drag to crop / highlight an area"
                : "Drag to draw an arrow"}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex items-start justify-center bg-zinc-200/80 p-3 overflow-auto">
        <div
          className="relative bg-white shadow-xl border border-zinc-300 overflow-hidden"
          style={{ width: viewport.width, maxWidth: "100%", height: viewport.height }}
        >
          {showMock ? (
            <div className="w-full h-full overflow-auto">
              <WebsiteMockSite variant={mockVariant} pageUrl="/" deviceType={viewport.deviceType} />
            </div>
          ) : (
            <>
              {!iframeLoaded && !iframeError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  <span className="text-xs text-muted-foreground">Loading live site…</span>
                </div>
              )}
              {iframeError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-4 text-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <p className="text-xs font-semibold text-zinc-800">Could not embed this URL</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs">
                    Try <strong>Proxy</strong> mode, or open in a new tab. Some sites block iframes.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadMode("proxy");
                      setIframeError(false);
                    }}
                    className="text-xs font-bold text-indigo-600 underline"
                  >
                    Switch to proxy mode
                  </button>
                </div>
              )}
              <iframe
                key={`${iframeSrc}-${viewport.width}`}
                src={iframeSrc}
                title="Live website review"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => {
                  setIframeLoaded(true);
                  setIframeError(false);
                }}
                onError={() => setIframeError(true)}
              />
            </>
          )}

          <div
            ref={overlayRef}
            className={`absolute inset-0 z-10 ${
              browseMode || showMock ? "pointer-events-none" : tool === "pin" ? "cursor-crosshair" : "cursor-cell"
            }`}
            onMouseDown={handleOverlayMouseDown}
            onMouseMove={handleOverlayMouseMove}
            onMouseUp={handleOverlayMouseUp}
            onMouseLeave={() => {
              setDragStart(null);
              setDragPreview(null);
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              {websiteAnnotations
                .map((comment) => ({ comment, pct: getCommentOverlayPercents(comment) }))
                .filter(
                  ({ comment, pct }) =>
                    pct &&
                    (comment.annotationKind || "pin") === "arrow" &&
                    pct.endX != null &&
                    pct.endY != null
                )
                .map(({ comment, pct }) => (
                  <line
                    key={`arrow-${comment.id}`}
                    x1={`${pct!.x}%`}
                    y1={`${pct!.y}%`}
                    x2={`${pct!.endX}%`}
                    y2={`${pct!.endY}%`}
                    stroke={comment.resolved ? "#a1a1aa" : "#ef4444"}
                    strokeWidth="2.5"
                    markerEnd="url(#web-arrowhead)"
                  />
                ))}
              {preview?.kind === "arrow" && preview.endX != null && preview.endY != null && (
                <line
                  x1={`${preview.x}%`}
                  y1={`${preview.y}%`}
                  x2={`${preview.endX}%`}
                  y2={`${preview.endY}%`}
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  markerEnd="url(#web-arrowhead-preview)"
                />
              )}
              <defs>
                <marker id="web-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
                <marker id="web-arrowhead-preview" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
              </defs>
            </svg>

            {websiteAnnotations
              .map((comment) => ({ comment, pct: getCommentOverlayPercents(comment) }))
              .filter(
                ({ comment, pct }) =>
                  pct &&
                  (comment.annotationKind || "pin") === "rectangle" &&
                  pct.width &&
                  pct.height
              )
              .map(({ comment, pct }) => (
                <div
                  key={`rect-${comment.id}`}
                  style={{
                    left: `${pct!.x}%`,
                    top: `${pct!.y}%`,
                    width: `${pct!.width}%`,
                    height: `${pct!.height}%`,
                  }}
                  className={`absolute border-2 pointer-events-none ${
                    comment.resolved
                      ? "border-zinc-400/80 bg-zinc-400/15"
                      : "border-amber-500 bg-amber-400/25"
                  }`}
                />
              ))}

            {preview?.kind === "rectangle" && preview.width != null && preview.height != null && (
              <div
                style={{
                  left: `${preview.x}%`,
                  top: `${preview.y}%`,
                  width: `${preview.width}%`,
                  height: `${preview.height}%`,
                }}
                className="absolute border-2 border-amber-500 bg-amber-400/30 pointer-events-none"
              />
            )}

            {websiteAnnotations
              .map((comment) => ({ comment, pct: getCommentOverlayPercents(comment) }))
              .filter(
                ({ comment, pct }) => pct && (comment.annotationKind || "pin") === "pin"
              )
              .map(({ comment, pct }) => {
                const pinNum = getPinNumber(comment);
                return (
                  <div
                    key={comment.id}
                    style={{ left: `${pct!.x}%`, top: `${pct!.y}%` }}
                    onMouseEnter={() => onHoveredPinIdChange(comment.id)}
                    onMouseLeave={() => onHoveredPinIdChange(null)}
                    className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-md z-20 pointer-events-auto ${
                      comment.resolved ? "bg-zinc-400 text-white" : "bg-indigo-500 text-white"
                    }`}
                  >
                    {comment.resolved ? "✓" : pinNum}
                    <AnimatePresence>
                      {hoveredPinId === comment.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap max-w-[200px] truncate z-30"
                        >
                          {htmlToPlainText(comment.text).slice(0, 60) || "—"}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

            {preview?.kind === "pin" && (
              <div
                style={{ left: `${preview.x}%`, top: `${preview.y}%` }}
                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-md animate-bounce pointer-events-none z-30"
              >
                ?
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
