import React, { useState, useEffect, useRef } from 'react';
import {
  Course,
  SubjectUE,
  RevisionSession,
  QcmQuestion,
  QcmAttempt,
  QcmVerificationResult,
  MedicalIllustration,
  HandwrittenScanResult,
  Flashcard,
  FlashcardVerification,
  TutorConversationThread
} from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ProgressionChart } from './ProgressionChart';
import { QcmVerificationModal } from './QcmVerificationModal';
import { FlashcardVerificationModal } from './FlashcardVerificationModal';
import { MedicalIllustrationModal } from './MedicalIllustrationModal';
import { NewIllustrationModal } from './NewIllustrationModal';
import { EditCourseNotesModal } from './EditCourseNotesModal';
import { PrintFlashcardsModal } from './PrintFlashcardsModal';
import { DeleteRevisionModal } from './DeleteRevisionModal';
import { DeleteCourseModal } from './DeleteCourseModal';
import { getLocalTodayString, parseDate } from '../utils/dateUtils';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Play,
  FileText,
  Upload,
  Clock,
  CalendarPlus,
  Bot,
  Plus,
  Flame,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  RotateCcw,
  ShieldCheck,
  Image as ImageIcon,
  Printer,
  Download,
  BookOpen,
  Layers,
  Star,
  Link2,
  MessageSquare
} from 'lucide-react';

