import React, { useState, useEffect } from 'react';
import { SubjectUE, Course } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getLocalTodayString } from '../utils/dateUtils';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  X,
  Zap,
  BookOpen,
  Calendar,
  Sparkles,
  Tag,
  FileText
} from 'lucide-react';

interface NewCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectUE[];
  initialUeId?: string;
  onCourseCreated: (course: Course) => void;
}

export const NewCourseModal: React.FC<NewCourseModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialUeId,
  onCourseCreated
}) => {
  useEscapeKey(isOpen, onClose);

  const [ueId, setUeId] = useState(subjects[0]?.id || 'ue1');
  const [quickUeCode, setQuickUeCode] = useState('UE1');
  const [quickUeName, setQuickUeName] = useState('Matière Principale');
  const [title, setTitle] = useState('');
  const [professor, setProfessor] = useState('');
  const [taughtDate, setTaughtDate] = useState(getLocalTodayString());
  const [difficulty, setDifficulty] = useState(3);
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let targetSubject: SubjectUE | undefined;
      if (initialUeId) {
        targetSubject = subjects.find(
          s => s.id.toLowerCase() === initialUeId.toLowerCase() ||
               s.code.toLowerCase() === initialUeId.toLowerCase()
        );
      }
      if (!targetSubject && subjects.length > 0) {
        targetSubject = subjects[0];
      }

      if (targetSubject) {
        setUeId(targetSubject.id);
      } else {
        setUeId('ue1');
      }
      setTitle('');
      setProfessor('');
      setTaughtDate(getLocalTodayString());
      setDifficulty(3);
      setTagsText('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialUeId, subjects]);

  if (!isOpen) return null;

  const selectedSubject = subjects.find(s => s.id === ueId) || subjects[0];
  const ueColor = selectedSubject?.color || '#0284c7';

  const handleUeChange = (newUeId: string) => {
    setUeId(newUeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);

      let finalUeId = selectedSubject?.id;
      let finalUeCode = selectedSubject?.code;

      if (!selectedSubject) {
        // Create new UE on the fly if subjects list is empty
        const createdUe = await api.createSubject({
          code: quickUeCode.trim().toUpperCase() || 'UE1',
          name: quickUeName.trim() || 'Matière Principale',
          color: '#0284c7',
          coefficient: 10,
          customIntervals: []
        });
        finalUeId = createdUe.id;
        finalUeCode = createdUe.code;
      }

      const newCourse = await api.createCourse({
        ueId: finalUeId,
        ueCode: finalUeCode,
        title,
        color: ueColor,
        professor,
        taughtDate,
        difficulty,
        status: 'EN_COURS',
        tags,
        notes,
        customIntervals: []
      });

      onCourseCreated(newCourse);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shadow-sky-950/30 shrink-0 transition-colors"
              style={{
                backgroundColor: ueColor,
                color: getContrastTextColor(ueColor)
              }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">Ajouter un Cours Appris (J0)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Génération automatique des cycles de révision espacée</p>
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
        <form id="new-course-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          
          {/* UE & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Matière / UE :</label>
              {subjects.length > 0 ? (
                <select
                  value={ueId}
                  onChange={(e) => handleUeChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Code UE (ex: UE1, MINEURE)"
                    value={quickUeCode}
                    onChange={(e) => setQuickUeCode(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500 font-semibold uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Nom de la matière (ex: Anatomie)"
                    value={quickUeName}
                    onChange={(e) => setQuickUeName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Date du cours dispensé (J0) :</label>
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

          {/* Professor & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Enseignant / Professeur :</label>
              <input
                type="text"
                placeholder="ex: Pr. Martin"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Difficulté estimée (1 à 5) :</label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mots-clés / Tags (séparés par des virgules) :</label>
            <input
              type="text"
              placeholder="ex: Concours, Par coeur, Formules, Vascularisation"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Programme de révision automatique */}
          <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/50 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-bold text-xs text-sky-900 dark:text-sky-200">
                Méthode des J personnalisée (Automatique)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 block text-xs">J0</span>
                <span className="text-[10px] text-slate-500 font-medium">Jour même</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 block text-xs">J1</span>
                <span className="text-[10px] text-slate-500 font-medium">Lendemain</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">Samedi</span>
                <span className="text-[10px] text-slate-500 font-medium">Suivant J1</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">Dimanches</span>
                <span className="text-[10px] text-slate-500 font-medium">Jusqu'à fin sem.</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Toutes les séances de révision sont planifiées automatiquement chaque dimanche jusqu'au 31 décembre (S1) ou 31 mai (S2).
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Résumé / Points clés initiaux :</label>
            <textarea
              rows={3}
              placeholder="Points importants à retenir, formules ou astuces..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none shadow-inner"
            />
          </div>

        </form>

        {/* Fixed Footer */}
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
            form="new-course-form"
            disabled={!title.trim() || isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Création en cours...' : 'Créer le cours & planifier les J'}
          </button>
        </div>

      </div>
    </div>
  );
};

