import html2canvas from 'html2canvas';

// Inject detection signal for web app
document.documentElement.setAttribute('data-signoffai', 'true');
window.postMessage({ 
  type: 'SIGNOFFAI_EXTENSION_PRESENT', 
  version: '1.0.0' 
}, '*');

// Listen for auth token sync from web app
window.addEventListener('message', (event) => {
  if (event.data?.type === 'SIGNOFFAI_SEND_AUTH_TOKEN') {
    // Save to chrome storage with 24hr expiration
    chrome.storage.local.set({
      authToken: event.data.token,
      user: event.data.user,
      expiresAt: Date.now() + 86400000 // 24 hours
    }, () => {
      console.log('Auth token stored from web app (content script)');
    });
    
    // Send to background script just in case
    chrome.runtime.sendMessage({
      type: 'SIGNOFFAI_AUTH_TOKEN',
      token: event.data.token,
      user: event.data.user
    });
  }
});

let sidebar: HTMLIFrameElement | null = (document.getElementById('signoff-sidebar') as HTMLIFrameElement) || null;
let overlay: HTMLDivElement | null = (document.getElementById('signoff-capture-overlay') as HTMLDivElement) || null;

function toggleSidebar() {
  sidebar = (document.getElementById('signoff-sidebar') as HTMLIFrameElement);
  
  if (sidebar) {
    const isVisible = sidebar.style.width !== '0px';
    const newWidth = isVisible ? '0px' : '424px';
    sidebar.style.width = newWidth;
    // Save state
    chrome.storage.local.set({ sidebarVisible: !isVisible });
    return;
  }

  sidebar = document.createElement('iframe');
  sidebar.id = 'signoff-sidebar';
  const pageParams = new URLSearchParams({
    url: window.location.href,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    title: document.title
  });
  sidebar.src = chrome.runtime.getURL(`sidepanel.html?${pageParams.toString()}`);
  sidebar.style.position = 'fixed';
  sidebar.style.top = '0';
  sidebar.style.right = '0';
  sidebar.style.width = '424px';
  sidebar.style.height = '100vh';
  sidebar.style.zIndex = '2147483647';
  sidebar.style.border = 'none';
  sidebar.style.boxShadow = '-2px 0 10px rgba(0,0,0,0.1)';
  sidebar.style.backgroundColor = 'transparent';
  sidebar.style.transition = 'width 0.2s ease-in-out';
  sidebar.setAttribute('allow', 'cross-origin-isolated');

  document.body.appendChild(sidebar);
  chrome.storage.local.set({ sidebarVisible: true });
}

// Auto-open logic: If current site is in user projects or sidebar was visible before
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  chrome.storage.local.get(['sidebarVisible', 'activeSession', 'userProjects'], (result) => {
    const currentHost = window.location.hostname.replace(/^www\./, '');
    const hasMatchingProject = (result.userProjects || []).some((p: any) => {
      const projectHost = (p.domain || '').replace(/^www\./, '');
      return projectHost === currentHost;
    });
    
    if (result.sidebarVisible || result.activeSession || hasMatchingProject) {
      toggleSidebar();
    }
  });
}

async function startCapture(tool: string) {
  // Create overlay for drawing
  overlay = document.createElement('div');
  overlay.id = 'signoff-capture-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '2147483646';
  overlay.style.cursor = 'crosshair';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.1)';
  document.body.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let currentElement: HTMLDivElement | null = null;

  const onMouseDown = (e: MouseEvent) => {
    startX = e.clientX;
    startY = e.clientY;

    if (tool === 'pin') {
      const pin = document.createElement('div');
      pin.style.position = 'absolute';
      pin.style.left = `${startX - 12}px`;
      pin.style.top = `${startY - 24}px`;
      pin.style.width = '24px';
      pin.style.height = '24px';
      pin.style.backgroundColor = '#ef4444';
      pin.style.borderRadius = '50% 50% 50% 0';
      pin.style.transform = 'rotate(-45deg)';
      pin.style.border = '2px solid white';
      overlay?.appendChild(pin);
      finishCapture();
    } else if (tool === 'rect') {
      currentElement = document.createElement('div');
      currentElement.style.position = 'absolute';
      currentElement.style.left = `${startX}px`;
      currentElement.style.top = `${startY}px`;
      currentElement.style.border = '2px solid #ef4444';
      currentElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
      overlay?.appendChild(currentElement);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!currentElement) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    currentElement.style.width = `${width}px`;
    currentElement.style.height = `${height}px`;
    currentElement.style.left = `${Math.min(startX, currentX)}px`;
    currentElement.style.top = `${Math.min(startY, currentY)}px`;
  };

  const onMouseUp = () => {
    if (tool === 'rect' && currentElement) {
      finishCapture();
    }
  };

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);

  const finishCapture = async () => {
    if (sidebar) sidebar.style.display = 'none';
    // Keep overlay but make it transparent so we capture what's under it + the annotations
    if (overlay) overlay.style.backgroundColor = 'transparent';

    try {
      // Small delay to ensure UI updates
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: window.devicePixelRatio,
        logging: false,
        ignoreElements: (el) => el.id === 'signoff-sidebar',
      });

      const dataUrl = canvas.toDataURL('image/png');
      
      if (sidebar && sidebar.contentWindow) {
        sidebar.contentWindow.postMessage({ action: 'capture_result', dataUrl }, '*');
      }
    } catch (err) {
      console.error('Capture failed', err);
    } finally {
      if (sidebar) sidebar.style.display = 'block';
      if (overlay) {
        overlay.removeEventListener('mousedown', onMouseDown);
        overlay.removeEventListener('mousemove', onMouseMove);
        overlay.removeEventListener('mouseup', onMouseUp);
        document.body.removeChild(overlay);
        overlay = null;
      }
    }
  };

  // If tool is just screenshot, capture immediately
  if (tool === 'full') {
    finishCapture();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggle_sidebar") {
    toggleSidebar();
  }
});

