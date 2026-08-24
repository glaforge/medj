import React, { useState } from 'react';
import { Course, SubjectUE } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  X,
  Trash2,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface DeleteCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  subject?: SubjectUE;
  onConfirmDelete: (courseId: string) => Promise<void> | void;
}

export const DeleteCourseModal: React.FC<DeleteCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  subject,
  onConfirmDelete
}) => {
  useEscapeKey(isOpen, onClose);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !course) return null;

  const courseColor = course.color || subject?.color || '#0284c7';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      await onConfirmDelete(course.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete course', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                Supprimer le cours
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Confirmation de suppression définitive
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

        {/* Content Body */}
        <form id="delete-course-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {/* Target Course Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span
                className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shadow-2xs"
                style={{
                  backgroundColor: courseColor,
                  color: getContrastTextColor(courseColor)
                }}
              >
                {course.ueCode || subject?.code || 'UE'}
              </span>

              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Dispensé le {course.taughtDate}</span>
              </span>
            </div>

            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">
              {course.title}
            </h3>

            {course.professor && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enseignant : <span className="font-semibold text-slate-700 dark:text-slate-300">{course.professor}</span>
              </p>
            )}
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <div className="font-bold text-rose-700 dark:text-rose-300">
                Cette action est irréversible
              </div>
              <p className="text-[11px] leading-relaxed">
                Toutes les séances de révision planifiées (passées et futures), ainsi que les documents rattachés à ce cours seront supprimés de votre planning.
              </p>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="delete-course-form"
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement ce cours'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
