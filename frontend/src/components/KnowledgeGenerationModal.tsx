import React, { useState, useEffect } from 'react';
import { Course, CourseKnowledgeSource } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getContrastBadgeStyle } from '../utils/colorUtils';
import {
  Sparkles,
  X,
  FileText,
  BookOpen,
  Camera,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight
} from 'lucide-react';

interface KnowledgeGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  mode: 'QCM' | 'FLASHCARDS';
  preselectedSourceId?: string;
  onGenerate: (params: {
    count: number;
    selectedSourceIds: string[];
    customPrompt?: string;
  }) => Promise<void>;
}

export const KnowledgeGenerationModal: React.FC<KnowledgeGenerationModalProps> = ({
  isOpen,
  onClose,
  course,
  mode,
  preselectedSourceId,
  onGenerate,
}) => {
  useEscapeKey(isOpen, onClose);

  const [sources, setSources] = useState<CourseKnowledgeSource[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [count, setCount] = useState(mode === 'QCM' ? 3 : 5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && course) {
      setCount(mode === 'QCM' ? 3 : 5);
      setCustomPrompt('');
      setErrorMessage(null);
      loadSources();
    }
  }, [isOpen, course?.id, mode, preselectedSourceId]);

  const loadSources = async () => {
    setIsLoadingSources(true);
    try {
      const resp = await api.getCourseKnowledgeSources(course.id);
      const list = resp.sources || [];
      setSources(list);

      // Preselection logic
      if (preselectedSourceId && list.some(s => s.id === preselectedSourceId)) {
        setSelectedIds(new Set([preselectedSourceId]));
      } else {
        // Select all available sources by default
        setSelectedIds(new Set(list.map(s => s.id)));
      }
    } catch (e) {
      console.error('Failed to load course knowledge sources', e);
      // If error, fall back to empty list but allow generation
      setSources([]);
      setSelectedIds(new Set());
    } finally {
      setIsLoadingSources(false);
    }
  };

  if (!isOpen) return null;

  const toggleSource = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sources.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleLaunch = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      await onGenerate({
        count,
        selectedSourceIds: Array.from(selectedIds),
        customPrompt: customPrompt.trim() ? customPrompt.trim() : undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Generation failed in modal', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la génération avec Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const badgeStyle = getContrastBadgeStyle(course.color || '#0284c7');

  const countOptions = mode === 'QCM' ? [3, 5, 10] : [5, 10, 15];

  const notesSources = sources.filter(s => s.type === 'NOTES');
  const pdfSources = sources.filter(s => s.type === 'PDF');
  const scanSources = sources.filter(s => s.type === 'SCAN');
  const otherSources = sources.filter(s => s.type !== 'NOTES' && s.type !== 'PDF' && s.type !== 'SCAN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col justify-between shadow-2xl bg-white dark:bg-slate-900 overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${mode === 'QCM' ? 'bg-gradient-to-tr from-sky-600 to-indigo-600' : 'bg-gradient-to-tr from-amber-500 to-orange-600'} text-white shadow-lg shadow-sky-950/20 dark:shadow-sky-950/40`}>
              {mode === 'QCM' ? <Sparkles className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 border border-sky-300 dark:border-sky-800/40 font-mono uppercase">
                  {mode === 'QCM' ? 'Génération QCMs PASS' : 'Génération Flashcards Active Recall'}
                </span>
                <span
                  style={badgeStyle}
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded shadow-2xs"
                >
                  {course.ueCode}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                {course.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50"
            aria-label="Fermer la boîte de dialogue"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/20 border border-sky-200/80 dark:border-sky-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-sky-900 dark:text-sky-300">
              <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Base de connaissances & Grounding Google Search</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Gemini s'appuie <strong>en priorité</strong> sur les sources cochées ci-dessous (vos notes, fiches et polycopiés). Si ces documents sont partiels ou concis, l'IA les complète automatiquement avec son <strong>savoir médical intrinsèque de concours</strong> et le <strong>grounding Google Search</strong> (consensus HAS, Collèges de médecine, <em>Terminologia Anatomica</em>).
            </p>
          </div>

          {/* Sources Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>Sources disponibles ({sources.length})</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/40">
                  {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                </span>
              </span>

              {sources.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    disabled={isGenerating}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Tout cocher
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    disabled={isGenerating}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Tout décocher
                  </button>
                </div>
              )}
            </div>

            {isLoadingSources ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 animate-pulse space-y-2">
                <Sparkles className="w-5 h-5 mx-auto text-sky-500 animate-spin" />
                <p>Chargement des documents et notes du cours...</p>
              </div>
            ) : sources.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/30">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun document ni note rattaché à ce cours.</p>
                <p className="text-[11px] leading-relaxed">Gemini concevra les questions à partir du <strong>programme officiel PASS de l'UE</strong>, enrichi de son <strong>savoir médical intrinsèque</strong> et du <strong>grounding Google Search en temps réel</strong>.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                {/* 1. Notes */}
                {notesSources.map(s => {
                  const isChecked = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isGenerating && toggleSource(s.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isChecked
                          ? 'bg-sky-50/90 dark:bg-sky-950/30 border-sky-300 dark:border-sky-500/40 shadow-2xs'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-sky-500" />
                            <span>{s.title}</span>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {s.sizeBytes} car.
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                            « {s.description} »
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. PDF Documents */}
                {pdfSources.map(s => {
                  const isChecked = selectedIds.has(s.id);
                  const formattedSize = s.sizeBytes > 0
                    ? s.sizeBytes < 1024 * 1024
                      ? `${(s.sizeBytes / 1024).toFixed(0)} Ko`
                      : `${(s.sizeBytes / (1024 * 1024)).toFixed(1)} Mo`
                    : 'PDF';

                  return (
                    <div
                      key={s.id}
                      onClick={() => !isGenerating && toggleSource(s.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isChecked
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-500/40 shadow-2xs'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 line-clamp-1">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{s.title}</span>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 shrink-0">
                            {formattedSize}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Polycopié / Document de cours extrait avec Apache PDFBox
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Scanned Notes / Photos */}
                {scanSources.map(s => {
                  const isChecked = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isGenerating && toggleSource(s.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isChecked
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 shadow-2xs'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{s.title}</span>
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                            OCR Gemini
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 4. Other Attachments */}
                {otherSources.map(s => {
                  const isChecked = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isGenerating && toggleSource(s.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isChecked
                          ? 'bg-sky-50/90 dark:bg-sky-950/30 border-sky-300 dark:border-sky-500/40 shadow-2xs'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="pt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="font-bold text-slate-900 dark:text-white">{s.title}</span>
                        <p className="text-[11px] text-slate-500">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generation Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            {/* Count Selector */}
            <div className="sm:col-span-1 space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nombre à générer
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {countOptions.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    disabled={isGenerating}
                    className={`py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      count === c
                        ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Focus / Prompt */}
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Consigne ou focus spécifique</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">(optionnel)</span>
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="ex: Insister sur les formules, pièges droite/gauche, dosages..."
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
              mode === 'QCM'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-950/20'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-950/20 text-slate-950'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>
              {isGenerating
                ? 'Génération Gemini en cours...'
                : `✨ Générer ${count} ${mode === 'QCM' ? 'QCMs' : 'Flashcards'} (${selectedIds.size > 0 ? `${selectedIds.size} source${selectedIds.size > 1 ? 's' : ''}` : 'cours seul'})`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
