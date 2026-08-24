import React, { useState, useEffect } from 'react';
import { RevisionSession } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatDate } from '../utils/dateUtils';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  X,
  Trash2,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface DeleteRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RevisionSession | null;
  onConfirmDelete: (sessionId: string, deleteFollowing: boolean) => Promise<void>;
}

export const DeleteRevisionModal: React.FC<DeleteRevisionModalProps> = ({
  isOpen,
  onClose,
  session,
  onConfirmDelete
}) => {
  useEscapeKey(isOpen, onClose);

  const [deleteFollowing, setDeleteFollowing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeleteFollowing(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const formattedDate = formatDate(session.scheduledDate, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const sessionColor = session.ueColor || '#0284c7';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      await onConfirmDelete(session.id, deleteFollowing);
      onClose();
    } catch (err) {
      console.error('Failed to delete revision session', err);
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
                Supprimer une séance de révision
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Gérer la suppression unitaire ou l'arrêt des révisions futures
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
        <form id="delete-revision-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {/* Target Session Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800 text-xs">
                  J{session.jStep}
                </span>
                <span
                  className="font-bold px-2 py-0.5 rounded text-[10px] shadow-2xs"
                  style={{
                    backgroundColor: sessionColor,
                    color: getContrastTextColor(sessionColor)
                  }}
                >
                  {session.ueCode}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 capitalize">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {session.courseTitle}
            </div>
          </div>

          {/* Options Selection */}
          <div className="space-y-3">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Que souhaitez-vous supprimer ?
            </label>

            {/* Option 1: Delete only this session (Default) */}
            <label
              onClick={() => setDeleteFollowing(false)}
              className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                !deleteFollowing
                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-xs ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    !deleteFollowing
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {!deleteFollowing && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Supprimer uniquement cette séance</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Par défaut
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Seule la séance du {formattedDate} sera retirée. Les révisions programmées les dimanches suivants resteront actives dans votre planning.
                </p>
              </div>
            </label>

            {/* Option 2: Delete this session and all following sessions */}
            <label
              onClick={() => setDeleteFollowing(true)}
              className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                deleteFollowing
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-xs ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    deleteFollowing
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {deleteFollowing && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className={deleteFollowing ? 'text-rose-700 dark:text-rose-300' : ''}>
                    Supprimer cette séance et toutes les révisions suivantes
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Toutes les révisions du dimanche programmées à partir du {formattedDate} jusqu'à la fin du semestre seront supprimées pour ce cours (idéal lorsque le cours est désormais maîtrisé).
                </p>
              </div>
            </label>
          </div>

          {deleteFollowing && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Les séances antérieures validées ou effectuées avant le {formattedDate} seront quant à elles conservées dans votre historique.
              </span>
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="delete-revision-form"
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Suppression en cours...' : deleteFollowing ? 'Supprimer toutes les séances futures' : 'Supprimer cette séance'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
