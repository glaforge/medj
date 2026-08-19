import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MedicalIllustration } from '../types';
import { api } from '../services/api';
import { printMedicalWorksheet } from '../utils/printWorksheet';
import { FullscreenImageViewer } from './FullscreenImageViewer';

interface MedicalIllustrationModalProps {
  illustration: MedicalIllustration;
  onClose: () => void;
  onUpdated?: (updated: MedicalIllustration) => void;
  onDeleted?: (id: string) => void;
}

function healLegendItems(items: string[]): string[] {
  if (!items || items.length === 0) return [];
  const merged: string[] = [];
  let current = '';
  let openParenCount = 0;

  for (const item of items) {
    if (!item.trim()) continue;
    if (current) {
      current += ', ' + item.trim();
    } else {
      current = item.trim();
    }

    for (const c of item) {
      if (c === '(') openParenCount++;
      else if (c === ')') openParenCount--;
    }

    if (openParenCount <= 0) {
      merged.push(current.trim());
      current = '';
      openParenCount = 0;
    }
  }

  if (current) {
    merged.push(current.trim());
  }

  return merged;
}

export const MedicalIllustrationModal: React.FC<MedicalIllustrationModalProps> = ({
  illustration,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [currentIllus, setCurrentIllus] = useState<MedicalIllustration>(illustration);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'LEGENDS' | 'AUDIT'>('LEGENDS');
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [showAdjustBox, setShowAdjustBox] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Record<number, boolean>>({});
  const [includeAnswerKeyOnPrint, setIncludeAnswerKeyOnPrint] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isFillInTheBlank = currentIllus.illustrationType === 'DESSIN_A_TROUS' ||
    currentIllus.prompt.toLowerCase().includes('trou') ||
    currentIllus.title.toLowerCase().includes('trou');

  const legendItems = healLegendItems(currentIllus.legendItems || []);

  const handleToggleItemReveal = (index: number) => {
    setRevealedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleRevealAll = () => {
    const nextState = !showAnswers;
    setShowAnswers(nextState);
    if (legendItems.length > 0) {
      const all: Record<number, boolean> = {};
      legendItems.forEach((_, idx) => {
        all[idx] = nextState;
      });
      setRevealedItems(all);
    }
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      setActiveTab('AUDIT');
      const verification = await api.verifyIllustration(currentIllus.id);
      const updated: MedicalIllustration = {
        ...currentIllus,
        verification
      };
      setCurrentIllus(updated);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error('Failed to verify illustration:', err);
      alert('Erreur lors de la vérification médicale avec Gemini 3.7 Flash.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      const updated = await api.regenerateIllustration(currentIllus.id, adjustmentPrompt);
      setCurrentIllus(updated);
      setAdjustmentPrompt('');
      setShowAdjustBox(false);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error('Failed to regenerate illustration:', err);
      alert('Erreur lors de la régénération de l\'illustration médicale.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApplyFixAndRegenerate = async (fixPrompt: string) => {
    try {
      setIsRegenerating(true);
      setAdjustmentPrompt(fixPrompt);
      const updated = await api.regenerateIllustration(currentIllus.id, fixPrompt);
      setCurrentIllus(updated);
      setAdjustmentPrompt('');
      setShowAdjustBox(false);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      console.error('Failed to regenerate illustration with suggested fix:', err);
      alert('Erreur lors de la régénération avec les corrections suggérées.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette illustration médicale ?')) return;
    try {
      setIsDeleting(true);
      await api.deleteIllustration(currentIllus.id);
      if (onDeleted) onDeleted(currentIllus.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete illustration:', err);
      alert('Erreur lors de la suppression de l\'illustration.');
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    printMedicalWorksheet(currentIllus, includeAnswerKeyOnPrint);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Screen Modal Card */}
      <div className="relative w-full max-w-5xl h-[88vh] max-h-[820px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Screen Header */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-lg sm:text-xl font-bold shrink-0">
              {isFillInTheBlank ? '🎯' : '🔬'}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                  {isFillInTheBlank ? "Planche à trous" : "Schéma Anatomique"}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {currentIllus.ueCode || 'PASS'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {currentIllus.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                currentIllus.verification
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/20'
              }`}
              title="Vérifier la conformité médicale avec Gemini 3.7 Flash & Google Search"
            >
              {isVerifying ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Audit...</span>
                </>
              ) : (
                <>
                  <span>🛡️</span>
                  <span className="hidden sm:inline">
                    {currentIllus.verification ? `Audit (${currentIllus.verification.score}/100)` : 'Vérifier la conformité'}
                  </span>
                  <span className="sm:hidden">Audit</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-indigo-950/20 active:scale-95"
              title="Imprimer la planche d'entraînement A4 sur papier"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Imprimer Planche A4</span>
            </button>
            <button
              onClick={() => setShowAdjustBox(!showAdjustBox)}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">Ajuster / Relancer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Adjust / Regenerate Prompt Banner (Screen Only) */}
        {showAdjustBox && (
          <div className="shrink-0 p-4 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800/60 animate-slideDown">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                Précisez une consigne d'ajustement pour régénérer le dessin avec Gemini 3 Pro Image (Nano Banana Pro) :
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adjustmentPrompt}
                  onChange={(e) => setAdjustmentPrompt(e.target.value)}
                  placeholder="Ex: Tous les libellés en français, vue en coupe sagittale..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isRegenerating}
                />
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold shadow transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {isRegenerating ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Génération...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Relancer</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  'Tous les libellés en français',
                  'Vue en coupe sagittale',
                  'Vue antérieure détaillée',
                  'Fond blanc épuré noir & blanc',
                  'Plus de contraste sur les repères 1..N',
                  'Ajouter la vascularisation',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setAdjustmentPrompt(s)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Main Content: Split Grid with Independent Scroll */}
        <div className="flex-1 overflow-hidden p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          
          {/* Left Column: Image Canvas Box */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950/60 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-inner overflow-hidden justify-between">
            <div
              onClick={() => !isRegenerating && setShowFullscreen(true)}
              className="flex-1 flex items-center justify-center min-h-0 overflow-hidden bg-white dark:bg-slate-950 rounded-xl p-2 cursor-zoom-in relative group transition-all"
            >
              {isRegenerating ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Régénération du schéma médical en cours...</p>
                  <p className="text-xs text-slate-500 mt-1">Modèle <code>gemini-3-pro-image</code> (Nano Banana Pro)</p>
                </div>
              ) : (
                <>
                  <img
                    src={currentIllus.imageUrl}
                    alt={currentIllus.title}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Subtle Hover Hint */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 pointer-events-none">
                    <span>🔍</span>
                    <span>Cliquer pour agrandir (Plein écran)</span>
                  </div>
                </>
              )}
            </div>

            {/* Image Footer / Info */}
            <div className="shrink-0 pt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                <span>✨</span>
                <span>Généré par <code>gemini-3-pro-image</code></span>
              </span>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-xs"
                >
                  <span>🛡️</span>
                  <span>{currentIllus.verification ? 'Re-vérifier' : 'Vérifier conformité'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullscreen(true)}
                  className="font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-xs"
                >
                  <span>🔍</span> Plein écran
                </button>
                <a
                  href={currentIllus.imageUrl}
                  download={`${currentIllus.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-xs"
                >
                  <span>⬇️</span> Télécharger HD
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Tabs (Legends vs Medical Audit) */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Tab Bar Switcher */}
            <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-3 pt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('LEGENDS')}
                  className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'LEGENDS'
                      ? 'border-purple-600 text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span>🏷️</span>
                  <span>{isFillInTheBlank ? "Corrigé Légendes" : "Structures"}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {legendItems.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('AUDIT')}
                  className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'AUDIT'
                      ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span>🛡️</span>
                  <span>Audit IA (Gemini 3.7)</span>
                  {currentIllus.verification ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold border ${
                      currentIllus.verification.status === 'VALIDE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : currentIllus.verification.status === 'AVERTISSEMENT'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-700'
                    }`}>
                      {currentIllus.verification.score}/100
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                      Vérifier
                    </span>
                  )}
                </button>
              </div>

              {activeTab === 'LEGENDS' && isFillInTheBlank && (
                <button
                  onClick={handleRevealAll}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0 mb-1"
                >
                  {showAnswers ? '🙈 Masquer' : '👁️ Révéler'}
                </button>
              )}
            </div>

            {/* TAB CONTENT 1: Medical Audit View */}
            {activeTab === 'AUDIT' ? (
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
                {isVerifying ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin"></div>
                      <span className="absolute text-2xl animate-pulse">🛡️</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Audit médical multimodal en cours...
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Gemini 3.7 Flash inspecte le schéma et confronte les structures avec Google Search.
                      </p>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 text-left bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold">
                        <span className="animate-spin">⏳</span>
                        <span>Vision multimodale Gemini 3.7...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🔍</span>
                        <span>Vérification nomenclature officielle & orthographe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🌐</span>
                        <span>Confrontation littérature médicale (Google Search)</span>
                      </div>
                    </div>
                  </div>
                ) : currentIllus.verification ? (
                  <div className="space-y-3.5 animate-fadeIn">
                    {/* Status Score Card */}
                    <div className={`p-3.5 rounded-2xl border ${
                      currentIllus.verification.status === 'VALIDE'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                        : currentIllus.verification.status === 'AVERTISSEMENT'
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
                        : 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 text-red-950 dark:text-red-100'
                    } shadow-2xs space-y-2`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {currentIllus.verification.status === 'VALIDE' ? '🟢' : currentIllus.verification.status === 'AVERTISSEMENT' ? '🟡' : '🔴'}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-xs sm:text-sm">
                              {currentIllus.verification.status === 'VALIDE'
                                ? 'Schéma Conforme & Validé PASS'
                                : currentIllus.verification.status === 'AVERTISSEMENT'
                                ? 'Schéma Utilisable avec Réserves'
                                : 'Anomalies ou Inexactitudes Détectées'}
                            </h4>
                            <p className="text-[10px] opacity-75">
                              Audité par Gemini 3.7 Flash • Google Search Grounding
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-black font-mono px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/10">
                            {currentIllus.verification.score}/100
                          </span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed opacity-90 border-t border-current/10 pt-2 font-medium">
                        {currentIllus.verification.summary}
                      </p>
                    </div>

                    {/* Detected Issues / Warnings (Crucial for student awareness) */}
                    {currentIllus.verification.detectedIssues && currentIllus.verification.detectedIssues.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                          <span>⚠️</span>
                          <span>Points de vigilance & Pièges de concours :</span>
                        </div>
                        <ul className="space-y-1 text-xs">
                          {currentIllus.verification.detectedIssues.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                              <span className="leading-snug">{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Editing & Correction Instructions Card */}
                    {(currentIllus.verification.suggestedFixPrompt || (currentIllus.verification.editingInstructions && currentIllus.verification.editingInstructions.length > 0)) && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-100 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                            <span>✏️</span>
                            <span>Instructions de correction pour éditer le schéma :</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/70 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-300">
                            Prêt à l'emploi
                          </span>
                        </div>

                        {/* Bullet points of editing instructions */}
                        {currentIllus.verification.editingInstructions && currentIllus.verification.editingInstructions.length > 0 && (
                          <ul className="space-y-1 text-xs">
                            {currentIllus.verification.editingInstructions.map((instruction, idx) => (
                              <li key={idx} className="flex items-start gap-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-100/80 dark:border-indigo-900/50">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">➔</span>
                                <span className="leading-snug font-medium text-slate-800 dark:text-slate-200">{instruction}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Suggested Full Prompt with 1-click apply and regenerate */}
                        {currentIllus.verification.suggestedFixPrompt && (
                          <div className="pt-1 space-y-2">
                            <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 leading-relaxed font-mono text-[11px]">
                              <span className="font-sans font-bold text-indigo-800 dark:text-indigo-300 block mb-1 text-[10.5px]">
                                Consigne synthétisée prête à relancer :
                              </span>
                              « {currentIllus.verification.suggestedFixPrompt} »
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApplyFixAndRegenerate(currentIllus.verification!.suggestedFixPrompt!)}
                                disabled={isRegenerating}
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                              >
                                <span>🪄</span>
                                <span>Appliquer & Régénérer avec Gemini 3 Pro</span>
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustmentPrompt(currentIllus.verification!.suggestedFixPrompt!);
                                  setShowAdjustBox(true);
                                }}
                                className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-xs font-semibold shadow-xs"
                                title="Modifier la consigne avant de relancer"
                              >
                                Modifier...
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verified Points */}
                    {currentIllus.verification.verifiedPoints && currentIllus.verification.verifiedPoints.length > 0 && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <span>✅</span>
                          <span>Structures exactes et validées :</span>
                        </div>
                        <ul className="space-y-1 text-xs">
                          {currentIllus.verification.verifiedPoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                              <span className="leading-snug">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tutor Advice */}
                    {currentIllus.verification.tutorAdvice && (
                      <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-950 dark:text-purple-200 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                          <span>💡</span>
                          <span>Conseil du Professeur Tuteur PASS :</span>
                        </div>
                        <p className="text-xs leading-relaxed font-medium">
                          {currentIllus.verification.tutorAdvice}
                        </p>
                      </div>
                    )}

                    {/* Grounding Sources from Audit */}
                    {currentIllus.verification.groundingSources && currentIllus.verification.groundingSources.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-500 space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <span>🌐</span>
                          <span>Littérature médicale vérifiée par Google Search :</span>
                        </div>
                        <ul className="space-y-0.5">
                          {currentIllus.verification.groundingSources.map((src, idx) => (
                            <li key={idx} className="truncate">
                              <a href={src.uri} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                {src.title || src.uri}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Re-verify action bar */}
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <span>🔄</span>
                        <span>Re-vérifier avec Gemini 3.7</span>
                      </button>
                      <button
                        onClick={() => setShowAdjustBox(true)}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                      >
                        Ajuster / Relancer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 my-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
                      🛡️
                    </div>
                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Vérifier la conformité médicale du schéma
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        L'IA générative d'images peut parfois insérer des anomalies anatomiques ou des fautes de texte. Demandez à <strong>Gemini 3.7 Flash</strong> (avec Google Search) de valider le schéma et de signaler les éventuelles erreurs ou pièges de concours.
                      </p>
                    </div>
                    <button
                      onClick={handleVerify}
                      disabled={isVerifying}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 mx-auto active:scale-95"
                    >
                      <span>🛡️</span>
                      <span>Lancer l'audit de conformité (Gemini 3.7)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* TAB CONTENT 2: Legends / Fill-in-the-blank List */
              <>
                {/* Scrollable Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 pr-1.5">
                  {legendItems && legendItems.length > 0 ? (
                    legendItems.map((item, idx) => {
                      const isRevealed = showAnswers || !!revealedItems[idx];
                      const cleanText = item.replace(/^\d+[\.\)]\s*/, '');

                      return (
                        <div
                          key={idx}
                          onClick={() => isFillInTheBlank && handleToggleItemReveal(idx)}
                          className={`p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer select-none ${
                            isRevealed
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                isRevealed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`leading-relaxed break-words font-medium ${!isRevealed && isFillInTheBlank ? 'blur-[5px] select-none text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {cleanText}
                              </span>
                            </div>

                            {isFillInTheBlank && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal shrink-0 mt-0.5">
                                {isRevealed ? 'Masquer' : 'Révéler'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">Aucune légende spécifique listée.</p>
                  )}
                </div>

                {/* Medical Grounding Sources (Inside Right Column) */}
                {currentIllus.groundingSources && currentIllus.groundingSources.length > 0 && (
                  <div className="shrink-0 p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-[10.5px] text-slate-600 dark:text-slate-400">
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span>🌐</span>
                      <span>Sources médicales consultées :</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {currentIllus.groundingSources.map((s, idx) => (
                        <li key={idx} className="truncate">
                          <a
                            href={s.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {s.title || s.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
            >
              🗑️ Supprimer le schéma
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>

      {showFullscreen && (
        <FullscreenImageViewer
          imageUrl={currentIllus.imageUrl}
          title={currentIllus.title}
          subtitle={`${currentIllus.ueCode || 'PASS'} • Modèle gemini-3-pro-image (Nano Banana Pro)`}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
export default MedicalIllustrationModal;
