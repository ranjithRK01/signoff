import { NextRequest, NextResponse } from "next/server";
import { signoffMarkerBridgeScript } from "@/lib/iframeMarkers";

export const dynamic = "force-dynamic";

function isAllowedUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function defaultDocumentBase(pageUrl: URL): string {
  const path = pageUrl.pathname.endsWith("/")
    ? pageUrl.pathname
    : pageUrl.pathname.replace(/\/[^/]*$/, "") + "/";
  return new URL(path || "/", pageUrl.origin).href;
}

/** Root-relative <base href="/..."> breaks inside our iframe — rewrite to absolute upstream URL. */
function rewriteBaseTag(html: string, pageUrl: URL): string {
  const fallbackBase = defaultDocumentBase(pageUrl);

  if (/<base\s/i.test(html)) {
    return html.replace(
      /<base([^>]*?)href=["']([^"']+)["']([^>]*)>/gi,
      (_match, before, href, after) => {
        let absolute = fallbackBase;
        try {
          absolute = new URL(href, pageUrl.href).href;
        } catch {
          /* keep fallback */
        }
        return `<base${before}href="${absolute}"${after}>`;
      }
    );
  }

  return html.replace(/<head([^>]*)>/i, `<head$1><base href="${fallbackBase}">`);
}

/** Turn root-relative asset URLs into absolute upstream URLs (helps Angular/Webpack chunks). */
function absolutizeRootRelativeUrls(html: string, pageUrl: URL): string {
  const origin = pageUrl.origin;
  return html.replace(
    /(\s(?:src|href)=["'])(\/[^"']*)(["'])/gi,
    (_m, prefix, path, suffix) => `${prefix}${origin}${path}${suffix}`
  );
}

function stripEmbeddingRestrictions(html: string): string {
  return html
    .replace(
      /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
      ""
    )
    .replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
}

function spaBootstrapScript(pageUrl: URL): string {
  const upstreamJson = JSON.stringify(pageUrl.toString());
  return `<script data-signoff-bootstrap>
(function(){
  var upstreamBase=${upstreamJson};
  var activeRoot=null;
  function cssPath(el){
    if(!el||el===document.body)return"body";
    if(el.id)return"#"+el.id.replace(/([!"#$%%&'()*+,./:;<=>?@[\\\\]^\\\`{|}~])/g,"\\\\$1");
    var parts=[];
    var node=el;
    for(var d=0;node&&node.nodeType===1&&d<8;d++){
      var tag=node.tagName.toLowerCase();
      var parent=node.parentElement;
      if(!parent){parts.unshift(tag);break;}
      var sibs=[].filter.call(parent.children,function(c){return c.tagName===node.tagName});
      parts.unshift(sibs.length>1?tag+":nth-of-type("+(sibs.indexOf(node)+1)+")":tag);
      node=parent;
    }
    return parts.join(" > ");
  }
  function pickScrollRoot(){
    var best=null,bestScore=0;
    var winY=window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0;
    var winScore=winY+1;
    if(winScore>bestScore){best=document.documentElement;bestScore=winScore;}
    try{
      document.querySelectorAll("*").forEach(function(node){
        if(!(node instanceof HTMLElement))return;
        if(node.scrollHeight<=node.clientHeight+2)return;
        var score=node.scrollTop+node.clientHeight*0.001;
        if(score>bestScore){best=node;bestScore=score;}
      });
    }catch(e){}
    return best||document.documentElement;
  }
  function metricsFrom(root){
    var el=root||document.documentElement;
    var isDoc=el===document.documentElement||el===document.body;
    if(isDoc){
      return{
        scrollX:window.scrollX||document.documentElement.scrollLeft||0,
        scrollY:window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0,
        scrollWidth:document.documentElement.scrollWidth||document.body.scrollWidth||0,
        scrollHeight:document.documentElement.scrollHeight||document.body.scrollHeight||0,
        viewportWidth:window.innerWidth||0,
        viewportHeight:window.innerHeight||0,
        scrollRoot:""
      };
    }
    return{
      scrollX:el.scrollLeft||0,
      scrollY:el.scrollTop||0,
      scrollWidth:el.scrollWidth||0,
      scrollHeight:el.scrollHeight||0,
      viewportWidth:el.clientWidth||window.innerWidth||0,
      viewportHeight:el.clientHeight||window.innerHeight||0,
      scrollRoot:cssPath(el)
    };
  }
  function reportScroll(){
    try{
      activeRoot=pickScrollRoot();
      var m=metricsFrom(activeRoot);
      parent.postMessage(Object.assign({type:"signoff-frame-scroll"},m),"*");
    }catch(e){}
  }
  function notify(){
    try{
      var u=new URL(upstreamBase);
      if(location.hash)u.hash=location.hash;
      parent.postMessage({type:"signoff-frame-nav",href:u.toString()},"*");
    }catch(e){}
  }
  reportScroll();
  document.addEventListener("scroll",function(ev){
    var t=ev.target;
    if(t===document)activeRoot=document.documentElement;
    else if(t instanceof Element)activeRoot=t;
    reportScroll();
  },true);
  window.addEventListener("scroll",reportScroll,{passive:true});
  window.addEventListener("resize",reportScroll,{passive:true});
  window.addEventListener("load",function(){notify();reportScroll();});
  var _ps=history.pushState;
  history.pushState=function(){_ps.apply(this,arguments);notify();reportScroll();};
  window.addEventListener("popstate",function(){notify();reportScroll();});
  window.addEventListener("message",function(ev){
    if(!ev.data)return;
    if(ev.data.type==="signoff-scroll-to"){
      var y=ev.data.y||0,x=ev.data.x||0;
      var root=ev.data.scrollRoot?document.querySelector(ev.data.scrollRoot):null;
      if(root&&root instanceof HTMLElement){
        root.scrollTo({left:x,top:y,behavior:"smooth"});
      }else{
        window.scrollTo({left:x,top:y,behavior:"smooth"});
      }
      reportScroll();
    }
  });
  setInterval(reportScroll,400);
})();
</script>`;
}

