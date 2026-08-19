import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Course, MedicalIllustration } from '../types';
import { api } from '../services/api';
import { CourseCombobox } from './CourseCombobox';

interface NewIllustrationModalProps {
  course?: Course;
  courses: Course[];
  onClose: () => void;
  onCreated: (illustration: MedicalIllustration) => void;
}

export const NewIllustrationModal: React.FC<NewIllustrationModalProps> = ({
  course,
  courses,
  onClose,
  onCreated,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState(course?.id || (courses.length > 0 ? courses[0].id : ''));
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'SCHEMA_ANATOMIQUE' | 'DESSIN_A_TROUS' | 'SCHEMA_FONCTIONNEL' | 'CROQUIS_SYNTHETIQUE'>('SCHEMA_ANATOMIQUE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || course;

  const presets = [
    {
      label: '🔬 Plexus brachial & loges du bras (Schéma complet)',
      type: 'SCHEMA_ANATOMIQUE' as const,
      prompt: 'Schéma anatomique complet des troncs du plexus brachial, nerf musculocutané, nerf radial et nerf médian avec loges musculaires du bras et annotations précises.',
      title: 'Atlas didactique : Plexus brachial et innervation du membre supérieur'
    },
    {
      label: '🔬 4 Cavités et valves cardiaques (Schéma complet)',
      type: 'SCHEMA_ANATOMIQUE' as const,
      prompt: 'Coupe frontale détaillée du cœur humain montrant les 4 cavités (atrium droit, ventricule droit, atrium gauche, ventricule gauche), les valves mitrale et tricuspide, la crosse aortique et le tronc pulmonaire avec légendes médicales.',
      title: 'Schéma anatomique : Morphologie interne et cavités cardiaques'
    },
    {
      label: '🎯 Moelle spinale et cornes (Dessin à trous)',
      type: 'DESSIN_A_TROUS' as const,
      prompt: 'Coupe axiale de la moelle spinale avec substance grise en papillon, canal épendymaire et substance blanche, repères numérotés 1 à 6 sans texte pour entraînement.',
      title: 'Planche à légender : Moelle spinale et cornes médullaires'
    },
    {
      label: '⚙️ Membrane plasmique & pompes (Schéma fonctionnel)',
      type: 'SCHEMA_FONCTIONNEL' as const,
      prompt: 'Bicouche phospholipidique avec transporteurs GLUT, pompe Na+/K+ ATPase et récepteurs membranaires.',
      title: 'Schéma fonctionnel : Transports et perméabilité membranaire'
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTitle(p.title);
    setPrompt(p.prompt);
    setType(p.type);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Veuillez décrire le schéma à générer.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const generated = await api.generateIllustration({
        title: title.trim() || (type === 'DESSIN_A_TROUS' ? 'Planche à trous PASS' : 'Schéma Médical PASS'),
        prompt: prompt.trim(),
        courseId: selectedCourse?.id || 'course-general',
        courseTitle: selectedCourse?.title || 'Cours Médical PASS',
        ueCode: selectedCourse?.ueCode || 'UE',
        illustrationType: type,
      });

      onCreated(generated);
      onClose();
    } catch (err) {
      console.error('Generation failed:', err);
      setError('Erreur lors de la génération du schéma avec Gemini. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xl font-bold">
              🎨
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                Générer une Illustration ou Planche Médicale
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Propulsé par <code>gemini-3-pro-image</code> (Nano Banana Pro) & Google Search Grounding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              ⚠️ {error}
            </div>
          )}

          {/* CHOICE OF ILLUSTRATION TYPE (Visual Radio Cards) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              1. Choisissez le type de support souhaité :
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Complete Labeled Anatomical Schema */}
              <div
                onClick={() => setType('SCHEMA_ANATOMIQUE')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  type === 'SCHEMA_ANATOMIQUE'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                  type === 'SCHEMA_ANATOMIQUE' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {type === 'SCHEMA_ANATOMIQUE' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>🔬</span>
                    <span>Schéma Médical Complet</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Atlas didactique complet avec toutes les structures identifiées, annotées et fléchées pour comprendre et réviser.
                  </p>
                </div>
              </div>

              {/* Option 2: Fill-in-the-blank Drawing */}
              <div
                onClick={() => setType('DESSIN_A_TROUS')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  type === 'DESSIN_A_TROUS'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                  type === 'DESSIN_A_TROUS' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {type === 'DESSIN_A_TROUS' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Planche à trous</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Dessin sans les noms écrits, avec repères numérotés (1..N) et corrigé masquable pour s'auto-évaluer et imprimer.
                  </p>
                </div>
              </div>

              {/* Option 3: Functional schema */}
              <div
                onClick={() => setType('SCHEMA_FONCTIONNEL')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  type === 'SCHEMA_FONCTIONNEL'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                  type === 'SCHEMA_FONCTIONNEL' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {type === 'SCHEMA_FONCTIONNEL' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>Schéma Fonctionnel / Processus</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Physiologie, cascades de signalisation, pompes et transports membranaires.
                  </p>
                </div>
              </div>

              {/* Option 4: Synthetic sketch */}
              <div
                onClick={() => setType('CROQUIS_SYNTHETIQUE')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                  type === 'CROQUIS_SYNTHETIQUE'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                  type === 'CROQUIS_SYNTHETIQUE' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {type === 'CROQUIS_SYNTHETIQUE' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>✏️</span>
                    <span>Croquis de cours synthétique</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Dessin épuré pour mémorisation visuelle rapide des structures clés.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              💡 Idées & Exemples Prêts à l'Emploi :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all text-xs font-medium text-slate-700 dark:text-slate-300 truncate"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Course Selection & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cours de Rattachement :
              </label>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Titre du Schéma :
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'DESSIN_A_TROUS' ? "Ex: Planche à trous : Moelle spinale en C6" : "Ex: Coupe frontale des cavités cardiaques"}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Prompt Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description de ce que vous souhaitez voir dans l'illustration :
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                type === 'DESSIN_A_TROUS'
                  ? "Ex: Vue en coupe des cavités et valves du cœur avec repères numérotés 1 à 6 sans texte pour s'entraîner..."
                  : "Ex: Schéma anatomique détaillé des branches du plexus brachial avec chaque nerf annoté et les loges musculaires..."
              }
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Génération Nano Banana Pro...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>{type === 'DESSIN_A_TROUS' ? "Générer la planche à trous" : "Générer le schéma médical"}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
export default NewIllustrationModal;