interface CourseDetailViewProps {
  course: Course;
  subjects: SubjectUE[];
  onBack: () => void;
  onStartQcmQuiz: (course: Course, qcms?: QcmQuestion[]) => void;
  onOpenAiTutor: (course: Course) => void;
  onOpenAiTutorThread?: (course: Course, threadId: string) => void;
  onOpenScannerForCourse: (course: Course) => void;
  onShiftRevision: (sessionId: string, days: number) => void;
  onCompleteRevision: (sessionId: string, evaluation: string) => void;
  onUncompleteRevision?: (sessionId: string) => void;
  onDeleteCourse?: (courseId: string) => Promise<void> | void;
  onCourseUpdated?: (course: Course) => void;
  onOpenAddRevisionModal?: (initialDate?: string, courseId?: string) => void;
  onOpenEditQcmModal?: (qcm?: QcmQuestion, courseId?: string) => void;
  onOpenEditFlashcardModal?: (flashcard?: Flashcard, defaultCourseId?: string) => void;
  onStartFlashcardsStudy?: (flashcards: Flashcard[], initialIndex?: number, title?: string) => void;
  onShowToast?: (msg: string) => void;
  revisionUpdateTrigger?: number;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  subjects,
  onBack,
  onStartQcmQuiz,
  onOpenAiTutor,
  onOpenAiTutorThread,
  onOpenScannerForCourse,
  onShiftRevision,
  onCompleteRevision,
  onUncompleteRevision,
  onDeleteCourse,
  onCourseUpdated,
  onOpenAddRevisionModal,
  onOpenEditQcmModal,
  onOpenEditFlashcardModal,
  onStartFlashcardsStudy,
  onShowToast,
  revisionUpdateTrigger
}) => {
  const [currentCourse, setCurrentCourse] = useState<Course>(course);
  const [sessions, setSessions] = useState<RevisionSession[]>([]);
  const [qcms, setQcms] = useState<QcmQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardGenerationSuccess, setFlashcardGenerationSuccess] = useState(false);
  const [attempts, setAttempts] = useState<QcmAttempt[]>([]);
  const [illustrations, setIllustrations] = useState<MedicalIllustration[]>([]);
  const [scans, setScans] = useState<HandwrittenScanResult[]>([]);
  const [tutorThreads, setTutorThreads] = useState<TutorConversationThread[]>([]);
  const [isDeletingThreadId, setIsDeletingThreadId] = useState<string | null>(null);
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(new Set());
  const [selectedIllustration, setSelectedIllustration] = useState<MedicalIllustration | null>(null);
  const [isNewIllustrationModalOpen, setIsNewIllustrationModalOpen] = useState(false);
  const [isEditNotesOpen, setIsEditNotesOpen] = useState(false);
  const [isGeneratingQcm, setIsGeneratingQcm] = useState(false);
  const [qcmGenerationSuccess, setQcmGenerationSuccess] = useState(false);
  const [expandedQcmIds, setExpandedQcmIds] = useState<Set<string>>(new Set());
  const [revealedQcmIds, setRevealedQcmIds] = useState<Set<string>>(new Set());
  const [globalShowAnswers, setGlobalShowAnswers] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isPrintFlashcardsModalOpen, setIsPrintFlashcardsModalOpen] = useState(false);

  const fileUploadRef = useRef<HTMLInputElement>(null);

  // Gemini QCM Verification
  const [verifyingQcm, setVerifyingQcm] = useState<QcmQuestion | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<QcmVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Gemini Flashcard Verification
  const [verifyingFlashcard, setVerifyingFlashcard] = useState<Flashcard | null>(null);
  const [isFlashcardVerificationModalOpen, setIsFlashcardVerificationModalOpen] = useState(false);
  const [flashcardVerificationResult, setFlashcardVerificationResult] = useState<FlashcardVerification | null>(null);
  const [isVerifyingFlashcard, setIsVerifyingFlashcard] = useState(false);

  // Deletion Modals
  const [sessionToDelete, setSessionToDelete] = useState<RevisionSession | null>(null);
  const [isDeleteCourseModalOpen, setIsDeleteCourseModalOpen] = useState(false);

  const subject = subjects.find(s => s.id.toLowerCase() === currentCourse.ueId.toLowerCase() || s.code.toLowerCase() === currentCourse.ueId.toLowerCase());
  const currentColor = subject?.color || currentCourse.color || '#0284c7';

  useEffect(() => {
    setCurrentCourse(course);
    loadCourseData();
  }, [course.id, course.documents?.length, course.updatedAt, revisionUpdateTrigger]);

  const loadCourseData = async () => {
    try {
      const [freshCourse, allRevs, courseQcms, courseFlashcards, courseAttempts, courseIllus, courseScans, courseThreads] = await Promise.all([
        api.getCourse(course.id).catch(() => course),
        api.getAllRevisions({ courseId: course.id }),
        api.getQcms(course.id),
        api.getFlashcards(course.id),
        api.getQcmAttempts(course.id),
        api.getIllustrations(course.id),
        api.getScans(course.id),
        api.getTutorThreads(course.id).catch(() => [])
      ]);
      if (freshCourse) {
        setCurrentCourse(freshCourse);
      }
      setSessions(allRevs.sort((a, b) => a.jStep - b.jStep));
      setQcms(courseQcms);
      setFlashcards(courseFlashcards);
      setAttempts(courseAttempts);
      setIllustrations(courseIllus);
      setScans(courseScans);
      setTutorThreads(courseThreads);
    } catch (e) {
      console.error('Failed to load course details', e);
    }
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const updated = await api.uploadCourseDocument(currentCourse.id, file);
      setCurrentCourse(updated);
      if (onCourseUpdated) onCourseUpdated(updated);
      await loadCourseData();
    } catch (err) {
      console.error('Failed to upload document', err);
      alert('Erreur lors du téléversement du document.');
    } finally {
      setIsUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Voulez-vous supprimer ce document attaché à ce cours ?')) return;
    try {
      const updated = await api.deleteDocumentAttachment(currentCourse.id, docId);
      setCurrentCourse(updated);
      if (onCourseUpdated) onCourseUpdated(updated);
    } catch (e) {
      console.error('Failed to delete document attachment', e);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!window.confirm('Voulez-vous supprimer cette fiche synthétique numérisée ?')) return;
    try {
      await api.deleteScan(scanId);
      setScans(prev => prev.filter(s => s.id !== scanId));
    } catch (e) {
      console.error('Failed to delete scan', e);
    }
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer définitivement cette conversation avec le Tuteur IA ?')) return;
    setIsDeletingThreadId(threadId);
    try {
      await api.deleteTutorThread(threadId);
      setTutorThreads(prev => prev.filter(t => t.id !== threadId));
      if (onShowToast) onShowToast('✓ Conversation supprimée');
    } catch (err) {
      console.error('Failed to delete tutor thread', err);
    } finally {
      setIsDeletingThreadId(null);
    }
  };

  const toggleScanExpanded = (scanId: string) => {
    setExpandedScanIds(prev => {
      const next = new Set(prev);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const handleCompleteRevisionSession = async (sessionId: string, evaluationGrade: string = 'FACILE') => {
    const todayStr = getLocalTodayString();
    const grade = (evaluationGrade as RevisionSession['evaluation']) || 'FACILE';
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, status: 'VALIDE', evaluation: grade, completedDate: todayStr }
          : s
      )
    );
    try {
      await onCompleteRevision(sessionId, evaluationGrade);
      await loadCourseData();
    } catch (err) {
      console.error('Failed to complete session', err);
    }
  };

  const handleUncompleteRevisionSession = async (sessionId: string) => {
    const todayStr = getLocalTodayString();
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              status: s.scheduledDate < todayStr ? 'EN_RETARD' : 'A_FAIRE',
              evaluation: undefined,
              completedDate: undefined
            }
          : s
      )
    );
    try {
      if (onUncompleteRevision) {
        await onUncompleteRevision(sessionId);
      } else {
        await api.uncompleteRevision(sessionId);
      }
      await loadCourseData();
    } catch (err) {
      console.error('Failed to uncomplete session', err);
    }
  };

  const handleShiftRevisionSession = async (sessionId: string, days: number) => {
    try {
      await onShiftRevision(sessionId, days);
      await loadCourseData();
    } catch (err) {
      console.error('Failed to shift session', err);
    }
  };

  const handleDeleteRevisionConfirmed = async (sessionId: string, deleteFollowing: boolean) => {
    try {
      await api.deleteRevision(sessionId, deleteFollowing);
      if (onShowToast) {
        onShowToast(deleteFollowing ? '✓ Séances futures supprimées jusqu\'à la fin du semestre' : '✓ Séance de révision supprimée');
      }
      await loadCourseData();
    } catch (err) {
      console.error('Failed to delete revision', err);
      if (onShowToast) onShowToast('❌ Erreur lors de la suppression');
    }
  };

  const handleDeleteCourseConfirmed = async (courseId: string) => {
    try {
      if (onDeleteCourse) {
        await onDeleteCourse(courseId);
      } else {
        await api.deleteCourse(courseId);
        if (onShowToast) onShowToast('✓ Cours et révisions supprimés');
        onBack();
      }
    } catch (err) {
      console.error('Failed to delete course', err);
      if (onShowToast) onShowToast('❌ Erreur lors de la suppression du cours');
    }
  };

  const handleGenerateQcms = async () => {
    setIsGeneratingQcm(true);
    setQcmGenerationSuccess(false);
    try {
      const generated = await api.generateQcm(
        course.id,
        course.title,
        course.ueCode || 'UE',
        course.notes || course.title,
        3
      );
      setQcms(prev => [...generated, ...prev]);
      setQcmGenerationSuccess(true);
      setTimeout(() => setQcmGenerationSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingQcm(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsGeneratingFlashcards(true);
    setFlashcardGenerationSuccess(false);
    try {
      const generated = await api.generateFlashcards(
        course.id,
        course.title,
        course.ueCode || 'UE',
        course.ueId || 'ue1',
        course.notes || course.title,
        5
      );
      setFlashcards(prev => [...generated, ...prev]);
      setFlashcardGenerationSuccess(true);
      setTimeout(() => setFlashcardGenerationSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFlashcards(false);
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
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApplyCorrection = async (correctedQcm: QcmQuestion) => {
    try {
      const updated = await api.updateQcm(correctedQcm.id, correctedQcm);
      setQcms(prev => prev.map(q => q.id === updated.id ? updated : q));
      loadCourseData();
    } catch (e) {
      console.error('Failed to apply correction', e);
      throw e;
    }
  };

  const handleVerifyFlashcard = async (card: Flashcard) => {
    setVerifyingFlashcard(card);
    setFlashcardVerificationResult(null);
    setIsVerifyingFlashcard(true);
    setIsFlashcardVerificationModalOpen(true);
    try {
      const result = await api.verifyFlashcardById(card.id);
      setFlashcardVerificationResult(result);
    } catch (e) {
      console.error('Failed to verify flashcard', e);
      if (onShowToast) onShowToast('❌ Erreur lors de la vérification');
    } finally {
      setIsVerifyingFlashcard(false);
    }
  };

  const handleApplyFlashcardCorrection = async (correctedCard: Flashcard) => {
    try {
      const updated = await api.updateFlashcard(correctedCard.id, correctedCard);
      setFlashcards(prev => prev.map(f => f.id === updated.id ? updated : f));
      loadCourseData();
      if (onShowToast) onShowToast('✓ Flashcard optimisée avec succès !');
    } catch (e) {
      console.error('Failed to apply flashcard correction', e);
      throw e;
    }
  };

  const toggleExpandQcm = (id: string) => {
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

  const toggleExpandAllQcms = () => {
    if (expandedQcmIds.size === qcms.length) {
      setExpandedQcmIds(new Set());
    } else {
      setExpandedQcmIds(new Set(qcms.map(q => q.id)));
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

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Back & Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux cours</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAiTutor(course)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/40 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Tuteur IA sur ce cours</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteCourseModalOpen(true)}
            title="Supprimer définitivement ce cours et ses révisions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/40 text-xs font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Supprimer le cours</span>
          </button>
        </div>
      </div>

      {/* Main Course Hero Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: currentColor, color: getContrastTextColor(currentColor) }}
              >
                {course.ueCode || subject?.code || 'UE'} • {subject?.name || 'Matière'}
              </span>

              <span className="text-xs text-slate-400">
                Cours du {course.taughtDate} (J0)
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {course.title}
            </h1>

            {course.professor && (
              <p className="text-xs text-slate-400">
                Enseignant : <span className="text-slate-300 font-medium">{course.professor}</span>
              </p>
            )}

            {course.tags && (
              <div className="flex flex-wrap gap-1 pt-1">
                {course.tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] border border-slate-800 font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Quiz Trigger */}
          <div className="flex flex-col gap-2 min-w-44">
            <button
              onClick={() => onStartQcmQuiz(course)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4" />
              <span>S'entraîner aux QCMs ({qcms.length})</span>
            </button>

            <button
              onClick={handleGenerateQcms}
              disabled={isGeneratingQcm}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/20 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingQcm ? 'animate-spin' : ''}`} />
              <span>{isGeneratingQcm ? 'Génération Gemini...' : 'Générer +3 QCMs'}</span>
            </button>

            {qcmGenerationSuccess && (
              <div className="text-[10px] text-emerald-400 text-center font-bold animate-bounce">
                ✨ 3 nouveaux QCMs PASS créés !
              </div>
            )}
          </div>
        </div>

        {currentCourse.notes && currentCourse.notes.trim().length > 0 ? (
          <div className="mt-5 p-5 rounded-2xl bg-slate-100/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed shadow-2xs">
            <div className="font-bold text-slate-900 dark:text-slate-200 mb-3 flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Edit3 className="w-4 h-4 text-sky-500" />
                <span>Notes & Synthèse du cours</span>
              </span>
              <button
                onClick={() => setIsEditNotesOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier mes notes</span>
              </button>
            </div>
            <MarkdownRenderer content={currentCourse.notes} />
          </div>
        ) : (
          <div className="mt-5 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Edit3 className="w-4 h-4 text-slate-400" />
              <span>Aucune note personnelle rédigée pour ce cours.</span>
            </div>
            <button
              onClick={() => setIsEditNotesOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/20 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Rédiger / Coller mes notes</span>
            </button>
          </div>
        )}
      </div>

      {/* Spaced Repetition Timeline */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Planning des Révisions (J0, J1, Samedi & Dimanches)
            </h2>
            <span className="text-xs text-slate-400">
              ({sessions.filter(s => s.status === 'VALIDE').length} / {sessions.length} validées)
            </span>
          </div>

          {onOpenAddRevisionModal && (
            <button
              onClick={() => onOpenAddRevisionModal(undefined, course.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition-all self-start sm:self-center shadow-xs"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>+ Ajouter une séance</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {sessions.map(session => {
            const isDone = session.status === 'VALIDE';
            const isOverdue = session.status === 'EN_RETARD';
            const dateObj = parseDate(session.scheduledDate);
            const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });

            const sessionBadgeLabel = session.jStep === 0
              ? 'J0'
              : session.jStep === 1
              ? 'J1'
              : `J${session.jStep} • ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;

            return (
              <div
                key={session.id}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2 transition-all ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : isOverdue
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                      {sessionBadgeLabel}
                    </span>
                    <span className="text-[10px] font-bold">
                      {isDone ? '✓ Fait' : isOverdue ? '⚠️ Retard' : 'Prévu'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {session.scheduledDate}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleShiftRevisionSession(session.id, -1)}
                      title="Avancer de 1 jour (-1j)"
                      className="p-1 rounded hover:bg-slate-800 text-sky-300 hover:text-sky-200 flex items-center gap-0.5 transition-all text-[10px] font-bold font-mono"
                    >
                      -1j
                    </button>
                    <button
                      onClick={() => handleShiftRevisionSession(session.id, 1)}
                      title="Décaler de +1 jour (+1j)"
                      className="p-1 rounded hover:bg-slate-800 text-amber-300 hover:text-amber-200 flex items-center gap-0.5 transition-all text-[10px] font-bold font-mono"
                    >
                      +1j
                    </button>
                    <button
                      onClick={() => setSessionToDelete(session)}
                      title="Supprimer cette séance (ou les suivantes)"
                      className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 flex items-center transition-all text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {!isDone ? (
                    <button
                      onClick={() => handleCompleteRevisionSession(session.id, 'FACILE')}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-2xs active:scale-95 transition-all"
                    >
                      Valider
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUncompleteRevisionSession(session.id)}
                      title="Repasser cette révision en non-validée"
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700/60 font-semibold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all whitespace-nowrap"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span>Refaire</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add custom J tile */}
          {onOpenAddRevisionModal && (
            <button
              onClick={() => onOpenAddRevisionModal(undefined, course.id)}
              className="p-3 rounded-xl border border-dashed border-slate-700 hover:border-sky-500 hover:bg-sky-500/10 text-slate-400 hover:text-sky-300 text-xs flex flex-col items-center justify-center gap-1.5 transition-all min-h-[90px] group"
            >
              <CalendarPlus className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors" />
              <span className="font-bold text-[11px]">+ Nouveau J</span>
            </button>
          )}
        </div>
      </div>

      {/* Progression & Learning Curve Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <ProgressionChart
          attempts={attempts}
          title="Courbe de Réussite & Progression (Ce Cours)"
          subtitle="Mesurez vos progrès au fur et à mesure de vos entraînements aux QCMs"
        />
      </div>

      {/* QCMs Bank for this Course */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              QCMs Associés à ce Cours ({qcms.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Global Expand/Collapse Toggle */}
            {qcms.length > 0 && (
              <button
                onClick={toggleExpandAllQcms}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title={expandedQcmIds.size === qcms.length ? "Replier tous les QCMs" : "Déplier tous les QCMs"}
              >
                {expandedQcmIds.size === qcms.length ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{expandedQcmIds.size === qcms.length ? 'Tout replier' : 'Tout déplier'}</span>
              </button>
            )}

            {/* Global Answers Toggle for this course */}
            {qcms.length > 0 && (
              <button
                onClick={() => {
                  const nextVal = !globalShowAnswers;
                  setGlobalShowAnswers(nextVal);
                  if (nextVal) {
                    setRevealedQcmIds(new Set(qcms.map(q => q.id)));
                  } else {
                    setRevealedQcmIds(new Set());
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                  globalShowAnswers
                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                    : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
                }`}
                title={globalShowAnswers ? "Masquer les réponses pour tous les QCMs" : "Afficher les réponses pour tous les QCMs"}
              >
                {globalShowAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{globalShowAnswers ? 'Masquer les réponses' : 'Afficher les réponses'}</span>
              </button>
            )}

            {onOpenEditQcmModal && (
              <button
                onClick={() => onOpenEditQcmModal(undefined, course.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30 text-xs font-bold transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter un QCM</span>
              </button>
            )}

            <button
              onClick={() => onStartQcmQuiz(course)}
              disabled={qcms.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>S'entraîner ({qcms.length})</span>
            </button>
          </div>
        </div>

        {qcms.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400">
            Aucun QCM enregistré pour ce cours. Cliquez sur <strong>Générer +3 QCMs</strong> ou <strong>+ Ajouter un QCM</strong> pour en créer un manuellement.
          </div>
        ) : (
          <div className="space-y-3">
            {qcms.map((qcm, idx) => {
              const trueCount = qcm.items ? qcm.items.filter(it => it.isTrue).length : 0;
              const isExpanded = expandedQcmIds.has(qcm.id);
              const answersVisible = isQcmAnswerVisible(qcm.id);

              return (
                <div
                  key={qcm.id}
                  className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden text-xs shadow-2xs"
                >
                  <div
                    onClick={() => toggleExpandQcm(qcm.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-900/90 transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                          #{idx + 1}
                        </span>
                        <span className="text-amber-500 dark:text-amber-400 font-mono text-[11px]">
                          {'★'.repeat(qcm.difficulty || 3)}{'☆'.repeat(5 - (qcm.difficulty || 3))}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                          {answersVisible
                            ? `${trueCount} Vraie(s) • ${5 - trueCount} Fausse(s)`
                            : '5 propositions (A à E)'}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white leading-snug">
                        <MarkdownRenderer content={qcm.questionStem} inline />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartQcmQuiz(course, [qcm]);
                        }}
                        title="Lancer l'entraînement sur ce QCM"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold transition-all active:scale-95 shadow-2xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-emerald-700 dark:text-emerald-300" />
                        <span className="hidden sm:inline">S'entraîner</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRevealQcm(qcm.id);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                          answersVisible
                            ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                            : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                        }`}
                        title={answersVisible ? "Masquer les réponses de ce QCM" : "Afficher les réponses de ce QCM"}
                      >
                        {answersVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{answersVisible ? 'Masquer réponses' : 'Voir réponses'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyQcm(qcm);
                        }}
                        title="Vérifier la véracité et l'exactitude avec Gemini (Google Search)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/70 dark:hover:bg-indigo-600 text-indigo-900 dark:text-indigo-200 hover:text-indigo-950 dark:hover:text-white border border-indigo-300 dark:border-indigo-500/40 text-xs font-bold transition-all active:scale-95 shadow-2xs group"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-sky-400 group-hover:text-indigo-950 dark:group-hover:text-white" />
                        <span>Vérifier</span>
                      </button>

                      {onOpenEditQcmModal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditQcmModal(qcm, course.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-600 text-sky-800 dark:text-sky-300 hover:text-sky-950 dark:hover:text-white border border-sky-300 dark:border-sky-500/30 text-xs font-semibold transition-all shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-700 dark:text-sky-300" />
                          <span className="text-sky-800 dark:text-sky-300 font-semibold">Modifier</span>
                        </button>
                      )}

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('Supprimer définitivement ce QCM ?')) return;
                          try {
                            await api.deleteQcm(qcm.id);
                            loadCourseData();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-600 text-rose-800 dark:text-rose-400 hover:text-rose-950 dark:hover:text-white border border-rose-300 dark:border-rose-500/20 transition-all shadow-2xs"
                        title="Supprimer ce QCM"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                      </button>

                      <div className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2 animate-fadeIn">
                      {qcm.items && qcm.items.map((item) => (
                        <div
                          key={item.itemLetter}
                          className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all shadow-2xs ${
                            answersVisible
                              ? item.isTrue
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                : 'bg-rose-50/90 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-950 dark:text-rose-100'
                              : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 flex-1">
                              <span className="font-mono font-extrabold text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
                                {item.itemLetter}
                              </span>
                              <div className="leading-snug flex-1 min-w-0">
                                <MarkdownRenderer content={item.text} inline />
                              </div>
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
                              <MarkdownRenderer content={item.explanation} inline />
                              {item.isTrap && (
                                <span className="ml-2 text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/40 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                  ⚠️ Piège de concours
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

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
                              <MarkdownRenderer content={cleanedMne} inline />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flashcards (Active Recall) Section */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Fiches de Mémorisation Active & Flashcards</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                {flashcards.length} carte{flashcards.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Révisez les formules, définitions et repères essentiels avec le lecteur 3D aléatoire.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {flashcards.length > 0 && onStartFlashcardsStudy && (
              <button
                onClick={() => onStartFlashcardsStudy(flashcards, 0, currentCourse.title)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/30 transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>S'entraîner ({flashcards.length})</span>
              </button>
            )}

            {flashcards.length > 0 && (
              <button
                onClick={() => setIsPrintFlashcardsModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Imprimer ou exporter en PDF les flashcards de ce cours"
              >
                <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Imprimer</span>
              </button>
            )}

            {onOpenEditFlashcardModal && (
              <button
                onClick={() => onOpenEditFlashcardModal(undefined, currentCourse.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            )}

            <button
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingFlashcards ? 'animate-spin' : ''}`} />
              <span>{isGeneratingFlashcards ? 'Génération Gemini...' : '✨ Générer +5 Flashcards'}</span>
            </button>
          </div>
        </div>

        {flashcards.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-2 bg-slate-50/50 dark:bg-slate-950/30">
            <Layers className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Aucune flashcard enregistrée pour ce cours.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingFlashcards}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                ✨ Générer 5 cartes avec l'IA
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {flashcards.map((fc) => (
              <div
                key={fc.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 hover:border-amber-500/40 transition-all shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/30">
                      Flashcard
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/flashcards/${fc.id}`;
                          navigator.clipboard.writeText(url);
                          window.history.pushState(null, '', `/flashcards/${fc.id}`);
                          if (onShowToast) onShowToast(`✓ Lien direct copié : /flashcards/${fc.id}`);
                        }}
                        className="text-slate-400 hover:text-amber-500 transition-colors p-1"
                        title="Copier le lien direct de la flashcard (/flashcards/...)"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.toggleFlashcardFavorite(fc.id);
                          loadCourseData();
                        }}
                        className="text-slate-400 hover:text-amber-400 transition-colors p-1"
                        title={fc.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris ⭐'}
                      >
                        <Star className={`w-3.5 h-3.5 ${fc.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                    <MarkdownRenderer content={fc.front} />
                  </div>
                  {fc.hint && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 px-2 py-0.5 rounded truncate">
                      💡 {fc.hint}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {onStartFlashcardsStudy && (
                    <button
                      type="button"
                      onClick={() => onStartFlashcardsStudy([fc], 0, currentCourse.title)}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-amber-500" />
                      <span>Réviser</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyFlashcard(fc)}
                      className="p-1 text-slate-400 hover:text-amber-500 rounded"
                      title="Vérifier la flashcard par IA (Fact-Checking)"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                    {onOpenEditFlashcardModal && (
                      <button
                        type="button"
                        onClick={() => onOpenEditFlashcardModal(fc, currentCourse.id)}
                        className="p-1 text-slate-400 hover:text-sky-400 rounded"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Supprimer cette flashcard ?')) return;
                        await api.deleteFlashcard(fc.id);
                        loadCourseData();
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medical Illustrations & Fill-in-the-Blank Diagrams Gallery */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-purple-400">🎨</span>
              Croquis, Schémas & Dessins à Trous ({illustrations.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewIllustrationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Générer un schéma / planche</span>
            </button>
          </div>
        </div>

        {illustrations.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 space-y-3">
            <p>
              Aucun schéma ou dessin à trous généré pour ce cours.
            </p>
            <p className="text-[11px] text-slate-400">
              Générez des planches anatomiques et des dessins à trous avec <code>gemini-3-pro-image</code> (Nano Banana Pro) pour vous entraîner et les imprimer !
            </p>
            <button
              onClick={() => setIsNewIllustrationModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
            >
              <span>✨</span>
              <span>Créer ma 1ère planche d'entraînement</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {illustrations.map((illus) => {
              const isFill = illus.illustrationType === 'DESSIN_A_TROUS';
              return (
                <div
                  key={illus.id}
                  onClick={() => setSelectedIllustration(illus)}
                  className="group rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600/60 p-3.5 space-y-3 transition-all cursor-pointer shadow-2xs hover:shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Thumbnail Image */}
                    <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner">
                      <img
                        src={illus.imageUrl}
                        alt={illus.title}
                        className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${
                          illus.illustrationType === 'DESSIN_A_TROUS'
                            ? 'bg-purple-100 dark:bg-purple-950/90 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                            : illus.illustrationType === 'SCHEMA_FONCTIONNEL'
                            ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : illus.illustrationType === 'CROQUIS_SYNTHETIQUE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                        }`}>
                          {illus.illustrationType === 'DESSIN_A_TROUS'
                            ? '🎯 Dessin à trous'
                            : illus.illustrationType === 'SCHEMA_FONCTIONNEL'
                            ? '⚙️ Schéma Fonctionnel'
                            : illus.illustrationType === 'CROQUIS_SYNTHETIQUE'
                            ? '✏️ Croquis de cours'
                            : '🔬 Schéma Anatomique'}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {illus.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {illus.prompt}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>🏷️ {illus.legendItems?.length || 0} repères</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <span>🔍</span> Voir & Imprimer
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Documents & Scans Section */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Documents & Fiches Numérisées</span>
              {((currentCourse.documents?.length || 0) + scans.length > 0) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                  {(currentCourse.documents?.length || 0) + scans.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Polycopiés PDF, documents rattachés et fiches de révision numérisées par l'IA.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <input
              ref={fileUploadRef}
              type="file"
              accept=".pdf,image/*,.txt,.md"
              className="hidden"
              onChange={handleDirectFileUpload}
            />

            <button
              onClick={() => fileUploadRef.current?.click()}
              disabled={isUploadingFile}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-sky-500" />
              <span>{isUploadingFile ? 'Téléversement...' : 'Ajouter un fichier (PDF / image)'}</span>
            </button>

            <button
              onClick={() => onOpenScannerForCourse(currentCourse)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Scanner un PDF / une photo</span>
            </button>
          </div>
        </div>

        {/* 1. Attached Files / PDFs / Images */}
        {currentCourse.documents && currentCourse.documents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>Fichiers originaux rattachés ({currentCourse.documents.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentCourse.documents.map(doc => {
                const isPdf = doc.fileType === 'PDF' || doc.name.toLowerCase().endsWith('.pdf');
                const isAnnale = doc.fileType === 'QCM_SCAN';
                const formattedSize = doc.sizeBytes > 0
                  ? doc.sizeBytes < 1024 * 1024
                    ? `${(doc.sizeBytes / 1024).toFixed(0)} Ko`
                    : `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} Mo`
                  : '';

                return (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5 shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          isPdf ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                          isAnnale ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' :
                          'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors" title={doc.name}>
                            {doc.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {isPdf ? 'PDF' : isAnnale ? 'Annale' : 'Fiche'}
                            </span>
                            {formattedSize && <span>{formattedSize}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Détacher ce document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : ''}
                      </span>
                      <a
                        href={doc.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline"
                      >
                        <span>Ouvrir / Consulter</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Scanned Fiches with Gemini Multimodal Transcriptions */}
        {scans.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Fiches & Synthèses extraites par Gemini ({scans.length})</span>
            </h3>

            <div className="space-y-3">
              {scans.map(scan => {
                const isExpanded = expandedScanIds.has(scan.id);
                return (
                  <div
                    key={scan.id}
                    className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-sm"
                  >
                    {/* Fiche Header Row */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/20">
                            Fiche IA Numérisée
                          </span>
                          {scan.scannedAt && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {new Date(scan.scannedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {scan.courseTitle || 'Synthèse Manuscrite'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {scan.imageUrls && scan.imageUrls.length > 1 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {scan.imageUrls.map((url, pIdx) => (
                              <a
                                key={pIdx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
                                title={`Voir la page ${pIdx + 1} du document source`}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Page {pIdx + 1}</span>
                              </a>
                            ))}
                          </div>
                        ) : scan.imageUrl ? (
                          <a
                            href={scan.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
                            title="Voir le fichier original scanné"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Document source</span>
                          </a>
                        ) : null}

                        <button
                          onClick={() => toggleScanExpanded(scan.id)}
                          className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-600/20 hover:bg-sky-100 dark:hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>{isExpanded ? 'Masquer la synthèse' : 'Afficher la synthèse'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteScan(scan.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Supprimer cette fiche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Summary Quick Badges */}
                    <div className="px-4 py-2 bg-slate-50/40 dark:bg-slate-950/20 border-t border-b border-slate-200 dark:border-slate-800/50 flex items-center gap-3 overflow-x-auto text-[11px] text-slate-600 dark:text-slate-400">
                      {scan.keyPoints && scan.keyPoints.length > 0 && (
                        <span className="flex items-center gap-1 shrink-0 font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{scan.keyPoints.length} points clés</span>
                        </span>
                      )}
                      {scan.anatomicalTerms && scan.anatomicalTerms.length > 0 && (
                        <span className="flex items-center gap-1 shrink-0 font-bold text-sky-700 dark:text-sky-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{scan.anatomicalTerms.length} termes clés</span>
                        </span>
                      )}
                      {scan.potentialExamTraps && scan.potentialExamTraps.length > 0 && (
                        <span className="flex items-center gap-1 shrink-0 font-bold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{scan.potentialExamTraps.length} pièges concours</span>
                        </span>
                      )}
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="p-5 space-y-5 bg-slate-50/60 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                        {/* Markdown Transcription */}
                        {scan.transcriptionMarkdown && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-1.5">
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Transcription & Synthèse Structurée</span>
                            </h5>
                            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-200 shadow-2xs">
                              <MarkdownRenderer content={scan.transcriptionMarkdown} />
                            </div>
                          </div>
                        )}

                        {/* Key Points */}
                        {scan.keyPoints && scan.keyPoints.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Points Clés Retenus</span>
                            </h5>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {scan.keyPoints.map((kp, idx) => (
                                <li key={idx} className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs font-medium text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs">
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-emerald-500/20 text-white dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs">
                                    {idx + 1}
                                  </span>
                                  <div className="leading-relaxed flex-1 min-w-0">
                                    <MarkdownRenderer content={kp} inline />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Figures & Values */}
                        {scan.keyFiguresAndValues && scan.keyFiguresAndValues.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              <span>Chiffres & Constantes Clés</span>
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {scan.keyFiguresAndValues.map((fig, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 text-xs font-mono font-bold">
                                  <MarkdownRenderer content={fig} inline />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exam Traps */}
                        {scan.potentialExamTraps && scan.potentialExamTraps.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Pièges de Concours Identifiés</span>
                            </h5>
                            <div className="space-y-2">
                              {scan.potentialExamTraps.map((trap, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 text-xs font-medium text-amber-950 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <div className="leading-relaxed flex-1 min-w-0">
                                    <MarkdownRenderer content={trap} inline />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mnemonics */}
                        {scan.mnemonics && scan.mnemonics.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Moyens Mnémotechniques Recommandés</span>
                            </h5>
                            <div className="space-y-1.5">
                              {scan.mnemonics.map((mne, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 text-xs font-medium text-amber-950 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
                                  <span className="shrink-0 mt-0.5">💡</span>
                                  <div className="leading-relaxed flex-1 min-w-0">
                                    <MarkdownRenderer content={mne} inline />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State when no documents and no scans */}
        {(!currentCourse.documents || currentCourse.documents.length === 0) && scans.length === 0 && (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun document ni fiche numérisée pour ce cours.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vous pouvez téléverser un polycopié PDF ou numériser vos fiches manuscrites et annales avec Gemini.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              <button
                onClick={() => fileUploadRef.current?.click()}
                disabled={isUploadingFile}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-500" />
                <span>{isUploadingFile ? 'Téléversement...' : 'Ajouter un fichier (PDF / image)'}</span>
              </button>
              <button
                onClick={() => onOpenScannerForCourse(currentCourse)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Numériser un document avec Gemini</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. TUTEUR IA CONVERSATION THREADS FOR THIS COURSE                         */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <span>Conversations avec le Tuteur IA</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                {tutorThreads.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Échanges, questions-réponses et synthèses interactives générées avec le Tuteur IA pour ce cours.
            </p>
          </div>

          <button
            onClick={() => onOpenAiTutor(currentCourse)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/20 active:scale-95 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Bot className="w-4 h-4" />
            <span>+ Poser une question au Tuteur IA</span>
          </button>
        </div>

        {tutorThreads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {tutorThreads.map((thread) => {
              const messageCount = thread.messages?.length || 0;
              const lastMsg = thread.messages && thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : null;
              const hasCreatedQcm = thread.messages?.some(m => m.createdQcm != null);
              const hasCreatedIllus = thread.messages?.some(m => m.createdIllustration != null);
              const hasCreatedFlashcard = thread.messages?.some(m => m.createdFlashcard != null);

              const formattedDate = thread.updatedAt
                ? new Date(thread.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : thread.createdAt
                  ? new Date(thread.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : '';

              return (
                <div
                  key={thread.id}
                  onClick={() => onOpenAiTutorThread ? onOpenAiTutorThread(currentCourse, thread.id) : onOpenAiTutor(currentCourse)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-950/10 cursor-pointer transition-all flex flex-col justify-between gap-3 group shadow-2xs"
                >
                  <div className="space-y-2">
                    {/* Card Top: Title & Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors" title={thread.title}>
                          {thread.title}
                        </h4>
                      </div>

                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        disabled={isDeletingThreadId === thread.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        title="Supprimer cette conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 italic">
                        « {lastMsg.content.replace(/[#*`_]/g, '').slice(0, 140)}... »
                      </p>
                    )}

                    {/* Generated Tools Badges */}
                    {(hasCreatedQcm || hasCreatedIllus || hasCreatedFlashcard) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {hasCreatedQcm && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
                            <span>✨</span>
                            <span>QCM généré</span>
                          </span>
                        )}
                        {hasCreatedIllus && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1">
                            <span>🖼️</span>
                            <span>Schéma généré</span>
                          </span>
                        )}
                        {hasCreatedFlashcard && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                            <span>🃏</span>
                            <span>Flashcard générée</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Message count, Date & Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {messageCount} message{messageCount > 1 ? 's' : ''}
                      </span>
                      {formattedDate && <span className="text-[10px]">{formattedDate}</span>}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Ouvrir</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto text-sky-500 shadow-2xs">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune conversation enregistrée pour ce cours.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Posez vos questions de cours, demandez des explications physiologiques ou générez des QCMs ciblés avec le Tuteur IA.
              </p>
            </div>
            <div className="pt-1">
              <button
                onClick={() => onOpenAiTutor(currentCourse)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/20 active:scale-95 transition-all cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Démarrer une conversation sur ce cours</span>
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* Flashcard Verification Modal */}
      <FlashcardVerificationModal
        isOpen={isFlashcardVerificationModalOpen}
        onClose={() => {
          setIsFlashcardVerificationModalOpen(false);
          setVerifyingFlashcard(null);
          setFlashcardVerificationResult(null);
        }}
        flashcard={verifyingFlashcard}
        verificationResult={flashcardVerificationResult}
        isLoading={isVerifyingFlashcard}
        onApplyCorrection={handleApplyFlashcardCorrection}
      />

      {/* Edit Course Rich Notes Modal */}
      <EditCourseNotesModal
        isOpen={isEditNotesOpen}
        onClose={() => setIsEditNotesOpen(false)}
        course={currentCourse}
        onNotesSaved={(updated) => {
          setCurrentCourse(updated);
          if (onCourseUpdated) onCourseUpdated(updated);
        }}
      />

      {/* Medical Illustration Viewer / Test / Print Modal */}
      {selectedIllustration && (
        <MedicalIllustrationModal
          illustration={selectedIllustration}
          onClose={() => setSelectedIllustration(null)}
          onUpdated={(updated) => {
            setSelectedIllustration(updated);
            setIllustrations(prev => prev.map(i => i.id === updated.id ? updated : i));
          }}
          onDeleted={(id) => {
            setSelectedIllustration(null);
            setIllustrations(prev => prev.filter(i => i.id !== id));
          }}
        />
      )}

      {/* New Illustration Generator Modal */}
      {isNewIllustrationModalOpen && (
        <NewIllustrationModal
          course={course}
          courses={[course]}
          onClose={() => setIsNewIllustrationModalOpen(false)}
          onCreated={(created) => {
            setIllustrations(prev => [created, ...prev]);
            setSelectedIllustration(created);
          }}
        />
      )}

      {/* Print Flashcards Modal */}
      <PrintFlashcardsModal
        isOpen={isPrintFlashcardsModalOpen}
        onClose={() => setIsPrintFlashcardsModalOpen(false)}
        flashcards={flashcards}
        subjects={subjects}
        contextTitle={`Flashcards • [${currentCourse.ueCode}] ${currentCourse.title}`}
        onShowToast={onShowToast}
      />

      {/* Delete Revision Modal */}
      <DeleteRevisionModal
        isOpen={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        session={sessionToDelete}
        onConfirmDelete={handleDeleteRevisionConfirmed}
      />

      {/* Delete Course Modal */}
      <DeleteCourseModal
        isOpen={isDeleteCourseModalOpen}
        onClose={() => setIsDeleteCourseModalOpen(false)}
        course={currentCourse}
        subject={subject}
        onConfirmDelete={handleDeleteCourseConfirmed}
      />

    </div>
  );
};
