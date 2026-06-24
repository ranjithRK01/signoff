import type { AnnotationCapture, ReviewItem } from "@/lib/types";
import { isDocumentAnchored } from "@/lib/annotationGeometry";

export type IframeMarker = {
  id: string;
  itemNumber: number;
  kind: "pin" | "rectangle" | "arrow";
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  active?: boolean;
  selector?: string;
  domContext?: AnnotationCapture["domContext"];
};

export type IframeMarkerSyncPayload = {
  markers: IframeMarker[];
  annotateMode: boolean;
  tool: "pin" | "rectangle" | "arrow";
  preview?: IframeMarker | null;
};

function annotationToDocPixels(a: AnnotationCapture): Omit<IframeMarker, "id" | "itemNumber" | "active"> | null {
  const kind = a.annotationKind ?? "pin";

  if (isDocumentAnchored(a)) {
    const x = a.documentX;
    const y = a.documentY;
    const base = { kind, x, y, domContext: a.domContext };
    
    if (kind === "rectangle") {
      return {
        ...base,
        width: a.width,
        height: a.height,
      };
    }
    if (kind === "arrow") {
      return {
        ...base,
        endX: a.documentX + (a.width || 0),
        endY: a.documentY + (a.height || 0),
      };
    }
    return base;
  }

  return null;
}

export function itemsToIframeMarkers(
  items: ReviewItem[],
  activeItemId: string | null
): IframeMarker[] {
  const out: IframeMarker[] = [];
  for (const item of items) {
    if (!item.annotation) continue;
    const geom = annotationToDocPixels(item.annotation);
    if (!geom) continue;
    out.push({
      id: item.id,
      itemNumber: item.itemNumber,
      active: item.id === activeItemId,
      ...geom,
    });
  }
  return out;
}

