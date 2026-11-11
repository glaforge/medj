import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  Play,
  Shuffle,
  Layers,
  AlertCircle
} from 'lucide-react';

interface FlashcardStudySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount: number;
  deckTitle?: string;
  onStartSession: (subsetCount: number | null) => void;
}

const PRESET_COUNTS = [5, 10, 15, 20, 30, 50];
const STORAGE_MODE_KEY = 'medj_flashcard_study_mode';
const STORAGE_COUNT_KEY = 'medj_flashcard_subset_count';

export const FlashcardStudySetupModal: React.FC<FlashcardStudySetupModalProps> = ({
  isOpen,
  onClose,
  totalCount,
  deckTitle,
  onStartSession
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const countInputRef = useRef<HTMLInputElement>(null);

  const titleId = useId();
  const radioAllId = useId();
  const radioSubsetId = useId();
  const countInputId = useId();
  const countHelpId = useId();
  const countErrorId = useId();

  const [studyMode, setStudyMode] = useState<'ALL' | 'SUBSET'>('ALL');
  const [customCountInput, setCustomCountInput] = useState<string>('10');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize defaults whenever modal opens for a new card pool
  useEffect(() => {
    if (!isOpen || totalCount <= 0) return;

    let savedMode: 'ALL' | 'SUBSET' | null = null;
    let savedCount: number | null = null;
    try {
      const rawMode = localStorage.getItem(STORAGE_MODE_KEY);
      if (rawMode === 'ALL' || rawMode === 'SUBSET') {
        savedMode = rawMode;
      }
      const rawCount = localStorage.getItem(STORAGE_COUNT_KEY);
      if (rawCount) {
        const parsed = parseInt(rawCount, 10);
        if (!Number.isNaN(parsed) && parsed >= 1) {
          savedCount = parsed;
        }
      }
    } catch {
      // Ignore storage access errors
    }

    const fallbackDefaultCount = totalCount > 10 ? 10 : Math.max(1, Math.floor(totalCount / 2));
    const clampedCount = savedCount
      ? Math.max(1, Math.min(savedCount, Math.max(1, totalCount - 1)))
      : fallbackDefaultCount;

    setCustomCountInput(String(clampedCount));
    setStudyMode(savedMode ?? (totalCount > 20 ? 'SUBSET' : 'ALL'));
    setValidationError(null);
  }, [isOpen, totalCount]);

  // Manage native <dialog> modal open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Sync native dialog close event (Esc / platform dismiss / closedby) and Safari light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      if (isOpen) {
        onClose();
      }
    };

    dialog.addEventListener('close', handleNativeClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [isOpen, onClose]);

  const validateSubsetCount = (rawValue: string): number | null => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setValidationError(`Veuillez saisir un nombre entre 1 et ${totalCount}.`);
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > totalCount) {
      setValidationError(`Veuillez choisir un nombre entier compris entre 1 et ${totalCount}.`);
      return null;
    }
    return parsed;
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStudyMode('SUBSET');
    setCustomCountInput(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleCountBlur = () => {
    if (studyMode === 'SUBSET') {
      validateSubsetCount(customCountInput);
    }
  };

  const handleSelectPreset = (preset: number) => {
    setStudyMode('SUBSET');
    setCustomCountInput(String(preset));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (studyMode === 'ALL') {
      try {
        localStorage.setItem(STORAGE_MODE_KEY, 'ALL');
      } catch {
        // Ignore storage errors
      }
      onStartSession(null);
      return;
    }

    const validCount = validateSubsetCount(customCountInput);
    if (validCount === null) {
      countInputRef.current?.focus();
      return;
    }

    try {
      localStorage.setItem(STORAGE_MODE_KEY, 'SUBSET');
      localStorage.setItem(STORAGE_COUNT_KEY, String(validCount));
    } catch {
      // Ignore storage errors
    }

    onStartSession(validCount >= totalCount ? null : validCount);
  };

  const availablePresets = PRESET_COUNTS.filter(n => n < totalCount);
  const parsedPreviewCount = Number(customCountInput.trim());
  const isValidPreviewCount =
    Number.isInteger(parsedPreviewCount) &&
    parsedPreviewCount >= 1 &&
    parsedPreviewCount <= totalCount;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as any)}
      aria-labelledby={titleId}
      className="study-setup-dialog m-auto p-0 bg-transparent border-0 outline-none max-w-lg w-[calc(100%-1.5rem)] sm:w-full overflow-visible"
    >
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Layers className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id={titleId} className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Session d'entraînement
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/40">
                  {totalCount} disponibles
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {deckTitle || 'Toutes les flashcards sélectionnées'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre de configuration"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-5">
          <fieldset className="space-y-3 border-0 p-0 m-0 min-w-0">
            <legend className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 block">
              Combien de flashcards souhaitez-vous réviser ?
            </legend>

            {/* Option 1: All cards */}
            <label
              htmlFor={radioAllId}
              className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                studyMode === 'ALL'
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <input
                id={radioAllId}
                type="radio"
                name="studyMode"
                value="ALL"
                checked={studyMode === 'ALL'}
                onChange={() => {
                  setStudyMode('ALL');
                  setValidationError(null);
                }}
                className="mt-0.5 w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    Toutes les cartes ({totalCount})
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Parcourir l'intégralité des {totalCount} flashcards correspondant à vos filtres actuels.
                </p>
              </div>
            </label>

            {/* Option 2: Random subset */}
            <div
              onClick={() => setStudyMode('SUBSET')}
              className={`p-4 rounded-2xl border-2 transition-all space-y-3.5 cursor-pointer ${
                studyMode === 'SUBSET'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <label htmlFor={radioSubsetId} className="flex items-start gap-3.5 cursor-pointer">
                <input
                  id={radioSubsetId}
                  type="radio"
                  name="studyMode"
                  value="SUBSET"
                  checked={studyMode === 'SUBSET'}
                  onChange={() => setStudyMode('SUBSET')}
                  className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer shrink-0"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shuffle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span>Sous-ensemble aléatoire</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                      Tirage au sort
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Choisissez un nombre précis de cartes tirées au hasard parmi les {totalCount} disponibles.
                  </p>
                </div>
              </label>

              {/* Presets + Number Input */}
              <div
                className="pl-7 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {availablePresets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sélections rapides du nombre de cartes">
                    {availablePresets.map(preset => {
                      const isSelectedPreset = studyMode === 'SUBSET' && parsedPreviewCount === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          aria-pressed={isSelectedPreset}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            isSelectedPreset
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500/60'
                          }`}
                        >
                          {preset} cartes
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor={countInputId}
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Nombre personnalisé de cartes
                  </label>
                  <span
                    id={countHelpId}
                    className="block text-[11px] text-slate-500 dark:text-slate-400 pb-0.5"
                  >
                    Saisissez un nombre entre 1 et {totalCount}.
                  </span>
                  <div className="flex items-center gap-2.5">
                    <input
                      ref={countInputRef}
                      id={countInputId}
                      name="subsetCount"
                      type="number"
                      inputMode="numeric"
                      enterKeyHint="go"
                      min={1}
                      max={totalCount}
                      step={1}
                      required={studyMode === 'SUBSET'}
                      value={customCountInput}
                      onFocus={() => setStudyMode('SUBSET')}
                      onChange={handleCountChange}
                      onBlur={handleCountBlur}
                      aria-describedby={validationError ? `${countHelpId} ${countErrorId}` : countHelpId}
                      aria-invalid={validationError ? true : undefined}
                      className="w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      sur {totalCount} cartes
                    </span>
                  </div>

                  {validationError && (
                    <div
                      id={countErrorId}
                      role="alert"
                      className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 pt-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white shrink-0" aria-hidden="true" />
              <span className="text-white">
                {studyMode === 'ALL'
                  ? `Réviser les ${totalCount} cartes`
                  : isValidPreviewCount
                  ? `Réviser ${parsedPreviewCount} carte${parsedPreviewCount > 1 ? 's' : ''} au hasard`
                  : 'Lancer la session'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
