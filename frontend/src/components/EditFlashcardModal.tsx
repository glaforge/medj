import React, { useState, useEffect, useId } from 'react';
import { Course, SubjectUE, Flashcard } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  Save,
  Star,
  Lightbulb,
  Layers
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
  useEscapeKey(isOpen, onClose);
  const formId = useId();

  const [selectedUe, setSelectedUe] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

    if (editingFlashcard) {
      setSelectedCourseId(editingFlashcard.courseId || '');
      const foundCourse = courses.find(c => c.id === editingFlashcard.courseId);
      setSelectedUe(resolveSubjectCode(foundCourse, editingFlashcard.ueCode));
      setFront(editingFlashcard.front || '');
      setBack(editingFlashcard.back || '');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      alert('Veuillez renseigner au moins la question au Recto et la réponse au Verso.');
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
    try {
      const payload: Partial<Flashcard> = {
        id: editingFlashcard ? editingFlashcard.id : undefined,
        courseId: course ? course.id : (selectedCourseId || 'course-general'),
        courseTitle: courseTitle,
        ueCode: ueCode,
        ueId: ueId,
        front: front.trim(),
        back: back.trim(),
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
      alert('Erreur lors de la sauvegarde de la flashcard.');
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
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`${formId}-front`}
                className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5"
              >
                <span>Face Recto (Question simple & ciblée)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">1 seule notion clé • LaTeX ($...$)</span>
            </div>
            <textarea
              id={`${formId}-front`}
              name="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Ex: Quelle est la formule de la clairance corporelle totale ? Ou : Quel transporteur assure l'entrée du glucose dans les érythrocytes ?"
              rows={3}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed resize-y font-sans shadow-2xs"
              required
            />
          </div>

          {/* Verso / Face Cachée (Réponse) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`${formId}-back`}
                className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"
              >
                <span>Face Verso (Réponse succincte & directe)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">1 à 2 phrases max, formule directe</span>
            </div>
            <textarea
              id={`${formId}-back`}
              name="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Ex: Cl_tot = Dose / AUC. Volume virtuel de plasma totalement épuré d'une substance par unité de temps."
              rows={3}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y font-sans shadow-2xs"
              required
            />
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
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : (editingFlashcard ? 'Mettre à jour' : 'Enregistrer la Flashcard')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
