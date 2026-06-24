"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Square, ArrowRight } from "lucide-react";
import type { AnnotationKind, LegacyComment } from "@/lib/api";
import { htmlToPlainText } from "@/lib/commentText";

export type AnnotationTool = AnnotationKind;

import type { DocumentAnchor } from "@/lib/annotationGeometry";

export type PendingAnnotation = {
  kind: AnnotationKind;
  /** Viewport % while editing (derived from anchor when present) */
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  /** Scroll-stable document anchor (Marker.io / Filestage style) */
  anchor?: DocumentAnchor;
};

type ImageAnnotationCanvasProps = {
  imageSrc: string;
  imageAlt: string;
  comments: LegacyComment[];
  tool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  pending: PendingAnnotation | null;
  onPendingChange: (pending: PendingAnnotation | null) => void;
  hoveredPinId: string | null;
  onHoveredPinIdChange: (id: string | null) => void;
  onPinClick?: (comment: LegacyComment) => void;
  immersive?: boolean;
};

function getPercentFromEvent(e: React.MouseEvent, rect: DOMRect) {
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  return { x: left, y: top, width, height };
}

export function ImageAnnotationCanvas({
  imageSrc,
  imageAlt,
  comments,
  tool,
  onToolChange,
  pending,
  onPendingChange,
  hoveredPinId,
  onHoveredPinIdChange,
  onPinClick,
  immersive = false,
}: ImageAnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<PendingAnnotation | null>(null);

  const imageAnnotations = comments.filter(
    (c) => c.type === "annotation" && c.xPercent !== undefined && c.yPercent !== undefined
  );

  const getPinNumber = useCallback(
    (comment: LegacyComment) => {
      return (
        comment.pinNumber ||
        imageAnnotations.findIndex((c) => c.id === comment.id) + 1
      );
    },
    [imageAnnotations]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || pending) return;
    const rect = containerRef.current.getBoundingClientRect();
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !dragStart) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);

    if (tool === "rectangle") {
      const normalized = normalizeRect(dragStart.x, dragStart.y, x, y);
      setDragPreview({
        kind: "rectangle",
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
      });
    } else if (tool === "arrow") {
      setDragPreview({
        kind: "arrow",
        x: dragStart.x,
        y: dragStart.y,
        endX: x,
        endY: y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !dragStart) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = getPercentFromEvent(e, rect);

    if (tool === "rectangle") {
      const normalized = normalizeRect(dragStart.x, dragStart.y, x, y);
      if (normalized.width > 1 && normalized.height > 1) {
        onPendingChange({
          kind: "rectangle",
          x: normalized.x,
          y: normalized.y,
          width: normalized.width,
          height: normalized.height,
        });
      }
    } else if (tool === "arrow") {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 2) {
        onPendingChange({
          kind: "arrow",
          x: dragStart.x,
          y: dragStart.y,
          endX: x,
          endY: y,
        });
      }
    }

    setDragStart(null);
    setDragPreview(null);
  };

  const preview = dragPreview || pending;

  const toolBtnClass = (t: AnnotationTool) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
      tool === t
        ? "bg-indigo-600 text-white shadow-sm border-indigo-600"
        : "bg-white text-zinc-700 border-border hover:bg-zinc-50"
    }`;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className={`flex flex-wrap items-center gap-2 px-1 ${immersive ? "py-1" : ""}`}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Annotate</span>
        <button type="button" className={toolBtnClass("pin")} onClick={() => onToolChange("pin")} title="Pin comment">
          <MapPin className="h-3.5 w-3.5" /> Pin
        </button>
        <button type="button" className={toolBtnClass("rectangle")} onClick={() => onToolChange("rectangle")} title="Highlight area">
          <Square className="h-3.5 w-3.5" /> Snip
        </button>
        <button type="button" className={toolBtnClass("arrow")} onClick={() => onToolChange("arrow")} title="Arrow mark">
          <ArrowRight className="h-3.5 w-3.5" /> Arrow
        </button>
        <span className="text-[10px] text-muted-foreground ml-1">
          {tool === "pin" ? "Click to place a pin" : tool === "rectangle" ? "Drag to highlight an area" : "Drag to draw an arrow"}
        </span>
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (dragStart) {
            setDragStart(null);
            setDragPreview(null);
          }
        }}
        className={`relative max-w-full w-full border border-border rounded bg-white group flex justify-center shadow overflow-hidden ${
          immersive ? "max-h-[calc(100dvh-12rem)]" : "max-h-[550px]"
        } ${tool === "pin" ? "cursor-crosshair" : "cursor-cell"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} className="object-contain max-h-[530px] select-none pointer-events-none" draggable={false} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" preserveAspectRatio="none">
          {imageAnnotations
            .filter((c) => (c.annotationKind || "pin") === "arrow" && c.endXPercent != null && c.endYPercent != null)
            .map((comment) => (
              <g key={`arrow-${comment.id}`}>
                <line
                  x1={`${comment.xPercent}%`}
                  y1={`${comment.yPercent}%`}
                  x2={`${comment.endXPercent}%`}
                  y2={`${comment.endYPercent}%`}
                  stroke={comment.resolved ? "#a1a1aa" : "#ef4444"}
                  strokeWidth="2.5"
                  markerEnd="url(#arrowhead)"
                />
              </g>
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
              markerEnd="url(#arrowhead-preview)"
            />
          )}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
            <marker id="arrowhead-preview" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
        </svg>

        {imageAnnotations
          .filter((c) => (c.annotationKind || "pin") === "rectangle" && c.widthPercent && c.heightPercent)
          .map((comment) => (
            <div
              key={`rect-${comment.id}`}
              style={{
                left: `${comment.xPercent}%`,
                top: `${comment.yPercent}%`,
                width: `${comment.widthPercent}%`,
                height: `${comment.heightPercent}%`,
              }}
              className={`absolute border-2 z-[6] pointer-events-none ${
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
            className="absolute border-2 border-amber-500 bg-amber-400/30 z-[8] pointer-events-none"
          />
        )}

        {imageAnnotations
          .filter((c) => (c.annotationKind || "pin") === "pin")
          .map((comment) => {
            const pinNum = getPinNumber(comment);
            const authorDisplayName = comment.authorName || (comment.author === "client" ? "Client" : "Agency");
            const plainPreview = htmlToPlainText(comment.text).slice(0, 80);

            return (
              <div
                key={comment.id}
                style={{
                  left: `${comment.xPercent}%`,
                  top: `${comment.yPercent}%`,
                }}
                onMouseEnter={() => onHoveredPinIdChange(comment.id)}
                onMouseLeave={() => onHoveredPinIdChange(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinClick?.(comment);
                }}
                className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center rounded-full text-xs font-semibold shadow-md transition-all transform hover:scale-110 cursor-pointer z-10 ${
                  comment.resolved ? "bg-zinc-400 text-zinc-100" : "bg-indigo-500 text-white"
                }`}
              >
                {comment.resolved ? "✓" : pinNum}

                <AnimatePresence>
                  {hoveredPinId === comment.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-md shadow-lg font-normal min-w-[150px] max-w-[250px] text-center"
                    >
                      <div className="font-semibold text-[10px] text-indigo-300 mb-0.5">
                        Pin #{pinNum} ({authorDisplayName})
                      </div>
                      <span className="line-clamp-3">{plainPreview || "—"}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

        {preview?.kind === "pin" && (
          <div
            style={{ left: `${preview.x}%`, top: `${preview.y}%` }}
            className="absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-md z-20 animate-bounce pointer-events-none"
          >
            ?
          </div>
        )}
      </div>
    </div>
  );
}
