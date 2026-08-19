import React, { useState, useEffect } from 'react';
import { Course, SubjectUE, QcmQuestion, QcmItem } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Tag,
  Save,
  HelpCircle
} from 'lucide-react';

interface EditQcmModalProps {
  isOpen: boolean;
  onClose: () => void;
  qcm?: QcmQuestion | null;
  courses: Course[];
  subjects: SubjectUE[];
  initialCourseId?: string;
  onQcmSaved: (savedQcm: QcmQuestion) => void;
}

const DEFAULT_ITEMS: QcmItem[] = [
  { itemLetter: 'A', text: '', isTrue: true, explanation: '', isTrap: false, trapDetails: '' },
  { itemLetter: 'B', text: '', isTrue: false, explanation: '', isTrap: false, trapDetails: '' },
  { itemLetter: 'C', text: '', isTrue: true, explanation: '', isTrap: false, trapDetails: '' },
  { itemLetter: 'D', text: '', isTrue: false, explanation: '', isTrap: false, trapDetails: '' },
  { itemLetter: 'E', text: '', isTrue: true, explanation: '', isTrap: false, trapDetails: '' },
];

export const EditQcmModal: React.FC<EditQcmModalProps> = ({
  isOpen,
  onClose,
  qcm,
  courses,
  subjects,
  initialCourseId,
  onQcmSaved
}) => {
  useEscapeKey(isOpen, onClose);

  const isEditing = !!qcm?.id;

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [questionStem, setQuestionStem] = useState<string>('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [items, setItems] = useState<QcmItem[]>(DEFAULT_ITEMS);
  const [mnemonic, setMnemonic] = useState<string>('');
  const [tagsStr, setTagsStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (qcm) {
        setSelectedCourseId(qcm.courseId || '');
        setQuestionStem(qcm.questionStem || '');
        setDifficulty(qcm.difficulty || 3);
        
        if (qcm.items && qcm.items.length === 5) {
          setItems(qcm.items);
        } else {
          // Normalize to 5 items A-E
          const letters: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
          const normalized: QcmItem[] = letters.map((letter, idx) => {
            const existing = qcm.items?.find(it => it.itemLetter === letter) || qcm.items?.[idx];
            if (existing) {
              return {
                itemLetter: letter,
                text: existing.text,
                isTrue: existing.isTrue,
                explanation: existing.explanation,
                isTrap: existing.isTrap,
                trapDetails: existing.trapDetails
              };
            }
            return { itemLetter: letter, text: '', isTrue: false, explanation: '', isTrap: false, trapDetails: '' };
          });
          setItems(normalized);
        }

        setMnemonic(qcm.mnemonics?.[0] || '');
        setTagsStr(qcm.tags?.join(', ') || '');
      } else {
        // Creation mode
        const defaultCourse = initialCourseId ? courses.find(c => c.id === initialCourseId) : (courses[0] || null);
        setSelectedCourseId(defaultCourse?.id || '');
        setQuestionStem('');
        setDifficulty(3);
        setItems(DEFAULT_ITEMS.map(it => ({ ...it })));
        setMnemonic('');
        setTagsStr('');
      }
    }
  }, [isOpen, qcm, initialCourseId, courses]);

  if (!isOpen) return null;

  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const currentSubject = subjects.find(s => s.id === currentCourse?.ueId || s.code === currentCourse?.ueCode);
  const courseColor = currentCourse?.color || currentSubject?.color || '#0284c7';

  const handleItemChange = (index: number, field: keyof QcmItem, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!questionStem.trim()) {
      setErrorMessage("L'énoncé de la question est obligatoire.");
      return;
    }

    const hasEmptyItem = items.some(it => !it.text.trim());
    if (hasEmptyItem) {
      setErrorMessage("Toutes les 5 propositions (A à E) doivent être renseignées.");
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedTags = tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const qcmPayload: Partial<QcmQuestion> = {
        courseId: currentCourse?.id || 'course-general',
        courseTitle: currentCourse?.title || 'Cours PASS',
        ueCode: currentCourse?.ueCode || 'UE',
        questionStem: questionStem.trim(),
        difficulty,
        items,
        tags: parsedTags.length > 0 ? parsedTags : [currentCourse?.ueCode || 'UE'],
        mnemonics: mnemonic.trim() ? [mnemonic.trim()] : []
      };

      let saved: QcmQuestion;
      if (isEditing && qcm?.id) {
        saved = await api.updateQcm(qcm.id, qcmPayload);
      } else {
        saved = await api.createCustomQcm(qcmPayload);
      }

      onQcmSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('Failed to save QCM', err);
      setErrorMessage(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-sky-950/40">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Award className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isEditing ? 'Modifier le QCM' : 'Créer un Nouveau QCM'}
              </h2>
              <p className="text-xs text-slate-400">
                Format officiel PASS : 5 items A-E, statuts Vrai/Faux indépendants et pièges
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Course assignment & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Cours rattaché</span>
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Contexte général PASS --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.ueCode}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Difficulté ({difficulty}/5)</span>
                <span className="text-amber-400 font-mono">
                  {'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full accent-sky-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Question Stem */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Énoncé du QCM (Question)</span>
            </label>
            <textarea
              rows={2}
              value={questionStem}
              onChange={(e) => setQuestionStem(e.target.value)}
              placeholder="Ex: Concernant l'organisation anatomique du plexus brachial et ses loges musculaires, quelles sont les propositions exactes ?"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
            />
          </div>

          {/* Section: 5 Items A-E */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Propositions A à E (VRAI / FAUX)
              </span>
              <span className="text-[11px] text-slate-400">
                {items.filter(it => it.isTrue).length} Vraie(s) • {items.filter(it => !it.isTrue).length} Fausse(s)
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.itemLetter}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    item.isTrue
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-rose-950/15 border-rose-500/30'
                  }`}
                >
                  {/* Top line: Letter, Text, Vrai/Faux Switch */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 font-mono font-extrabold text-xs text-sky-400 flex items-center justify-center shrink-0">
                      {item.itemLetter}
                    </span>

                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleItemChange(idx, 'text', e.target.value)}
                      placeholder={`Texte de la proposition ${item.itemLetter}...`}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-medium"
                    />

                    {/* VRAI / FAUX Toggle */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, 'isTrue', true)}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                          item.isTrue
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        VRAI
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, 'isTrue', false)}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                          !item.isTrue
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        FAUX
                      </button>
                    </div>
                  </div>

                  {/* Bottom line: Explanation & Trap toggle */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1 border-t border-slate-800/40">
                    <input
                      type="text"
                      value={item.explanation || ''}
                      onChange={(e) => handleItemChange(idx, 'explanation', e.target.value)}
                      placeholder="Justification / explication de la correction..."
                      className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />

                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300 font-medium shrink-0 select-none">
                      <input
                        type="checkbox"
                        checked={item.isTrap || false}
                        onChange={(e) => handleItemChange(idx, 'isTrap', e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Piège de concours</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Mnemonic & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Moyen mnémotechnique (optionnel)</span>
              </label>
              <input
                type="text"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="Ex: R.A. = Radial et Axillaire (faisceau postérieur)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>Tags / Mots-clés (séparés par des virgules)</span>
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Ex: Plexus, Innervation, Bras"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-950/40 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : isEditing ? 'Sauvegarder les modifications' : 'Créer le QCM'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default EditQcmModal;
