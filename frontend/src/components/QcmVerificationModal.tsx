import React, { useState } from 'react';
import { QcmQuestion, QcmVerificationResult } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Check,
  Search,
  BookOpen
} from 'lucide-react';

interface QcmVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  qcm: QcmQuestion | null;
  verificationResult: QcmVerificationResult | null;
  isLoading: boolean;
  onApplyCorrection: (correctedQcm: QcmQuestion) => Promise<void>;
}

export const QcmVerificationModal: React.FC<QcmVerificationModalProps> = ({
  isOpen,
  onClose,
  qcm,
  verificationResult,
  isLoading,
  onApplyCorrection
}) => {
  useEscapeKey(isOpen, onClose);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen || !qcm) return null;

  const handleApply = async () => {
    if (!verificationResult?.correctedQcm) return;
    setIsApplying(true);
    try {
      await onApplyCorrection(verificationResult.correctedQcm);
      onClose();
    } catch (e) {
      console.error('Failed to apply QCM correction', e);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-teal-400 p-0.5 shadow-lg shadow-sky-950/20 dark:shadow-sky-950/40">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Vérification Factuelle par Gemini
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-500/30 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold flex items-center gap-1">
                  <Search className="w-2.5 h-2.5" />
                  Google Search Grounding
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {qcm.ueCode} • {qcm.courseTitle}
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
          
          {/* Question Stem preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Énoncé du QCM analysé :</span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-snug">
              {qcm.questionStem}
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 dark:border-t-sky-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-500 dark:text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit scientifique & recherche Google en cours...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Gemini consulte les référentiels officiels de santé et valide l'exactitude de chacune des 5 propositions A à E.
                </p>
              </div>
            </div>
          )}

          {/* Result view */}
          {!isLoading && verificationResult && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Overall status banner */}
              {verificationResult.isAccurate ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">
                      ✓ QCM 100% Vérifié & Scientifiquement Conforme
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-200/90 leading-relaxed pl-7">
                    {verificationResult.summary}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300">
                        Correction Recommandée ({verificationResult.errorCount} remarque(s)/erreur(s))
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-500/30">
                      Mise à jour disponible
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed pl-7">
                    {verificationResult.summary}
                  </p>
                </div>
              )}

              {/* Items Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Audit détaillé des propositions (A à E) :
                </div>

                {verificationResult.itemVerifications && verificationResult.itemVerifications.map((item) => (
                  <div
                    key={item.itemLetter}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2 text-xs ${
                      item.hasError
                        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-rose-200'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {/* Item Letter, current truth value, proposed truth value */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sky-800 dark:text-sky-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 shrink-0">
                          Item {item.itemLetter}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.correctedText || qcm.items?.find(i => i.itemLetter === item.itemLetter)?.text}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                        {item.hasError ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-500/50 text-[11px] font-extrabold text-rose-900 dark:text-rose-300">
                            <span>Était : {item.currentIsTrue ? 'VRAI' : 'FAUX'}</span>
                            <span>➔</span>
                            <span className="underline font-black">Doit être : {item.proposedIsTrue ? 'VRAI' : 'FAUX'}</span>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                            item.proposedIsTrue
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            ✓ {item.proposedIsTrue ? 'VRAI' : 'FAUX'} (Conforme)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Gemini's fact check note */}
                    {item.explanation && (
                      <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                        item.hasError
                          ? 'bg-rose-100/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                          : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}>
                        <div className="font-semibold mb-0.5 flex items-center gap-1 text-slate-900 dark:text-slate-200">
                          <span>💡 Analyse médicale :</span>
                        </div>
                        <span>{item.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
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
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all"
          >
            Fermer
          </button>

          {!isLoading && verificationResult && !verificationResult.isAccurate && verificationResult.correctedQcm && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/20 dark:shadow-emerald-950/40 active:scale-95 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isApplying ? 'Correction en cours...' : 'Appliquer la correction au QCM'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
export default QcmVerificationModal;
