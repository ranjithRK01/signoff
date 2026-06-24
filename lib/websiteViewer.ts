/** Ensure review URLs are absolute https/http (not `/path` only). */
export function normalizeReviewUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`
    );
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Build iframe src for live website review. */
export function getWebsiteIframeSrc(
  reviewUrl: string,
  mode: "direct" | "proxy"
): string {
  const normalized = normalizeReviewUrl(reviewUrl);
  if (!normalized) return "";
  if (mode === "proxy") {
    return `/api/website-proxy?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

/** Demo / placeholder hosts that should render the built-in staging mock. */
const DEMO_HOSTS = new Set(["staging.client.com"]);

export function isMockReviewUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("mock://") || trimmed.includes("mock:")) return true;

  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return DEMO_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Try proxy first for production stability (scroll-stable pins, CORS-safe screenshots).
 * Direct is only for local dev or known demo hosts.
 */
export function getInitialWebsiteLoadMode(reviewUrl: string): "direct" | "proxy" {
  if (!reviewUrl.trim() || isMockReviewUrl(reviewUrl)) return "proxy";
  
  // Default to proxy for better UAT experience (pins don't drift, screenshots work)
  return "proxy";
}
