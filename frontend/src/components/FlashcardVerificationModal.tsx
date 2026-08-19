import React, { useState } from 'react';
import { Flashcard, FlashcardVerification } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Check,
  Search,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Award,
  ArrowRight
} from 'lucide-react';

interface FlashcardVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard | null;
  verificationResult: FlashcardVerification | null;
  isLoading: boolean;
  onApplyCorrection: (correctedCard: Flashcard) => Promise<void>;
}

export const FlashcardVerificationModal: React.FC<FlashcardVerificationModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  verificationResult,
  isLoading,
  onApplyCorrection
}) => {
  useEscapeKey(isOpen, onClose);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen || !flashcard) return null;

  const handleApply = async () => {
    if (!verificationResult?.correctedFlashcard) return;
    setIsApplying(true);
    try {
      await onApplyCorrection(verificationResult.correctedFlashcard);
      onClose();
    } catch (e) {
      console.error('Failed to apply Flashcard correction', e);
    } finally {
      setIsApplying(false);
    }
  };

  const getStatusBadge = (status: string, score: number) => {
    if (status === 'VALIDE' || score >= 85) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-300',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        label: '✓ Flashcard Validée & Conforme',
        pill: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
      };
    }
    if (status === 'CORRECTIONS_RECOMMANDEES' || score >= 60) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-300',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
        label: 'Correction & Optimisation Recommandée',
        pill: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
      };
    }
    return {
      bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-300',
      icon: <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
      label: 'Inexactitudes Détectées',
      pill: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
    };
  };

  const statusInfo = verificationResult ? getStatusBadge(verificationResult.status, verificationResult.score) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-sky-400 p-0.5 shadow-lg shadow-amber-950/20 dark:shadow-amber-950/40">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Audit Médical & Fact-Checking Flashcard
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-500/30 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold flex items-center gap-1">
                  <Search className="w-2.5 h-2.5" />
                  Google Search Grounding
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {flashcard.ueCode} • {flashcard.courseTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Original Flashcard Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Flashcard auditée :</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-snug">
              <strong>Recto :</strong> {flashcard.front}
            </div>
            {flashcard.hint && (
              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Indice : {flashcard.hint}</span>
              </div>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-amber-500/20 border-t-amber-600 dark:border-t-amber-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-500 dark:text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit scientifique & recherche Google en cours...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Gemini vérifie l'exactitude du Recto, du Verso, des formules et de l'indice avec les référentiels officiels de santé.
                </p>
              </div>
            </div>
          )}

          {/* Result view */}
          {!isLoading && verificationResult && statusInfo && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Overall status banner */}
              <div className={`p-4 rounded-2xl border space-y-2 shadow-xs ${statusInfo.bg}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {statusInfo.icon}
                    <h3 className="text-sm font-extrabold">
                      {statusInfo.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border ${statusInfo.pill}`}>
                      Score : {verificationResult.score} / 100
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed pl-7 opacity-95">
                  {verificationResult.summary}
                </p>
              </div>

              {/* Recto & Verso Audit Section */}
              <div className="space-y-4">
                
                {/* 1. RECTO (Question) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-500" />
                      <span>Recto (Question / Concept)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Version Actuelle :</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{flashcard.front}</p>
                    </div>
                    {verificationResult.correctedFlashcard && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-300 dark:border-amber-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Version Optimisée :</span>
                        <p className="font-semibold text-slate-900 dark:text-white">{verificationResult.correctedFlashcard.front}</p>
                      </div>
                    )}
                  </div>

                  {verificationResult.frontReview && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>💡 Avis d'expert :</strong> {verificationResult.frontReview}
                    </div>
                  )}
                </div>

                {/* 2. VERSO (Réponse / Définition / Formule) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Verso (Réponse / Définition / Formule)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Version Actuelle :</span>
                      <div className="text-slate-800 dark:text-slate-200">
                        <MarkdownRenderer content={flashcard.back} />
                      </div>
                    </div>
                    {verificationResult.correctedFlashcard && (
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-300 dark:border-emerald-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Version Optimisée :</span>
                        <div className="text-slate-900 dark:text-white">
                          <MarkdownRenderer content={verificationResult.correctedFlashcard.back} />
                        </div>
                      </div>
                    )}
                  </div>

                  {verificationResult.backReview && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>🔬 Exactitude scientifique :</strong> {verificationResult.backReview}
                    </div>
                  )}
                </div>

                {/* 3. INDICE (Hint) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-extrabold text-sky-800 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-sky-500" />
                    <span>Indice de mémorisation (Hint)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Indice Actuel :</span>
                      <p className="text-slate-800 dark:text-slate-200">{flashcard.hint || '— Aucun indice —'}</p>
                    </div>
                    {verificationResult.correctedFlashcard && (
                      <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-300 dark:border-sky-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase">Indice Optimisé :</span>
                        <p className="text-slate-900 dark:text-white">{verificationResult.correctedFlashcard.hint || '— Aucun indice —'}</p>
                      </div>
                    )}
                  </div>

                  {verificationResult.hintReview && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>💡 Efficacité pédagogique :</strong> {verificationResult.hintReview}
                    </div>
                  )}
                </div>

              </div>

              {/* Key Medical Points & Issues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Verified Points */}
                {verificationResult.keyMedicalPoints && verificationResult.keyMedicalPoints.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 space-y-2">
                    <div className="text-[11px] font-extrabold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Points clés vérifiés :</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                      {verificationResult.keyMedicalPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detected Issues */}
                {verificationResult.detectedIssues && verificationResult.detectedIssues.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 space-y-2">
                    <div className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Points de vigilance :</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
                      {verificationResult.detectedIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Grounding Sources */}
              {verificationResult.groundingSources && verificationResult.groundingSources.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Sources & Référentiels Web consultés (Google Search) :</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {verificationResult.groundingSources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500/40 text-[11px] text-sky-800 dark:text-sky-300 hover:text-sky-950 dark:hover:text-white transition-all shadow-2xs"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span className="font-medium truncate max-w-xs">{src.title || src.domain || 'Source médicale'}</span>
                        {src.domain && (
                          <span className="text-[9px] text-slate-500 font-mono">({src.domain})</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>

          {!isLoading && verificationResult?.correctedFlashcard && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/20 dark:shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isApplying ? (
                <span>Application en cours...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Appliquer les optimisations (1-clic)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
