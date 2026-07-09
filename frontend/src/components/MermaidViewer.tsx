import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Download, Maximize2, Minimize2 } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
  }
});

interface MermaidViewerProps {
  chartCode: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chartCode }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartCode || chartCode.trim() === '') {
      setSvgContent('');
      return;
    }

    const renderChart = async () => {
      try {
        const id = `mermaid-render-${Math.random().toString(36).substring(2, 9)}`;
        // Clean markdown backticks if returned in code blocks
        let cleanCode = chartCode;
        if (cleanCode.includes('```mermaid')) {
          cleanCode = cleanCode.replace(/```mermaid([\s\S]*?)```/g, '$1');
        } else if (cleanCode.includes('```')) {
          cleanCode = cleanCode.replace(/```([\s\S]*?)```/g, '$1');
        }
        
        // Remove trailing lines or comments if they break rendering
        cleanCode = cleanCode.trim();

        const { svg } = await mermaid.render(id, cleanCode);
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        // Fallback placeholder display if render fails due to syntax mismatch
        setSvgContent(`<div class="text-xs text-red-400 p-4 font-mono">Failed to render Mermaid layout automatically. Diagram source:<pre class="mt-2 text-[10px] bg-slate-900 p-2 rounded overflow-x-auto">${chartCode}</pre></div>`);
      }
    };

    renderChart();
  }, [chartCode]);

  const handleExport = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'architecture_diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-panel-bg border border-panel-border rounded-lg relative overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-6' : 'w-full h-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-panel-border/50 px-4 py-2 bg-panel-sidebar select-none font-mono text-[11px] shrink-0">
        <span className="text-white font-bold">Mermaid Architecture Flowchart</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className="flex items-center gap-1 hover:text-white px-2 py-1 bg-[#1e293b] border border-panel-border rounded transition-colors text-panel-text cursor-pointer"
            title="Download SVG"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export SVG</span>
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center justify-center p-1.5 hover:text-white bg-[#1e293b] border border-panel-border rounded transition-colors text-panel-text cursor-pointer"
            title="Fullscreen Toggle"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#07090e]">
        {svgContent ? (
          <div 
            className="w-full max-w-full text-center flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="text-xs text-panel-text font-mono animate-pulse">Analyzing architectural hierarchy graphs...</div>
        )}
      </div>
    </div>
  );
};
export default MermaidViewer;
