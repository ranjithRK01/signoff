import type { AnnotationCapture } from "@/lib/types";
import type { PendingAnnotation } from "@/components/review/image-annotation-canvas";

/** Live scroll + size reported from the review iframe (via postMessage). */
export type FrameScrollState = {
  scrollX: number;
  scrollY: number;
  scrollWidth: number;
  scrollHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  /** CSS selector for nested scroll container (Angular SPAs often scroll a div, not window). */
  scrollRoot?: string;
};

export const DEFAULT_FRAME_SCROLL: FrameScrollState = {
  scrollX: 0,
  scrollY: 0,
  scrollWidth: 0,
  scrollHeight: 0,
  viewportWidth: 0,
  viewportHeight: 0,
};

/** 
 * Legacy anchor type. We're moving towards using AnnotationCapture directly 
 * as it already contains document-relative coordinates.
 */
export type DocumentAnchor = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  scroll: { x: number; y: number };
  scrollRoot?: string;
  documentSize: { width: number; height: number };
  viewport: { width: number; height: number };
};

export function isDocumentAnchored(annotation: AnnotationCapture): boolean {
  return Boolean(annotation.documentX != null && annotation.documentY != null);
}

/** 
 * Document anchor → viewport % for overlay rendering at current scroll. 
 * This is the core of the "Annotation Context Engine".
 */
export function resolveItemPosition(
  annotation: AnnotationCapture,
  frame: FrameScrollState,
  overlaySize: { width: number; height: number }
): { x: number; y: number; width?: number; height?: number; endX?: number; endY?: number } {
  const vw = frame.viewportWidth || overlaySize.width || 1;
  const vh = frame.viewportHeight || overlaySize.height || 1;
  const sx = frame.scrollX;
  const sy = frame.scrollY;

  // renderY = documentY - currentScrollPosition
  const rx = annotation.documentX - sx;
  const ry = annotation.documentY - sy;

  const x = (rx / vw) * 100;
  const y = (ry / vh) * 100;
  
  let out: { x: number; y: number; width?: number; height?: number; endX?: number; endY?: number } = { x, y };

  // Calculate width/height relative to the viewport at current scroll
  if (annotation.width != null && annotation.height != null) {
    // If we have absolute width/height in pixels from capture, we use them
    // but we need to ensure they scale if the viewport changed.
    // For now, assume viewport size is relatively stable or use percentages.
    out.width = (annotation.width / vw) * 100;
    out.height = (annotation.height / vh) * 100;
  } else if (annotation.widthPercent != null && annotation.heightPercent != null) {
    // Use percentages of the document if available
    const docW = frame.scrollWidth || vw;
    const docH = frame.scrollHeight || vh;
    out.width = ((annotation.widthPercent / 100) * docW / vw) * 100;
    out.height = ((annotation.heightPercent / 100) * docH / vh) * 100;
  }
  
  // Arrow support: if we have document-relative end coordinates
  if (annotation.annotationKind === "arrow" && annotation.xPercent != null) {
    // derive end position if we only have percentages
    const docW = frame.scrollWidth || vw;
    const docH = frame.scrollHeight || vh;
    
    // If we have explicit end percentages in the new model (to be added)
    // For now, if it's an arrow, startX/Y and width/height are the vector
    if (annotation.width != null && annotation.height != null) {
      const dex = annotation.documentX + annotation.width;
      const dey = annotation.documentY + annotation.height;
      out.endX = ((dex - sx) / vw) * 100;
      out.endY = ((dey - sy) / vh) * 100;
    }
  }

  return out;
}

/** Legacy alias for resolveItemPosition to satisfy existing imports. */
export function annotationToViewportPercent(
  annotation: AnnotationCapture,
  frame: FrameScrollState,
  overlaySize: { width: number; height: number }
): { x: number; y: number; width?: number; height?: number; endX?: number; endY?: number } | null {
  return resolveItemPosition(annotation, frame, overlaySize);
}

