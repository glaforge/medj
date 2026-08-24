import React, { useState, useEffect, useMemo } from 'react';
import {
  RevisionSession,
  TodaySummary,
  SubjectUE,
  Course,
  QcmAttempt
} from '../types';
import { api } from '../services/api';
import { ProgressionChart } from './ProgressionChart';
import { getContrastTextColor } from '../utils/colorUtils';
import { DeleteRevisionModal } from './DeleteRevisionModal';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Flame,
  Zap,
  CalendarPlus,
  Sparkles,
  Play,
  Layers,
  ChevronRight,
  BookOpen,
  TrendingUp,
  RotateCcw,
  Star,
  Plus,
  Database,
  Trash2
} from 'lucide-react';

interface DashboardViewProps {
  todaySummary: TodaySummary;
  subjects: SubjectUE[];
  courses: Course[];
  onCompleteRevision: (sessionId: string, evaluation: string) => void;
  onUncompleteRevision?: (sessionId: string) => void;
  onShiftRevision: (sessionId: string, days: number) => void;
  onDeleteRevision?: (sessionId: string, deleteFollowing: boolean) => Promise<void>;
  onStartQcmQuiz: (course: Course) => void;
  onSelectCourse: (course: Course) => void;
  onTriggerSmoothing: () => void;
  onNewCourseJ0: () => void;
  onLoadSampleData?: () => void;
  revisionUpdateTrigger?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  todaySummary,
  subjects,
  courses,
  onCompleteRevision,
  onUncompleteRevision,
  onShiftRevision,
  onDeleteRevision,
  onStartQcmQuiz,
  onSelectCourse,
  onTriggerSmoothing,
  onNewCourseJ0,
  onLoadSampleData,
  revisionUpdateTrigger
}) => {
  const [selectedEvaluation, setSelectedEvaluation] = useState<Record<string, string>>({});
  const [shiftingId, setShiftingId] = useState<string | null>(null);
  const [allAttempts, setAllAttempts] = useState<QcmAttempt[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<RevisionSession | null>(null);

  useEffect(() => {
    loadAttempts();
  }, [revisionUpdateTrigger]);

  const handleDeleteRevisionConfirmed = async (sessionId: string, deleteFollowing: boolean) => {
    try {
      if (onDeleteRevision) {
        await onDeleteRevision(sessionId, deleteFollowing);
      } else {
        await api.deleteRevision(sessionId, deleteFollowing);
      }
    } catch (err) {
      console.error('Failed to delete revision', err);
    }
  };

  const loadAttempts = async () => {
    try {
      const list = await api.getQcmAttempts();
      setAllAttempts(list);
    } catch (e) {
      console.error('Failed to load global attempts', e);
    }
  };

  const getSubjectColor = (ueId: string) => {
    const s = subjects.find(sub => sub.id.toLowerCase() === ueId.toLowerCase() || sub.code.toLowerCase() === ueId.toLowerCase());
    return s ? s.color : '#0284c7';
  };

  const getSubjectForSession = (ueId: string): SubjectUE | undefined => {
    return subjects.find(sub => sub.id.toLowerCase() === ueId.toLowerCase() || sub.code.toLowerCase() === ueId.toLowerCase());
  };

  const getCourseForSession = (courseId: string): Course | undefined => {
    return courses.find(c => c.id === courseId);
  };

  const getSessionColor = (session: RevisionSession) => {
    const s = getSubjectForSession(session.ueId);
    if (s && s.color) return s.color;
    if (session.ueColor) return session.ueColor;
    const c = getCourseForSession(session.courseId);
    if (c && c.color) return c.color;
    return '#0284c7';
  };

  // Sort sessions: Highest course difficulty first (5 -> 1), then UE weight, then lowest J-step
  const dueSessions = useMemo(() => {
    const list = [...(todaySummary.dueToday || [])];
    return list.sort((a, b) => {
      const courseA = getCourseForSession(a.courseId);
      const courseB = getCourseForSession(b.courseId);
      const diffA = courseA?.difficulty ?? 3;
      const diffB = courseB?.difficulty ?? 3;
      if (diffB !== diffA) return diffB - diffA;

      const ueA = getSubjectForSession(a.ueId);
      const ueB = getSubjectForSession(b.ueId);
      const coeffA = ueA?.coefficient ?? 10;
      const coeffB = ueB?.coefficient ?? 10;
      if (coeffB !== coeffA) return coeffB - coeffA;

      return a.jStep - b.jStep;
    });
  }, [todaySummary.dueToday, courses, subjects]);

  const overdueSessions = useMemo(() => {
    const list = [...(todaySummary.overdue || [])];
    return list.sort((a, b) => {
      const courseA = getCourseForSession(a.courseId);
      const courseB = getCourseForSession(b.courseId);
      const diffA = courseA?.difficulty ?? 3;
      const diffB = courseB?.difficulty ?? 3;
      if (diffB !== diffA) return diffB - diffA;
      return a.jStep - b.jStep;
    });
  }, [todaySummary.overdue, courses]);

  const completedSessions = todaySummary.completedToday || [];
  const totalDue = dueSessions.length + overdueSessions.length;
  const completedCount = completedSessions.length;
  const progressPercent = (totalDue + completedCount) > 0
    ? Math.round((completedCount / (totalDue + completedCount)) * 100)
    : 100;

  const isOverloaded = totalDue > 6;

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Onboarding Welcome Banner when starting in clean mode with 0 courses */}
      {courses.length === 0 && (
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-sky-900/40 via-slate-900/90 to-indigo-950/40 border border-sky-500/30 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mode Vierge / Prêt pour vos cours</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Bienvenue sur MedJ
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                L'application est lancée sans données pré-installées. Vous pouvez commencer à saisir vos propres cours et séances de révision, ou charger le programme officiel PASS (Université Paris Cité - 186 cours & QCMs) pour tester l'application.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={onNewCourseJ0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-950/30 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer mon 1er cours (J0)</span>
              </button>
              {onLoadSampleData && (
                <button
                  onClick={onLoadSampleData}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Charger les données d'exemple</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Welcome & Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Progress Card */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  Méthode des J en cours
                </span>
                <span className="text-xs text-slate-400">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Objectif Révisions du Jour
              </h1>
            </div>

            <button
              onClick={onNewCourseJ0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30 active:scale-95 transition-all self-start sm:self-center"
            >
              <Zap className="w-4 h-4" />
              <span>Nouveau Cours J0</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Progression globale</span>
              <span className="text-sky-400">{progressPercent}% ({completedCount} / {totalDue + completedCount} validés)</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <div className="text-[11px] font-medium text-slate-400">À réviser (Aujourd'hui)</div>
              <div className="text-xl font-bold text-white mt-0.5">{dueSessions.length}</div>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <div className="text-[11px] font-medium text-rose-400">En retard</div>
              <div className="text-xl font-bold text-rose-400 mt-0.5">{overdueSessions.length}</div>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
              <div className="text-[11px] font-medium text-emerald-400">Validés aujourd'hui</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">{completedCount}</div>
            </div>
          </div>
        </div>

        {/* Workload Smoothing & Status Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border border-slate-800/80 bg-slate-900/60">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Météo de Charge & Lissage
              </h2>
              {isOverloaded ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Surcharge
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Équilibré
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isOverloaded
                ? `Attention : ${totalDue} révisions programmées. Le lissage intelligent préserve vos cours difficiles (4-5★) sur leur date cible et relègue en premier les cours plus faciles (1-2★) ou cycles avancés (J30/J60).`
                : `Charge de travail équilibrée (${totalDue} révisions restantes). Les révisions sont triées par difficulté décroissante pour aborder les cours les plus exigeants en premier.`}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60">
            <button
              onClick={onTriggerSmoothing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-sky-500/20 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Lisser la charge (Priorité cours difficiles)</span>
            </button>
          </div>
        </div>

      </div>

      {/* OVERDUE SESSIONS ALERT BANNER (If any) */}
      {overdueSessions.length > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 relative overflow-hidden shadow-xs">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-300">
                  {overdueSessions.length} révision(s) en retard
                </h3>
                <span className="text-[11px] sm:text-xs font-semibold text-rose-700 dark:text-rose-400/80">
                  Action recommandée : Rattraper ou Décaler
                </span>
              </div>
              <p className="text-xs text-rose-800/80 dark:text-rose-200/70 mt-1 leading-relaxed">
                La répétition espacée est plus efficace quand les J sont réguliers. Décalez d'un clic pour réajuster votre planning.
              </p>

              {/* Overdue items list */}
              <div className="mt-4 space-y-2">
                {overdueSessions.map(session => {
                  const course = getCourseForSession(session.courseId);
                  return (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-950/70 border border-rose-200/80 dark:border-rose-900/30 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded font-mono font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/40 shrink-0">
                          J{session.jStep}
                        </span>
                        <span
                          className="font-bold px-2 py-0.5 rounded text-[10px] shrink-0 shadow-2xs"
                          style={{
                            backgroundColor: getSessionColor(session),
                            color: getContrastTextColor(getSessionColor(session))
                          }}
                        >
                          {session.ueCode}
                        </span>
                        {course && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                              course.difficulty >= 4
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                            title={`Difficulté : ${course.difficulty}/5`}
                          >
                            {'★'.repeat(course.difficulty || 3)}
                          </span>
                        )}
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1">
                          {session.courseTitle}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] hidden md:inline shrink-0">
                          (Prévu le {session.scheduledDate})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {course && (
                          <button
                            onClick={() => onStartQcmQuiz(course)}
                            className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-600 dark:bg-sky-600/30 text-sky-700 hover:text-white dark:text-sky-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>QCM</span>
                          </button>
                        )}
                        <button
                          onClick={() => onShiftRevision(session.id, 1)}
                          title="Repousser de +1 jour"
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1.5 transition-all border border-amber-200 dark:border-slate-700/60 active:scale-95 shadow-2xs cursor-pointer"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>+1j</span>
                        </button>
                        <button
                          onClick={() => onCompleteRevision(session.id, 'MOYEN')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Fait</span>
                        </button>
                        <button
                          onClick={() => setSessionToDelete(session)}
                          title="Supprimer cette séance (ou les suivantes)"
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-rose-200 dark:border-slate-700/60 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S DUE REVISIONS QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></div>
            <h2 className="text-lg font-bold text-white">Programme de la Journée</h2>
          </div>
          <span className="text-xs text-slate-400">
            {dueSessions.length} séance(s) planifiée(s) • Triées par priorité
          </span>
        </div>

        {dueSessions.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center border border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Toutes les révisions du jour sont terminées !</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Félicitations pour votre régularité ! Vous pouvez ajouter un nouveau cours $J_0$ ou vous entraîner sur les QCMs libres.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={onNewCourseJ0}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all cursor-pointer"
              >
                + Ajouter un cours appris aujourd'hui
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueSessions.map(session => {
              const course = getCourseForSession(session.courseId);
              const color = getSessionColor(session);
              const evalValue = selectedEvaluation[session.id] || 'MOYEN';
              const isHard = (course?.difficulty ?? 3) >= 4;

              return (
                <div
                  key={session.id}
                  className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between relative group shadow-sm hover:shadow-md ${
                    isHard
                      ? 'border-amber-500/40 dark:border-amber-500/30 bg-slate-900/90 shadow-amber-950/10 hover:border-amber-500/60'
                      : 'border-slate-800/90 hover:border-slate-700 bg-slate-900/70 hover:shadow-sky-950/20'
                  }`}
                >
                  <div>
                    {/* Top row: J badge, UE badge & Difficulty */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md font-mono font-extrabold text-xs bg-sky-950 text-sky-300 border border-sky-800/50">
                          J{session.jStep}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-xs"
                          style={{ backgroundColor: color, color: getContrastTextColor(color) }}
                        >
                          {session.ueCode}
                        </span>
                        {course && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                              course.difficulty >= 4
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'
                                : course.difficulty <= 2
                                ? 'bg-slate-800 text-slate-400 border border-slate-700/50'
                                : 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            <span className="text-amber-400">{'★'.repeat(course.difficulty || 3)}</span>
                            <span className="text-[9px] font-extrabold">
                              {course.difficulty >= 4 ? 'Prioritaire' : `${course.difficulty}/5`}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>~25 min</span>
                      </div>
                    </div>

                    {/* Course Title */}
                    <h3
                      onClick={() => course && onSelectCourse(course)}
                      className="text-sm font-bold text-slate-100 group-hover:text-sky-300 cursor-pointer transition-colors line-clamp-2 mb-2"
                    >
                      {session.courseTitle}
                    </h3>

                    {/* Course details preview */}
                    {course?.notes && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-2 bg-slate-100/90 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/40 mb-4">
                        💡 {course.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/60 mt-2 space-y-3">
                    
                    {/* Self-evaluation selector */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Auto-évaluation :</span>
                      <div className="flex items-center gap-1">
                        {['FACILE', 'MOYEN', 'DIFFICILE'].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setSelectedEvaluation(prev => ({ ...prev, [session.id]: lvl }))}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              evalValue === lvl
                                ? lvl === 'FACILE'
                                  ? 'bg-emerald-600 text-white'
                                  : lvl === 'MOYEN'
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-rose-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {lvl === 'FACILE' ? 'Facile' : lvl === 'MOYEN' ? 'Moyen' : 'Difficile'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {course && (
                        <button
                          onClick={() => onStartQcmQuiz(course)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-950/30 active:scale-95 transition-all"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Lancer QCM</span>
                        </button>
                      )}

                      <button
                        onClick={() => onCompleteRevision(session.id, evalValue)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valider</span>
                      </button>

                      <button
                        onClick={() => onShiftRevision(session.id, 1)}
                        title="Reporter à demain (+1j)"
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700/50 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <CalendarPlus className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold">+1j</span>
                      </button>

                      <button
                        onClick={() => setSessionToDelete(session)}
                        title="Supprimer cette séance (ou les suivantes)"
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/50 active:scale-95 transition-all flex items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED REVISIONS TODAY SECTION */}
      {completedSessions.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-900">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Révisions Validées Aujourd'hui ({completedSessions.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {completedSessions.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs gap-2"
              >
                <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                  <span className="font-mono font-bold text-emerald-400 shrink-0">J{s.jStep}</span>
                  <span className="text-slate-300 truncate font-medium">{s.courseTitle}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onUncompleteRevision && (
                    <button
                      onClick={() => onUncompleteRevision(s.id)}
                      title="Repasser en non-validée"
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs whitespace-nowrap"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                      <span>Refaire</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GLOBAL PROGRESSION & LEARNING CURVE */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <ProgressionChart
          attempts={allAttempts}
          title="Courbe de Progression Globale (Tous les QCMs PASS)"
          subtitle="Vue d'ensemble de votre dynamique de réussite et de mémorisation"
        />
      </div>

      {/* Delete Revision Modal */}
      <DeleteRevisionModal
        isOpen={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        session={sessionToDelete}
        onConfirmDelete={handleDeleteRevisionConfirmed}
      />

    </div>
  );
};