/** Injected into proxied pages — markers live inside the scrolling document. */
export function signoffMarkerBridgeScript(): string {
  return `
(function(){
  var layer=null, host=null, state={markers:[],annotateMode:false,tool:"pin",preview:null};
  function pickScrollRoot(){
    var best=null,bestScore=0;
    var winY=window.scrollY||document.documentElement.scrollTop||0;
    if(winY+1>bestScore){best=document.documentElement;bestScore=winY+1;}
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
  function ensureLayer(){
    var root=pickScrollRoot();
    host=(root===document.documentElement||root===document.body)?document.body:root;
    if(host instanceof HTMLElement&&getComputedStyle(host).position==="static"){
      host.style.position="relative";
    }
    if(!layer||layer.parentElement!==host){
      if(layer && layer.parentElement) layer.parentElement.removeChild(layer);
      layer = document.createElement("div");
      layer.id = "signoff-marker-root";
      layer.className = "annotation-layer";
      host.appendChild(layer);
    }
    layer.style.cssText="position:absolute;left:0;top:0;width:100%;z-index:2147483646;pointer-events:none;";
    var h=Math.max(host.scrollHeight||0,document.documentElement.scrollHeight||0);
    layer.style.height=h+"px";
    return layer;
  }
  function pctFromEvent(e){
    var rect=host.getBoundingClientRect();
    var x=e.clientX-rect.left+(host.scrollLeft||0);
    var y=e.clientY-rect.top+(host.scrollTop||0);
    return {x:x,y:y,rect:rect};
  }
  function render(){
    var L=ensureLayer();
    L.innerHTML="";
    // Only render the preview during creation, not existing markers
    if(state.preview){
      var m = state.preview;
      var x = m.x, y = m.y;
      
      if(m.kind==="rectangle"&&m.width!=null&&m.height!=null){
        var box=document.createElement("div");
        box.setAttribute("data-annotation-marker", "true");
        box.style.cssText="position:absolute;border:2px solid #4f46e5;background:rgba(79,70,229,0.15);pointer-events:none;left:"+x+"px;top:"+y+"px;width:"+m.width+"px;height:"+m.height+"px;";
        L.appendChild(box);
      }else if(m.kind==="arrow"&&m.endX!=null&&m.endY!=null){
        var svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
        svg.setAttribute("data-annotation-marker", "true");
        svg.setAttribute("style","position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;");
        var line=document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("x1",x);line.setAttribute("y1",y);
        line.setAttribute("x2",m.endX);line.setAttribute("y2",m.endY);
        line.setAttribute("stroke","#4f46e5");
        line.setAttribute("stroke-width","2.5");
        svg.appendChild(line);
        L.appendChild(svg);
      }else{
        var pin=document.createElement("div");
        pin.setAttribute("data-annotation-marker", "true");
        pin.style.cssText="position:absolute;transform:translate(-50%,-100%);width:28px;height:28px;border-radius:9999px;border:2px solid #fff;background:#4f46e5;color:#fff;display:flex;align-items:center;justify-content:center;font:bold 11px sans-serif;pointer-events:none;left:"+x+"px;top:"+y+"px;";
        pin.textContent="+";
        L.appendChild(pin);
      }
    }
    L.style.pointerEvents=state.annotateMode?"auto":"none";
  }
  var drag=null;
  function onDown(e){
    if(!state.annotateMode)return;
    // Don't annotate if clicking on a marker
    if(e.target.closest("[data-annotation-marker]")) return;
    
    var p=pctFromEvent(e);
    if(state.tool==="pin"){
      parent.postMessage({type:"signoff-annotate",kind:"pin",x:p.x,y:p.y,scrollRoot:""},"*");
      return;
    }
    drag={x:p.x,y:p.y,tool:state.tool};
  }
  function onMove(e){
    if(!drag)return;
    var p=pctFromEvent(e);
    if(drag.tool==="rectangle"){
      var w=Math.abs(p.x-drag.x),h=Math.abs(p.y-drag.y);
      state.preview={id:"preview",kind:"rectangle",x:Math.min(drag.x,p.x),y:Math.min(drag.y,p.y),width:w,height:h,itemNumber:0};
    }else if(drag.tool==="arrow"){
      state.preview={id:"preview",kind:"arrow",x:drag.x,y:drag.y,endX:p.x,endY:p.y,itemNumber:0};
    }
    render();
  }
  function onUp(e){
    if(!drag)return;
    var p=pctFromEvent(e);
    if(drag.tool==="rectangle"){
      var w=Math.abs(p.x-drag.x),h=Math.abs(p.y-drag.y);
      if(w>4&&h>4){
        parent.postMessage({type:"signoff-annotate",kind:"rectangle",x:Math.min(drag.x,p.x),y:Math.min(drag.y,p.y),width:w,height:h},"*");
      }
    }else if(drag.tool==="arrow"){
      var dx=p.x-drag.x,dy=p.y-drag.y;
      if(Math.sqrt(dx*dx+dy*dy)>4){
        parent.postMessage({type:"signoff-annotate",kind:"arrow",x:drag.x,y:drag.y,endX:p.x,endY:p.y},"*");
      }
    }
    drag=null;state.preview=null;render();
  }
  document.addEventListener("mousedown",onDown,true);
  document.addEventListener("mousemove",onMove,true);
  document.addEventListener("mouseup",onUp,true);
  window.addEventListener("message",function(ev){
    if(!ev.data)return;
    if(ev.data.type==="signoff-sync-markers"){
      state.markers=ev.data.markers||[];
      state.annotateMode=!!ev.data.annotateMode;
      state.tool=ev.data.tool||"pin";
      state.preview=ev.data.preview||null;
      render();
    }
    if(ev.data.type==="signoff-scroll-to"){
      var root=pickScrollRoot();
      if(ev.data.scrollRoot){
        try{
          var r=document.querySelector(ev.data.scrollRoot);
          if(r)root=r;
        }catch(e){}
      }
      root.scrollTo({left:ev.data.x,top:ev.data.y,behavior:"smooth"});
    }
  });
  
  // Report scroll metrics frequently
  function reportScroll(){
    var root=pickScrollRoot();
    parent.postMessage({
      type:"signoff-frame-scroll",
      scrollX:root.scrollLeft||window.scrollX||0,
      scrollY:root.scrollTop||window.scrollY||0,
      scrollWidth:root.scrollWidth,
      scrollHeight:root.scrollHeight,
      viewportWidth:root.clientWidth||window.innerWidth,
      viewportHeight:root.clientHeight||window.innerHeight,
      scrollRoot:root===document.documentElement?"":root.id?"#"+root.id:""
    },"*");
  }

  // Intercept all clicks to keep navigation inside the proxy
  function interceptNavigation(){
    document.addEventListener("click", function(e){
      var anchor = e.target.closest("a");
      if(anchor && anchor.href && !anchor.target){
        // If it's an internal link, prevent default and notify parent to reload proxy
        var url = new URL(anchor.href);
        if(url.origin === window.location.origin){
          // It's already absolute or proxied
          return;
        }
        e.preventDefault();
        parent.postMessage({type: "signoff-frame-nav", href: anchor.href}, "*");
      }
    }, true);

    // Intercept forms
    document.addEventListener("submit", function(e){
      var form = e.target;
      if(form.action && !form.target){
         // In a real production app, we would proxy POST requests too.
         // For now, we notify the parent.
      }
    }, true);
  }

  window.addEventListener("scroll",function(){reportScroll();render();},true);
  window.addEventListener("resize",function(){reportScroll();render();});
  window.addEventListener("load",function(){
    reportScroll();
    interceptNavigation();
    parent.postMessage({type:"signoff-frame-nav", href: window.location.href}, "*");
  });
  
  setInterval(function(){ensureLayer();reportScroll();},1000);
})();
`;
}
