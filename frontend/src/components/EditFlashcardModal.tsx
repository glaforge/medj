import React, { useState, useEffect, useId, useRef } from 'react';
import { Course, SubjectUE, Flashcard } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { FlashcardImageLightbox } from './FlashcardImageLightbox';
import {
  X,
  Save,
  Star,
  Lightbulb,
  Layers,
  ImagePlus,
  Loader2,
  ZoomIn,
  AlertCircle
} from 'lucide-react';

export const LAST_FLASHCARD_CONTEXT_KEY = 'medj_last_flashcard_context';

interface LastFlashcardContext {
  ueCode: string;
  courseId: string;
}

function readLastFlashcardContext(): LastFlashcardContext | null {
  try {
    const raw = localStorage.getItem(LAST_FLASHCARD_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        ueCode: typeof parsed.ueCode === 'string' ? parsed.ueCode : '',
        courseId: typeof parsed.courseId === 'string' ? parsed.courseId : ''
      };
    }
  } catch {
    // Ignore localStorage / JSON parse errors
  }
  return null;
}

function saveLastFlashcardContext(ueCode: string, courseId: string): void {
  try {
    localStorage.setItem(
      LAST_FLASHCARD_CONTEXT_KEY,
      JSON.stringify({ ueCode, courseId })
    );
  } catch {
    // Ignore localStorage errors (e.g. private browsing / quota)
  }
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flashcard: Partial<Flashcard>) => Promise<Flashcard | void>;
  courses: Course[];
  subjects: SubjectUE[];
  editingFlashcard?: Flashcard | null;
  defaultCourseId?: string;
  defaultUeCode?: string;
}

