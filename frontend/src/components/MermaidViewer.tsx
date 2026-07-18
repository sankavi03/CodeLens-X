import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Copy, FileText } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  htmlLabels: false,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
  }
});

interface MermaidViewerProps {
  chartCode: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chartCode }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  // Zoom/Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartCode || chartCode.trim() === '') {
      setSvgContent('');
      setError(null);
      return;
    }

    const renderChart = async () => {
      try {
        const id = `mermaid-render-${Math.random().toString(36).substring(2, 9)}`;
        let cleanCode = chartCode;
        if (cleanCode.includes('```mermaid')) {
          cleanCode = cleanCode.replace(/```mermaid([\s\S]*?)```/g, '$1');
        } else if (cleanCode.includes('```')) {
          cleanCode = cleanCode.replace(/```([\s\S]*?)```/g, '$1');
        }
        cleanCode = cleanCode.trim();

        // Validate syntax before rendering
        await mermaid.parse(cleanCode);

        const { svg } = await mermaid.render(id, cleanCode);
        setSvgContent(svg);
        setError(null);
        // Reset zoom/pan when code changes
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Syntax validation failed.');
        setSvgContent('');
      }
    };

    renderChart();
  }, [chartCode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(Math.max(0.1, scale + delta * zoomIntensity), 5);
    setScale(newScale);
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.1));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getFormattedFilename = (ext: 'png' | 'svg') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `architecture-diagram-${year}-${month}-${day}-${hours}${minutes}${seconds}.${ext}`;
  };

  const handleExportSVG = () => {
    if (!svgContent) return;
    try {
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFormattedFilename('svg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('SVG exported successfully!', 'success');
    } catch (err) {
      console.error('SVG export failed:', err);
      addToast('Failed to export SVG.', 'error');
    }
  };

  const handleExportPNG = () => {
    console.log("=== STARTING PNG EXPORT DEBUGGING ===");
    const svgElement = svgWrapperRef.current?.querySelector('svg');
    if (!svgElement) {
      console.warn("No SVG element found in DOM inside svgWrapperRef");
      addToast('No SVG diagram found to export.', 'error');
      return;
    }

    try {
      console.log("Found SVG element in DOM. TagName:", svgElement.tagName);
      
      // Clone the SVG element from the DOM
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Parse viewBox for width and height safely
      let width = 800;
      let height = 600;
      const viewBoxAttr = clonedSvg.getAttribute('viewBox');
      console.log("Parsed viewBox attribute value:", viewBoxAttr);

      if (viewBoxAttr) {
        const parts = viewBoxAttr.split(/\s+/);
        if (parts.length === 4) {
          width = parseFloat(parts[2]) || 800;
          height = parseFloat(parts[3]) || 600;
        }
      } else {
        const wAttr = clonedSvg.getAttribute('width');
        const hAttr = clonedSvg.getAttribute('height');
        if (wAttr) width = parseFloat(wAttr) || 800;
        if (hAttr) height = parseFloat(hAttr) || 600;
      }
      console.log("Determined Dimensions - Width:", width, "Height:", height);
      
      // Setup absolute dimensions and clear max-width constraints for clean export bounds
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());
      clonedSvg.style.width = width + 'px';
      clonedSvg.style.height = height + 'px';
      clonedSvg.style.maxWidth = 'none';
      
      if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      console.log("Serialized SVG string length:", svgString.length);
      console.log("Serialized SVG preview:", svgString.substring(0, 300));

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      console.log("Generated Blob URL:", url);
      
      const image = new Image();
      image.onload = () => {
        console.log("Image onload fired successfully!");
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2; // high resolution export
          canvas.height = height * 2;
          const context = canvas.getContext('2d');
          if (context) {
            console.log("Created 2D canvas context successfully.");
            context.fillStyle = '#07090e'; // dark theme background
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            console.log("drawImage executed successfully.");
            
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = getFormattedFilename('png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("PNG download triggered.");
            addToast('PNG exported successfully!', 'success');
          } else {
            console.error("Failed to create 2D canvas context.");
            addToast('Failed to create 2D canvas context.', 'error');
          }
        } catch (err) {
          console.error('Canvas export error inside onload:', err);
          addToast('Failed to generate PNG image.', 'error');
        } finally {
          DOMURL.revokeObjectURL(url);
        }
      };
      
      image.onerror = (evt) => {
        console.error('Image element failed to load. onerror event details:', evt);
        console.log("Image source attempted:", image.src ? image.src.substring(0, 200) : "null");
        console.log("Image properties - complete:", image.complete, "naturalWidth:", image.naturalWidth);
        addToast('Failed to load diagram render content.', 'error');
        DOMURL.revokeObjectURL(url);
      };
      
      image.src = url;
    } catch (err) {
      console.error('PNG export initialization failed:', err);
      addToast('Failed to export PNG.', 'error');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chartCode);
      addToast('Mermaid code copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy Mermaid code.', 'error');
    }
  };

  const handleDownloadCode = () => {
    try {
      const blob = new Blob([chartCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'diagram.mermaid';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Mermaid file downloaded!', 'success');
    } catch {
      addToast('Failed to download Mermaid file.', 'error');
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-panel-bg border border-panel-border rounded-lg relative overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-[#07090e]' : 'w-full h-full min-h-[400px]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-panel-border/50 px-4 py-2 bg-panel-sidebar select-none font-mono text-[11px] shrink-0">
        <span className="text-white font-bold">Architecture Viewer</span>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center border border-panel-border/80 rounded bg-[#1e293b] px-1 py-0.5 text-panel-text">
            <button onClick={handleZoomIn} className="p-1 hover:text-white cursor-pointer" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
            <button onClick={handleZoomOut} className="p-1 hover:text-white cursor-pointer" title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></button>
            <button onClick={handleReset} className="p-1 hover:text-white cursor-pointer" title="Reset view"><RotateCcw className="h-3.5 w-3.5" /></button>
          </div>

          {/* Action Dropdown / buttons */}
          <button 
            onClick={handleCopyCode}
            className="flex items-center gap-1 hover:text-white px-2 py-1 bg-[#1e293b] border border-panel-border rounded transition-colors text-panel-text cursor-pointer"
            title="Copy Mermaid Code"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </button>
          <button 
            onClick={handleDownloadCode}
            className="flex items-center gap-1 hover:text-white px-2 py-1 bg-[#1e293b] border border-panel-border rounded transition-colors text-panel-text cursor-pointer"
            title="Download Mermaid File"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
          <button 
            onClick={handleExportSVG}
            className="flex items-center gap-1 hover:text-white px-2 py-1 bg-[#1e293b] border border-panel-border rounded transition-colors text-panel-text cursor-pointer"
            title="Export SVG"
          >
            <Download className="h-3.5 w-3.5" />
            <span>SVG</span>
          </button>
          <button 
            onClick={handleExportPNG}
            className="flex items-center gap-1 hover:text-white px-2 py-1 bg-[#1e293b] border border-panel-border rounded transition-colors text-panel-text cursor-pointer"
            title="Export PNG"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PNG</span>
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

      <div 
        className="flex-1 overflow-hidden relative bg-[#07090e] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center font-mono">
            <div className="text-red-400 text-sm font-bold mb-2">Mermaid Diagram Rendering Error</div>
            <div className="text-xs text-panel-text/70 bg-slate-900 border border-panel-border p-4 rounded max-w-xl max-h-[300px] overflow-auto whitespace-pre-wrap text-left">
              {error}
            </div>
          </div>
        ) : svgContent ? (
          <div 
            ref={svgWrapperRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-panel-text font-mono animate-pulse">
            Analyzing architecture configurations...
          </div>
        )}
      </div>
    </div>
  );
};
export default MermaidViewer;
