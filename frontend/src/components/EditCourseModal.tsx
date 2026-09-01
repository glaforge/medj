import React, { useState, useEffect } from 'react';
import { SubjectUE, Course } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  X,
  BookOpen,
  Calendar,
  Save,
  Tag,
  FileText,
  User,
  Star,
  Sparkles,
  AlertTriangle,
  Info
} from 'lucide-react';

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  subjects: SubjectUE[];
  onCourseSaved: (savedCourse: Course) => void;
}

const DIFFICULTY_LABELS: Record<number, { title: string; desc: string }> = {
  1: { title: '1 - Facile', desc: 'Notions de base, apprentissage rapide' },
  2: { title: '2 - Simple', desc: 'Cours accessible, peu de pièges' },
  3: { title: '3 - Moyen', desc: 'Volume standard, équilibré' },
  4: { title: '4 - Difficile', desc: 'Dense, nombreuses formules ou détails d\'anatomie' },
  5: { title: '5 - Très lourd', desc: 'Ultra-prioritaire concours, fort risque d\'oubli' }
};

export const EditCourseModal: React.FC<EditCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  subjects,
  onCourseSaved
}) => {
  useEscapeKey(isOpen, onClose);

  const [ueId, setUeId] = useState('');
  const [title, setTitle] = useState('');
  const [professor, setProfessor] = useState('');
  const [taughtDate, setTaughtDate] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && course) {
      setErrorMessage(null);
      setUeId(course.ueId || (subjects[0]?.id ?? 'ue1'));
      setTitle(course.title || '');
      setProfessor(course.professor || '');
      setTaughtDate(course.taughtDate || '');
      setDifficulty(course.difficulty && course.difficulty >= 1 && course.difficulty <= 5 ? course.difficulty : 3);
      setTagsText(course.tags ? course.tags.join(', ') : '');
      setNotes(course.notes || '');
      setIsSubmitting(false);
    }
  }, [isOpen, course, subjects]);

  if (!isOpen || !course) return null;

  const selectedSubject = subjects.find(
    s => s.id.toLowerCase() === ueId.toLowerCase() || s.code.toLowerCase() === ueId.toLowerCase()
  ) || subjects[0];
  const ueColor = selectedSubject?.color || course.color || '#0284c7';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Le titre du cours est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const tags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload: Partial<Course> = {
        title: title.trim(),
        ueId: selectedSubject?.id || ueId,
        ueCode: selectedSubject?.code || course.ueCode || 'UE',
        color: ueColor,
        professor: professor.trim(),
        taughtDate: taughtDate.trim() || course.taughtDate,
        difficulty,
        tags,
        notes: notes.trim(),
      };

      const updated = await api.updateCourse(course.id, payload);
      onCourseSaved(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update course', err);
      setErrorMessage(err.message || 'Erreur lors de la modification du cours.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shadow-sky-950/30 shrink-0 transition-colors"
              style={{
                backgroundColor: ueColor,
                color: getContrastTextColor(ueColor)
              }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                Modifier la fiche du cours
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Ajustez le titre, l'UE, la date $J_0$, la difficulté et les notes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-course-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* UE & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Matière / UE :</label>
              {subjects.length > 0 ? (
                <select
                  value={ueId}
                  onChange={(e) => setUeId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={course.ueCode || 'UE'}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-500"
                />
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>Date du cours dispensé (J0) :</span>
              </label>
              <input
                type="date"
                value={taughtDate}
                onChange={(e) => setTaughtDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Titre complet du cours : *</label>
            <input
              type="text"
              placeholder="ex: Ostéologie du Membre Inférieur, Bioénergétique mitochondriale..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          {/* Professor */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-500" />
              <span>Enseignant / Professeur :</span>
            </label>
            <input
              type="text"
              placeholder="ex: Pr. Martin, Dr. Dubois"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Difficulty (1 to 5) with Visual Stars & Pedagogical Explanation */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Niveau de difficulté du cours (1 à 5) :</span>
              </label>
              <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                {DIFFICULTY_LABELS[difficulty]?.title}
              </span>
            </div>

            {/* Interactive Rating Buttons */}
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map(lvl => {
                const isSelected = difficulty === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/20 scale-[1.02]'
                        : 'bg-white/80 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{lvl}</span>
                    <span className="text-[10px] opacity-80">
                      {'★'.repeat(lvl)}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-tight">
              {DIFFICULTY_LABELS[difficulty]?.desc}
            </p>

            <div className="pt-2 border-t border-amber-500/20 flex items-start gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Impact sur le lissage de charge :</strong> Les cours de difficulté 4 et 5 sont <em>protégés en priorité</em> pour conserver leur date de révision optimale lors des journées surchargées.
              </span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-sky-500" />
              <span>Mots-clés / Tags (séparés par des virgules) :</span>
            </label>
            <input
              type="text"
              placeholder="ex: Concours, Par coeur, Formules, Vascularisation"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>Synthèse / Notes du cours :</span>
            </label>
            <textarea
              rows={4}
              placeholder="Points importants à retenir, formules ou astuces..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none shadow-inner"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="edit-course-form"
            disabled={!title.trim() || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default EditCourseModal;