export const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  courses,
  subjects,
  editingFlashcard,
  defaultCourseId,
  defaultUeCode
}) => {
  const formId = useId();
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedUe, setSelectedUe] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [frontImages, setFrontImages] = useState<string[]>([]);
  const [backImages, setBackImages] = useState<string[]>([]);
  const [uploadingFrontCount, setUploadingFrontCount] = useState(0);
  const [uploadingBackCount, setUploadingBackCount] = useState(0);
  const [dragOverSide, setDragOverSide] = useState<'front' | 'back' | null>(null);
  const [lastActiveSide, setLastActiveSide] = useState<'front' | 'back'>('front');
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    index: number;
    sideLabel: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEscapeKey(isOpen && lightboxState === null, onClose);

  const resolveSubjectCode = (course?: Course, fallbackUeCode?: string): string => {
    if (course) {
      const matchByCourse = subjects.find(
        s =>
          (course.ueCode && s.code?.toLowerCase() === course.ueCode.toLowerCase()) ||
          (course.ueId && s.id?.toLowerCase() === course.ueId.toLowerCase())
      );
      if (matchByCourse) return matchByCourse.code;
      if (course.ueCode) return course.ueCode;
    }
    if (fallbackUeCode && fallbackUeCode !== 'ALL') {
      const matchByCode = subjects.find(
        s =>
          s.code?.toLowerCase() === fallbackUeCode.toLowerCase() ||
          s.id?.toLowerCase() === fallbackUeCode.toLowerCase()
      );
      if (matchByCode) return matchByCode.code;
      return fallbackUeCode;
    }
    return 'ALL';
  };

  const getCoursesForUe = (ueValue: string): Course[] => {
    if (!ueValue || ueValue === 'ALL') return courses;
    const lower = ueValue.toLowerCase();
    const matchedSubject = subjects.find(
      s => s.code?.toLowerCase() === lower || s.id?.toLowerCase() === lower
    );
    const subjectIdLower = matchedSubject?.id?.toLowerCase();
    return courses.filter(c =>
      c.ueCode?.toLowerCase() === lower ||
      c.ueId?.toLowerCase() === lower ||
      (subjectIdLower !== undefined && c.ueId?.toLowerCase() === subjectIdLower)
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setDragOverSide(null);
    setLightboxState(null);
    setLastActiveSide('front');

    if (editingFlashcard) {
      setSelectedCourseId(editingFlashcard.courseId || '');
      const foundCourse = courses.find(c => c.id === editingFlashcard.courseId);
      setSelectedUe(resolveSubjectCode(foundCourse, editingFlashcard.ueCode));
      setFront(editingFlashcard.front || '');
      setBack(editingFlashcard.back || '');
      setFrontImages(editingFlashcard.frontImages || []);
      setBackImages(editingFlashcard.backImages || []);
      setHint(editingFlashcard.hint || '');
      setDifficulty(editingFlashcard.difficulty || 3);
      setIsFavorite(editingFlashcard.isFavorite || false);
      setTagsInput((editingFlashcard.tags || []).join(', '));
    } else {
      let initialCourse: Course | undefined;
      let initialUe = 'ALL';

      if (defaultCourseId) {
        initialCourse = courses.find(c => c.id === defaultCourseId);
        initialUe = resolveSubjectCode(initialCourse, defaultUeCode);
      } else if (defaultUeCode) {
        initialUe = resolveSubjectCode(undefined, defaultUeCode);
        const coursesInUe = getCoursesForUe(initialUe);
        initialCourse = coursesInUe[0] || courses[0];
      } else {
        const savedContext = readLastFlashcardContext();
        if (savedContext?.courseId) {
          initialCourse = courses.find(c => c.id === savedContext.courseId);
        }
        if (initialCourse) {
          initialUe = resolveSubjectCode(initialCourse, savedContext?.ueCode);
        } else if (savedContext?.ueCode) {
          const resolvedSavedUe = resolveSubjectCode(undefined, savedContext.ueCode);
          const coursesInSavedUe = getCoursesForUe(resolvedSavedUe);
          if (resolvedSavedUe !== 'ALL' && coursesInSavedUe.length > 0) {
            initialUe = resolvedSavedUe;
            initialCourse = coursesInSavedUe[0];
          }
        }
        if (!initialCourse && courses.length > 0) {
          initialCourse = courses[0];
          initialUe = resolveSubjectCode(initialCourse);
        }
      }

      setSelectedCourseId(initialCourse ? initialCourse.id : (defaultCourseId || ''));
      setSelectedUe(initialUe);
      setFront('');
      setBack('');
      setFrontImages([]);
      setBackImages([]);
      setHint('');
      setDifficulty(3);
      setIsFavorite(false);
      setTagsInput('');
    }
  }, [isOpen, editingFlashcard, defaultCourseId, defaultUeCode]);

  if (!isOpen) return null;

  const availableCourses = getCoursesForUe(selectedUe);

  const handleUeChange = (newUe: string) => {
    setSelectedUe(newUe);
    if (newUe !== 'ALL') {
      const coursesForUe = getCoursesForUe(newUe);
      if (coursesForUe.length > 0) {
        setSelectedCourseId(coursesForUe[0].id);
      } else {
        setSelectedCourseId('');
      }
    } else if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  };

  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    const course = courses.find(c => c.id === newCourseId);
    if (course) {
      setSelectedUe(resolveSubjectCode(course));
    }
  };

  const normalizeImageFile = (file: File, side: 'front' | 'back', idx: number): File => {
    if (file.name && file.name.includes('.')) {
      return file;
    }
    const ext =
      file.type === 'image/jpeg' ? 'jpg' :
      file.type === 'image/webp' ? 'webp' :
      file.type === 'image/gif' ? 'gif' :
      file.type === 'image/avif' ? 'avif' : 'png';
    return new File([file], `photo-${side}-${Date.now()}-${idx + 1}.${ext}`, {
      type: file.type || 'image/png'
    });
  };

  const uploadImagesForSide = async (rawFiles: File[], side: 'front' | 'back') => {
    const imageFiles = rawFiles.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|svg|heic|heif)$/i.test(f.name));
    if (imageFiles.length === 0) return;

    setValidationError(null);
    if (side === 'front') {
      setUploadingFrontCount(c => c + imageFiles.length);
    } else {
      setUploadingBackCount(c => c + imageFiles.length);
    }

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const prepared = normalizeImageFile(imageFiles[i], side, i);
        const res = await api.uploadFile(prepared);
        if (res?.url) {
          uploadedUrls.push(res.url);
        }
      }
      if (uploadedUrls.length > 0) {
        if (side === 'front') {
          setFrontImages(prev => [...prev, ...uploadedUrls]);
        } else {
          setBackImages(prev => [...prev, ...uploadedUrls]);
        }
      }
    } catch (err) {
      console.error(`Failed to upload ${side} image(s)`, err);
      setValidationError("Impossible de téléverser l'image. Vérifiez votre connexion et réessayez.");
    } finally {
      if (side === 'front') {
        setUploadingFrontCount(c => Math.max(0, c - imageFiles.length));
      } else {
        setUploadingBackCount(c => Math.max(0, c - imageFiles.length));
      }
    }
  };

  const handlePasteImages = (e: React.ClipboardEvent, side: 'front' | 'back') => {
    const items = Array.from(e.clipboardData?.items || []);
    const pastedFiles: File[] = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) pastedFiles.push(f);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      void uploadImagesForSide(pastedFiles, side);
    }
  };

  const handleDropImages = (e: React.DragEvent, side: 'front' | 'back') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSide(null);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      void uploadImagesForSide(files, side);
    }
  };

  const removeImage = (side: 'front' | 'back', indexToRemove: number) => {
    if (side === 'front') {
      setFrontImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    } else {
      setBackImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const isUploadingAny = uploadingFrontCount > 0 || uploadingBackCount > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasFrontContent = front.trim().length > 0 || frontImages.length > 0;
    const hasBackContent = back.trim().length > 0 || backImages.length > 0;

    if (!hasFrontContent || !hasBackContent) {
      setValidationError(
        'Veuillez renseigner un texte ou au moins une photo au Recto ET au Verso.'
      );
      return;
    }

    const course = courses.find(c => c.id === selectedCourseId);
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const ueCode = course?.ueCode || (selectedUe !== 'ALL' ? selectedUe : 'UE');
    const ueId = course?.ueId || (selectedUe !== 'ALL' ? selectedUe.toLowerCase() : 'ue1');
    const courseTitle = course?.title || (editingFlashcard?.courseTitle || 'Cours PASS');

    // Remove old UE tag if it exists and changed
    const cleanTags = tags.filter(t => 
      t.toLowerCase() !== editingFlashcard?.ueCode?.toLowerCase() &&
      t.toLowerCase() !== editingFlashcard?.ueId?.toLowerCase()
    );
    if (ueCode && !cleanTags.includes(ueCode)) {
      cleanTags.unshift(ueCode);
    }

    setIsSaving(true);
    setValidationError(null);
    try {
      const payload: Partial<Flashcard> = {
        id: editingFlashcard ? editingFlashcard.id : undefined,
        courseId: course ? course.id : (selectedCourseId || 'course-general'),
        courseTitle: courseTitle,
        ueCode: ueCode,
        ueId: ueId,
        front: front.trim(),
        back: back.trim(),
        frontImages,
        backImages,
        hint: hint.trim() ? hint.trim() : undefined,
        difficulty,
        isFavorite,
        tags: cleanTags
      };

      await onSave(payload);
      if (!editingFlashcard) {
        const savedCourseId = course ? course.id : selectedCourseId;
        const savedUeCode = resolveSubjectCode(course, selectedUe !== 'ALL' ? selectedUe : ueCode);
        saveLastFlashcardContext(savedUeCode, savedCourseId);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save flashcard', err);
      setValidationError('Erreur lors de la sauvegarde de la flashcard.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingFlashcard ? 'Modifier la Flashcard' : 'Créer une Flashcard Médicale'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Mémorisation active (Active Recall) avec formules LaTeX et indices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSave}
          onPaste={(e) => handlePasteImages(e, lastActiveSide)}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}
          
          {/* UE & Course Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${formId}-ue`}
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Unité d'Enseignement (UE)
              </label>
              <select
                id={`${formId}-ue`}
                name="ueCode"
                value={selectedUe}
                onChange={(e) => handleUeChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 shadow-2xs"
              >
                <option value="ALL">Toutes les UEs</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={`${formId}-course`}
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Cours rattaché <span className="text-rose-500">*</span>
              </label>
              <select
                id={`${formId}-course`}
                name="courseId"
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 truncate shadow-2xs"
                required={availableCourses.length > 0}
              >
                {availableCourses.length === 0 ? (
                  <option value="">Cours général PASS (aucun cours disponible)</option>
                ) : (
                  availableCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.ueCode}] {c.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Recto / Face Visible (Question) */}
          <div
            onClick={() => setLastActiveSide('front')}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverSide !== 'front') setDragOverSide('front');
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverSide(prev => (prev === 'front' ? null : prev));
              }
            }}
            onDrop={(e) => handleDropImages(e, 'front')}
            className={`rounded-2xl p-3.5 border transition-all space-y-2.5 ${
              dragOverSide === 'front'
                ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50/60 dark:bg-amber-950/30'
                : 'border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-950/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={`${formId}-front`}
                className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5"
              >
                <span>Face Recto (Question / Schéma muet)</span>
                {frontImages.length === 0 && <span className="text-rose-500">*</span>}
              </label>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">
                  LaTeX ($...$) • Coller (⌘V) ou glisser
                </span>
                <input
                  ref={frontFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      void uploadImagesForSide(files, 'front');
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setLastActiveSide('front');
                    frontFileInputRef.current?.click();
                  }}
                  aria-label="Ajouter photo(s) au recto"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ajouter photo(s)</span>
                </button>
              </div>
            </div>

            <textarea
              id={`${formId}-front`}
              name="front"
              value={front}
              onFocus={() => setLastActiveSide('front')}
              onPaste={(e) => handlePasteImages(e, 'front')}
              onChange={(e) => {
                setFront(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={
                frontImages.length > 0
                  ? 'Question optionnelle (une ou plusieurs photos sont déjà rattachées au Recto)...'
                  : "Ex: Quelle est cette structure anatomique ? (Vous pouvez aussi coller ⌘V ou glisser une photo sans texte)"
              }
              rows={frontImages.length > 0 && !front ? 2 : 3}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed resize-y font-sans shadow-2xs"
              required={frontImages.length === 0}
            />

            {(frontImages.length > 0 || uploadingFrontCount > 0) && (
              <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                {frontImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="relative group rounded-xl overflow-hidden border border-amber-300 dark:border-amber-500/40 bg-slate-900/80 shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState({
                          images: frontImages,
                          index: idx,
                          sideLabel: 'Recto (Question)'
                        })
                      }
                      aria-label={`Agrandir la photo ${idx + 1} du recto`}
                      className="block relative cursor-zoom-in"
                    >
                      <img
                        src={imgUrl}
                        alt={`Photo ${idx + 1} du recto`}
                        className="h-20 w-24 object-cover"
                      />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white drop-shadow" aria-hidden="true" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage('front', idx)}
                      aria-label={`Retirer la photo ${idx + 1} du recto`}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/85 hover:bg-rose-600 text-white border border-white/20 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {uploadingFrontCount > 0 && (
                  <div className="h-20 px-3 rounded-xl border border-dashed border-amber-400/60 bg-amber-500/5 flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Téléversement ({uploadingFrontCount})...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verso / Face Cachée (Réponse) */}
          <div
            onClick={() => setLastActiveSide('back')}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverSide !== 'back') setDragOverSide('back');
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverSide(prev => (prev === 'back' ? null : prev));
              }
            }}
            onDrop={(e) => handleDropImages(e, 'back')}
            className={`rounded-2xl p-3.5 border transition-all space-y-2.5 ${
              dragOverSide === 'back'
                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-950/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={`${formId}-back`}
                className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"
              >
                <span>Face Verso (Réponse / Schéma légendé)</span>
                {backImages.length === 0 && <span className="text-rose-500">*</span>}
              </label>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">
                  1-2 phrases max • Coller (⌘V) ou glisser
                </span>
                <input
                  ref={backFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      void uploadImagesForSide(files, 'back');
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setLastActiveSide('back');
                    backFileInputRef.current?.click();
                  }}
                  aria-label="Ajouter photo(s) au verso"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ajouter photo(s)</span>
                </button>
              </div>
            </div>

            <textarea
              id={`${formId}-back`}
              name="back"
              value={back}
              onFocus={() => setLastActiveSide('back')}
              onPaste={(e) => handlePasteImages(e, 'back')}
              onChange={(e) => {
                setBack(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={
                backImages.length > 0
                  ? 'Explication optionnelle (une ou plusieurs photos sont déjà rattachées au Verso)...'
                  : 'Ex: Cl_tot = Dose / AUC, ou collez (⌘V) le schéma corrigé / légendé...'
              }
              rows={backImages.length > 0 && !back ? 2 : 3}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y font-sans shadow-2xs"
              required={backImages.length === 0}
            />

            {(backImages.length > 0 || uploadingBackCount > 0) && (
              <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                {backImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="relative group rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-500/40 bg-slate-900/80 shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxState({
                          images: backImages,
                          index: idx,
                          sideLabel: 'Verso (Réponse)'
                        })
                      }
                      aria-label={`Agrandir la photo ${idx + 1} du verso`}
                      className="block relative cursor-zoom-in"
                    >
                      <img
                        src={imgUrl}
                        alt={`Photo ${idx + 1} du verso`}
                        className="h-20 w-24 object-cover"
                      />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white drop-shadow" aria-hidden="true" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage('back', idx)}
                      aria-label={`Retirer la photo ${idx + 1} du verso`}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/85 hover:bg-rose-600 text-white border border-white/20 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {uploadingBackCount > 0 && (
                  <div className="h-20 px-3 rounded-xl border border-dashed border-emerald-400/60 bg-emerald-500/5 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Téléversement ({uploadingBackCount})...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indice de Mémorisation (Hint) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`${formId}-hint`}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Indice de rappel (Optionnel)</span>
              </label>
              <span className="text-[11px] text-slate-500">Amorce ou début de formule (dévoilable au clic)</span>
            </div>
            <input
              id={`${formId}-hint`}
              name="hint"
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Ex: Pensez au rapport Dose * F sur AUC, ou : 3 muscles fléchisseurs..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 shadow-2xs"
            />
          </div>

          {/* Options : Difficulté, Favori ⭐, Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            {/* Difficulty */}
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Niveau de difficulté
              </span>
              <div className="flex items-center gap-1 pt-1" role="group" aria-label="Niveau de difficulté">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDifficulty(star)}
                    aria-label={`Difficulté ${star} sur 5`}
                    aria-pressed={star === difficulty}
                    className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= difficulty
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite toggle ⭐ */}
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Favori ⭐
              </span>
              <button
                type="button"
                aria-pressed={isFavorite}
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  isFavorite
                    ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-400 font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                <span>{isFavorite ? 'Marquée en favori' : 'Non marquée'}</span>
              </button>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor={`${formId}-tags`}
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Mots-clés / Tags
              </label>
              <input
                id={`${formId}-tags`}
                name="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: Formule, Nerf, Clés"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingAny}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isUploadingAny
                  ? 'Téléversement photo...'
                  : isSaving
                  ? 'Enregistrement...'
                  : editingFlashcard
                  ? 'Mettre à jour'
                  : 'Enregistrer la Flashcard'}
              </span>
            </button>
          </div>
        </form>

        <FlashcardImageLightbox
          images={lightboxState?.images || []}
          initialIndex={lightboxState?.index || 0}
          sideLabel={lightboxState?.sideLabel}
          isOpen={lightboxState !== null}
          onClose={() => setLightboxState(null)}
        />
      </div>
    </div>
  );
};
