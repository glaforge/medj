import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard, FlashcardReviewRating } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  X,
  Shuffle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Star,
  Lightbulb,
  Maximize2,
  Minimize2,
  Award,
  Layers,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Link2
} from 'lucide-react';

interface FlashcardPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  initialIndex?: number;
  courseTitle?: string;
  onToggleFavorite: (id: string) => Promise<void>;
  onRecordReview: (id: string, rating: FlashcardReviewRating) => Promise<void>;
}

export const FlashcardPlayerModal: React.FC<FlashcardPlayerModalProps> = ({
  isOpen,
  onClose,
  flashcards,
  initialIndex = 0,
  courseTitle,
  onToggleFavorite,
  onRecordReview
}) => {
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(true); // Aléatoire par défaut !
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [ratings, setRatings] = useState<Record<string, FlashcardReviewRating>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Initialize or re-shuffle deck
  const setupDeck = useCallback((cards: Flashcard[], shuffle: boolean, startIdx: number = 0) => {
    if (!cards || cards.length === 0) {
      setDeck([]);
      return;
    }
    let newDeck = [...cards];
    if (shuffle) {
      // Fisher-Yates shuffle
      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
      }
    }
    setDeck(newDeck);
    setCurrentIndex(shuffle ? 0 : Math.min(startIdx, newDeck.length - 1));
    setIsFlipped(false);
    setShowHint(false);
    setIsFinished(false);
  }, []);

  useEffect(() => {
    if (isOpen && flashcards.length > 0) {
      setupDeck(flashcards, isShuffle, initialIndex);
      setRatings({});
    }
  }, [isOpen, flashcards, isShuffle, setupDeck, initialIndex]);

  const currentCard = deck[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
      setIsFinished(false);
    }
  }, [currentIndex]);

  const handleRating = async (rating: FlashcardReviewRating) => {
    if (!currentCard) return;
    setRatings(prev => ({ ...prev, [currentCard.id]: rating }));
    try {
      await onRecordReview(currentCard.id, rating);
    } catch (e) {
      console.error('Failed to record review', e);
    }
    handleNext();
  };

  const handleToggleFav = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentCard) return;
    const targetId = currentCard.id;
    // Optimistic local update in current deck
    setDeck(prev => prev.map(c => c.id === targetId ? { ...c, isFavorite: !c.isFavorite } : c));
    try {
      await onToggleFavorite(targetId);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if user is in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          handlePrev();
          break;
        case 'KeyH':
          e.preventDefault();
          setShowHint(prev => !prev);
          break;
        case 'KeyF':
          e.preventDefault();
          handleToggleFav();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (isFlipped) {
            e.preventDefault();
            handleRating('AGAIN');
          }
          break;
        case 'Digit2':
        case 'Numpad2':
          if (isFlipped) {
            e.preventDefault();
            handleRating('HARD');
          }
          break;
        case 'Digit3':
        case 'Numpad3':
          if (isFlipped) {
            e.preventDefault();
            handleRating('GOOD');
          }
          break;
        case 'Digit4':
        case 'Numpad4':
          if (isFlipped) {
            e.preventDefault();
            handleRating('EASY');
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFinished, isFlipped, handleFlip, handleNext, handlePrev, handleToggleFav]);

  if (!isOpen) return null;

  const totalCards = deck.length;
  const progressPercent = totalCards > 0 ? Math.round(((currentIndex + (isFinished ? 1 : 0)) / totalCards) * 100) : 0;

  // Restart handlers
  const handleRestartAll = () => {
    setupDeck(flashcards, isShuffle, 0);
    setRatings({});
  };

  const handleRestartFailed = () => {
    const failedCards = flashcards.filter(c => ratings[c.id] === 'AGAIN' || ratings[c.id] === 'HARD');
    if (failedCards.length > 0) {
      setupDeck(failedCards, isShuffle, 0);
    } else {
      setupDeck(flashcards, isShuffle, 0);
    }
    setRatings({});
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0 bg-slate-950' : 'p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md'} animate-fadeIn`}>
      <div className={`w-full ${isFullscreen ? 'h-full rounded-none border-none' : 'h-full sm:h-auto sm:max-h-[94vh] max-w-4xl rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-scaleUp`}>
        
        {/* Top Header Bar */}
        <div className="px-3 sm:px-5 py-2 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wide truncate max-w-[140px] sm:max-w-md">
                  {courseTitle || (currentCard ? currentCard.courseTitle : 'Entraînement Flashcards')}
                </span>
                {currentCard?.ueCode && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                    {currentCard.ueCode}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                {totalCards > 0 ? `Carte ${currentIndex + 1} sur ${totalCards}` : 'Aucune carte'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Shuffle toggle button */}
            <button
              onClick={() => {
                const next = !isShuffle;
                setIsShuffle(next);
                setupDeck(flashcards, next, 0);
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isShuffle
                  ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-400 font-bold'
                  : 'bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={isShuffle ? 'Mode aléatoire activé' : 'Mode ordonné (séquentiel)'}
            >
              <Shuffle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{isShuffle ? 'Aléatoire' : 'Ordonné'}</span>
            </button>

            {/* Copy direct link */}
            {currentCard && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/flashcards/${currentCard.id}`;
                  navigator.clipboard.writeText(url);
                  window.history.pushState(null, '', `/flashcards/${currentCard.id}`);
                }}
                className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Copier le lien direct de cette flashcard (/flashcards/...)"
              >
                <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-950 h-1 sm:h-1.5 relative overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-r"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Main Content Area (No overflow clipping in landscape / my-auto positioning) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 flex flex-col items-center">
          
          {isFinished ? (
            /* End of deck summary screen */
            <div className="max-w-md w-full my-auto text-center space-y-4 sm:space-y-5 animate-fadeIn">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/20">
                <Award className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Session de révision terminée !
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Vous avez révisé <strong className="text-slate-900 dark:text-white">{totalCards}</strong> flashcards.
                </p>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left">
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30">
                  <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">Maîtrisées</div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {Object.values(ratings).filter(r => r === 'EASY' || r === 'GOOD').length}
                  </div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/30">
                  <div className="text-[10px] sm:text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase">À revoir</div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {Object.values(ratings).filter(r => r === 'AGAIN' || r === 'HARD').length}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 justify-center pt-1 sm:pt-2">
                <button
                  onClick={handleRestartAll}
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Recommencer tout le paquet</span>
                </button>
                {Object.values(ratings).some(r => r === 'AGAIN' || r === 'HARD') && (
                  <button
                    onClick={handleRestartFailed}
                    className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400" />
                    <span>Revoir les cartes à revoir</span>
                  </button>
                )}
              </div>
            </div>
          ) : currentCard ? (
            /* 3D Flip Card */
            <div className="w-full max-w-2xl my-auto flex flex-col items-center space-y-3 sm:space-y-4">
              
              {/* Card Container with 3D Perspective */}
              <div
                className="w-full cursor-pointer select-none"
                style={{ perspective: '1200px' }}
                onClick={handleFlip}
              >
                <div
                  className="w-full min-h-[260px] sm:min-h-[360px] md:min-h-[420px] rounded-2xl sm:rounded-3xl relative transition-transform duration-500 shadow-xl sm:shadow-2xl"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  
                  {/* FRONT FACE (Question) */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 flex flex-col justify-between border transition-all ${
                      isFlipped ? 'pointer-events-none' : ''
                    } bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-800/90 dark:via-slate-900 dark:to-slate-950 border-slate-300 dark:border-slate-700/80 hover:border-amber-500/50 shadow-xl`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                    {/* Front Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                          Recto • Question
                        </span>
                        {currentCard.tags && currentCard.tags.length > 0 && (
                          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[240px]">
                            #{currentCard.tags.join(' #')}
                          </span>
                        )}
                      </div>

                      {/* Favorite Star */}
                      <button
                        type="button"
                        onClick={handleToggleFav}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                        title={currentCard.isFavorite ? 'Retirer des favoris' : 'Marquer comme favori (F)'}
                      >
                        <Star className={`w-5 h-5 sm:w-6 sm:h-6 ${currentCard.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Question Content (Enlarged prominent typography) */}
                    <div className="my-auto py-3 sm:py-6 text-center overflow-y-auto max-h-[190px] sm:max-h-[280px]">
                      <div className="text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-snug sm:leading-relaxed md:leading-normal font-sans">
                        <MarkdownRenderer content={currentCard.front} />
                      </div>
                    </div>

                    {/* Front Footer: Hint & Instruction */}
                    <div className="pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs">
                      {currentCard.hint ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          {!showHint ? (
                            <button
                              type="button"
                              onClick={() => setShowHint(true)}
                              className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-bold py-1 px-3 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/20 text-xs sm:text-sm transition-colors cursor-pointer"
                            >
                              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>Indice (H)</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 py-1 px-3 rounded-lg text-xs sm:text-sm font-semibold">
                              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate max-w-[240px] sm:max-w-md"><strong>Indice :</strong> {currentCard.hint}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div />
                      )}

                      <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 text-center sm:text-right flex items-center justify-center sm:justify-end gap-1.5 font-medium">
                        <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Cliquer ou <strong>Espace</strong> pour retourner</span>
                      </div>
                    </div>
                  </div>

                  {/* BACK FACE (Answer) */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 flex flex-col justify-between border transition-all ${
                      !isFlipped ? 'pointer-events-none' : ''
                    } bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border-emerald-300 dark:border-emerald-500/40 shadow-xl`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    {/* Back Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                          Verso • Réponse
                        </span>
                        <span className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                          {currentCard.courseTitle}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleFav}
                        className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                        title={currentCard.isFavorite ? 'Retirer des favoris' : 'Marquer comme favori (F)'}
                      >
                        <Star className={`w-5 h-5 sm:w-6 sm:h-6 ${currentCard.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Answer Content (Enlarged prominent typography) */}
                    <div className="my-auto py-3 sm:py-6 overflow-y-auto max-h-[190px] sm:max-h-[280px] text-left">
                      <div className="text-base sm:text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-snug sm:leading-relaxed md:leading-normal font-sans">
                        <MarkdownRenderer content={currentCard.back} />
                      </div>
                    </div>

                    {/* Back Footer: Self Evaluation / Next */}
                    <div className="pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col space-y-1.5 sm:space-y-2">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-center">
                        Auto-évaluation de maîtrise
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRating('AGAIN')}
                          className="py-1 sm:py-1.5 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800/40 transition-all cursor-pointer shadow-2xs"
                          title="Touche 1"
                        >
                          À revoir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRating('HARD')}
                          className="py-1 sm:py-1.5 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40 transition-all cursor-pointer shadow-2xs"
                          title="Touche 2"
                        >
                          Difficile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRating('GOOD')}
                          className="py-1 sm:py-1.5 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800/40 transition-all cursor-pointer shadow-2xs"
                          title="Touche 3"
                        >
                          Bon
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRating('EASY')}
                          className="py-1 sm:py-1.5 px-1 sm:px-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 transition-all cursor-pointer shadow-2xs"
                          title="Touche 4"
                        >
                          Facile
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Navigation Toolbar */}
              <div className="w-full flex items-center justify-between pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Précédente</span>
                </button>

                <button
                  type="button"
                  onClick={handleFlip}
                  className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-400 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                  <span>{isFlipped ? 'Voir Question' : 'Retourner'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/20 transition-all cursor-pointer"
                >
                  <span>{currentIndex === deck.length - 1 ? 'Terminer' : 'Suivante'}</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Raccourcis clavier guide (desktop only) */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 text-center hidden md:block">
                <strong>Raccourcis :</strong> Espace (Retourner) • ← / → (Naviguer) • H (Indice) • F (Favori ⭐) • 1-4 (Évaluer)
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 text-xs my-auto">
              Aucune flashcard disponible.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
