import React, { useState, useEffect } from 'react';
import { SubjectUE } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getContrastTextColor } from '../utils/colorUtils';
import { DeleteSubjectModal } from './DeleteSubjectModal';
import {
  X,
  BookOpen,
  Palette,
  Check,
  Clock,
  Layers,
  Save,
  Trash2,
  AlertTriangle,
  Atom,
  Dna,
  Activity,
  BarChart3,
  HeartPulse,
  Pill,
  Users,
  GraduationCap,
  Book,
  Stethoscope,
  Microscope,
  Brain,
  Zap,
  Shield,
  Sparkles
} from 'lucide-react';

interface EditSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: SubjectUE | null;
  coursesCount?: number;
  onSubjectSaved: (savedSubject: SubjectUE) => void;
  onDeleteSubject?: (subjectId: string) => Promise<void> | void;
}

const AVAILABLE_ICONS = [
  { name: 'Atom', label: 'Chimie', icon: Atom },
  { name: 'Dna', label: 'Génétique / Bio', icon: Dna },
  { name: 'Activity', label: 'Physiologie', icon: Activity },
  { name: 'HeartPulse', label: 'Anatomie / Cardio', icon: HeartPulse },
  { name: 'Pill', label: 'Pharmacologie', icon: Pill },
  { name: 'BarChart3', label: 'Biostatistiques', icon: BarChart3 },
  { name: 'Users', label: 'SSH / Société', icon: Users },
  { name: 'GraduationCap', label: 'Mineure', icon: GraduationCap },
  { name: 'Book', label: 'Général', icon: Book },
  { name: 'Stethoscope', label: 'Clinique', icon: Stethoscope },
  { name: 'Microscope', label: 'Histologie', icon: Microscope },
  { name: 'Brain', label: 'Neuro / Psycho', icon: Brain },
  { name: 'Zap', label: 'Biophysique', icon: Zap },
  { name: 'Shield', label: 'Santé Publique', icon: Shield },
  { name: 'Sparkles', label: 'Optionnel', icon: Sparkles },
];

const COLOR_PALETTE = [
  '#0284c7', // Bleu Médical
  '#10b981', // Vert Émeraude
  '#ec4899', // Rose Fuchsia
  '#8b5cf6', // Violet
  '#f59e0b', // Ambre
  '#14b8a6', // Turquoise
  '#6366f1', // Indigo
  '#f43f5e', // Rouge Rubis
  '#06b6d4', // Cyan
  '#84cc16', // Vert Lime
  '#d97706', // Ocre
  '#64748b'  // Ardoise
];

export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  isOpen,
  onClose,
  subject,
  coursesCount = 0,
  onSubjectSaved,
  onDeleteSubject
}) => {
  useEscapeKey(isOpen, onClose);

  const isEditing = !!subject?.id;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [ects, setEcts] = useState<number | string>(10);
  const [selectedIcon, setSelectedIcon] = useState('Book');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (subject) {
        setCode(subject.code || '');
        setName(subject.name || '');
        setDescription(subject.description || '');
        setColor(subject.color || '#0284c7');
        setEcts(subject.coefficient ?? subject.ects ?? 10);
        setSelectedIcon(subject.icon || 'Book');
      } else {
        // Create mode
        setCode('');
        setName('');
        setDescription('');
        setColor('#0284c7');
        setEcts(10);
        setSelectedIcon('Book');
      }
    }
  }, [isOpen, subject]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!code.trim()) {
      setErrorMessage("Le code de l'UE est obligatoire (ex: UE1, UE8, MINEURE).");
      return;
    }
    if (!name.trim()) {
      setErrorMessage("Le nom de la matière est obligatoire.");
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedCoeff = typeof ects === 'number' ? ects : parseFloat(String(ects).replace(',', '.'));
      const coeff = !isNaN(parsedCoeff) && parsedCoeff > 0 ? parsedCoeff : 10;
      const payload: Partial<SubjectUE> = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        color,
        coefficient: coeff,
        ects: coeff,
        customIntervals: [],
        defaultIntervals: [],
        icon: selectedIcon
      };

      let saved: SubjectUE;
      if (isEditing && subject?.id) {
        saved = await api.updateSubject(subject.id, payload);
      } else {
        saved = await api.createSubject(payload);
      }

      onSubjectSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('Failed to save subject', err);
      setErrorMessage(err.message || "Une erreur est survenue lors de l'enregistrement de l'UE.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl p-0.5 shadow-lg shadow-sky-950/40 flex items-center justify-center"
              style={{
                backgroundColor: color,
                color: getContrastTextColor(color)
              }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isEditing ? `Modifier l'UE : ${subject?.code}` : 'Créer une Nouvelle UE / Matière'}
              </h2>
              <p className="text-xs text-slate-400">
                Personnalisez le code, les ECTS, le code couleur et le rythme des J
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Code & ECTS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Code UE</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: UE1, UE8, MINEURE"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Nom de la matière</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Chimie & Biochimie structurale"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-medium"
                required
              />
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Description du programme / thématiques</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Thermodynamique, chimie organique, métabolisme glucidique et lipidique..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
            />
          </div>

          {/* Row 3: Color Palette & ECTS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>Code couleur personnalisé</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">{color}</span>
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs"
                  style={{ backgroundColor: c }}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                  )}
                </button>
              ))}

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-full bg-transparent border-0 cursor-pointer p-0"
                  title="Couleur personnalisée"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Coefficient ECTS */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Coefficient / ECTS</label>
            <input
              type="number"
              step="any"
              min={0.1}
              max={100}
              value={ects}
              onChange={(e) => setEcts(e.target.value)}
              placeholder="Ex: 4.5"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Programme de révision automatique pour l'UE */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Méthode des J pour cette UE</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Tous les cours créés dans cette UE suivront le cycle : <strong>J0</strong>, <strong>J1</strong>, <strong>samedi suivant</strong>, puis chaque <strong>dimanche</strong> jusqu'à la fin du semestre.
            </p>
          </div>

          {/* Row 5: Icon Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Icône thématique</label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_ICONS.map(item => {
                const IconComp = item.icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-sky-950 border-sky-500 text-sky-400 shadow-md shadow-sky-950/30'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span className="text-[9px] truncate max-w-full font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <div>
              {isEditing && onDeleteSubject && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/40 text-xs font-semibold transition-all cursor-pointer"
                  title="Supprimer définitivement cette UE"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer cette UE</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-950/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour l\'UE' : 'Créer l\'UE'}</span>
              </button>
            </div>
          </div>

        </form>

        {/* Delete Subject Modal */}
        <DeleteSubjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          subject={subject || null}
          coursesCount={coursesCount}
          onConfirmDelete={async (id) => {
            if (onDeleteSubject) {
              await onDeleteSubject(id);
              setIsDeleteModalOpen(false);
              onClose();
            }
          }}
        />

      </div>
    </div>
  );
};
export default EditSubjectModal;