/** Legacy alias for resolveItemPosition. */
export function documentAnchorToViewportPercent(
  anchor: DocumentAnchor,
  frame: FrameScrollState,
  overlaySize: { width: number; height: number }
): { x: number; y: number; width?: number; height?: number; endX?: number; endY?: number } {
  // Map legacy DocumentAnchor to a temporary AnnotationCapture for resolution
  const temp: any = {
    documentX: anchor.x,
    documentY: anchor.y,
    width: anchor.width,
    height: anchor.height,
    annotationKind: anchor.endX != null ? "arrow" : anchor.width != null ? "rectangle" : "pin"
  };
  
  const pos = resolveItemPosition(temp as AnnotationCapture, frame, overlaySize);
  
  if (anchor.endX != null && anchor.endY != null) {
    const vw = frame.viewportWidth || overlaySize.width || 1;
    const sx = frame.scrollX;
    const vh = frame.viewportHeight || overlaySize.height || 1;
    const sy = frame.scrollY;
    pos.endX = ((anchor.endX - sx) / vw) * 100;
    pos.endY = ((anchor.endY - sy) / vh) * 100;
  }
  
  return pos;
}

/** Viewport % (overlay click) → document pixel anchor (scroll-stable). */
export function viewportPercentToDocumentAnchor(
  vp: { x: number; y: number; width?: number; height?: number; endX?: number; endY?: number },
  frame: FrameScrollState,
  overlaySize: { width: number; height: number }
): DocumentAnchor {
  const vw = frame.viewportWidth || overlaySize.width || 1;
  const vh = frame.viewportHeight || overlaySize.height || 1;
  const sx = frame.scrollX;
  const sy = frame.scrollY;

  const anchor: DocumentAnchor = {
    x: sx + (vp.x / 100) * vw,
    y: sy + (vp.y / 100) * vh,
    scroll: { x: sx, y: sy },
    documentSize: {
      width: frame.scrollWidth || vw,
      height: frame.scrollHeight || vh,
    },
    viewport: { width: vw, height: vh },
  };

  if (vp.width != null && vp.height != null) {
    anchor.width = (vp.width / 100) * vw;
    anchor.height = (vp.height / 100) * vh;
  }
  if (vp.endX != null && vp.endY != null) {
    anchor.endX = sx + (vp.endX / 100) * vw;
    anchor.endY = sy + (vp.endY / 100) * vh;
  }

  return anchor;
}

export function pendingToViewportPercent(
  pending: PendingAnnotation,
  frame: FrameScrollState,
  overlaySize: { width: number; height: number }
): { x: number; y: number; width?: number; height?: number; endX?: number; endY?: number } {
  if (pending.anchor) {
    return documentAnchorToViewportPercent(pending.anchor, frame, overlaySize);
  }
  return {
    x: pending.x,
    y: pending.y,
    width: pending.width,
    height: pending.height,
    endX: pending.endX,
    endY: pending.endY,
  };
}

export function buildAnnotationCaptureFromPending(
  pending: PendingAnnotation,
  frame: FrameScrollState,
  overlaySize: { width: number; height: number },
  meta: Omit<AnnotationCapture, "startX" | "startY" | "width" | "height" | "documentX" | "documentY" | "scrollPosition" | "viewport" | "xPercent" | "yPercent" | "widthPercent" | "heightPercent"> & { domContext?: AnnotationCapture["domContext"] }
): AnnotationCapture {
  const sx = frame.scrollX;
  const sy = frame.scrollY;
  const vw = frame.viewportWidth || overlaySize.width || 1;
  const vh = frame.viewportHeight || overlaySize.height || 1;
  const docW = frame.scrollWidth || vw;
  const docH = frame.scrollHeight || vh;

  // pending.x/y are viewport-relative percentages (0-100)
  const startX = (pending.x / 100) * vw;
  const startY = (pending.y / 100) * vh;
  const width = pending.width != null ? (pending.width / 100) * vw : undefined;
  const height = pending.height != null ? (pending.height / 100) * vh : undefined;

  const documentX = sx + startX;
  const documentY = sy + startY;

  return {
    ...meta,
    startX,
    startY,
    width,
    height,
    documentX,
    documentY,
    scrollPosition: { x: sx, y: sy },
    viewport: { width: vw, height: vh },
    xPercent: (documentX / docW) * 100,
    yPercent: (documentY / docH) * 100,
    widthPercent: width != null ? (width / docW) * 100 : undefined,
    heightPercent: height != null ? (height / docH) * 100 : undefined,
  };
}