function proxyErrorHtml(status: number, message: string, targetUrl: string): string {
  const safeUrl = targetUrl.replace(/</g, "&lt;");
  const safeMessage = message.replace(/</g, "&lt;");
  
  let suggestion = "Check that the URL is reachable from your machine and uses https://.";
  if (status === 403) {
    suggestion = `
      <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
        <p style="margin: 0; color: #92400e;"><strong>Why this is happening:</strong> The target site (e.g. Cloudflare, AWS WAF) is blocking our proxy's automated request.</p>
        <ul style="margin: 0.5rem 0 0; padding-left: 1.25rem; color: #92400e; font-size: 0.8rem;">
          <li>Whitelist the Signoff.AI server IP in your WAF settings.</li>
          <li>Ensure the staging site doesn't require a VPN or IP-restricted access.</li>
          <li>Try the <strong>"Direct Embed"</strong> button below to load the site using your browser's network instead.</li>
        </ul>
      </div>
    `;
  } else if (status === 401) {
    suggestion = "This site requires authentication. Please <strong>open the site in a new tab</strong>, log in, and then refresh this page to share the session.";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Proxy Error - ${status}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; background: #fafafa; color: #3f3f46; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
    .card { background: white; border: 1px solid #e4e4e7; border-radius: 12px; padding: 2rem; max-width: 500px; width: 100%; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; color: #18181b; display: flex; align-items: center; gap: 0.5rem; }
    p { font-size: 0.9375rem; line-height: 1.6; margin: 0 0 1rem; color: #52525b; }
    code { font-size: 0.8125rem; background: #f4f4f5; padding: 0.2rem 0.4rem; border-radius: 4px; color: #27272a; word-break: break-all; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 1.25rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; border: none; width: 100%; box-sizing: border-box; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; }
    .btn-secondary { background: white; color: #27272a; border: 1px solid #e4e4e7; margin-top: 0.5rem; }
    .btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
    .status-badge { display: inline-flex; padding: 0.25rem 0.5rem; border-radius: 4px; background: #fee2e2; color: #991b1b; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.025em; margin-bottom: 1rem; }
    .footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f4f4f5; font-size: 0.8125rem; color: #71717a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status-badge">Error ${status}</div>
    <h1>Could not load site via Proxy</h1>
    <p>${safeMessage}</p>
    ${suggestion}
    <div style="margin-top: 1.5rem;">
      <button onclick="parent.postMessage({type: 'signoff-switch-load-mode', mode: 'direct'}, '*')" class="btn btn-primary">Try Direct Embed</button>
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Open in New Tab</a>
    </div>
    <div class="footer">
      URL: <code>${safeUrl}</code>
    </div>
  </div>
</body>
</html>`;
}

async function fetchUpstream(parsed: URL, originalHeaders: Headers) {
  const headers = new Headers();
  
  // Forward essential browser headers to bypass basic anti-bot
  const forwardHeaders = [
    "user-agent",
    "accept",
    "accept-language",
    "cache-control",
    "pragma",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
  ];

  forwardHeaders.forEach(h => {
    const val = originalHeaders.get(h);
    if (val) headers.set(h, val);
  });

  // Ensure we have a modern user agent if not provided
  if (!headers.has("user-agent")) {
    headers.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  }

  // Add referer to look like a real navigation
  headers.set("referer", parsed.origin + "/");

  return fetch(parsed.toString(), {
    headers,
    redirect: "follow",
    cache: "no-store",
  });
}

async function fetchWithRetry(parsed: URL, originalHeaders: Headers): Promise<Response> {
  // Attempt 1: Full browser header mirroring
  let res = await fetchUpstream(parsed, originalHeaders);
  
  // If 403 (Forbidden) or 401 (Unauthorized), try more aggressive stealth
  if (res.status === 403 || res.status === 401) {
    console.log(`Proxy blocked (${res.status}) for ${parsed.hostname}. Retrying with clean stealth...`);
    
    // Attempt 2: Minimalist stealth (bypass basic WAF finger-printing)
    res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
      redirect: "follow",
      cache: "no-store",
    });
  }

  // Attempt 3: If still 403, try without any extra headers (some servers block sec-fetch-*)
  if (res.status === 403) {
    res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      redirect: "follow",
      cache: "no-store"
    });
  }

  return res;
}

/** POC proxy so staging sites can load inside the review iframe when X-Frame-Options blocks embed. */
export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return new NextResponse(proxyErrorHtml(400, "Missing url parameter.", ""), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const parsed = isAllowedUrl(target);
  if (!parsed) {
    return new NextResponse(proxyErrorHtml(400, "Invalid or disallowed URL.", target), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  try {
    const upstream = await fetchWithRetry(parsed, request.headers);
    const contentType = upstream.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      const body = await upstream.arrayBuffer();
      return new NextResponse(body, {
        status: upstream.status,
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!upstream.ok) {
      return new NextResponse(
        proxyErrorHtml(upstream.status, `The server responded with an error.`, parsed.toString()),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        }
      );
    }

    let html = stripEmbeddingRestrictions(await upstream.text());
    html = rewriteBaseTag(html, parsed);
    html = absolutizeRootRelativeUrls(html, parsed);

    const bridge = spaBootstrapScript(parsed);

    const markerBridge = `<script>${signoffMarkerBridgeScript()}</script>`;
    const injected = bridge + markerBridge;

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${injected}`);
    } else if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${injected}</body>`);
    } else {
      html = injected + html;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("website-proxy error:", err);
    const hint =
      parsed.hostname === "staging.client.com"
        ? "This is a demo placeholder URL. Use a real https:// staging URL, or keep the sample project to use the built-in preview."
        : "Check that the URL is reachable from your machine and uses https://.";
    return new NextResponse(proxyErrorHtml(hint, parsed.toString()), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
