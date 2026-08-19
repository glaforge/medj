import React, { useState, useRef, useEffect } from 'react';
import { Course, SubjectUE, HandwrittenScanResult, QcmQuestion } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { FullscreenImageViewer } from './FullscreenImageViewer';
import { CourseCombobox } from './CourseCombobox';
import { getLocalTodayString } from '../utils/dateUtils';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  Play,
  BookOpen
} from 'lucide-react';

interface GeminiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  subjects: SubjectUE[];
  selectedCourseForScan?: Course;
  onScanSaved?: () => void;
  onStartQuizWithQcms?: (course: Course, qcms: QcmQuestion[]) => void;
}

export const GeminiScannerModal: React.FC<GeminiScannerModalProps> = ({
  isOpen,
  onClose,
  courses,
  subjects,
  selectedCourseForScan,
  onScanSaved,
  onStartQuizWithQcms
}) => {
  useEscapeKey(isOpen, onClose);

  const [scanType, setScanType] = useState<'ANNALES' | 'HANDWRITTEN'>('ANNALES');
  const [targetCourseId, setTargetCourseId] = useState<string>(selectedCourseForScan?.id || '');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<HandwrittenScanResult | null>(null);
  const [annaleQcms, setAnnaleQcms] = useState<QcmQuestion[]>([]);
  const [showAnnaleAnswers, setShowAnnaleAnswers] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'keyPoints' | 'traps' | 'qcms'>('qcms');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedCourseForScan?.id) {
      setTargetCourseId(selectedCourseForScan.id);
    }
  }, [selectedCourseForScan, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setScanResult(null);
      setAnnaleQcms([]);
    }
  };

  const handleLaunchScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setErrorMessage(null);

    const finalCourseId = targetCourseId && targetCourseId.trim() !== ''
      ? targetCourseId.trim()
      : (selectedCourseForScan?.id || '');

    const resolvedCourse = courses.find(c => c.id.toLowerCase() === finalCourseId.toLowerCase())
      || (selectedCourseForScan?.id.toLowerCase() === finalCourseId.toLowerCase() ? selectedCourseForScan : undefined);

    const finalCourseTitle = resolvedCourse?.title || selectedCourseForScan?.title || undefined;
    const finalUeCode = resolvedCourse?.ueCode || selectedCourseForScan?.ueCode || undefined;

    try {
      if (scanType === 'HANDWRITTEN') {
        const result = await api.scanHandwritten(
          selectedFile,
          finalCourseId || undefined,
          finalCourseTitle,
          finalUeCode
        );
        setScanResult(result);
        setActiveTab('transcription');
      } else {
        const qcms = await api.scanAnnale(
          selectedFile,
          finalCourseId || undefined,
          finalCourseTitle,
          finalUeCode
        );
        setAnnaleQcms(qcms);
        setActiveTab('qcms');
      }
      if (onScanSaved) onScanSaved();
    } catch (e: any) {
      console.error('Scan failed', e);
      setErrorMessage(e.message || 'Erreur lors de la numérisation avec Gemini. Veuillez réessayer.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartQuizNow = () => {
    if (annaleQcms.length === 0) return;
    const targetCourse: Course = courses.find(c => c.id === targetCourseId) || {
      id: targetCourseId || 'course-annale',
      ueId: 'PASS',
      ueCode: 'PASS',
      title: 'Annales & QCMs Numérisés',
      color: '#0284c7',
      taughtDate: getLocalTodayString(),
      difficulty: 3,
      status: 'EN_COURS',
      tags: ['scan', 'annale'],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (onStartQuizWithQcms) {
      onStartQuizWithQcms(targetCourse, annaleQcms);
      onClose();
    }
  };

  const resetSelection = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    setScanResult(null);
    setAnnaleQcms([]);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col justify-between shadow-2xl bg-white dark:bg-slate-900 overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-500 to-teal-500 text-white shadow-lg shadow-sky-950/20 dark:shadow-sky-950/40">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 border border-sky-300 dark:border-sky-800/40 font-mono">
                  OCR MULTIMODAL GEMINI
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Scanner & Numériser des Supports Médicaux PASS
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={handleLaunchScan}
                className="px-2.5 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-900 dark:text-white text-xs font-bold transition-all shrink-0"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Scan Type Switcher */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => { setScanType('ANNALES'); resetSelection(); }}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                scanType === 'ANNALES'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>📸 Annales & QCMs Imprimés</span>
            </button>

            <button
              onClick={() => { setScanType('HANDWRITTEN'); resetSelection(); }}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                scanType === 'HANDWRITTEN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📝 Fiche Manuscrite / Schéma</span>
            </button>
          </div>

          {/* Upload / Capture Box */}
          {!scanResult && annaleQcms.length === 0 && (
            <div className="space-y-4">
              
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/50 rounded-2xl p-6 text-center bg-slate-50/60 dark:bg-slate-950/40 transition-all">
                {previewImage && selectedFile ? (
                  <div className="space-y-4">
                    {selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.type === 'application/pdf' ? (
                      <div className="max-w-md mx-auto p-6 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-center space-y-3 shadow-xs">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-2xs">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-[340px] mx-auto">
                            {selectedFile.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                            {(selectedFile.size / 1024).toFixed(1)} Ko • Document PDF multi-pages
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Prêt pour l'analyse OCR multimodale Gemini 3.7
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => setShowFullscreen(true)}
                        className="relative max-w-md mx-auto rounded-xl overflow-hidden cursor-zoom-in group shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <img
                          src={previewImage}
                          alt="Aperçu scan"
                          className="max-h-64 mx-auto object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                          <span className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                            <span>🔍</span> Cliquer pour plein écran
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Image Controls & Direct Action */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      {!(selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.type === 'application/pdf') && (
                        <button
                          onClick={() => setShowFullscreen(true)}
                          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all flex items-center gap-1.5"
                        >
                          <span>🔍</span> Plein écran
                        </button>
                      )}
                      <button
                        onClick={resetSelection}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all"
                      >
                        Changer de fichier
                      </button>

                      <button
                        onClick={handleLaunchScan}
                        disabled={isScanning}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-sky-950/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {scanType === 'ANNALES'
                            ? '⚡ Extraire les QCMs avec Gemini'
                            : '⚡ Numériser la fiche avec Gemini'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center mx-auto shadow-2xs">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Prendre une photo ou importer un fichier
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        Formats acceptés : JPG, PNG, PDF (photos d'annales de concours, colles du tutorat, schémas ou fiches manuscrites).
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Prendre une photo</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all shadow-2xs"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Parcourir mes fichiers</span>
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Associate with course */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5 shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                  <span>Rattacher au cours :</span>
                </label>
                <div className="flex-1 min-w-0">
                  <CourseCombobox
                    courses={courses}
                    selectedCourseId={targetCourseId}
                    onSelectCourse={(id) => setTargetCourseId(id)}
                    placeholder="Rechercher par UE (UE1..UE8), titre ou professeur..."
                    generalOptionLabel="-- Contexte général PASS (aucun cours spécifique) --"
                    fullWidth={true}
                    dropdownPlacement="left"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Scanning Progress */}
          {isScanning && (
            <div className="py-16 text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-full border-4 border-sky-200 dark:border-sky-500/20 border-t-sky-600 dark:border-t-sky-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-500 dark:text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Analyse multimodale Gemini en cours...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Détection des propositions A à E, transcription fidèle, vérification des statuts Vrai/Faux et identification des pièges.
                </p>
              </div>
            </div>
          )}

          {/* Handwritten Scan Result Display */}
          {scanResult && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Success Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Fiche manuscrite numérisée et enregistrée avec succès !</span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('transcription')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeTab === 'transcription'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Transcription Markdown
                </button>

                <button
                  onClick={() => setActiveTab('keyPoints')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeTab === 'keyPoints'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Points Clés ({scanResult.keyPoints?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('traps')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    activeTab === 'traps'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Pièges & Mnémotechniques
                </button>
              </div>

              {/* Tab 1: Transcription */}
              {activeTab === 'transcription' && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans max-h-80 overflow-y-auto shadow-inner">
                  <MarkdownRenderer content={scanResult.transcriptionMarkdown} />
                </div>
              )}

              {/* Tab 2: Key Points */}
              {activeTab === 'keyPoints' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Notions Incontournables pour le Concours :
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {scanResult.keyPoints?.map((kp, idx) => (
                        <li key={idx}>{kp}</li>
                      ))}
                    </ul>
                  </div>

                  {scanResult.keyFiguresAndValues && scanResult.keyFiguresAndValues.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="text-xs font-extrabold text-sky-800 dark:text-sky-400 uppercase tracking-wider">
                        Chiffres & Constantes Clés :
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.keyFiguresAndValues.map((fig, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs font-mono font-bold">
                            {fig}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Traps */}
              {activeTab === 'traps' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                    <h4 className="text-xs font-extrabold text-rose-900 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Pièges Classiques Identifiés :
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
                      {scanResult.potentialExamTraps?.map((trap, idx) => (
                        <li key={idx}>{trap}</li>
                      ))}
                    </ul>
                  </div>

                  {scanResult.mnemonics && scanResult.mnemonics.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-sky-950/40 border border-amber-200 dark:border-sky-800/50 space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Moyens Mnémotechniques Recommandés :
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                        {scanResult.mnemonics.map((mne, idx) => (
                          <li key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-medium">
                            💡 {mne}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Annale Scanned QCMs */}
          {annaleQcms.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Success Banner with Direct "S'entraîner" CTA */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    ✓ {annaleQcms.length} QCM{annaleQcms.length > 1 ? 's' : ''} extrait{annaleQcms.length > 1 ? 's' : ''} et sauvegardé{annaleQcms.length > 1 ? 's' : ''} dans vos cours !
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartQuizNow}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>S'entraîner maintenant ({annaleQcms.length})</span>
                  </button>

                  <button
                    onClick={() => setShowAnnaleAnswers(!showAnnaleAnswers)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                      showAnnaleAnswers
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                        : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                    }`}
                  >
                    {showAnnaleAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showAnnaleAnswers ? 'Masquer réponses' : 'Afficher réponses'}</span>
                  </button>
                </div>
              </div>

              {/* Scanned QCM Cards */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {annaleQcms.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sky-800 dark:text-sky-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        QCM #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex-1">
                        {q.questionStem}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {q.items?.map(item => (
                        <div
                          key={item.itemLetter}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            showAnnaleAnswers
                              ? item.isTrue
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 text-rose-950 dark:text-rose-100'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-medium flex-1">
                            <span className="font-bold font-mono text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                              {item.itemLetter}.
                            </span>
                            <span>{item.text}</span>
                          </div>

                          {showAnnaleAnswers && (
                            <span className={`font-extrabold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2 ${
                              item.isTrue
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40'
                            }`}>
                              {item.isTrue ? 'VRAI' : 'FAUX'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {showAnnaleAnswers && q.mnemonics && q.mnemonics.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                        💡 {q.mnemonics[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all"
          >
            Fermer
          </button>

          {!scanResult && annaleQcms.length === 0 ? (
            <button
              onClick={handleLaunchScan}
              disabled={!selectedFile || isScanning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-sky-950/20 dark:shadow-sky-950/40 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isScanning ? 'Numérisation en cours...' : 'Lancer la numérisation IA Gemini'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {annaleQcms.length > 0 && (
                <button
                  onClick={handleStartQuizNow}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>S'entraîner ({annaleQcms.length})</span>
                </button>
              )}
              <button
                onClick={resetSelection}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Scanner une autre photo</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {showFullscreen && previewImage && (
        <FullscreenImageViewer
          imageUrl={previewImage}
          title="Aperçu du Document / QCM Scanné"
          subtitle="Photo haute résolution pour extraction IA"
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
};
export default GeminiScannerModal;