/** Get DOM context for an element at viewport coordinates in an iframe. */
export function getDomContextAtPoint(
  iframe: HTMLIFrameElement | null,
  vx: number,
  vy: number
): AnnotationCapture["domContext"] | undefined {
  try {
    const doc = iframe?.contentDocument;
    if (!doc) return undefined;

    // Convert viewport % to pixels in the iframe viewport
    const win = iframe.contentWindow;
    if (!win) return undefined;

    const pxX = (vx / 100) * win.innerWidth;
    const pxY = (vy / 100) * win.innerHeight;

    const el = doc.elementFromPoint(pxX, pxY);
    if (!el) return undefined;

    return {
      tagName: el.tagName,
      elementText: el.textContent?.trim().slice(0, 100),
      elementId: el.id || undefined,
      elementClasses: Array.from(el.classList),
    };
  } catch {
    return undefined;
  }
}

/** Scroll iframe to where the issue was filed (Marker.io-style). */
export function getScrollTargetForAnnotation(
  annotation: AnnotationCapture
): { x: number; y: number } | null {
  const y = annotation.documentY;
  const x = annotation.documentX;
  const vh = annotation.viewport.height || 800;
  const vw = annotation.viewport.width || 1280;
  
  return {
    x: Math.max(0, x - vw * 0.1),
    y: Math.max(0, y - vh * 0.15),
  };
}

export function scrollIframeToAnnotation(
  iframe: HTMLIFrameElement | null,
  annotation: AnnotationCapture
): void {
  const target = getScrollTargetForAnnotation(annotation);
  if (!target || !iframe?.contentWindow) return;
  const win = iframe.contentWindow;
  
  // Try direct scroll if same-origin, otherwise postMessage
  try {
    win.scrollTo({ left: target.x, top: target.y, behavior: "smooth" });
  } catch {
    win.postMessage({
      type: "signoff-scroll-to",
      x: target.x,
      y: target.y,
    }, "*");
  }
}

/** Read scroll metrics from iframe (same-origin proxy). */
export function readIframeScrollMetrics(
  iframe: HTMLIFrameElement | null
): FrameScrollState | null {
  try {
    const win = iframe?.contentWindow;
    const doc = iframe?.contentDocument;
    if (!win || !doc) return null;

    let best: HTMLElement = doc.documentElement;
    let bestScore = -1;

    // Check document level first
    const docScrollY = win.scrollY || doc.documentElement.scrollTop || doc.body?.scrollTop || 0;
    const docScrollX = win.scrollX || doc.documentElement.scrollLeft || doc.body?.scrollLeft || 0;
    
    if (docScrollY > 0 || docScrollX > 0) {
      best = doc.documentElement;
      bestScore = docScrollY + docScrollX + 1000; // High priority for window scroll
    }

    // Search for the best nested scroll container
    const potentialContainers = doc.querySelectorAll('div, section, main, article, [id*="root"], [id*="app"], [class*="scroll"]');
    
    potentialContainers.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      
      const style = win.getComputedStyle(node);
      const isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX);
      
      if (isScrollable && node.scrollHeight > node.clientHeight + 5) {
        const score = node.scrollTop + node.scrollLeft + (node.clientHeight * 0.5);
        if (score > bestScore) {
          best = node;
          bestScore = score;
        }
      }
    });

    const isDoc = best === doc.documentElement || best === doc.body || !best;
    
    if (isDoc) {
      return {
        scrollX: docScrollX,
        scrollY: docScrollY,
        scrollWidth: Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth || 0),
        scrollHeight: Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0),
        viewportWidth: win.innerWidth || doc.documentElement.clientWidth,
        viewportHeight: win.innerHeight || doc.documentElement.clientHeight,
        scrollRoot: "",
      };
    }

    return {
      scrollX: best.scrollLeft,
      scrollY: best.scrollTop,
      scrollWidth: best.scrollWidth,
      scrollHeight: best.scrollHeight,
      viewportWidth: best.clientWidth,
      viewportHeight: best.clientHeight,
      scrollRoot: cssPathFromElement(best, doc),
    };
  } catch (err) {
    return null;
  }
}

function cssPathFromElement(el: Element, doc: Document): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  const parts: string[] = [];
  let node: Element | null = el;
  for (let depth = 0; node && node !== doc.body && depth < 8; depth++) {
    const tag = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const nodeRef = node;
    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === nodeRef.tagName
    );
    const idx = siblings.indexOf(nodeRef) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
    node = parent;
  }
  return parts.join(" > ");
}
