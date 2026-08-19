import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';

interface FullscreenImageViewerProps {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export const FullscreenImageViewer: React.FC<FullscreenImageViewerProps> = ({
  imageUrl,
  title = 'Aperçu Plein Écran',
  subtitle,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key, keyboard zoom shortcuts (+ / - / 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scrolling while open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.35, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1.1) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + delta, 0.5), 4);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const content = (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col select-none animate-fadeIn"
    >
      {/* Top Floating Control Bar */}
      <div className="shrink-0 h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-slate-900/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold shrink-0">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
            <button
              onClick={handleZoomOut}
              title="Zoom arrière (-)"
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Réinitialiser zoom (0)"
              className="px-2 py-1 text-xs font-mono font-bold text-purple-300 hover:text-white transition-colors"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              title="Zoom avant (+)"
              disabled={scale >= 4}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {scale !== 1 && (
              <button
                onClick={handleResetZoom}
                title="Recentrer"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Download HD */}
          <a
            href={imageUrl}
            download={`${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`}
            target="_blank"
            rel="noreferrer"
            title="Télécharger l'image HD"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Fermer (Échap)"
            className="p-2 rounded-xl bg-white/15 hover:bg-red-500/80 text-white border border-white/20 transition-all hover:scale-105 active:scale-95 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Canvas Area */}
      <div
        className={`flex-1 overflow-hidden relative flex items-center justify-center p-4 sm:p-8 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={imageUrl}
            alt={title}
            draggable={false}
            className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
          />
        </div>
      </div>

      {/* Bottom Hint Banner */}
      <div className="shrink-0 py-2.5 px-4 text-center border-t border-white/10 bg-slate-900/40 backdrop-blur-md">
        <p className="text-[11px] sm:text-xs text-slate-400">
          💡 <strong>Double-clic</strong> pour zoomer • <strong>Molette</strong> pour ajuster • <strong>Glisser</strong> pour naviguer • Touche <strong>Échap</strong> pour fermer
        </p>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default FullscreenImageViewer;
