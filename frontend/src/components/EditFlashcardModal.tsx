import React, { useState, useEffect } from 'react';
import { Course, SubjectUE, Flashcard } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  Sparkles,
  Save,
  Star,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Tag,
  Layers
} from 'lucide-react';

interface EditFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flashcard: Partial<Flashcard>) => Promise<void>;
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

  const [selectedUe, setSelectedUe] = useState<string>('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingFlashcard) {
      setSelectedCourseId(editingFlashcard.courseId || '');
      const foundCourse = courses.find(c => c.id === editingFlashcard.courseId);
      if (foundCourse) {
        setSelectedUe(foundCourse.ueCode || 'ALL');
      } else if (editingFlashcard.ueCode) {
        setSelectedUe(editingFlashcard.ueCode);
      }
      setFront(editingFlashcard.front || '');
      setBack(editingFlashcard.back || '');
      setHint(editingFlashcard.hint || '');
      setDifficulty(editingFlashcard.difficulty || 3);
      setIsFavorite(editingFlashcard.isFavorite || false);
      setTagsInput((editingFlashcard.tags || []).join(', '));
    } else {
      const initialCourseId = defaultCourseId || (courses.length > 0 ? courses[0].id : '');
      setSelectedCourseId(initialCourseId);
      const initialCourse = courses.find(c => c.id === initialCourseId);
      setSelectedUe(initialCourse ? initialCourse.ueCode : (defaultUeCode || 'ALL'));
      setFront('');
      setBack('');
      setHint('');
      setDifficulty(3);
      setIsFavorite(false);
      setTagsInput('');
    }
  }, [editingFlashcard, defaultCourseId, defaultUeCode, courses, isOpen]);

  if (!isOpen) return null;

  const availableCourses = selectedUe === 'ALL'
    ? courses
    : courses.filter(c =>
        c.ueCode?.toLowerCase() === selectedUe.toLowerCase() ||
        c.ueId?.toLowerCase() === selectedUe.toLowerCase()
      );

  const handleUeChange = (newUe: string) => {
    setSelectedUe(newUe);
    if (newUe !== 'ALL') {
      const coursesForUe = courses.filter(
        c => c.ueCode?.toLowerCase() === newUe.toLowerCase() || c.ueId?.toLowerCase() === newUe.toLowerCase()
      );
      if (coursesForUe.length > 0) {
        setSelectedCourseId(coursesForUe[0].id);
      }
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
    if (!tags.includes(ueCode)) {
      tags.unshift(ueCode);
    }

    setIsSaving(true);
    try {
      const payload: Partial<Flashcard> = {
        id: editingFlashcard ? editingFlashcard.id : undefined,
        courseId: course ? course.id : (selectedCourseId || 'course-general'),
        courseTitle: course ? course.title : 'Cours PASS',
        ueCode: ueCode,
        ueId: course ? course.ueId : 'ue1',
        front: front.trim(),
        back: back.trim(),
        hint: hint.trim() ? hint.trim() : undefined,
        difficulty,
        isFavorite,
        tags
      };

      await onSave(payload);
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
            onClick={onClose}
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unité d'Enseignement (UE)
              </label>
              <select
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cours rattaché <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 truncate shadow-2xs"
                required
              >
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.ueCode}] {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recto / Face Visible (Question) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <span>Face Recto (Question / Concept clé)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Supporte Markdown et formules LaTeX ($...$)</span>
            </div>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Ex: Quelle est la formule de la clairance corporelle totale ? Ou : Quels sont les muscles innervés par le nerf musculocutané ?"
              rows={3}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed resize-none font-sans shadow-2xs"
              required
            />
          </div>

          {/* Verso / Face Cachée (Réponse) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <span>Face Verso (Réponse / Explication complète)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Explication rigoureuse et concise</span>
            </div>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Ex: Cl_tot = (Dose * F) / AUC. Volume virtuel de plasma totalement épuré d'un médicament par unité de temps..."
              rows={4}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none font-sans shadow-2xs"
              required
            />
          </div>

          {/* Indice de Mémorisation (Hint) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Indice de rappel (Optionnel)</span>
              </label>
              <span className="text-[11px] text-slate-500">Amorce ou début de formule (dévoilable au clic)</span>
            </div>
            <input
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Niveau de difficulté
              </label>
              <div className="flex items-center gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDifficulty(star)}
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Favori ⭐
              </label>
              <button
                type="button"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mots-clés / Tags
              </label>
              <input
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
