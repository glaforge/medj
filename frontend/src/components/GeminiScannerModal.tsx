import React, { useState, useRef, useEffect } from 'react';
import { Course, SubjectUE, HandwrittenScanResult, QcmQuestion } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { FullscreenImageViewer } from './FullscreenImageViewer';
import { CourseCombobox } from './CourseCombobox';
import { ScanDiagramModal } from './ScanDiagramModal';
import { printMedicalWorksheet } from '../utils/printWorksheet';
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
  Play,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Trash2,
  ZoomIn,
  Plus,
  Printer,
  Wand2,
  RotateCw,
  Maximize2
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

interface ScannedPage {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  isPdf: boolean;
}

export const GeminiScannerModal: React.FC<GeminiScannerModalProps> = ({
  isOpen,
  onClose,
  courses,
  subjects: _subjects,
  selectedCourseForScan,
  onScanSaved,
  onStartQuizWithQcms
}) => {
  useEscapeKey(isOpen, onClose);

  const [scanType, setScanType] = useState<'ANNALES' | 'HANDWRITTEN'>('ANNALES');
  const [targetCourseId, setTargetCourseId] = useState<string>(selectedCourseForScan?.id || '');
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [fullscreenPreview, setFullscreenPreview] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<HandwrittenScanResult | null>(null);
  const [annaleQcms, setAnnaleQcms] = useState<QcmQuestion[]>([]);
  const [showAnnaleAnswers, setShowAnnaleAnswers] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'keyPoints' | 'traps' | 'diagram' | 'qcms'>('qcms');
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedCourseForScan?.id) {
      setTargetCourseId(selectedCourseForScan.id);
    }
  }, [selectedCourseForScan, isOpen]);

  const targetCourse = courses.find(c => c.id === targetCourseId) || selectedCourseForScan;

  // Clean up Object URLs when unmounting or closing
  useEffect(() => {
    return () => {
      pages.forEach(p => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  if (!isOpen) return null;

  const addFilesToPages = (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    setScanResult(null);
    setAnnaleQcms([]);

    const newPages: ScannedPage[] = [];
    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const previewUrl = isPdf ? '' : URL.createObjectURL(file);
      newPages.push({
        id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        isPdf,
      });
    }

    setPages(prev => [...prev, ...newPages]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToPages(e.target.files);
      e.target.value = '';
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToPages(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemovePage = (index: number) => {
    setPages(prev => {
      const target = prev[index];
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleMovePage = (index: number, direction: 'prev' | 'next') => {
    setPages(prev => {
      const targetIndex = direction === 'prev' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const nextPages = [...prev];
      const temp = nextPages[index];
      nextPages[index] = nextPages[targetIndex];
      nextPages[targetIndex] = temp;
      return nextPages;
    });
  };

  const resetSelection = () => {
    pages.forEach(p => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPages([]);
    setScanResult(null);
    setAnnaleQcms([]);
    setErrorMessage(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30 Mo (Infrastructure limit Cloud Run: 32 Mo)
  const totalBytes = pages.reduce((acc, p) => acc + p.size, 0);
  const isOverSizeLimit = totalBytes > MAX_UPLOAD_BYTES;

  const handleLaunchScan = async () => {
    if (pages.length === 0) return;

    if (isOverSizeLimit) {
      setErrorMessage(
        `Le document sélectionné fait ${formatFileSize(totalBytes)}, ce qui dépasse la limite d'envoi autorisée de 30 Mo. ` +
        `Veuillez compresser votre fichier PDF (par ex. avec un compresseur de PDF en ligne ou en réduisant la résolution des photos) avant de lancer l'analyse.`
      );
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    const finalCourseId = targetCourseId && targetCourseId.trim() !== ''
      ? targetCourseId.trim()
      : (selectedCourseForScan?.id || '');

    const resolvedCourse = courses.find(c => c.id.toLowerCase() === finalCourseId.toLowerCase())
      || (selectedCourseForScan?.id.toLowerCase() === finalCourseId.toLowerCase() ? selectedCourseForScan : undefined);

    const finalCourseTitle = resolvedCourse?.title || selectedCourseForScan?.title || undefined;
    const finalUeCode = resolvedCourse?.ueCode || selectedCourseForScan?.ueCode || undefined;

    const filesToUpload = pages.map(p => p.file);

    try {
      if (scanType === 'HANDWRITTEN') {
        const result = await api.scanHandwritten(
          filesToUpload,
          finalCourseId || undefined,
          finalCourseTitle,
          finalUeCode
        );
        setScanResult(result);
        setActiveTab('transcription');
      } else {
        const qcms = await api.scanAnnale(
          filesToUpload,
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
      const isNetworkOrFetchError =
        e?.message?.toLowerCase().includes('failed to fetch') ||
        e?.name === 'TypeError';
      if (isNetworkOrFetchError) {
        setErrorMessage(
          `Erreur réseau (Failed to fetch) : la connexion au serveur a été interrompue. ` +
          `Cela survient lorsque le fichier est trop volumineux (limite max 30 Mo) ou que le réseau a coupé. ` +
          `Taille actuelle : ${formatFileSize(totalBytes)}. Veuillez essayer avec un document compressé.`
        );
      } else {
        setErrorMessage(e.message || 'Erreur lors de la numérisation avec Gemini. Veuillez réessayer.');
      }
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
                  OCR MULTIMODAL MULTI-PAGES GEMINI
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Scanner & Numériser des Documents Médicaux PASS
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
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
                className="px-2.5 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-900 dark:text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Scan Type Switcher */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => { setScanType('ANNALES'); resetSelection(); }}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                scanType === 'HANDWRITTEN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📝 Fiche Manuscrite / Schéma</span>
            </button>
          </div>

          {/* Multi-Page Upload / Capture Section */}
          {!scanResult && annaleQcms.length === 0 && (
            <div className="space-y-4">
              
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCameraInputChange}
              />

              {pages.length === 0 ? (
                /* Empty state: initial dropzone */
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/50 rounded-2xl p-8 text-center bg-slate-50/60 dark:bg-slate-950/40 transition-all space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Prendre une photo ou importer des documents
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      Prenez plusieurs photos successives avec votre smartphone (Page 1, Page 2, Page 3...) ou sélectionnez des fichiers photos (JPG, PNG) et documents PDF.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📸 Prendre une photo</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>📁 Parcourir mes fichiers (Photos ou PDF)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Multi-Page Gallery & Controls */
                <div className="space-y-4">
                  
                  {/* Top Status & Add Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold font-mono">
                        {pages.length}
                      </span>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {pages.length} page{pages.length > 1 ? 's' : ''} prête{pages.length > 1 ? 's' : ''} pour l'analyse
                        <span className={`ml-1.5 font-mono text-[11px] ${
                          isOverSizeLimit
                            ? 'font-bold text-rose-600 dark:text-rose-400'
                            : 'font-normal text-slate-500 dark:text-slate-400'
                        }`}>
                          ({formatFileSize(totalBytes)})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                        title="Prendre une photo supplémentaire avec l'appareil photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>+ Prendre une photo</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        title="Ajouter des photos ou PDFs depuis l'explorateur"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Ajouter des fichiers</span>
                      </button>

                      <button
                        onClick={resetSelection}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer ml-1"
                        title="Supprimer toutes les pages"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Vider</span>
                      </button>
                    </div>
                  </div>

                  {/* Size Limit Warnings */}
                  {isOverSizeLimit && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs animate-fadeIn shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-extrabold">
                          Document trop volumineux ({formatFileSize(totalBytes)}) — Limite maximale : 30 Mo
                        </div>
                        <div className="text-[11px] text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
                          La taille totale dépasse la limite d'envoi autorisée par le serveur (30 Mo). Veuillez compresser votre fichier PDF (par ex. via un compresseur de PDF en ligne ou en réduisant la résolution des photos) avant de lancer la numérisation.
                        </div>
                      </div>
                    </div>
                  )}

                  {!isOverSizeLimit && totalBytes > 20 * 1024 * 1024 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-[11px]">
                        Fichier volumineux ({formatFileSize(totalBytes)}). L'analyse par Gemini peut prendre 15 à 30 secondes selon le nombre de pages.
                      </span>
                    </div>
                  )}

                  {/* Grid of Page Thumbnails */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto p-1">
                    {pages.map((page, index) => (
                      <div
                        key={page.id}
                        className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        {/* Card Header with Page Number & Ordering Controls */}
                        <div className="p-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
                          <span className="px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[11px] font-extrabold font-mono border border-sky-200 dark:border-sky-800/60">
                            Page {index + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMovePage(index, 'prev')}
                              disabled={index === 0}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                              title="Déplacer vers la gauche / avant"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleMovePage(index, 'next')}
                              disabled={index === pages.length - 1}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                              title="Déplacer vers la droite / après"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleRemovePage(index)}
                              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 transition-all cursor-pointer ml-0.5"
                              title="Supprimer cette page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Page Preview Thumbnail */}
                        <div className="p-3 flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/60 min-h-[140px]">
                          {page.isPdf ? (
                            <div className="text-center space-y-2 py-3">
                              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-2xs">
                                <FileText className="w-6 h-6" />
                              </div>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                Document PDF
                              </span>
                            </div>
                          ) : (
                            <div
                              onClick={() => setFullscreenPreview({
                                url: page.previewUrl,
                                title: `Page ${index + 1} : ${page.name}`,
                                subtitle: `${formatFileSize(page.size)} • Support pour analyse multimodale`
                              })}
                              className="relative cursor-zoom-in w-full h-32 rounded-xl overflow-hidden group/thumb flex items-center justify-center bg-slate-200/40 dark:bg-slate-900"
                            >
                              <img
                                src={page.previewUrl}
                                alt={`Page ${index + 1}`}
                                className="max-h-full max-w-full object-contain transition-transform group-hover/thumb:scale-105"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                <ZoomIn className="w-4 h-4" />
                                <span>Agrandir</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: name & size */}
                        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="truncate max-w-[140px]" title={page.name}>
                            {page.name}
                          </span>
                          <span className="shrink-0 font-semibold">
                            {formatFileSize(page.size)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

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
                  Analyse multimodale Gemini en cours ({pages.length} page{pages.length > 1 ? 's' : ''})...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {scanType === 'ANNALES'
                    ? 'Détection des énoncés et propositions A-E, vérification des statuts Vrai/Faux et extraction des pièges sur toutes les pages.'
                    : 'Transcription ordonnée, consolidation transversale des points clés, termes anatomiques et mnémotechniques.'}
                </p>
              </div>
            </div>
          )}

          {/* Handwritten Scan Result Display */}
          {scanResult && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Success Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Fiche manuscrite ({pages.length > 0 ? `${pages.length} page${pages.length > 1 ? 's' : ''}` : 'numérisée'}) synthétisée et enregistrée avec succès !
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDiagramModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{scanResult.illustrationUrl ? '🎨 Schéma Visuel' : '🎨 Créer schéma de synthèse'}</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
                <button
                  onClick={() => setActiveTab('transcription')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'transcription'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Transcription Markdown
                </button>

                <button
                  onClick={() => setActiveTab('keyPoints')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'keyPoints'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Points Clés ({scanResult.keyPoints?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('traps')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'traps'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Pièges & Mnémotechniques
                </button>

                {scanResult.illustrationUrl && (
                  <button
                    onClick={() => setActiveTab('diagram')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'diagram'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                    }`}
                  >
                    <span>🎨 Schéma Visuel Pastel</span>
                  </button>
                )}
              </div>

              {/* Tab: Diagramme Visuel de Synthèse */}
              {activeTab === 'diagram' && scanResult.illustrationUrl && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-800/60 space-y-3 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎨</span>
                        <span>Schéma de Synthèse (Nano Banana Pro)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Dessiné à la main sur fond blanc pur avec rehauts pastels</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (scanResult.illustrationUrl) {
                            printMedicalWorksheet({
                              id: scanResult.illustrationId || 'illus-scan',
                              courseId: scanResult.courseId,
                              courseTitle: scanResult.courseTitle,
                              ueCode: targetCourse?.ueCode || 'PASS',
                              title: `Schéma de Synthèse : ${scanResult.courseTitle}`,
                              imageUrl: scanResult.illustrationUrl,
                              illustrationType: 'CROQUIS_SYNTHETIQUE',
                              prompt: '',
                              refinedVisualPrompt: '',
                              legendItems: scanResult.keyPoints || [],
                              createdAt: scanResult.scannedAt,
                            }, true);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Imprimer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDiagramModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Régénérer / Ajuster</span>
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => setIsDiagramModalOpen(true)}
                    className="cursor-pointer rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 flex items-center justify-center max-h-80 bg-white dark:bg-slate-900 group relative"
                    title="Cliquez pour agrandir ou régénérer"
                  >
                    <img
                      src={scanResult.illustrationUrl}
                      alt={scanResult.courseTitle}
                      className="w-full h-auto object-contain max-h-80"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-bold shadow-md flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Agrandir / Modifier</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                        <li key={idx}>
                          <MarkdownRenderer content={kp} inline />
                        </li>
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
                            <MarkdownRenderer content={fig} inline />
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
                        <li key={idx}>
                          <MarkdownRenderer content={trap} inline />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {scanResult.mnemonics && scanResult.mnemonics.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 space-y-2">
                      <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Moyens Mnémotechniques Recommandés :
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                        {scanResult.mnemonics.map((mne, idx) => (
                          <li key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-medium flex items-start gap-2">
                            <span className="shrink-0">💡</span>
                            <div className="flex-1 min-w-0">
                              <MarkdownRenderer content={mne} inline />
                            </div>
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>S'entraîner maintenant ({annaleQcms.length})</span>
                  </button>

                  <button
                    onClick={() => setShowAnnaleAnswers(!showAnnaleAnswers)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
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
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex-1">
                        <MarkdownRenderer content={q.questionStem} inline />
                      </div>
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
                            <span className="font-bold font-mono text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 shrink-0">
                              {item.itemLetter}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <MarkdownRenderer content={item.text} inline />
                            </div>
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
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 font-medium flex items-start gap-1.5">
                        <span className="shrink-0">💡</span>
                        <div className="flex-1 min-w-0">
                          <MarkdownRenderer content={q.mnemonics[0]} inline />
                        </div>
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
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
          >
            Fermer
          </button>

          {!scanResult && annaleQcms.length === 0 ? (
            <button
              onClick={handleLaunchScan}
              disabled={pages.length === 0 || isScanning || isOverSizeLimit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-sky-950/20 dark:shadow-sky-950/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isScanning
                  ? `Numérisation en cours (${pages.length} page${pages.length > 1 ? 's' : ''})...`
                  : isOverSizeLimit
                    ? `Fichier trop volumineux (${formatFileSize(totalBytes)} > 30 Mo)`
                    : pages.length > 0
                      ? `Lancer la numérisation IA Gemini (${pages.length} page${pages.length > 1 ? 's' : ''})`
                      : 'Lancer la numérisation IA Gemini'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {annaleQcms.length > 0 && (
                <button
                  onClick={handleStartQuizNow}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>S'entraîner ({annaleQcms.length})</span>
                </button>
              )}
              <button
                onClick={resetSelection}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scanner d'autres documents</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {fullscreenPreview && (
        <FullscreenImageViewer
          imageUrl={fullscreenPreview.url}
          title={fullscreenPreview.title}
          subtitle={fullscreenPreview.subtitle}
          onClose={() => setFullscreenPreview(null)}
        />
      )}

      {isDiagramModalOpen && scanResult && (
        <ScanDiagramModal
          scan={scanResult}
          course={targetCourse}
          onClose={() => setIsDiagramModalOpen(false)}
          onSaved={(updatedScan) => {
            setScanResult(updatedScan);
            if (onScanSaved) onScanSaved();
          }}
        />
      )}
    </div>
  );
};
export default GeminiScannerModal;
