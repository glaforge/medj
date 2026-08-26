import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Printer,
  RotateCw,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  Wand2,
  BookOpen,
  History,
  Save,
  Check,
} from 'lucide-react';
import { Course, HandwrittenScanResult, MedicalIllustration } from '../types';
import { api } from '../services/api';
import { printMedicalWorksheet } from '../utils/printWorksheet';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { FullscreenImageViewer } from './FullscreenImageViewer';

interface ScanDiagramModalProps {
  scan: HandwrittenScanResult;
  course?: Course;
  onClose: () => void;
  onSaved: (updatedScan: HandwrittenScanResult, illustration: MedicalIllustration) => void;
}

export function buildDefaultScanPrompt(scan: HandwrittenScanResult, course?: Course): string {
  const prefix = "Crée un diagramme visuel de synthèse, dessiné à la main sur fond blanc pur, avec un peu de pastel pour réhausser les éléments important, et résumant les notes suivantes :\n\n";

  let notes = `Cours : ${scan.courseTitle || course?.title || 'Synthèse Médicale PASS'}\n`;
  if (course?.ueCode) notes += `UE : ${course.ueCode}\n`;
  notes += '\n';

  if (scan.keyPoints && scan.keyPoints.length > 0) {
    notes += 'Points Clés & Définitions :\n' + scan.keyPoints.map(kp => `- ${kp}`).join('\n') + '\n\n';
  }

  if (scan.anatomicalTerms && scan.anatomicalTerms.length > 0) {
    notes += 'Termes & Notions Clés :\n' + scan.anatomicalTerms.map(t => `- ${t}`).join('\n') + '\n\n';
  }

  if (scan.keyFiguresAndValues && scan.keyFiguresAndValues.length > 0) {
    notes += 'Chiffres & Constantes Incontournables :\n' + scan.keyFiguresAndValues.map(f => `- ${f}`).join('\n') + '\n\n';
  }

  if (scan.potentialExamTraps && scan.potentialExamTraps.length > 0) {
    notes += 'Pièges Fréquents Concours PASS :\n' + scan.potentialExamTraps.map(p => `- ${p}`).join('\n') + '\n\n';
  }

  if (scan.mnemonics && scan.mnemonics.length > 0) {
    notes += 'Moyens Mnémotechniques :\n' + scan.mnemonics.map(m => `- ${m}`).join('\n') + '\n\n';
  }

  if (scan.transcriptionMarkdown && notes.length < 350) {
    notes += 'Extrait des notes du cours :\n' + scan.transcriptionMarkdown;
  }

  return prefix + notes.trim();
}

