import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

export interface FlashcardImageLightboxProps {
  images: string[];
  initialIndex?: number;
  sideLabel?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FlashcardImageLightbox: React.FC<FlashcardImageLightboxProps> = ({
  images,
  initialIndex = 0,
  sideLabel,
  isOpen,
  onClose
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contentBoxRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const clamped = Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1)));
      setActiveIndex(clamped);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex, images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && images.length > 0) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('close', handleNativeClose);

    // Fallback for browsers without declarative <dialog closedby="any"> support (e.g. Safari)
    let cleanupFallback: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutsideContent = (e: PointerEvent) => {
        const box = contentBoxRef.current;
        if (!box) return e.target === dialog;
        const r = box.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutsideContent(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutsideContent(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      if (cleanupFallback) cleanupFallback();
    };
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    e.stopPropagation();
    if (e.key === 'ArrowLeft' && images.length > 1) {
      e.preventDefault();
      setIsZoomed(false);
      setActiveIndex(prev => (prev - 1 + images.length) % images.length);
    } else if (e.key === 'ArrowRight' && images.length > 1) {
      e.preventDefault();
      setIsZoomed(false);
      setActiveIndex(prev => (prev + 1) % images.length);
    }
  };

  if (images.length === 0) return null;

  const currentUrl = images[activeIndex] || images[0];

  return (
    <dialog
      ref={dialogRef}
      aria-label={sideLabel ? `Aperçu photo — ${sideLabel}` : 'Aperçu plein écran de la photo'}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        e.stopPropagation();
        // Close when clicking the empty backdrop space inside the full-viewport dialog wrapper
        if (e.target === e.currentTarget) {
          dialogRef.current?.close();
        }
      }}
      {...({ closedby: 'any' } as any)}
      className="flashcard-lightbox-dialog m-auto max-w-[96vw] max-h-[94vh] w-fit bg-transparent border-0 p-0 outline-none overflow-visible"
    >
      <div
        ref={contentBoxRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col rounded-2xl border border-slate-700/80 bg-slate-950/95 text-white shadow-2xl overflow-hidden max-w-[95vw] max-h-[92vh]"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {sideLabel && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate">
                {sideLabel}
              </span>
            )}
            {images.length > 1 && (
              <span className="text-xs font-semibold text-slate-300">
                Photo {activeIndex + 1} sur {images.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsZoomed(z => !z)}
              aria-label={isZoomed ? 'Réduire le zoom' : 'Agrandir la photo'}
              aria-pressed={isZoomed}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {isZoomed ? (
                <>
                  <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ajuster</span>
                </>
              ) : (
                <>
                  <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Zoom 2×</span>
                </>
              )}
            </button>

            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              aria-label="Fermer l'aperçu plein écran"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Main Image Viewport */}
        <div className="relative flex items-center justify-center overflow-auto p-3 sm:p-5 min-w-[280px] max-w-[94vw] max-h-[76vh] bg-slate-950">
          {images.length > 1 && !isZoomed && (
            <button
              type="button"
              onClick={() => setActiveIndex(prev => (prev - 1 + images.length) % images.length)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white border border-slate-700 shadow-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          <img
            src={currentUrl}
            alt={
              sideLabel
                ? `${sideLabel} — photo ${activeIndex + 1} sur ${images.length}`
                : `Photo ${activeIndex + 1} sur ${images.length}`
            }
            onClick={() => setIsZoomed(z => !z)}
            className={`rounded-lg transition-transform select-none ${
              isZoomed
                ? 'max-w-none w-[160%] sm:w-[180%] cursor-zoom-out'
                : 'max-h-[70vh] max-w-[88vw] w-auto h-auto object-contain cursor-zoom-in'
            }`}
          />

          {images.length > 1 && !isZoomed && (
            <button
              type="button"
              onClick={() => setActiveIndex(prev => (prev + 1) % images.length)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white border border-slate-700 shadow-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Thumbnails strip when multiple photos */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-t border-slate-800 bg-slate-900/90 overflow-x-auto shrink-0">
            {images.map((imgUrl, idx) => (
              <button
                key={`${imgUrl}-${idx}`}
                type="button"
                onClick={() => {
                  setIsZoomed(false);
                  setActiveIndex(idx);
                }}
                aria-label={`Afficher la photo ${idx + 1}`}
                aria-current={idx === activeIndex ? 'true' : undefined}
                className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  idx === activeIndex
                    ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                    : 'border-slate-700 opacity-65 hover:opacity-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt=""
                  className="w-12 h-12 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
};
