import React, { useState, useEffect, useRef } from 'react';
import { Course, SubjectUE, QcmQuestion, QcmVerificationResult } from '../types';
import { api } from '../services/api';
import { QcmVerificationModal } from './QcmVerificationModal';
import { getLocalTodayString } from '../utils/dateUtils';
import {
  Award,
  Plus,
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Tag,
  Trash2,
  Edit3,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Link2,
  ShieldCheck
} from 'lucide-react';

interface QcmBankViewProps {
  courses: Course[];
  subjects: SubjectUE[];
  targetQcmId?: string | null;
  refreshTrigger?: number;
  onOpenEditModal: (qcm?: QcmQuestion, courseId?: string) => void;
  onStartQuiz: (course: Course, qcms?: QcmQuestion[]) => void;
  onShowToast: (msg: string) => void;
}

export const QcmBankView: React.FC<QcmBankViewProps> = ({
  courses,
  subjects,
  targetQcmId,
  refreshTrigger,
  onOpenEditModal,
  onStartQuiz,
  onShowToast
}) => {
  const [qcms, setQcms] = useState<QcmQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUe, setSelectedUe] = useState('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'ALL'>('ALL');
  const [expandedQcmIds, setExpandedQcmIds] = useState<Set<string>>(new Set());
  const [globalShowAnswers, setGlobalShowAnswers] = useState(false);
  const [revealedQcmIds, setRevealedQcmIds] = useState<Set<string>>(new Set());
  const hasScrolledToTargetRef = useRef(false);

  // Gemini QCM Verification
  const [verifyingQcm, setVerifyingQcm] = useState<QcmQuestion | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<QcmVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadQcms();
  }, [refreshTrigger]);

  const loadQcms = async () => {
    setIsLoading(true);
    try {
      const list = await api.getQcms();
      setQcms(list);
      
      // Auto-expand target QCM if present, otherwise keep all QCMs folded by default
      if (targetQcmId) {
        setExpandedQcmIds(new Set([targetQcmId]));
        setRevealedQcmIds(new Set([targetQcmId]));
      } else {
        setExpandedQcmIds(new Set());
      }
    } catch (e) {
      console.error('Failed to load QCMs', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle scrolling to targetQcmId when data is loaded
  useEffect(() => {
    if (!isLoading && targetQcmId && qcms.length > 0) {
      // Ensure target QCM is expanded and revealed
      setExpandedQcmIds(prev => new Set([...prev, targetQcmId]));
      setRevealedQcmIds(prev => new Set([...prev, targetQcmId]));

      // Clear search query or filters if they would hide target QCM
      const targetQcm = qcms.find(q => q.id === targetQcmId);
      if (targetQcm) {
        setSelectedUe('ALL');
        setSelectedCourseId('ALL');
        setDifficultyFilter('ALL');
        setSearchQuery('');
      }

      setTimeout(() => {
        const el = document.getElementById(`qcm-card-${targetQcmId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  }, [isLoading, targetQcmId, qcms]);

  const toggleExpand = (id: string) => {
    setExpandedQcmIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedQcmIds.size === filteredQcms.length) {
      setExpandedQcmIds(new Set());
    } else {
      setExpandedQcmIds(new Set(filteredQcms.map(q => q.id)));
    }
  };

  const toggleRevealQcm = (id: string) => {
    setRevealedQcmIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isQcmAnswerVisible = (id: string) => {
    return globalShowAnswers || revealedQcmIds.has(id);
  };

  const handleDeleteQcm = async (e: React.MouseEvent, qcmId: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer définitivement ce QCM ?')) return;

    try {
      await api.deleteQcm(qcmId);
      setQcms(prev => prev.filter(q => q.id !== qcmId));
      onShowToast('✓ QCM supprimé avec succès.');
    } catch (err) {
      console.error('Failed to delete QCM', err);
      alert('Erreur lors de la suppression du QCM.');
    }
  };

  const handleVerifyQcm = async (qcm: QcmQuestion) => {
    setVerifyingQcm(qcm);
    setVerificationResult(null);
    setIsVerifying(true);
    setIsVerificationModalOpen(true);
    try {
      const result = await api.verifyQcm(qcm);
      setVerificationResult(result);
    } catch (e) {
      console.error('Failed to verify QCM', e);
      onShowToast('⚠️ Échec de la vérification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApplyCorrection = async (correctedQcm: QcmQuestion) => {
    try {
      const updated = await api.updateQcm(correctedQcm.id, correctedQcm);
      setQcms(prev => prev.map(q => q.id === updated.id ? updated : q));
      onShowToast('✓ QCM corrigé et mis à jour avec succès !');
    } catch (e) {
      console.error('Failed to apply correction', e);
      throw e;
    }
  };

  const copyDirectLink = (e: React.MouseEvent, qcmId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/qcms/${qcmId}`;
    navigator.clipboard.writeText(url);
    window.history.pushState(null, '', `/qcms/${qcmId}`);
    onShowToast(`✓ Lien direct copié : /qcms/${qcmId}`);
  };

  const availableCourses = selectedUe === 'ALL'
    ? courses
    : courses.filter(c =>
        c.ueCode?.toLowerCase() === selectedUe.toLowerCase() ||
        c.ueId?.toLowerCase() === selectedUe.toLowerCase()
      );

  const handleUeChange = (newUe: string) => {
    setSelectedUe(newUe);
    if (newUe !== 'ALL' && selectedCourseId !== 'ALL') {
      const isCourseInNewUe = courses.some(
        c => c.id === selectedCourseId && (
          c.ueCode?.toLowerCase() === newUe.toLowerCase() ||
          c.ueId?.toLowerCase() === newUe.toLowerCase()
        )
      );
      if (!isCourseInNewUe) {
        setSelectedCourseId('ALL');
      }
    }
  };

  const filteredQcms = qcms.filter(q => {
    const qText = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      q.questionStem.toLowerCase().includes(qText) ||
      (q.courseTitle && q.courseTitle.toLowerCase().includes(qText)) ||
      (q.ueCode && q.ueCode.toLowerCase().includes(qText)) ||
      (q.tags && q.tags.some(t => t.toLowerCase().includes(qText))) ||
      (q.items && q.items.some(it => it.text.toLowerCase().includes(qText) || (it.explanation && it.explanation.toLowerCase().includes(qText))));

    const matchesUe = selectedUe === 'ALL' || q.ueCode?.toLowerCase() === selectedUe.toLowerCase();
    const matchesCourse = selectedCourseId === 'ALL' || q.courseId === selectedCourseId;
    const matchesDiff = difficultyFilter === 'ALL' || q.difficulty === difficultyFilter;

    return matchesSearch && matchesUe && matchesCourse && matchesDiff;
  });

  const getCourse = (courseId: string) => courses.find(c => c.id === courseId);
  const getSubject = (ueCode?: string) => subjects.find(s => s.code.toLowerCase() === ueCode?.toLowerCase());

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-400" />
              Banque de QCMs de Concours & Entraînements
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800/40">
              {qcms.length} QCM{qcms.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Consultez, filtrez par cours/UE et testez vos connaissances en affichant ou masquant les réponses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Global Answers Toggle for whole bank */}
          <button
            onClick={() => {
              const next = !globalShowAnswers;
              setGlobalShowAnswers(next);
              if (next) {
                setRevealedQcmIds(new Set(filteredQcms.map(q => q.id)));
              } else {
                setRevealedQcmIds(new Set());
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-2xs ${
              globalShowAnswers
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
            }`}
            title={globalShowAnswers ? "Masquer les réponses pour tous les QCMs" : "Afficher les réponses pour tous les QCMs"}
          >
            {globalShowAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{globalShowAnswers ? 'Masquer les réponses' : 'Afficher les réponses'}</span>
          </button>

          <button
            onClick={toggleExpandAll}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
          >
            {expandedQcmIds.size === filteredQcms.length ? 'Tout replier' : 'Tout déplier'}
          </button>

          <button
            onClick={() => onOpenEditModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouveau QCM</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search bar */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher (énoncé, piège, terme médical)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* UE Filter */}
          <select
            value={selectedUe}
            onChange={(e) => handleUeChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Toutes les UEs</option>
            {subjects.map(s => (
              <option key={s.id} value={s.code}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {/* Course Filter (Filtered by selected UE) */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 truncate"
          >
            <option value="ALL">
              {selectedUe === 'ALL'
                ? `Tous les cours (${courses.length})`
                : `Tous les cours de ${selectedUe} (${availableCourses.length})`}
            </option>
            {availableCourses.map(c => (
              <option key={c.id} value={c.id}>
                [{c.ueCode}] {c.title}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Toutes difficultés</option>
            <option value={1}>Difficulté : ★☆☆☆☆ (1)</option>
            <option value={2}>Difficulté : ★★☆☆☆ (2)</option>
            <option value={3}>Difficulté : ★★★☆☆ (3 - Moyen)</option>
            <option value={4}>Difficulté : ★★★★☆ (4 - Difficile)</option>
            <option value={5}>Difficulté : ★★★★★ (5 - Concours lourd)</option>
          </select>

        </div>
      </div>

      {/* QCMs List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 animate-spin text-sky-400" />
          <span>Chargement de la banque de QCMs...</span>
        </div>
      ) : filteredQcms.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">Aucun QCM ne correspond à vos critères</h3>
          <p className="text-xs text-slate-500 mt-1">
            Modifiez vos filtres ou créez votre premier QCM manuellement.
          </p>
          <button
            onClick={() => onOpenEditModal()}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white"
          >
            + Créer un QCM
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQcms.map((qcm, index) => {
            const course = getCourse(qcm.courseId);
            const subject = getSubject(qcm.ueCode);
            const color = course?.color || subject?.color || '#0284c7';
            const isExpanded = expandedQcmIds.has(qcm.id);
            const answersVisible = isQcmAnswerVisible(qcm.id);
            const isTarget = targetQcmId === qcm.id;
            const trueCount = qcm.items ? qcm.items.filter(it => it.isTrue).length : 0;
            const trapCount = qcm.items ? qcm.items.filter(it => it.isTrap).length : 0;

            return (
              <div
                key={qcm.id}
                id={`qcm-card-${qcm.id}`}
                className={`glass-panel rounded-2xl border transition-all overflow-hidden scroll-mt-24 ${
                  isTarget
                    ? 'border-sky-500 ring-2 ring-sky-500/80 shadow-xl shadow-sky-500/15'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Header Card */}
                <div
                  onClick={() => toggleExpand(qcm.id)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                    isTarget
                      ? 'bg-sky-500/10 hover:bg-sky-500/15'
                      : 'bg-slate-900/40 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* UE Badge with dynamic course color */}
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs"
                        style={{ backgroundColor: color }}
                      >
                        {qcm.ueCode || 'UE'}
                      </span>

                      {/* Course Title */}
                      <span className="text-xs font-bold text-slate-300 truncate max-w-md">
                        {qcm.courseTitle || course?.title || 'Cours PASS'}
                      </span>

                      {/* Difficulty stars */}
                      <span className="text-amber-400 text-xs font-mono">
                        {'★'.repeat(qcm.difficulty || 3)}{'☆'.repeat(5 - (qcm.difficulty || 3))}
                      </span>

                      {/* Breakdown badge */}
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                        {answersVisible
                          ? `${trueCount} Vraie(s) • ${5 - trueCount} Fausse(s)`
                          : '5 propositions (A à E)'}
                        {answersVisible && trapCount > 0 && ` • ⚠️ ${trapCount} Piège(s)`}
                      </span>

                      {isTarget && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500 text-white shadow-xs animate-pulse">
                          🎯 QCM ciblé
                        </span>
                      )}
                    </div>

                    {/* Question Stem */}
                    <h3 className="text-sm font-bold text-white leading-snug">
                      QCM #{index + 1} : {qcm.questionStem}
                    </h3>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {(() => {
                      const targetCourse: Course = course || {
                        id: qcm.courseId || 'course-annale',
                        ueId: qcm.ueCode || 'PASS',
                        ueCode: qcm.ueCode || 'PASS',
                        title: qcm.courseTitle || 'QCMs Scannés & Annales',
                        color: color,
                        taughtDate: getLocalTodayString(),
                        difficulty: qcm.difficulty || 3,
                        status: 'EN_COURS',
                        tags: ['scan', 'qcm'],
                        documents: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };

                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartQuiz(targetCourse, [qcm]);
                          }}
                          title="Lancer l'entraînement sur ce QCM"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold transition-all active:scale-95 shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current text-emerald-700 dark:text-emerald-300" />
                          <span className="hidden sm:inline">S'entraîner</span>
                        </button>
                      );
                    })()}

                    <button
                      onClick={(e) => copyDirectLink(e, qcm.id)}
                      title="Copier le lien direct vers ce QCM"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                    >
                      <Link2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span className="hidden sm:inline">Lien</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerifyQcm(qcm);
                      }}
                      title="Vérifier la conformité et l'exactitude avec Gemini (Google Search)"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/70 dark:hover:bg-indigo-600 text-indigo-900 dark:text-indigo-200 hover:text-indigo-950 dark:hover:text-white border border-indigo-300 dark:border-indigo-500/40 text-xs font-bold transition-all active:scale-95 shadow-2xs group"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-sky-400 group-hover:text-indigo-950 dark:group-hover:text-white" />
                      <span>Vérifier</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditModal(qcm, qcm.courseId);
                      }}
                      title="Éditer ce QCM (énoncé, réponses, Vrai/Faux, pièges)"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-600/20 dark:hover:bg-sky-600 text-sky-800 dark:text-sky-300 hover:text-sky-950 dark:hover:text-white border border-sky-300 dark:border-sky-500/30 text-xs font-bold transition-all active:scale-95 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
                      <span>Éditer</span>
                    </button>

                    <button
                      onClick={(e) => handleDeleteQcm(e, qcm.id)}
                      title="Supprimer ce QCM"
                      className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-600 text-rose-800 dark:text-rose-400 hover:text-rose-950 dark:hover:text-white border border-rose-300 dark:border-rose-500/20 transition-all shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                    </button>

                    <div className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: 5 Items A-E */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 space-y-4 animate-fadeIn">
                    
                    {/* Top sub-bar: Corrigé / Réponses toggle */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/60">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {answersVisible ? 'Corrigé & Explications :' : 'Propositions (A à E) :'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRevealQcm(qcm.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                          answersVisible
                            ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                            : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                        }`}
                      >
                        {answersVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{answersVisible ? 'Masquer les réponses' : 'Afficher les réponses'}</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {qcm.items && qcm.items.map((item) => (
                        <div
                          key={item.itemLetter}
                          className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all shadow-2xs ${
                            answersVisible
                              ? item.isTrue
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                : 'bg-rose-50/90 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-950 dark:text-rose-100'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 flex-1">
                              <span className="font-mono font-extrabold text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
                                {item.itemLetter}
                              </span>
                              <span className="leading-snug">{item.text}</span>
                            </div>

                            {answersVisible && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 uppercase tracking-wider animate-fadeIn shadow-2xs ${
                                  item.isTrue
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40'
                                }`}
                              >
                                {item.isTrue ? 'VRAI' : 'FAUX'}
                              </span>
                            )}
                          </div>

                          {answersVisible && item.explanation && (
                            <div className={`text-[11px] pl-7 border-l-2 ml-2.5 animate-fadeIn font-medium ${
                              item.isTrue
                                ? 'text-emerald-900/85 dark:text-slate-300 border-emerald-300 dark:border-emerald-800'
                                : 'text-rose-900/85 dark:text-slate-300 border-rose-300 dark:border-rose-800'
                            }`}>
                              <span>{item.explanation}</span>
                              {item.isTrap && (
                                <span className="ml-2 text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/40 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 inline" /> Piège de concours
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Mnemonic box */}
                    {answersVisible && qcm.mnemonics && qcm.mnemonics.length > 0 && (() => {
                      const rawMne = qcm.mnemonics[0] || '';
                      const cleanedMne = rawMne
                        .replace(/^moyen\s+mn[ée]motechnique\s*:\s*/i, '')
                        .replace(/^astuce\s+mn[ée]motechnique\s*:\s*/i, '');

                      return (
                        <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-indigo-950/50 border border-amber-200 dark:border-indigo-500/40 text-xs text-amber-950 dark:text-indigo-100 flex items-start sm:items-center gap-2.5 shadow-2xs animate-fadeIn">
                          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="leading-relaxed">
                            <strong className="font-extrabold text-amber-900 dark:text-amber-300 mr-1.5">
                              💡 Moyen mnémotechnique :
                            </strong>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{cleanedMne}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tags */}
                    {qcm.tags && qcm.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {qcm.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[10px] font-medium shadow-2xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QCM Verification Modal */}
      <QcmVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => {
          setIsVerificationModalOpen(false);
          setVerifyingQcm(null);
          setVerificationResult(null);
        }}
        qcm={verifyingQcm}
        verificationResult={verificationResult}
        isLoading={isVerifying}
        onApplyCorrection={handleApplyCorrection}
      />

    </div>
  );
};
export default QcmBankView;
