import type { LegacyComment } from "@/lib/api";

export type DeviceType = "desktop" | "laptop" | "tablet" | "mobile" | "custom";

export type CommentPriority = "low" | "medium" | "high" | "critical";
export type WebsiteCommentStatus = "open" | "resolved" | "ignored";

export interface ViewportPreset {
  width: number;
  height: number;
  deviceType: DeviceType;
  label: string;
}

export const DEVICE_PRESETS: ViewportPreset[] = [
  { label: "Desktop", width: 1440, height: 900, deviceType: "desktop" },
  { label: "Laptop", width: 1280, height: 800, deviceType: "laptop" },
  { label: "Tablet", width: 768, height: 1024, deviceType: "tablet" },
  { label: "Mobile", width: 375, height: 812, deviceType: "mobile" },
];

export interface WebsiteAnchor {
  selector: string;
  xpath?: string;
  elementPath?: string;
  pageUrl: string;
  scrollPosition: { x: number; y: number };
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  deviceType: DeviceType;
  offsetWithinElement?: { xPercent: number; yPercent: number };
}

/** Build a simple CSS selector for mock-site anchoring (POC). */
export function generateSelector(el: Element): string {
  if (el.id) return `#${el.id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1")}`;
  const dataId = el.getAttribute("data-signoff-id");
  if (dataId) return `[data-signoff-id="${dataId}"]`;

  const parts: string[] = [];
  let node: Element | null = el;
  for (let depth = 0; node && node !== document.body && depth < 6; depth++) {
    const tag = node.tagName.toLowerCase();
    const parentEl: Element | null = node.parentElement;
    if (!parentEl) break;
    const nodeRef = node;
    const siblings = Array.from(parentEl.children).filter((c) => c.tagName === nodeRef.tagName);
    const idx = siblings.indexOf(nodeRef) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag);
    node = parentEl;
  }
  return parts.join(" > ");
}

export function buildAnchorFromClick(
  el: Element,
  event: React.MouseEvent,
  scrollEl: HTMLElement,
  viewport: ViewportPreset,
  pageUrl: string
): WebsiteAnchor {
  const rect = el.getBoundingClientRect();
  const containerRect = scrollEl.getBoundingClientRect();
  const x = event.clientX - containerRect.left + scrollEl.scrollLeft;
  const y = event.clientY - containerRect.top + scrollEl.scrollTop;

  return {
    selector: generateSelector(el),
    pageUrl,
    scrollPosition: { x: scrollEl.scrollLeft, y: scrollEl.scrollTop },
    x,
    y,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    deviceType: viewport.deviceType,
    offsetWithinElement: {
      xPercent: rect.width ? (event.clientX - rect.left) / rect.width : 0.5,
      yPercent: rect.height ? (event.clientY - rect.top) / rect.height : 0.5,
    },
  };
}

export function viewportMatches(
  anchor: WebsiteAnchor,
  viewport: ViewportPreset,
  tolerance = 4
): boolean {
  return (
    anchor.deviceType === viewport.deviceType ||
    (Math.abs(anchor.viewportWidth - viewport.width) <= tolerance &&
      Math.abs(anchor.viewportHeight - viewport.height) <= tolerance)
  );
}

export function resolvePinPosition(
  root: HTMLElement,
  anchor: WebsiteAnchor
): { left: number; top: number; found: boolean } {
  const el = root.querySelector(anchor.selector);
  if (el && anchor.offsetWithinElement) {
    const rect = el.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const left =
      rect.left -
      rootRect.left +
      root.scrollLeft +
      rect.width * anchor.offsetWithinElement.xPercent;
    const top =
      rect.top -
      rootRect.top +
      root.scrollTop +
      rect.height * anchor.offsetWithinElement.yPercent;
    return { left, top, found: true };
  }
  return { left: anchor.x, top: anchor.y, found: false };
}

export function isWebsiteComment(c: LegacyComment): boolean {
  return c.type === "website" || Boolean(c.websiteAnchor);
}

export function filterCommentsForViewport(
  comments: LegacyComment[],
  viewport: ViewportPreset
): LegacyComment[] {
  return comments.filter((c) => {
    if (!isWebsiteComment(c)) return false;
    if (c.websiteAnchor) return viewportMatches(c.websiteAnchor, viewport);
    return true;
  });
}

export function getCommentOverlayPercents(c: LegacyComment): {
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
} | null {
  if (c.xPercent != null && c.yPercent != null) {
    return {
      x: c.xPercent,
      y: c.yPercent,
      width: c.widthPercent,
      height: c.heightPercent,
      endX: c.endXPercent,
      endY: c.endYPercent,
    };
  }
  const a = c.websiteAnchor;
  if (a?.offsetWithinElement) {
    return { x: a.offsetWithinElement.xPercent * 100, y: a.offsetWithinElement.yPercent * 100 };
  }
  if (a && a.viewportWidth > 0 && a.viewportHeight > 0) {
    return {
      x: (a.x / a.viewportWidth) * 100,
      y: (a.y / a.viewportHeight) * 100,
    };
  }
  return null;
}

export function getMockVariantFromVersion(versionNumber: number): 1 | 2 {
  return versionNumber >= 2 ? 2 : 1;
}

export const MOCK_DIFF_SUMMARY: Record<string, { v1: string; v2: string }[]> = {
  "/": [
    { v1: "Hero CTA: Get Started", v2: "Hero CTA: Get Started Free (larger)" },
    { v1: "Pricing section hidden on mobile", v2: "CTA overlaps nav on mobile (known issue)" },
  ],
  "/pricing": [
    { v1: "3 tiers", v2: "4 tiers + Enterprise row" },
  ],
};
