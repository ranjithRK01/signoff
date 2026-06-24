import html2canvas from "html2canvas";

const CAPTURE_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Capture the review viewport (iframe + annotation overlay) as PNG. */
export async function captureReviewViewport(
  container: HTMLElement,
  iframe: HTMLIFrameElement | null,
  options: { hideAnnotations?: boolean } = {}
): Promise<Blob | null> {
  await sleep(CAPTURE_DELAY_MS);

  // If we need to hide annotations, we can temporarily set a data attribute
  if (options.hideAnnotations) {
    container.setAttribute("data-signoff-capture-hide", "true");
  }

  const isProxied = iframe?.src?.includes("/api/website-proxy") ?? false;

  try {
    // If proxied, we can try to capture the iframe content directly first
    if (isProxied && iframe?.contentDocument?.body) {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow!;
        
        // Capture only the visible viewport of the iframe
        const frameCanvas = await html2canvas(doc.body, {
          useCORS: true,
          allowTaint: true,
          scale: Math.min(2, window.devicePixelRatio || 1),
          logging: false,
          backgroundColor: "#ffffff",
          // Force it to capture only the visible area
          width: win.innerWidth,
          height: win.innerHeight,
          scrollX: win.scrollX,
          scrollY: win.scrollY,
          windowWidth: win.innerWidth,
          windowHeight: win.innerHeight,
        });

        // Now composite the annotations
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = frameCanvas.width;
        finalCanvas.height = frameCanvas.height;
        const ctx = finalCanvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(frameCanvas, 0, 0);
          
          if (!options.hideAnnotations) {
            // Find the annotation layer. It could be inside the iframe (proxied) or outside (direct fallback)
            let overlayCanvas: HTMLCanvasElement | null = null;
            
            // 1. Try to find the layer inside the iframe (proxied markers)
            const internalLayer = doc.getElementById("signoff-marker-root");
            if (internalLayer) {
              overlayCanvas = await html2canvas(internalLayer, {
                backgroundColor: null,
                scale: Math.min(2, window.devicePixelRatio || 1),
                width: win.innerWidth,
                height: win.innerHeight,
                scrollX: win.scrollX,
                scrollY: win.scrollY,
              });
            } else {
              // 2. Try to find the layer in the parent (direct markers)
              const externalLayer = container.querySelector(".annotation-layer");
              if (externalLayer instanceof HTMLElement) {
                overlayCanvas = await html2canvas(externalLayer, {
                  backgroundColor: null,
                  scale: Math.min(2, window.devicePixelRatio || 1),
                });
              }
            }
            
            if (overlayCanvas) {
              ctx.drawImage(overlayCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
            }
          }
          
          const blob = await canvasToBlob(finalCanvas);
          if (blob) return blob;
        }
      } catch (err) {
        console.warn("Iframe-direct capture failed, falling back to container capture", err);
      }
    }

    // Fallback: Capture the whole container
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale: Math.min(2, window.devicePixelRatio || 1),
      logging: false,
      backgroundColor: "#ffffff",
      ignoreElements: (el) =>
        Boolean(
          el.closest?.("[data-signoff-ignore-capture='true']") ||
            (options.hideAnnotations && (el.classList.contains("annotation-layer") || el.hasAttribute("data-annotation-marker")))
        ),
    });
    const blob = await canvasToBlob(canvas);
    return blob;
  } catch (err) {
    console.error("captureReviewViewport failed:", err);
  } finally {
    if (options.hideAnnotations) {
      container.removeAttribute("data-signoff-capture-hide");
    }
  }

  return null;
}

/** Generate a small thumbnail from a blob. */
export async function generateThumbnail(blob: Blob, width = 300): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      const scale = width / img.width;
      canvas.width = width;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(blob);
  });
}

/** Capture full evidence package. */
export async function captureIssueEvidence(
  container: HTMLElement,
  iframe: HTMLIFrameElement | null,
  pending?: { kind: string; x: number; y: number; width?: number; height?: number }
): Promise<{
  screenshot: Blob | null;
  annotatedScreenshot: Blob | null;
  cropScreenshot: Blob | null;
  thumbnail: Blob | null;
}> {
  // 1. Capture annotated version (what the user sees)
  const annotatedScreenshot = await captureReviewViewport(container, iframe, {
    hideAnnotations: false,
  });

  // 2. Capture clean version (hide annotations)
  const screenshot = await captureReviewViewport(container, iframe, {
    hideAnnotations: true,
  });

  // 3. Capture crop screenshot if it's a rectangle/crop
  let cropScreenshot: Blob | null = null;
  if (pending?.kind === "rectangle" && screenshot && pending.width && pending.height) {
    cropScreenshot = await captureCrop(screenshot, pending as any);
  }

  // 4. Generate thumbnail from the clean screenshot
  let thumbnail: Blob | null = null;
  if (screenshot) {
    thumbnail = await generateThumbnail(screenshot);
  } else if (annotatedScreenshot) {
    thumbnail = await generateThumbnail(annotatedScreenshot);
  }

  return { screenshot, annotatedScreenshot, cropScreenshot, thumbnail };
}

/** Capture only the selected rectangle area. */
async function captureCrop(
  fullScreenshot: Blob, 
  pending: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      
      // pending.x/y/width/height are percentages (0-100)
      const sx = (pending.x / 100) * img.width;
      const sy = (pending.y / 100) * img.height;
      const sw = (pending.width / 100) * img.width;
      const sh = (pending.height / 100) * img.height;

      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob((b) => resolve(b), "image/png", 0.92);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(fullScreenshot);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}