async function startLocationSelection() {
  // 1. Enter Review Mode
  overlay = document.createElement('div');
  overlay.id = 'signoff-review-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483640;
    cursor: crosshair;
    background-color: rgba(0, 0, 0, 0.1);
    pointer-events: auto;
  `;
  document.body.appendChild(overlay);

  const highlighter = document.createElement('div');
  highlighter.id = 'signoff-highlighter';
  highlighter.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 2px solid #3b82f6;
    background-color: rgba(59, 130, 246, 0.15);
    z-index: 2147483641;
    display: none;
    transition: all 0.05s ease-out;
  `;
  document.body.appendChild(highlighter);

  const onMouseMove = (e: MouseEvent) => {
    overlay!.style.pointerEvents = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY);
    overlay!.style.pointerEvents = 'auto';

    if (target && target !== document.body && target !== document.documentElement && !target.closest('#signoff-sidebar')) {
      const rect = target.getBoundingClientRect();
      highlighter.style.display = 'block';
      highlighter.style.top = `${rect.top}px`;
      highlighter.style.left = `${rect.left}px`;
      highlighter.style.width = `${rect.width}px`;
      highlighter.style.height = `${rect.height}px`;
    } else {
      highlighter.style.display = 'none';
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup();
  };

  const cleanup = () => {
    overlay?.removeEventListener('mousemove', onMouseMove);
    overlay?.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKeyDown);
    if (overlay) document.body.removeChild(overlay);
    if (highlighter) document.body.removeChild(highlighter);
    overlay = null;
  };

  // Detect browser
  function detectBrowser(): { name: string; version: string } {
    const ua = navigator.userAgent;
    let match = ua.match(/(chrome|firefox|safari|edge|opera)\/?\s*(\d+(\.\d+)?)/i);
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (match) {
      browserName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      browserVersion = match[2];
    }
    return { name: browserName, version: browserVersion };
  }

  // Detect OS
  function detectOS(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') !== -1) return 'Windows';
    if (ua.indexOf('Mac') !== -1) return 'macOS';
    if (ua.indexOf('Linux') !== -1) return 'Linux';
    if (ua.indexOf('Android') !== -1) return 'Android';
    if (ua.indexOf('iOS') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) return 'iOS';
    return 'Unknown';
  }

  // Get unique selector
  function getSelector(element: Element | null): string {
    if (!element) return '';
    if (element.id) return `#${element.id}`;
    if (element === document.body) return 'body';
    
    let path = [];
    let current: Element | null = element;
    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
        }
        if (current.className) {
            const classes = current.className.trim().split(/\s+/).filter(Boolean);
            if (classes.length) {
                selector += '.' + classes.join('.');
            }
        }
        // Add nth-child
        let parent = current.parentNode;
        if (parent) {
            let siblings = Array.from(parent.children);
            let index = siblings.indexOf(current) + 1;
            if (index > 0) {
                selector += `:nth-child(${index})`;
            }
        }
        path.unshift(selector);
        current = current.parentElement;
    }
    return path.join(' > ');
  }

  const onClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture coordinates and selector
    const target = highlighter.style.display === 'block' ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const coords = { x: e.clientX, y: e.clientY };
    const rect = target?.getBoundingClientRect();
    
    // Collect element info
    let elementInfo = null;
    if (target && target instanceof HTMLElement) {
      elementInfo = {
        selector: getSelector(target),
        tag: target.tagName.toLowerCase(),
        elementId: target.id,
        elementClasses: target.className.trim().split(/\s+/).filter(Boolean),
        elementText: target.textContent?.trim() || '',
      };
    }

    // Collect browser/viewport info
    const browser = detectBrowser();
    const os = detectOS();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    const devicePixelRatio = window.devicePixelRatio;
    
    // Hide UI for screenshot
    if (sidebar) sidebar.style.display = 'none';
    highlighter.style.display = 'none';
    overlay!.style.display = 'none';

    // Request high-quality screenshot from background
    chrome.runtime.sendMessage({ action: "capture_tab" }, (response) => {
      const dataUrl = response?.dataUrl;
      
      cleanup();
      
      if (sidebar) {
        sidebar.style.display = 'block';
        sidebar.contentWindow?.postMessage({ 
          action: 'location_selected', 
          coords, 
          dataUrl,
          elementRect: rect ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height } : null,
          elementInfo,
          pageInfo: {
            url: window.location.href,
            hostname: window.location.hostname,
            pathname: window.location.pathname,
            title: document.title,
          },
          browser,
          os,
          viewport,
          scrollPosition,
          devicePixelRatio,
        }, '*');
      }
    });
  };

  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
}

