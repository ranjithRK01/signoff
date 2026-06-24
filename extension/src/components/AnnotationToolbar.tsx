import React from 'react';
import { MapPin, Square, ArrowUpRight, Type, Camera, X } from 'lucide-react';

interface AnnotationToolbarProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({ onCapture, onCancel }) => {
  const tools = [
    { id: 'pin', icon: MapPin, label: 'Pin' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'full', icon: Camera, label: 'Screenshot' },
  ];

  const handleToolClick = (toolId: string) => {
    // Notify parent (content script) to start capture with specific tool
    window.parent.postMessage({ action: 'start_capture', tool: toolId }, '*');
  };

  // Listen for capture result from content script
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === 'capture_result') {
        onCapture(event.data.dataUrl);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCapture]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Annotation Tools</h2>
        <button onClick={onCancel} className="p-1 hover:bg-slate-800 rounded">
          <X size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className="flex items-center gap-4 p-4 bg-slate-800 hover:bg-blue-600 rounded-xl transition-all group"
          >
            <tool.icon size={24} className="group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold">{tool.label}</div>
              <div className="text-xs text-slate-400 group-hover:text-blue-100">Click to start drawing</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto p-4 bg-slate-800/50 rounded-lg text-xs text-slate-400">
        <p>Select a tool and click or drag on the website to annotate.</p>
      </div>
    </div>
  );
};

export default AnnotationToolbar;
