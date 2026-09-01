import React, { useState, useEffect } from 'react';
import {
  SubjectUE,
  Course,
  RevisionSession,
  TodaySummary,
  JScheduleConfig,
  QcmQuestion,
  Flashcard,
  FlashcardReviewRating
} from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JCalendarView } from './components/JCalendarView';
import { CourseListView } from './components/CourseListView';
import { CourseDetailView } from './components/CourseDetailView';
import { QcmBankView } from './components/QcmBankView';
import { FlashcardBankView } from './components/FlashcardBankView';
import { EditQcmModal } from './components/EditQcmModal';
import { EditFlashcardModal } from './components/EditFlashcardModal';
import { FlashcardPlayerModal } from './components/FlashcardPlayerModal';
import { EditSubjectModal } from './components/EditSubjectModal';
import { AiTutorChat } from './components/AiTutorChat';
import { QcmTrainerModal } from './components/QcmTrainerModal';
import { GeminiScannerModal } from './components/GeminiScannerModal';
import { NewCourseModal } from './components/NewCourseModal';
import { EditCourseModal } from './components/EditCourseModal';
import { MedicalIllustrationModal } from './components/MedicalIllustrationModal';
import { getLocalTodayString } from './utils/dateUtils';
import { AddRevisionModal } from './components/AddRevisionModal';
import { SettingsModal } from './components/SettingsModal';
import { ColdStartLoader } from './components/ColdStartLoader';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'courses' | 'qcms' | 'flashcards' | 'tutor' | 'scans'>('dashboard');
  const [subjects, setSubjects] = useState<SubjectUE[]>(() => {
    try {
      const cached = localStorage.getItem('medj_subjects_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const cached = localStorage.getItem('medj_courses_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [revisions, setRevisions] = useState<RevisionSession[]>(() => {
    try {
      const cached = localStorage.getItem('medj_all_revisions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [todaySummary, setTodaySummary] = useState<TodaySummary>(() => {
    try {
      const cached = localStorage.getItem('medj_today_summary');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      todayDate: getLocalTodayString(),
      dueToday: [],
      overdue: [],
      completedToday: [],
      totalDueCount: 0,
      completedCount: 0,
    };
  });
  const [isInitialDataLoading, setIsInitialDataLoading] = useState<boolean>(() => {
    try {
      const cachedCourses = localStorage.getItem('medj_courses_cache');
      const cachedSubjects = localStorage.getItem('medj_subjects_cache');
      return !(cachedCourses && cachedSubjects && JSON.parse(cachedCourses).length > 0);
    } catch {
      return true;
    }
  });

  // Modal and view states
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);
  const [tutorInitialCourse, setTutorInitialCourse] = useState<Course | null>(null);
  const [tutorInitialThreadId, setTutorInitialThreadId] = useState<string | null>(null);
  const [targetQcmId, setTargetQcmId] = useState<string | null>(null);
  const [targetFlashcardId, setTargetFlashcardId] = useState<string | null>(null);
  const [activeQcmCourse, setActiveQcmCourse] = useState<Course | null>(null);
  const [activeCustomQcms, setActiveCustomQcms] = useState<QcmQuestion[] | undefined>(undefined);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [newCourseInitialUeId, setNewCourseInitialUeId] = useState<string | undefined>(undefined);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isAddRevisionOpen, setIsAddRevisionOpen] = useState(false);
  const [addRevisionInitialDate, setAddRevisionInitialDate] = useState<string | undefined>(undefined);
  const [addRevisionInitialCourseId, setAddRevisionInitialCourseId] = useState<string | undefined>(undefined);
  const [editingQcm, setEditingQcm] = useState<QcmQuestion | null>(null);
  const [isEditQcmOpen, setIsEditQcmOpen] = useState(false);
  const [editQcmInitialCourseId, setEditQcmInitialCourseId] = useState<string | undefined>(undefined);
  const [editingSubject, setEditingSubject] = useState<SubjectUE | null>(null);
  const [revisionUpdateTrigger, setRevisionUpdateTrigger] = useState(0);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [selectedCourseForScan, setSelectedCourseForScan] = useState<Course | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Flashcards state
  const [isEditFlashcardOpen, setIsEditFlashcardOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [editFlashcardCourseId, setEditFlashcardCourseId] = useState<string | undefined>(undefined);
  const [isFlashcardPlayerOpen, setIsFlashcardPlayerOpen] = useState(false);
  const [playerFlashcards, setPlayerFlashcards] = useState<Flashcard[]>([]);
  const [playerInitialIndex, setPlayerInitialIndex] = useState(0);
  const [playerDeckTitle, setPlayerDeckTitle] = useState<string | undefined>(undefined);

  // Deep linking: Route parser
  const parseRoute = (pathname: string): {
    tab: 'dashboard' | 'calendar' | 'courses' | 'qcms' | 'flashcards' | 'tutor' | 'scans';
    courseId?: string;
    qcmId?: string;
    flashcardId?: string;
    threadId?: string;
  } => {
    const clean = pathname.replace(/\/+$/, '') || '/';

    if (clean === '/' || clean === '/today' || clean === '/dashboard') {
      return { tab: 'dashboard' };
    }
    if (clean === '/planning' || clean === '/calendar') {
      return { tab: 'calendar' };
    }
    if (clean === '/subjects' || clean === '/courses') {
      return { tab: 'courses' };
    }
    if (clean.startsWith('/subjects/') || clean.startsWith('/courses/')) {
      const parts = clean.split('/');
      return { tab: 'courses', courseId: parts[2] };
    }
    if (clean === '/qcms') {
      return { tab: 'qcms' };
    }
    if (clean.startsWith('/qcms/')) {
      const parts = clean.split('/');
      return { tab: 'qcms', qcmId: parts[2] };
    }
    if (clean === '/flashcards') {
      return { tab: 'flashcards' };
    }
    if (clean.startsWith('/flashcards/')) {
      const parts = clean.split('/');
      return { tab: 'flashcards', flashcardId: parts[2] };
    }
    if (clean === '/ia' || clean === '/tutor') {
      return { tab: 'tutor' };
    }
    if (clean.startsWith('/ia/thread/') || clean.startsWith('/tutor/thread/')) {
      const parts = clean.split('/');
      return { tab: 'tutor', threadId: parts[3] };
    }
    if (clean.startsWith('/ia/') || clean.startsWith('/tutor/')) {
      const parts = clean.split('/');
      return { tab: 'tutor', courseId: parts[2] };
    }
    if (clean === '/scans') {
      return { tab: 'scans' };
    }
    return { tab: 'dashboard' };
  };

  const applyRoute = (pathname: string, courseList = courses) => {
    const route = parseRoute(pathname);
    setCurrentTab(route.tab);

    if (route.tab === 'tutor') {
      if (route.courseId) {
        const found = courseList.find(c => c.id.toLowerCase() === route.courseId!.toLowerCase());
        setTutorInitialCourse(found || null);
      } else {
        setTutorInitialCourse(null);
      }
      if (route.threadId) {
        setTutorInitialThreadId(route.threadId);
      } else {
        setTutorInitialThreadId(null);
      }
      setSelectedCourseForDetail(null);
    } else if (route.tab === 'courses' && route.courseId) {
      const found = courseList.find(c => c.id.toLowerCase() === route.courseId!.toLowerCase());
      setSelectedCourseForDetail(found || null);
    } else {
      setSelectedCourseForDetail(null);
    }

    if (route.qcmId) {
      setTargetQcmId(route.qcmId);
    } else {
      setTargetQcmId(null);
    }

    if (route.flashcardId) {
      setTargetFlashcardId(route.flashcardId);
    } else {
      setTargetFlashcardId(null);
    }
  };

  const navigate = (path: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    applyRoute(path);
  };

  // Listen to browser Back/Forward popstate
  useEffect(() => {
    const onPopState = () => {
      applyRoute(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [courses]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartQuiz = (course: Course, qcms?: QcmQuestion[]) => {
    setActiveQcmCourse(course);
    setActiveCustomQcms(qcms);
  };

  const handleOpenAddRevision = (date?: string, courseId?: string) => {
    setAddRevisionInitialDate(date);
    setAddRevisionInitialCourseId(courseId);
    setIsAddRevisionOpen(true);
  };

  const loadAllData = async () => {
    try {
      const [subjData, courseData, todayData, allRevs] = await Promise.all([
        api.getSubjects(),
        api.getCourses(),
        api.getTodaySummary(),
        api.getAllRevisions()
      ]);
      setSubjects(subjData);
      setCourses(courseData);
      setTodaySummary(todayData);
      setRevisions(allRevs);

      // Apply initial route with loaded courses
      applyRoute(window.location.pathname, courseData);
    } catch (e) {
      console.error('Failed to load initial data', e);
    } finally {
      setIsInitialDataLoading(false);
    }
  };

  const handleLoadSampleData = async () => {
    try {
      const res = await api.loadSampleData();
      await loadAllData();
      showToast(`✓ ${res.message || 'Données d\'exemple chargées avec succès !'}`);
    } catch (e) {
      console.error('Failed to load sample data', e);
      showToast('❌ Erreur lors du chargement des données d\'exemple');
    }
  };

  const handleClearData = async () => {
    try {
      const res = await api.clearSampleData();
      await loadAllData();
      showToast(`✓ ${res.message || 'Données réinitialisées avec succès.'}`);
    } catch (e) {
      console.error('Failed to clear data', e);
      showToast('❌ Erreur lors de la réinitialisation des données');
    }
  };

  const handleCompleteRevision = async (sessionId: string, evaluation: string) => {
    const todayStr = getLocalTodayString();
    const evalGrade = (evaluation as RevisionSession['evaluation']) || 'MOYEN';

    // Immediate optimistic UI update
    setTodaySummary(prev => {
      const targetSession = prev.dueToday.find(s => s.id === sessionId) || prev.overdue.find(s => s.id === sessionId);
      const validatedSession: RevisionSession | undefined = targetSession
        ? { ...targetSession, status: 'VALIDE', evaluation: evalGrade, completedDate: todayStr }
        : undefined;

      const newDueToday = prev.dueToday.filter(s => s.id !== sessionId);
      const newOverdue = prev.overdue.filter(s => s.id !== sessionId);
      const newCompleted = validatedSession
        ? [validatedSession, ...prev.completedToday.filter(s => s.id !== sessionId)]
        : prev.completedToday;

      return {
        ...prev,
        dueToday: newDueToday,
        overdue: newOverdue,
        completedToday: newCompleted,
        totalDueCount: newDueToday.length + newOverdue.length,
        completedCount: newCompleted.length
      };
    });

    setRevisions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, status: 'VALIDE', evaluation: evalGrade, completedDate: todayStr } : s))
    );

    try {
      await api.completeRevision(sessionId, evaluation, 100, 25);
      showToast('✓ Révision validée avec succès !');
      await loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUncompleteRevision = async (sessionId: string) => {
    const todayStr = getLocalTodayString();

    // Immediate optimistic UI update
    setTodaySummary(prev => {
      const targetSession = prev.completedToday.find(s => s.id === sessionId);
      const restoredSession: RevisionSession | undefined = targetSession
        ? {
            ...targetSession,
            status: targetSession.scheduledDate < todayStr ? 'EN_RETARD' : 'A_FAIRE',
            evaluation: undefined,
            completedDate: undefined
          }
        : undefined;

      const newCompleted = prev.completedToday.filter(s => s.id !== sessionId);
      const isDueToday = targetSession && targetSession.scheduledDate === todayStr;
      const isOverdue = targetSession && targetSession.scheduledDate < todayStr;

      const newDueToday = restoredSession && isDueToday ? [...prev.dueToday, restoredSession] : prev.dueToday;
      const newOverdue = restoredSession && isOverdue ? [...prev.overdue, restoredSession] : prev.overdue;

      return {
        ...prev,
        dueToday: newDueToday,
        overdue: newOverdue,
        completedToday: newCompleted,
        totalDueCount: newDueToday.length + newOverdue.length,
        completedCount: newCompleted.length
      };
    });

    setRevisions(prev =>
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
      await api.uncompleteRevision(sessionId);
      showToast('Séance reprogrammée (non-validée)');
      await loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShiftRevision = async (sessionId: string, days: number) => {
    setRevisions(prev =>
      prev.map(s => {
        if (s.id === sessionId) {
          const curDate = new Date(s.scheduledDate);
          curDate.setDate(curDate.getDate() + days);
          return { ...s, scheduledDate: curDate.toISOString().split('T')[0], status: 'REPORTE' };
        }
        return s;
      })
    );

    try {
      await api.shiftRevision(sessionId, days);
      showToast(`Séance décalée de +${days} jour(s)`);
      await loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRevision = async (sessionId: string, deleteFollowing: boolean = false) => {
    try {
      await api.deleteRevision(sessionId, deleteFollowing);
      showToast(deleteFollowing ? '✓ Séances futures supprimées jusqu\'à la fin du semestre' : '✓ Séance de révision supprimée');
      await loadAllData();
      setRevisionUpdateTrigger(prev => prev + 1);
    } catch (e) {
      console.error('Failed to delete revision', e);
      showToast('❌ Erreur lors de la suppression de la révision');
    }
  };

  const handleShiftSubject = async (ueId: string, days: number) => {
    try {
      const updated = await api.shiftSubject(ueId, days);
      showToast(`${updated.length} séances de cette UE décalées de +${days} jour(s) !`);
      await loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSmoothing = async () => {
    try {
      const res = await api.smoothWorkload();
      showToast(
        res.adjustedSessionsCount > 0
          ? `Lissage terminé : ${res.adjustedSessionsCount} séance(s) rééquilibrée(s) (cours difficiles préservés) !`
          : 'Charge déjà équilibrée : tous vos cours prioritaires sont optimisés.'
      );
      await loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditFlashcardModal = (flashcard?: Flashcard, defaultCourseId?: string) => {
    setEditingFlashcard(flashcard || null);
    setEditFlashcardCourseId(defaultCourseId);
    setIsEditFlashcardOpen(true);
  };

  const handleSaveFlashcard = async (payload: Partial<Flashcard>) => {
    if (payload.id) {
      await api.updateFlashcard(payload.id, payload);
      showToast('✓ Flashcard modifiée avec succès !');
    } else {
      await api.createFlashcard(payload);
      showToast('✓ Nouvelle flashcard créée avec succès !');
    }
    setRevisionUpdateTrigger(prev => prev + 1);
  };

  const handleStartStudyFlashcards = (cards: Flashcard[], initialIndex: number = 0, title?: string) => {
    if (!cards || cards.length === 0) {
      showToast('Aucune flashcard à étudier.');
      return;
    }
    setPlayerFlashcards(cards);
    setPlayerInitialIndex(initialIndex);
    setPlayerDeckTitle(title);
    setIsFlashcardPlayerOpen(true);
  };

  const handleToggleFlashcardFavorite = async (id: string) => {
    try {
      await api.toggleFlashcardFavorite(id);
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  };

  const handleRecordFlashcardReview = async (id: string, rating: FlashcardReviewRating) => {
    try {
      await api.recordFlashcardReview(id, rating);
    } catch (e) {
      console.error('Failed to record review', e);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    try {
      const res = await api.syncGoogleCalendar();
      showToast(`Agenda Google Calendar synchronisé (${res.syncedCount} événements) !`);
    } catch (e) {
      showToast('Erreur lors de la synchronisation');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  if (loading || (user && isInitialDataLoading)) {
    return <ColdStartLoader onRetry={() => loadAllData()} />;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 border border-sky-500/50 shadow-2xl text-xs font-bold text-sky-300 animate-slideUp flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'dashboard') navigate('/today');
          else if (tab === 'calendar') navigate('/planning');
          else if (tab === 'courses') navigate('/subjects');
          else if (tab === 'qcms') navigate('/qcms');
          else if (tab === 'flashcards') navigate('/flashcards');
          else if (tab === 'tutor') navigate('/ia');
          else navigate(`/${tab}`);
        }}
        onOpenScanner={() => {
          setSelectedCourseForScan(undefined);
          setIsScannerOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSyncCalendar={handleSyncCalendar}
        isSyncingCalendar={isSyncingCalendar}
        totalDueCount={todaySummary.totalDueCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedCourseForDetail ? (
          <CourseDetailView
            course={selectedCourseForDetail}
            subjects={subjects}
            onBack={() => {
              setSelectedCourseForDetail(null);
              navigate('/subjects');
            }}
            onStartQcmQuiz={handleStartQuiz}
            onOpenAiTutor={(c) => {
              setTutorInitialCourse(c);
              setTutorInitialThreadId(null);
              setSelectedCourseForDetail(null);
              navigate(`/ia/${c.id}`);
            }}
            onOpenAiTutorThread={(c, threadId) => {
              setTutorInitialCourse(c);
              setTutorInitialThreadId(threadId);
              setSelectedCourseForDetail(null);
              navigate(`/ia/thread/${threadId}`);
            }}
            onOpenScannerForCourse={(c) => {
              setSelectedCourseForScan(c);
              setIsScannerOpen(true);
            }}
            onShiftRevision={handleShiftRevision}
            onCompleteRevision={handleCompleteRevision}
            onUncompleteRevision={handleUncompleteRevision}
            onDeleteCourse={async (id) => {
              try {
                await api.deleteCourse(id);
                setSelectedCourseForDetail(null);
                showToast('✓ Cours et révisions supprimés');
                await loadAllData();
                navigate('/subjects');
              } catch (e) {
                console.error(e);
                showToast('❌ Erreur lors de la suppression du cours');
              }
            }}
            revisionUpdateTrigger={revisionUpdateTrigger}
            onCourseUpdated={(updated) => {
              setSelectedCourseForDetail(updated);
              showToast('✓ Fiche du cours mise à jour partout !');
              loadAllData();
            }}
            onOpenEditCourseModal={(c) => {
              setEditingCourse(c);
              setIsEditCourseOpen(true);
            }}
            onOpenAddRevisionModal={handleOpenAddRevision}
            onOpenEditQcmModal={(qcm, cId) => {
              setEditingQcm(qcm || null);
              setEditQcmInitialCourseId(cId);
              setIsEditQcmOpen(true);
            }}
            onOpenEditFlashcardModal={(fc, cId) => handleOpenEditFlashcardModal(fc, cId)}
            onStartFlashcardsStudy={(cards, idx, title) => handleStartStudyFlashcards(cards, idx, title)}
            onShowToast={showToast}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                todaySummary={todaySummary}
                subjects={subjects}
                courses={courses}
                onCompleteRevision={handleCompleteRevision}
                onUncompleteRevision={handleUncompleteRevision}
                onShiftRevision={handleShiftRevision}
                onDeleteRevision={handleDeleteRevision}
                onStartQcmQuiz={handleStartQuiz}
                onSelectCourse={(c) => {
                  setSelectedCourseForDetail(c);
                  navigate(`/subjects/${c.id}`);
                }}
                onTriggerSmoothing={handleTriggerSmoothing}
                onNewCourseJ0={() => setIsNewCourseOpen(true)}
                onLoadSampleData={handleLoadSampleData}
                revisionUpdateTrigger={revisionUpdateTrigger}
              />
            )}

            {currentTab === 'calendar' && (
              <JCalendarView
                revisions={revisions}
                subjects={subjects}
                courses={courses}
                onShiftRevision={handleShiftRevision}
                onShiftSubject={handleShiftSubject}
                onCompleteRevision={handleCompleteRevision}
                onUncompleteRevision={handleUncompleteRevision}
                onDeleteRevision={handleDeleteRevision}
                onTriggerSmoothing={handleTriggerSmoothing}
                onSelectCourse={(c) => {
                  setSelectedCourseForDetail(c);
                  navigate(`/subjects/${c.id}`);
                }}
                onOpenAddRevisionModal={handleOpenAddRevision}
              />
            )}

            {currentTab === 'courses' && (
              <CourseListView
                courses={courses}
                subjects={subjects}
                onSelectCourse={(c) => {
                  setSelectedCourseForDetail(c);
                  navigate(`/subjects/${c.id}`);
                }}
                onOpenNewCourseModal={(ueId) => {
                  setNewCourseInitialUeId(ueId);
                  setIsNewCourseOpen(true);
                }}
                onOpenEditCourseModal={(c) => {
                  setEditingCourse(c);
                  setIsEditCourseOpen(true);
                }}
                onDeleteCourse={async (id) => {
                  try {
                    await api.deleteCourse(id);
                    showToast('✓ Cours et révisions supprimés');
                    await loadAllData();
                  } catch (e) {
                    console.error(e);
                    showToast('❌ Erreur lors de la suppression du cours');
                  }
                }}
                onOpenEditSubjectModal={(subj) => {
                  setEditingSubject(subj || null);
                  setIsEditSubjectOpen(true);
                }}
                onDeleteSubject={async (subjId) => {
                  try {
                    await api.deleteSubject(subjId);
                    showToast('✓ UE / Matière supprimée.');
                    loadAllData();
                  } catch (e) {
                    console.error(e);
                  }
                }}
              />
            )}

            {currentTab === 'qcms' && (
              <QcmBankView
                courses={courses}
                subjects={subjects}
                targetQcmId={targetQcmId}
                refreshTrigger={revisionUpdateTrigger}
                onOpenEditModal={(qcm, cId) => {
                  setEditingQcm(qcm || null);
                  setEditQcmInitialCourseId(cId);
                  setIsEditQcmOpen(true);
                }}
                onStartQuiz={handleStartQuiz}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'flashcards' && (
              <FlashcardBankView
                courses={courses}
                subjects={subjects}
                targetFlashcardId={targetFlashcardId}
                onNavigate={navigate}
                onOpenEditModal={(card, cId) => handleOpenEditFlashcardModal(card, cId)}
                onStartStudy={(cards, idx, title) => handleStartStudyFlashcards(cards, idx, title)}
                onShowToast={showToast}
              />
            )}

            {currentTab === 'tutor' && (
              <AiTutorChat
                courses={courses}
                initialCourse={tutorInitialCourse || selectedCourseForDetail || undefined}
                initialThreadId={tutorInitialThreadId || undefined}
                onStartQcmQuiz={handleStartQuiz}
                onNavigateToCourse={(c) => {
                  setSelectedCourseForDetail(c);
                  navigate(`/subjects/${c.id}`);
                }}
                onQcmCreated={() => {
                  showToast('🎯 Nouveau QCM généré et ajouté à vos cours !');
                  setRevisionUpdateTrigger(prev => prev + 1);
                  loadAllData();
                }}
                onFlashcardCreated={() => {
                  showToast('🗂️ Nouvelle flashcard générée et ajoutée à vos cours !');
                  setRevisionUpdateTrigger(prev => prev + 1);
                  loadAllData();
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {activeQcmCourse && (
        <QcmTrainerModal
          course={activeQcmCourse}
          initialQcms={activeCustomQcms}
          isOpen={!!activeQcmCourse}
          onClose={() => {
            setActiveQcmCourse(null);
            setActiveCustomQcms(undefined);
          }}
          onSessionCompleted={() => {
            setActiveQcmCourse(null);
            setActiveCustomQcms(undefined);
            showToast('Séance de QCM terminée ! Score enregistré.');
            setRevisionUpdateTrigger(prev => prev + 1);
            loadAllData();
          }}
        />
      )}

      <GeminiScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        courses={courses}
        subjects={subjects}
        selectedCourseForScan={selectedCourseForScan}
        onStartQuizWithQcms={(course, qcms) => {
          handleStartQuiz(course, qcms);
        }}
        onScanSaved={() => {
          showToast('✓ Fiche / Annales numérisées avec succès !');
          setRevisionUpdateTrigger(prev => prev + 1);
          loadAllData();
        }}
      />

      <NewCourseModal
        isOpen={isNewCourseOpen}
        onClose={() => {
          setIsNewCourseOpen(false);
          setNewCourseInitialUeId(undefined);
        }}
        subjects={subjects}
        initialUeId={newCourseInitialUeId}
        onCourseCreated={(c) => {
          showToast(`✓ Cours « ${c.title} » créé à J0 !`);
          setRevisionUpdateTrigger(prev => prev + 1);
          loadAllData();
        }}
      />

      <EditCourseModal
        isOpen={isEditCourseOpen}
        onClose={() => {
          setIsEditCourseOpen(false);
          setEditingCourse(null);
        }}
        course={editingCourse}
        subjects={subjects}
        onCourseSaved={(saved) => {
          showToast(`✓ Fiche du cours « ${saved.title} » mise à jour avec succès !`);
          if (selectedCourseForDetail && selectedCourseForDetail.id === saved.id) {
            setSelectedCourseForDetail(saved);
          }
          setRevisionUpdateTrigger(prev => prev + 1);
          loadAllData();
        }}
      />

      <AddRevisionModal
        isOpen={isAddRevisionOpen}
        onClose={() => setIsAddRevisionOpen(false)}
        courses={courses}
        subjects={subjects}
        initialCourseId={addRevisionInitialCourseId}
        initialDate={addRevisionInitialDate}
        onRevisionAdded={(session) => {
          const todayStr = getLocalTodayString();
          setRevisions(prev => {
            const exists = prev.some(s => s.id === session.id);
            return exists ? prev.map(s => s.id === session.id ? session : s) : [...prev, session];
          });
          if (session.scheduledDate === todayStr) {
            setTodaySummary(prev => ({
              ...prev,
              dueToday: [...prev.dueToday.filter(s => s.id !== session.id), session],
              totalDueCount: prev.dueToday.filter(s => s.id !== session.id).length + prev.overdue.length + 1
            }));
          } else if (session.scheduledDate < todayStr) {
            setTodaySummary(prev => ({
              ...prev,
              overdue: [...prev.overdue.filter(s => s.id !== session.id), session],
              totalDueCount: prev.dueToday.length + prev.overdue.filter(s => s.id !== session.id).length + 1
            }));
          }
          setRevisionUpdateTrigger(prev => prev + 1);
          showToast(`✓ Révision J${session.jStep} ajoutée (${session.scheduledDate}) !`);
          loadAllData();
        }}
      />

      <EditQcmModal
        isOpen={isEditQcmOpen}
        onClose={() => {
          setIsEditQcmOpen(false);
          setEditingQcm(null);
          setEditQcmInitialCourseId(undefined);
        }}
        qcm={editingQcm}
        courses={courses}
        subjects={subjects}
        initialCourseId={editQcmInitialCourseId}
        onQcmSaved={(saved) => {
          showToast(editingQcm ? '✓ QCM modifié avec succès !' : '✓ Nouveau QCM créé avec succès !');
          setRevisionUpdateTrigger(prev => prev + 1);
          loadAllData();
        }}
      />

      <EditSubjectModal
        isOpen={isEditSubjectOpen}
        onClose={() => {
          setIsEditSubjectOpen(false);
          setEditingSubject(null);
        }}
        subject={editingSubject}
        coursesCount={editingSubject ? courses.filter(c => c.ueId.toLowerCase() === editingSubject.id.toLowerCase() || c.ueCode?.toLowerCase() === editingSubject.code.toLowerCase()).length : 0}
        onSubjectSaved={(saved) => {
          showToast(editingSubject ? `✓ UE ${saved.code} mise à jour !` : `✓ Nouvelle UE ${saved.code} créée !`);
          loadAllData();
        }}
        onDeleteSubject={async (subjId) => {
          try {
            await api.deleteSubject(subjId);
            showToast('✓ UE et cours associés supprimés');
            await loadAllData();
            navigate('/subjects');
          } catch (e) {
            console.error('Failed to delete subject', e);
            showToast('❌ Erreur lors de la suppression de l\'UE');
          }
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigUpdated={() => {
          showToast('Paramètres mis à jour !');
          loadAllData();
        }}
        onLoadSampleData={handleLoadSampleData}
        onClearData={handleClearData}
      />

      <EditFlashcardModal
        isOpen={isEditFlashcardOpen}
        onClose={() => {
          setIsEditFlashcardOpen(false);
          setEditingFlashcard(null);
          setEditFlashcardCourseId(undefined);
        }}
        onSave={handleSaveFlashcard}
        courses={courses}
        subjects={subjects}
        editingFlashcard={editingFlashcard}
        defaultCourseId={editFlashcardCourseId}
      />

      <FlashcardPlayerModal
        isOpen={isFlashcardPlayerOpen}
        onClose={() => setIsFlashcardPlayerOpen(false)}
        flashcards={playerFlashcards}
        initialIndex={playerInitialIndex}
        courseTitle={playerDeckTitle}
        onToggleFavorite={handleToggleFlashcardFavorite}
        onRecordReview={handleRecordFlashcardReview}
      />

    </div>
  );
};
export default App;