// Add marker styles
const markerStyles = document.createElement('style');
markerStyles.textContent = `
  @keyframes signoff-pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
  .signoff-issue-marker {
    animation: signoff-pulse 2s infinite;
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  }
  .signoff-issue-marker:hover {
    transform: scale(1.2) !important;
    z-index: 999991 !important;
  }
`;
document.head.appendChild(markerStyles);

let issueMarkers: HTMLDivElement[] = [];

function clearIssueMarkers() {
  issueMarkers.forEach(m => m.remove());
  issueMarkers = [];
}

function renderIssueMarkers(issues: any[]) {
  clearIssueMarkers();
  
  issues.forEach((issue, index) => {
    if (!issue.elementRect) return;
    
    const marker = document.createElement('div');
    marker.className = 'signoff-issue-marker';
    const rect = issue.elementRect;
    
    // Status colors
    let bgColor = '#ef4444'; // Red = Open
    if (issue.status === 'IN_PROGRESS') bgColor = '#eab308'; // Yellow = In Progress
    if (issue.status === 'RESOLVED') bgColor = '#22c55e'; // Green = Resolved
    if (issue.status === 'VALIDATED') bgColor = '#3b82f6'; // Blue = Validated
    
    marker.style.cssText = `
      position: fixed;
      top: ${rect.y + rect.height/2}px;
      left: ${rect.x + rect.width/2}px;
      width: 28px;
      height: 28px;
      background-color: ${bgColor};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      z-index: 999990;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      transform: translate(-50%, -50%);
      pointer-events: auto;
    `;
    marker.innerText = (index + 1).toString();
    
    // Hover tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999992;
      pointer-events: none;
      display: none;
    `;
    tooltip.textContent = issue.title || issue.description || 'Issue';
    marker.appendChild(tooltip);
    
    // Hover logic
    marker.onmouseenter = () => {
      tooltip.style.display = 'block';
      const target = document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
      if (target && target instanceof HTMLElement) {
        target.style.outline = `3px solid ${bgColor}`;
        target.style.outlineOffset = '2px';
      }
    };
    marker.onmouseleave = () => {
      tooltip.style.display = 'none';
      const target = document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
      if (target && target instanceof HTMLElement) {
        target.style.outline = '';
        target.style.outlineOffset = '';
      }
    };
    
    // Click logic
    marker.onclick = () => {
      if (sidebar && sidebar.contentWindow) {
        sidebar.contentWindow.postMessage({ action: 'issue_marker_clicked', issueId: issue.id || issue._id }, '*');
      }
    };
    
    document.body.appendChild(marker);
    issueMarkers.push(marker);
  });
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'SIGNOFFAI_SEND_AUTH_TOKEN') {
    chrome.runtime.sendMessage({
      type: 'SIGNOFFAI_AUTH_TOKEN',
      token: event.data.token,
      user: event.data.user
    });
  }
  if (event.data.action === 'sync_overlays') {
    if (event.data.show) {
      renderIssueMarkers(event.data.issues);
    } else {
      clearIssueMarkers();
    }
  }
  if (event.data.action === 'start_capture') {
    startCapture(event.data.tool);
  }
  if (event.data.action === 'start_location_selection') {
    startLocationSelection();
  }
  if (event.data.action === 'expand_sidebar') {
    if (sidebar) sidebar.style.width = '424px';
  }
  if (event.data.action === 'expand_full') {
    if (sidebar) {
      sidebar.style.width = '100vw';
      sidebar.style.height = '100vh';
      sidebar.style.backgroundColor = 'transparent'; // React will handle the backdrop
      sidebar.style.pointerEvents = 'auto';
    }
  }
  if (event.data.action === 'collapse_sidebar') {
    if (sidebar) {
      sidebar.style.width = '64px';
      sidebar.style.height = '100vh';
      sidebar.style.backgroundColor = 'transparent';
    }
  }
});