export const ScanDiagramModal: React.FC<ScanDiagramModalProps> = ({
  scan,
  course,
  onClose,
  onSaved,
}) => {
  useEscapeKey(true, onClose);

  const defaultPrompt = buildDefaultScanPrompt(scan, course);
  const defaultTitle = scan.courseTitle
    ? `Schéma de Synthèse : ${scan.courseTitle}`
    : `Diagramme Visuel de Synthèse (${course?.ueCode || 'PASS'})`;

  const [title, setTitle] = useState(defaultTitle);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [iterations, setIterations] = useState<MedicalIllustration[]>([]);
  const [selectedIterationIndex, setSelectedIterationIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [userAdjustment, setUserAdjustment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSavedOnFiche, setIsSavedOnFiche] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const currentIllustration: MedicalIllustration | null =
    iterations.length > 0 ? iterations[selectedIterationIndex] : null;

  // Load existing illustration if scan already has an illustrationId
  useEffect(() => {
    let isMounted = true;
    if (scan.illustrationId) {
      api.getIllustration(scan.illustrationId)
        .then(illus => {
          if (isMounted && illus) {
            setIterations([illus]);
            setSelectedIterationIndex(0);
            setIsSavedOnFiche(true);
            if (illus.title) setTitle(illus.title);
          }
        })
        .catch(() => {
          // If illustration couldn't be loaded by ID, check if illustrationUrl exists
          if (isMounted && scan.illustrationUrl) {
            const syntheticIllus: MedicalIllustration = {
              id: scan.illustrationId || 'illus-existing',
              courseId: scan.courseId,
              courseTitle: scan.courseTitle,
              ueCode: course?.ueCode || 'UE',
              title: defaultTitle,
              imageUrl: scan.illustrationUrl,
              illustrationType: 'CROQUIS_SYNTHETIQUE',
              prompt: defaultPrompt,
              refinedVisualPrompt: defaultPrompt,
              legendItems: scan.keyPoints?.slice(0, 6) || [],
              createdAt: scan.scannedAt || new Date().toISOString(),
            };
            setIterations([syntheticIllus]);
            setSelectedIterationIndex(0);
            setIsSavedOnFiche(true);
          }
        });
    } else if (scan.illustrationUrl) {
      const syntheticIllus: MedicalIllustration = {
        id: 'illus-existing',
        courseId: scan.courseId,
        courseTitle: scan.courseTitle,
        ueCode: course?.ueCode || 'UE',
        title: defaultTitle,
        imageUrl: scan.illustrationUrl,
        illustrationType: 'CROQUIS_SYNTHETIQUE',
        prompt: defaultPrompt,
        refinedVisualPrompt: defaultPrompt,
        legendItems: scan.keyPoints?.slice(0, 6) || [],
        createdAt: scan.scannedAt || new Date().toISOString(),
      };
      setIterations([syntheticIllus]);
      setSelectedIterationIndex(0);
      setIsSavedOnFiche(true);
    }
    return () => {
      isMounted = false;
    };
  }, [scan.illustrationId, scan.illustrationUrl]);

  // Initial generation with Nano Banana Pro
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      setError('Veuillez renseigner le prompt de description.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const generated = await api.generateIllustration({
        title: title.trim() || defaultTitle,
        prompt: prompt.trim(),
        courseId: scan.courseId || course?.id || 'course-general',
        courseTitle: scan.courseTitle || course?.title || 'Cours Médical PASS',
        ueCode: course?.ueCode || 'UE',
        illustrationType: 'CROQUIS_SYNTHETIQUE',
      });

      const updatedList = [...iterations, generated];
      setIterations(updatedList);
      setSelectedIterationIndex(updatedList.length - 1);

      // Automatically attach to scan in background
      try {
        const updatedScan = await api.linkScanIllustration(scan.id, generated.id, generated.imageUrl);
        setIsSavedOnFiche(true);
        onSaved(updatedScan, generated);
      } catch (saveErr) {
        console.warn('Auto-link failed, manual save available:', saveErr);
      }
    } catch (err) {
      console.error('Failed to generate synthesis diagram:', err);
      setError('Erreur lors de la génération avec Nano Banana Pro. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Iterative regeneration (as requested by user: can regenerate multiple times)
  const handleRegenerate = async (adjustmentText?: string) => {
    if (!currentIllustration) return;
    const finalAdjustment = (adjustmentText !== undefined ? adjustmentText : userAdjustment).trim();

    try {
      setIsRegenerating(true);
      setError(null);

      const regenerated = await api.regenerateIllustration(
        currentIllustration.id,
        finalAdjustment || 'Améliore la netteté du schéma de synthèse dessiné à la main avec touches de pastel sur fond blanc pur'
      );

      const updatedList = [...iterations, regenerated];
      setIterations(updatedList);
      setSelectedIterationIndex(updatedList.length - 1);
      setUserAdjustment('');

      // Auto-update linked scan
      try {
        const updatedScan = await api.linkScanIllustration(scan.id, regenerated.id, regenerated.imageUrl);
        setIsSavedOnFiche(true);
        onSaved(updatedScan, regenerated);
      } catch (saveErr) {
        console.warn('Auto-link failed on regenerate:', saveErr);
      }
    } catch (err) {
      console.error('Regeneration failed:', err);
      setError('Erreur lors de la régénération du schéma. Veuillez réessayer.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Manual save / attach to fiche
  const handleSaveToFiche = async () => {
    if (!currentIllustration) return;
    try {
      setIsSaving(true);
      setError(null);
      const updatedScan = await api.linkScanIllustration(
        scan.id,
        currentIllustration.id,
        currentIllustration.imageUrl
      );
      setIsSavedOnFiche(true);
      onSaved(updatedScan, currentIllustration);
    } catch (err) {
      console.error('Failed to link illustration to scan:', err);
      setError('Impossible d’enregistrer le schéma avec la fiche.');
    } finally {
      setIsSaving(false);
    }
  };

  // Print handler
  const handlePrint = () => {
    if (!currentIllustration) return;
    printMedicalWorksheet(currentIllustration, true);
  };

  const quickAdjustmentChips = [
    { label: '🎨 Plus de pastel', text: 'Rehausse les éléments importants avec des touches de couleurs pastel plus visibles (rose, bleu, vert menthe, jaune) sur fond blanc pur.' },
    { label: '⚠️ Mettre l’accent sur les pièges', text: 'Met bien en évidence les pièges fréquents de concours avec des encadrés d’alerte ou annotations spécifiques.' },
    { label: '📐 Schéma plus aéré', text: 'Rends le diagramme plus aéré, épuré, avec une disposition claire des blocs de notes et des flèches directrices.' },
    { label: '🔬 Zoom sur les structures', text: 'Détaille plus précisément les structures anatomiques et moléculaires avec des légendes claires en français.' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 text-lg">
              🎨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Diagramme Visuel de Synthèse
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Nano Banana Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {scan.courseTitle || course?.title || 'Fiche numérisée'} • <code>gemini-3-pro-image</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Initial State: Prompt Configuration if no illustration yet and not generating */}
          {!currentIllustration && !isGenerating && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-950 dark:text-purple-200 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Style de Synthèse Manuscrite Pastel (Nano Banana Pro)</span>
                </div>
                <p>
                  Gemini va transformer vos notes et fiches scannées en un <strong>diagramme visuel didactique</strong>, dessiné à la main sur fond blanc pur avec de douces touches de pastel pour réhausser les éléments essentiels du cours.
                </p>
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Titre du Diagramme :
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Titre du schéma de synthèse..."
                />
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Consigne & Notes Extraites du Scan :
                  </label>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    Formule prédéfinie Nano Banana Pro
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={8}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Consigne de génération..."
                />
              </div>

              {/* Generate Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Lancer la création du diagramme de synthèse (Nano Banana Pro)</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Animation during generation */}
          {isGenerating && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-xl">
                  🎨
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Génération du diagramme en cours...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Gemini 3 Pro Image (Nano Banana Pro) compose le diagramme visuel dessiné à la main sur fond blanc pur avec rehauts pastels...
                </p>
              </div>
            </div>
          )}

          {/* Result View: Iteration History, Image Display, Regeneration Controls, Print CTA */}
          {currentIllustration && !isGenerating && (
            <div className="space-y-5">
              
              {/* Top Controls: Iteration Badges & Print / Save */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    <span>Versions ({iterations.length}) :</span>
                  </span>
                  {iterations.map((iter, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIterationIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedIterationIndex === idx
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-purple-300'
                      }`}
                    >
                      V{idx + 1} {idx === iterations.length - 1 && iterations.length > 1 ? '(Dernière)' : ''}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Imprimer cette planche de synthèse au format A4"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Imprimer la planche</span>
                  </button>

                  <button
                    onClick={handleSaveToFiche}
                    disabled={isSaving || isSavedOnFiche}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSavedOnFiche
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
                    }`}
                  >
                    {isSavedOnFiche ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isSavedOnFiche ? 'Enregistré sur la fiche' : 'Enregistrer'}</span>
                  </button>
                </div>
              </div>

              {/* Main Content Grid: Image (Left) + Regeneration / Legend (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left: Illustration High-Res Box */}
                <div className="lg:col-span-7 space-y-2">
                  <div
                    onClick={() => setShowFullscreen(true)}
                    className="group relative rounded-2xl overflow-hidden border-2 border-purple-200 dark:border-purple-800/60 bg-white dark:bg-slate-950 shadow-md cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-all flex items-center justify-center min-h-[300px]"
                    title="Cliquez pour agrandir ou imprimer"
                  >
                    <img
                      src={currentIllustration.imageUrl}
                      alt={currentIllustration.title}
                      className="w-full h-auto object-contain max-h-[460px] select-none"
                    />

                    {/* Hover Overlay with Action Pill */}
                    <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-extrabold shadow-lg flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Agrandir / Plein Écran</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint();
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-purple-600 text-white text-xs font-extrabold shadow-lg flex items-center gap-1.5 hover:bg-purple-500 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span>💡 Cliquez sur l'image pour l'agrandir ou l'imprimer</span>
                    <span>Fond blanc pur & rehauts pastels</span>
                  </div>
                </div>

                {/* Right: Iterative Regeneration & Legend Box */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Regeneration Box (User can regenerate as many times as they want) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50/70 to-pink-50/40 dark:from-purple-950/30 dark:to-slate-900/60 border border-purple-200 dark:border-purple-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-purple-600" />
                        <span>Ajuster & Régénérer</span>
                      </h4>
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">
                        Itérations illimitées
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Le résultat ne vous convient pas totalement ? Précisez une consigne et régénérez jusqu'à satisfaction :
                    </p>

                    {/* Quick chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickAdjustmentChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleRegenerate(chip.text)}
                          disabled={isRegenerating}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-300 border border-purple-200 dark:border-purple-800/50 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom prompt text */}
                    <div className="space-y-1.5">
                      <textarea
                        value={userAdjustment}
                        onChange={e => setUserAdjustment(e.target.value)}
                        placeholder="Ex: Accentue les contrastes, ajoute des flèches pour le flux sanguin..."
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRegenerate()}
                      disabled={isRegenerating}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>{isRegenerating ? 'Régénération Nano Banana Pro...' : '🔄 Régénérer une nouvelle version'}</span>
                    </button>
                  </div>

                  {/* Legend / Key Points identified */}
                  {currentIllustration.legendItems && currentIllustration.legendItems.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                        <span>Nomenclature & Repères du Schéma :</span>
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto pr-1">
                        {currentIllustration.legendItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="flex-1 min-w-0">{item.replace(/^\d+[\.\)]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Grounding sources */}
                  {currentIllustration.groundingSources && currentIllustration.groundingSources.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Sources médicales vérifiées :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentIllustration.groundingSources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            <span>{s.title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Fermer
          </button>

          {currentIllustration && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                <span>Imprimer la planche A4</span>
              </button>

              <button
                onClick={handleSaveToFiche}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavedOnFiche ? 'Terminer' : 'Valider & Enregistrer'}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Fullscreen Lightbox */}
      {showFullscreen && currentIllustration && (
        <FullscreenImageViewer
          imageUrl={currentIllustration.imageUrl}
          title={currentIllustration.title}
          subtitle={`${course?.ueCode || 'PASS'} • Dessin de synthèse (Nano Banana Pro)`}
          onClose={() => setShowFullscreen(false)}
        />
      )}

    </div>,
    document.body
  );
};

export default ScanDiagramModal;
