import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Square, ArrowUpRight, MousePointer2, Type, Save, Pencil, Trash2, MapPin } from 'lucide-react';

interface Annotation {
  id: string;
  type: 'rect' | 'arrow' | 'pencil' | 'text' | 'pin';
  color: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: { x: number; y: number }[];
  text?: string;
  pinNumber?: number;
}

interface AnnotationEditorProps {
  image: string;
  onSave: (annotatedImage: string) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
];

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ image, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<'select' | 'rect' | 'arrow' | 'pencil' | 'text' | 'pin'>('pencil');
  const [color, setColor] = useState('#ef4444');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string, id?: string } | null>(null);
  const [nextPinNumber, setNextPinNumber] = useState(1);

  // Load image and set canvas size
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgSize({ width: img.width, height: img.height });
      const container = containerRef.current;
      if (!container) return;

      const maxWidth = container.clientWidth * 0.9;
      const maxHeight = container.clientHeight * 0.85;
      
      let scale = 1;
      if (img.width > maxWidth || img.height > maxHeight) {
        scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      }
      
      setCanvasScale(scale);
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        render();
      }
    };
    img.src = image;
  }, [image]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background image
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw all annotations
      annotations.forEach(ann => drawAnnotation(ctx, ann, ann.id === selectedId));
      
      // Draw current active annotation
      if (currentAnnotation) {
        drawAnnotation(ctx, currentAnnotation, false);
      }
    };
    img.src = image;
  }, [annotations, currentAnnotation, selectedId, image]);

  useEffect(() => {
    render();
  }, [render]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation, isSelected: boolean) => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isSelected) {
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#3b82f6';
      // Draw selection box
      if (ann.type === 'rect') {
        ctx.strokeRect(ann.x! - 5, ann.y! - 5, ann.width! + 10, ann.height! + 10);
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 3;
    }

    switch (ann.type) {
      case 'rect':
        ctx.strokeRect(ann.x!, ann.y!, ann.width!, ann.height!);
        break;
      case 'arrow':
        drawArrow(ctx, ann.x1!, ann.y1!, ann.x2!, ann.y2!);
        break;
      case 'pencil':
        if (ann.points && ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length - 1; i++) {
            const xc = (ann.points[i].x + ann.points[i + 1].x) / 2;
            const yc = (ann.points[i].y + ann.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(ann.points[i].x, ann.points[i].y, xc, yc);
          }
          ctx.stroke();
        }
        break;
      case 'text':
        ctx.font = 'bold 20px Arial';
        ctx.textBaseline = 'top';
        ctx.fillText(ann.text || '', ann.x!, ann.y!);
        break;
      case 'pin':
        drawPin(ctx, ann.x!, ann.y!, ann.pinNumber!);
        break;
    }
  };

  const drawPin = (ctx: CanvasRenderingContext2D, x: number, y: number, num: number) => {
    const size = 30;
    ctx.save();
    ctx.translate(x, y);
    
    // Teardrop shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size/2, -size/2, -size/2, -size, 0, -size);
    ctx.bezierCurveTo(size/2, -size, size/2, -size/2, 0, 0);
    ctx.fillStyle = '#ef4444'; // Red teardrop
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // White number inside
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), 0, -size * 0.65);
    
    ctx.restore();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLength = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) / canvasScale,
      y: (clientY - rect.top) / canvasScale
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setStartPos(pos);

    if (tool === 'select') {
      const found = [...annotations].reverse().find(ann => isPointInAnnotation(pos, ann));
      if (found) {
        setSelectedId(found.id);
        setIsMoving(true);
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, value: '' });
      return;
    }

    if (tool === 'pin') {
      const newPin: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'pin',
        color: '#ef4444',
        x: pos.x,
        y: pos.y,
        pinNumber: nextPinNumber,
      };
      setAnnotations(prev => [...prev, newPin]);
      setNextPinNumber(prev => prev + 1);
      setSelectedId(newPin.id);
      return;
    }

    setIsDrawing(true);
    const newAnn: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      type: tool as any,
      color,
      x: pos.x,
      y: pos.y,
      x1: pos.x,
      y1: pos.y,
      x2: pos.x,
      y2: pos.y,
      width: 0,
      height: 0,
      points: [pos],
    };
    setCurrentAnnotation(newAnn);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    const pos = getPos(e);
    const found = [...annotations].reverse().find(ann => ann.type === 'text' && isPointInAnnotation(pos, ann));
    if (found) {
      setTextInput({ x: found.x!, y: found.y!, value: found.text || '', id: found.id });
      // Remove it temporarily from annotations while editing
      setAnnotations(prev => prev.filter(ann => ann.id !== found.id));
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (isMoving && selectedId) {
      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== selectedId) return ann;
        const dx = pos.x - startPos.x;
        const dy = pos.y - startPos.y;
        setStartPos(pos);
        
        if (ann.type === 'rect' || ann.type === 'text' || ann.type === 'pin') {
          return { ...ann, x: ann.x! + dx, y: ann.y! + dy };
        } else if (ann.type === 'arrow') {
          return { ...ann, x1: ann.x1! + dx, y1: ann.y1! + dy, x2: ann.x2! + dx, y2: ann.y2! + dy };
        } else if (ann.type === 'pencil') {
          return { ...ann, points: ann.points?.map(p => ({ x: p.x + dx, y: p.y + dy })) };
        }
        return ann;
      }));
      return;
    }

    if (!isDrawing || !currentAnnotation) return;

    if (tool === 'rect') {
      setCurrentAnnotation({
        ...currentAnnotation,
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y)
      });
    } else if (tool === 'arrow') {
      setCurrentAnnotation({
        ...currentAnnotation,
        x2: pos.x,
        y2: pos.y
      });
    } else if (tool === 'pencil') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...(currentAnnotation.points || []), pos]
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentAnnotation) {
      setAnnotations(prev => [...prev, currentAnnotation]);
      setSelectedId(currentAnnotation.id);
    }
    setIsDrawing(false);
    setIsMoving(false);
    setCurrentAnnotation(null);
  };

  const isPointInAnnotation = (pos: { x: number, y: number }, ann: Annotation) => {
    const threshold = 10;
    switch (ann.type) {
      case 'rect':
        return pos.x >= ann.x! && pos.x <= ann.x! + ann.width! &&
               pos.y >= ann.y! && pos.y <= ann.y! + ann.height!;
      case 'text':
        return pos.x >= ann.x! && pos.x <= ann.x! + 100 &&
               pos.y >= ann.y! && pos.y <= ann.y! + 30;
      case 'arrow':
        const dist = distToSegment(pos, { x: ann.x1!, y: ann.y1! }, { x: ann.x2!, y: ann.y2! });
        return dist < threshold;
      case 'pencil':
        return ann.points?.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < threshold);
      case 'pin':
        return Math.hypot(pos.x - ann.x!, pos.y - (ann.y! - 15)) < 15;
    }
    return false;
  };

  const distToSegment = (p: {x:number, y:number}, v: {x:number, y:number}, w: {x:number, y:number}) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setAnnotations(prev => prev.filter(ann => ann.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput && textInput.value.trim()) {
      const newAnn: Annotation = {
        id: textInput.id || Math.random().toString(36).substr(2, 9),
        type: 'text',
        color,
        x: textInput.x,
        y: textInput.y,
        text: textInput.value
      };
      setAnnotations(prev => [...prev, newAnn]);
      setSelectedId(newAnn.id);
    }
    setTextInput(null);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black/90 z-[999999] flex flex-col items-center justify-center p-4 select-none">
      {/* Backdrop for cancellation */}
      <div className="absolute inset-0" onClick={() => {
        if (textInput) handleTextSubmit({ preventDefault: () => {} } as any);
        if (selectedId) setSelectedId(null);
      }} />

      {/* Floating Toolbar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-full px-6 py-3 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50">
        <div className="flex items-center gap-1.5">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={MousePointer2} label="Select" />
          <div className="w-[1px] h-6 bg-slate-700/50 mx-1" />
          <ToolButton active={tool === 'rect'} onClick={() => setTool('rect')} icon={Square} label="Rectangle" />
          <ToolButton active={tool === 'arrow'} onClick={() => setTool('arrow')} icon={ArrowUpRight} label="Arrow" />
          <ToolButton active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={Pencil} label="Pencil" />
          <ToolButton active={tool === 'text'} onClick={() => setTool('text')} icon={Type} label="Text" />
          <ToolButton active={tool === 'pin'} onClick={() => setTool('pin')} icon={MapPin} label="Pin" />
        </div>

        <div className="w-[1px] h-8 bg-slate-700/50" />

        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${
                color === c.value ? 'border-white scale-125 shadow-lg' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        <div className="w-[1px] h-8 bg-slate-700/50" />

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <Save size={18} />
            <span>Save</span>
          </button>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-all"
            title="Cancel"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        className="relative bg-white rounded-lg shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden transition-transform duration-300"
        style={{ 
          transform: `scale(${canvasScale})`,
          cursor: tool === 'select' ? 'default' : 'crosshair'
        }}
        onDoubleClick={handleDoubleClick}
      >
        <canvas 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className="block"
        />

        {textInput && (
          <form 
            onSubmit={handleTextSubmit}
            className="absolute z-50"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input
              autoFocus
              className="bg-transparent border-none outline-none font-bold text-[14px] p-0 shadow-none focus:ring-0"
              style={{ color: color, fontFamily: 'Arial', border: '1px dashed #3b82f6' }}
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onBlur={handleTextSubmit}
            />
          </form>
        )}
      </div>

      {/* Watermark */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1 opacity-40 pointer-events-none">
        <div className="text-white text-[10px] font-bold tracking-[0.4em] uppercase">
          Annotation Mode • Signoff.ai
        </div>
      </div>

      {/* Selected Annotation Delete Button */}
      {selectedId && !isMoving && !isDrawing && (
        <button
          onClick={() => {
            setAnnotations(prev => prev.filter(ann => ann.id !== selectedId));
            setSelectedId(null);
          }}
          className="absolute bottom-20 bg-red-600 text-white p-3 rounded-full shadow-2xl hover:bg-red-500 transition-all animate-in fade-in slide-in-from-bottom-4"
        >
          <Trash2 size={24} />
        </button>
      )}
    </div>
  );
};

const ToolButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    title={label}
    className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
      active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <Icon size={20} />
  </button>
);

export default AnnotationEditor;