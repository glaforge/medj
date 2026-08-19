import React, { useState } from 'react';
import { Flashcard, SubjectUE } from '../types';
import {
  FlashcardPrintLayout,
  FlashcardPrintOptions,
  printFlashcards
} from '../utils/printFlashcards';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  X,
  Printer,
  FileText,
  Layers,
  Scissors,
  Lightbulb,
  Tag,
  Eye,
  CheckCircle2,
  Sparkles,
  Columns,
  Grid,
  Table,
  RotateCw
} from 'lucide-react';

interface PrintFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  subjects?: SubjectUE[];
  contextTitle?: string;
  onShowToast?: (msg: string) => void;
}

export const PrintFlashcardsModal: React.FC<PrintFlashcardsModalProps> = ({
  isOpen,
  onClose,
  flashcards,
  subjects = [],
  contextTitle,
  onShowToast
}) => {
  const [layout, setLayout] = useState<FlashcardPrintLayout>('FOLDABLE_3');
  const [includeHints, setIncludeHints] = useState<boolean>(true);
  const [includeTags, setIncludeTags] = useState<boolean>(true);
  const [includeCutMarks, setIncludeCutMarks] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalCards = flashcards.length;

  // Calculate estimated pages
  const getEstimatedPages = (): number => {
    if (totalCards === 0) return 0;
    switch (layout) {
      case 'FOLDABLE_3':
        return Math.ceil(totalCards / 3);
      case 'FOLDABLE_4':
        return Math.ceil(totalCards / 4);
      case 'GRID_6':
        return Math.ceil(totalCards / 6);
      case 'TWO_SIDED_MIRROR':
        return Math.ceil(totalCards / 6) * 2;
      case 'TABLE_SUMMARY':
        return Math.max(1, Math.ceil(totalCards / 12));
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const options: FlashcardPrintOptions = {
      layout,
      includeHints,
      includeTags,
      includeCutMarks,
      title: contextTitle || 'MedJ — Flashcards de Révision'
    };

    try {
      printFlashcards(flashcards, options);
      if (onShowToast) {
        onShowToast(`🖨️ Fenêtre d'impression générée pour ${totalCards} flashcards !`);
      }
    } catch (e) {
      console.error('Failed to print flashcards', e);
      alert("Erreur lors du lancement de l'impression.");
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
      }, 1000);
    }
  };

  const previewCard = flashcards[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full h-full sm:h-auto sm:max-h-[94vh] max-w-5xl rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Imprimer les Flashcards
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40">
                  {totalCards} carte{totalCards > 1 ? 's' : ''} sélectionnée{totalCards > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {contextTitle || 'Toutes les flashcards actuellement affichées'} • ~{getEstimatedPages()} page{getEstimatedPages() > 1 ? 's' : ''} A4
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Layout & Options Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Mode selection */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 block">
                1. Disposition d'impression
              </label>

              <div className="space-y-2.5">
                {/* Mode 1: Foldable 3 cards (Standard Recommandé) */}
                <button
                  type="button"
                  onClick={() => setLayout('FOLDABLE_3')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    layout === 'FOLDABLE_3'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${layout === 'FOLDABLE_3' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Columns className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Fiches Pliables 2-en-1 (3 / page A4)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Grandes fiches aérées (75 mm de haut) adaptées aux réponses médicales détaillées et formules. Zéro coupure de page.
                    </p>
                  </div>
                </button>

                {/* Mode 2: Foldable 4 cards (Compact) */}
                <button
                  type="button"
                  onClick={() => setLayout('FOLDABLE_4')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    layout === 'FOLDABLE_4'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${layout === 'FOLDABLE_4' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Columns className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Fiches Pliables Compactes (4 / page A4)
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Pour fiches courtes (1 à 2 lignes). Format plus compact.
                    </p>
                  </div>
                </button>

                {/* Mode 3: Compact Grid 6 */}
                <button
                  type="button"
                  onClick={() => setLayout('GRID_6')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    layout === 'GRID_6'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${layout === 'GRID_6' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Grid className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Fiches Découpables (6 / page A4)
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Grille 2x3 économique avec Question en haut et Réponse en bas sur chaque fiche découpée.
                    </p>
                  </div>
                </button>

                {/* Mode 4: Table Summary */}
                <button
                  type="button"
                  onClick={() => setLayout('TABLE_SUMMARY')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    layout === 'TABLE_SUMMARY'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${layout === 'TABLE_SUMMARY' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Table className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Fiche Mémo / Tableau de Synthèse
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Tableau structuré A4 récapitulant les questions, indices et réponses pour réviser partout.
                    </p>
                  </div>
                </button>

                {/* Mode 5: Two sided mirror */}
                <button
                  type="button"
                  onClick={() => setLayout('TWO_SIDED_MIRROR')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    layout === 'TWO_SIDED_MIRROR'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${layout === 'TWO_SIDED_MIRROR' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Recto / Verso Miroir (Imprimante double-face)
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Pages alternées avec verso inversé en miroir pour impression recto-verso automatique.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Print Options */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 block">
                2. Options du document
              </label>
              
              <div className="space-y-2 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 text-xs">
                
                {/* Hint toggle */}
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Inclure les indices 💡</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeHints}
                    onChange={(e) => setIncludeHints(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                {/* Tags toggle */}
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Tag className="w-4 h-4 text-sky-500" />
                    <span>Inclure les codes UE et tags</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeTags}
                    onChange={(e) => setIncludeTags(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                {/* Cut marks toggle */}
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Scissors className="w-4 h-4 text-rose-500" />
                    <span>Repères de découpe et pointillés ✂️</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCutMarks}
                    onChange={(e) => setIncludeCutMarks(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                </label>

              </div>
            </div>

          </div>

          {/* Right Column: Live Interactive Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>Aperçu de la mise en page ({layout.startsWith('FOLDABLE') ? 'Pliable' : layout === 'GRID_6' ? 'Grille 6' : layout === 'TABLE_SUMMARY' ? 'Tableau' : 'Miroir'})</span>
              </label>
              <span className="text-[11px] text-slate-500">Format A4 Portrait</span>
            </div>

            {/* Preview Sheet Container */}
            <div className="flex-1 min-h-[360px] rounded-2xl bg-slate-100 dark:bg-slate-950 p-4 border border-slate-300 dark:border-slate-800 flex items-center justify-center overflow-y-auto">
              
              {(layout === 'FOLDABLE_3' || layout === 'FOLDABLE_4') && previewCard && (
                <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-300 p-3 text-slate-900 space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-200 pb-1.5 font-mono">
                    <span className="text-amber-600 font-bold">MedJ • Mémorisation Active</span>
                    <span>1/{layout === 'FOLDABLE_3' ? '3' : '4'} sur page A4</span>
                  </div>

                  {/* Foldable mock card with exact 50% / 50% symmetric columns */}
                  <div className={`border rounded-none overflow-hidden grid grid-cols-2 min-h-[140px] relative ${includeCutMarks ? 'border-dashed border-slate-400' : 'border-slate-300'}`}>
                    
                    {/* Left half (Question) - Exact 50% */}
                    <div className="p-3 bg-white flex flex-col justify-between border-r border-dashed border-amber-500 box-border">
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                            {previewCard.ueCode || 'UE'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                            QUESTION (RECTO)
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-3">
                          <MarkdownRenderer content={previewCard.front} />
                        </div>
                      </div>
                      {includeHints && previewCard.hint && (
                        <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-2 truncate">
                          💡 <strong>Indice :</strong> {previewCard.hint}
                        </div>
                      )}
                    </div>

                    {/* Central fold badge overlay */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <span className="text-[8px] font-bold text-amber-700 bg-white border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                        ✂️ PLIER ICI ✂️
                      </span>
                    </div>

                    {/* Right half (Answer) - Exact 50% */}
                    <div className="p-3 bg-slate-50 flex flex-col justify-between box-border">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900">
                            RÉPONSE (VERSO)
                          </span>
                          <span className="text-[9px] text-slate-500 truncate max-w-[80px]">
                            {previewCard.courseTitle}
                          </span>
                        </div>
                        <div className="text-xs text-slate-800 leading-snug line-clamp-4">
                          <MarkdownRenderer content={previewCard.back} />
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="text-[9px] text-center text-slate-400">
                    Colonnes symétriques 50% / 50% : découpez le contour rectangulaire et pliez le long des pointillés centraux pour obtenir une flashcard cartonnée recto-verso parfaitement alignée.
                  </div>
                </div>
              )}

              {layout === 'GRID_6' && previewCard && (
                <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-300 p-3 text-slate-900 space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-200 pb-1.5 font-mono">
                    <span className="text-amber-600 font-bold">MedJ • Grille 6 par page</span>
                    <span>1/6 sur page A4</span>
                  </div>

                  <div className="border border-dashed border-slate-400 rounded-lg p-3 space-y-2 bg-white min-h-[140px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                          {previewCard.ueCode || 'UE'}
                        </span>
                        <span className="text-[10px] text-slate-500">{previewCard.courseTitle}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        <strong>Q : </strong><MarkdownRenderer content={previewCard.front} />
                      </div>
                      {includeHints && previewCard.hint && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-1">
                          💡 {previewCard.hint}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Réponse</span>
                      <div className="text-xs text-slate-800 line-clamp-2">
                        <MarkdownRenderer content={previewCard.back} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {layout === 'TABLE_SUMMARY' && (
                <div className="w-full bg-white rounded-xl shadow-lg border border-slate-300 p-3 text-slate-900 space-y-2 animate-fadeIn text-[10px]">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                    <span>Fiche Récapitulative</span>
                    <span>{totalCards} notions</span>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold">
                        <th className="p-1.5 text-left border">UE</th>
                        <th className="p-1.5 text-left border">Question</th>
                        {includeHints && <th className="p-1.5 text-left border">Indice</th>}
                        <th className="p-1.5 text-left border">Réponse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flashcards.slice(0, 3).map((f, i) => (
                        <tr key={f.id || i} className="border-b">
                          <td className="p-1.5 font-bold text-amber-700 border">{f.ueCode || 'UE'}</td>
                          <td className="p-1.5 font-semibold text-slate-900 border line-clamp-1">{f.front}</td>
                          {includeHints && <td className="p-1.5 text-amber-900 bg-amber-50/50 border">{f.hint || '—'}</td>}
                          <td className="p-1.5 text-slate-800 border line-clamp-1">{f.back}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalCards > 3 && (
                    <div className="text-[9px] text-center text-slate-400 pt-1">
                      + {totalCards - 3} autres flashcards incluses dans le tableau...
                    </div>
                  )}
                </div>
              )}

              {layout === 'TWO_SIDED_MIRROR' && previewCard && (
                <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-300 p-3 text-slate-900 space-y-2 animate-fadeIn text-[10px]">
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-1">
                    <span className="font-bold text-amber-600">Impression Recto-Verso Automatique</span>
                    <span>2 faces alignées</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="border border-dashed border-slate-400 p-2 rounded bg-white">
                      <div className="font-bold text-amber-700 mb-1">Page Impaire (Recto)</div>
                      <div className="text-[11px] font-bold text-slate-900 line-clamp-2">{previewCard.front}</div>
                    </div>
                    <div className="border border-dashed border-slate-400 p-2 rounded bg-slate-50">
                      <div className="font-bold text-emerald-700 mb-1">Page Paire (Verso Miroir)</div>
                      <div className="text-[11px] text-slate-800 line-clamp-2">{previewCard.back}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
            Total : <strong className="text-slate-900 dark:text-white">{totalCards}</strong> flashcards • Estimation : <strong className="text-slate-900 dark:text-white">~{getEstimatedPages()} feuille{getEstimatedPages() > 1 ? 's' : ''} A4</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting || totalCards === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Génération...' : "Imprimer / Exporter en PDF (A4)"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
