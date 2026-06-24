export interface BrowserMetadata {
  browser: string;
  browserVersion: string;
  os: string;
  deviceType: string;
  userAgent: string;
}

export function parseUserAgent(ua: string): BrowserMetadata {
  let browser = "Unknown";
  let browserVersion = "";
  let os = "Unknown";
  let deviceType = "Desktop";

  const edge = ua.match(/Edg\/(\d+)/i);
  const chrome = ua.match(/Chrome\/(\d+)/i);
  const firefox = ua.match(/Firefox\/(\d+)/i);
  const safari = ua.match(/Version\/(\d+).*Safari/i);

  if (edge) {
    browser = "Edge";
    browserVersion = edge[1];
  } else if (chrome && !/Edg/i.test(ua)) {
    browser = "Chrome";
    browserVersion = chrome[1];
  } else if (firefox) {
    browser = "Firefox";
    browserVersion = firefox[1];
  } else if (safari && !/Chrome/i.test(ua)) {
    browser = "Safari";
    browserVersion = safari[1];
  }

  if (/Windows NT 10/i.test(ua)) os = "Windows 11";
  else if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";

  if (/Mobile|Android.*Mobile/i.test(ua)) deviceType = "Mobile";
  else if (/iPad|Tablet/i.test(ua)) deviceType = "Tablet";

  return { browser, browserVersion, os, deviceType, userAgent: ua };
}

export function captureBrowserMetadata(): BrowserMetadata | null {
  if (typeof navigator === "undefined") return null;
  return parseUserAgent(navigator.userAgent);
}
