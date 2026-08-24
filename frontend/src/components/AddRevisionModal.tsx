import React, { useState, useEffect } from 'react';
import { Course, SubjectUE, RevisionSession } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { CourseCombobox } from './CourseCombobox';
import { formatDate, getLocalTodayString } from '../utils/dateUtils';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  X,
  CalendarPlus,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface AddRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  subjects: SubjectUE[];
  initialCourseId?: string;
  initialDate?: string;
  onRevisionAdded: (session: RevisionSession) => void;
}

export const AddRevisionModal: React.FC<AddRevisionModalProps> = ({
  isOpen,
  onClose,
  courses,
  subjects,
  initialCourseId,
  initialDate,
  onRevisionAdded
}) => {
  useEscapeKey(isOpen, onClose);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || (courses[0]?.id || '')
  );
  const [mode, setMode] = useState<'step' | 'date'>('step');
  const [jStepInput, setJStepInput] = useState<number>(90);
  const [customDate, setCustomDate] = useState<string>(
    initialDate || getLocalTodayString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [initialCourseId, courses]);

  useEffect(() => {
    if (initialDate) {
      setCustomDate(initialDate);
      setMode('date');
    }
  }, [initialDate]);

  if (!isOpen) return null;

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const subject = selectedCourse
    ? subjects.find(
        s => s.id.toLowerCase() === selectedCourse.ueId.toLowerCase() ||
             s.code.toLowerCase() === selectedCourse.ueId.toLowerCase()
      )
    : undefined;

  const courseColor = selectedCourse?.color || subject?.color || '#0284c7';

  // Calculate dates and steps
  const taughtDateStr = selectedCourse?.taughtDate || getLocalTodayString();
  const taughtDate = new Date(taughtDateStr + 'T00:00:00');

  const SUGGESTED_J_STEPS = [15, 45, 90, 120, 180, 365];

  // If in step mode, compute date
  const computeDateFromStep = (step: number): string => {
    const d = new Date(taughtDate);
    d.setDate(d.getDate() + step);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // If in date mode, compute step
  const computeStepFromDate = (dateStr: string): number => {
    const target = new Date(dateStr + 'T00:00:00');
    const diffTime = target.getTime() - taughtDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const finalDateStr = mode === 'step' ? computeDateFromStep(jStepInput) : customDate;
  const finalJStep = mode === 'step' ? jStepInput : computeStepFromDate(customDate);

  const formattedFinalDate = formatDate(finalDateStr, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setErrorMessage('Veuillez sélectionner un cours.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await api.createRevisionSession(
        selectedCourse.id,
        finalJStep,
        finalDateStr
      );
      onRevisionAdded(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create revision session', err);
      setErrorMessage('Une erreur est survenue lors de la création de la séance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">Planifier un nouveau J</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Ajouter une séance de révision supplémentaire</p>
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
        <form id="add-revision-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Course Selection */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>Cours à réviser :</span>
              {selectedCourse && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  J0 dispensé le {taughtDateStr}
                </span>
              )}
            </label>
            <div className="relative">
              <CourseCombobox
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelectCourse={(id) => setSelectedCourseId(id)}
                placeholder="Rechercher par UE, titre ou professeur..."
                allowClear={false}
                fullWidth={true}
                dropdownPlacement="left"
              />
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">Mode de planification :</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMode('step')}
                className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'step'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Par étape J (ex: J+90)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('date')}
                className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'date'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Par date calendrier</span>
              </button>
            </div>
          </div>

          {/* Mode STEP Controls */}
          {mode === 'step' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Nombre de jours après le cours (J+) :
              </label>

              {/* Quick suggestions */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {SUGGESTED_J_STEPS.map(step => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setJStepInput(step)}
                    className={`py-1.5 rounded-lg font-mono font-bold text-xs border transition-all cursor-pointer ${
                      jStepInput === step
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    J{step}
                  </button>
                ))}
              </div>

              {/* Custom number input */}
              <div className="pt-2 flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Ou valeur libre :</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-sky-500">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">J +</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={jStepInput}
                    onChange={(e) => setJStepInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 bg-transparent text-slate-900 dark:text-white font-mono font-bold focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode DATE Controls */}
          {mode === 'date' && (
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Choisir la date de révision dans le calendrier :
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Dynamic Summary Preview Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 dark:from-sky-950/40 via-indigo-50 dark:via-indigo-950/40 to-slate-50 dark:to-slate-900/40 border border-sky-200 dark:border-sky-800/40 flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono font-extrabold shadow-md shrink-0"
              style={{
                backgroundColor: courseColor,
                color: getContrastTextColor(courseColor)
              }}
            >
              <span className="text-[10px] leading-none opacity-80">RÉV</span>
              <span className="text-sm leading-none">J{finalJStep}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                Séance planifiée le :
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white capitalize truncate">
                {formattedFinalDate}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Calculé à partir du J0 ({taughtDateStr})
              </div>
            </div>
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
            form="add-revision-form"
            disabled={isSubmitting || !selectedCourse}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-950/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Planification...' : `Ajouter la révision J${finalJStep}`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
