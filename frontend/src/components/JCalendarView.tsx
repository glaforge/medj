import React, { useState } from 'react';
import {
  RevisionSession,
  SubjectUE,
  Course
} from '../types';
import { formatDate, getLocalTodayString } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarPlus,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface JCalendarViewProps {
  revisions: RevisionSession[];
  subjects: SubjectUE[];
  courses: Course[];
  onShiftRevision: (sessionId: string, days: number) => void;
  onShiftSubject: (ueId: string, days: number) => void;
  onCompleteRevision: (sessionId: string, evaluation: string) => void;
  onUncompleteRevision?: (sessionId: string) => void;
  onTriggerSmoothing: () => void;
  onSelectCourse: (course: Course) => void;
  onOpenAddRevisionModal: (initialDate?: string, courseId?: string) => void;
}

export const JCalendarView: React.FC<JCalendarViewProps> = ({
  revisions,
  subjects,
  courses,
  onShiftRevision,
  onShiftSubject,
  onCompleteRevision,
  onUncompleteRevision,
  onTriggerSmoothing,
  onSelectCourse,
  onOpenAddRevisionModal
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayString());
  const [selectedUeFilter, setSelectedUeFilter] = useState<string>('ALL');
  const [selectedBulkUeId, setSelectedBulkUeId] = useState<string>('');

  const getSubjectColor = (ueId: string) => {
    const s = subjects.find(sub => sub.id.toLowerCase() === ueId.toLowerCase() || sub.code.toLowerCase() === ueId.toLowerCase());
    return s ? s.color : '#0284c7';
  };

  const getCourseOrUeColor = (session: RevisionSession) => {
    const course = courses.find(c => c.id === session.courseId);
    if (course && course.color) return course.color;
    if (session.ueColor) return session.ueColor;
    return getSubjectColor(session.ueId);
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Starting day index (Monday = 0)
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const totalDays = lastDayOfMonth.getDate();

  // Map revisions by date
  const filteredRevisions = revisions.filter(r => {
    if (selectedUeFilter === 'ALL') return true;
    return r.ueId.toLowerCase() === selectedUeFilter.toLowerCase();
  });

  const revisionsByDate: Record<string, RevisionSession[]> = {};
  for (const rev of filteredRevisions) {
    if (!revisionsByDate[rev.scheduledDate]) {
      revisionsByDate[rev.scheduledDate] = [];
    }
    revisionsByDate[rev.scheduledDate].push(rev);
  }

  const formatYMD = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Days array for rendering grid
  const daysInGrid: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
  
  // Previous month filler days
  const prevMonthDate = new Date(year, month, 0);
  const prevMonthLastDay = prevMonthDate.getDate();
  const prevYear = prevMonthDate.getFullYear();
  const prevMonthNum = prevMonthDate.getMonth();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateStr = formatYMD(prevYear, prevMonthNum, day);
    daysInGrid.push({ dateStr, dayNum: day, isCurrentMonth: false, isToday: false });
  }

  const todayStr = getLocalTodayString();
  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatYMD(year, month, day);
    daysInGrid.push({ dateStr, dayNum: day, isCurrentMonth: true, isToday: dateStr === todayStr });
  }

  // Selected date's revisions sorted by priority (Highest course difficulty first, lowest J-step)
  const rawSelectedDayRevisions = revisionsByDate[selectedDate] || [];
  const selectedDayRevisions = [...rawSelectedDayRevisions].sort((a, b) => {
    const courseA = courses.find(c => c.id === a.courseId);
    const courseB = courses.find(c => c.id === b.courseId);
    const diffA = courseA?.difficulty ?? 3;
    const diffB = courseB?.difficulty ?? 3;
    if (diffB !== diffA) return diffB - diffA;
    return a.jStep - b.jStep;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Calendar Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
            Planning Dynamique des J
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualisez vos courbes d'espacement et ajustez vos révisions par glissement ou décalage
          </p>
        </div>

        {/* Month controls & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-200 capitalize min-w-28 text-center">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onOpenAddRevisionModal(selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/40 active:scale-95 transition-all"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>+ Planifier un J</span>
          </button>

          <button
            onClick={onTriggerSmoothing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Lissage de Charge</span>
          </button>
        </div>
      </div>

      {/* UE Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedUeFilter('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            selectedUeFilter === 'ALL'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
          }`}
        >
          Toutes les UE
        </button>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedUeFilter(sub.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedUeFilter === sub.id
                ? 'text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
            }`}
            style={{
              backgroundColor: selectedUeFilter === sub.id ? sub.color : undefined,
              borderColor: selectedUeFilter === sub.id ? sub.color : undefined
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }}></span>
            <span>{sub.code}</span>
          </button>
        ))}
      </div>

      {/* Main Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Calendar Grid */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800">
          
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-[11px] font-bold text-slate-400 py-1 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysInGrid.map((dayItem, idx) => {
              const dayRevs = revisionsByDate[dayItem.dateStr] || [];
              const isSelected = dayItem.dateStr === selectedDate;
              const hasOverload = dayRevs.length > 5;
              const completedInDay = dayRevs.filter(r => r.status === 'VALIDE').length;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(dayItem.dateStr)}
                  className={`min-h-20 sm:min-h-24 p-1.5 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500 shadow-md shadow-sky-950/50'
                      : dayItem.isToday
                      ? 'bg-slate-900/90 border-sky-500/40'
                      : dayItem.isCurrentMonth
                      ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                      : 'bg-slate-950/20 border-slate-900 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        dayItem.isToday
                          ? 'w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center'
                          : dayItem.isCurrentMonth
                          ? 'text-slate-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {dayItem.dayNum}
                    </span>

                    {dayRevs.length > 0 && (
                      <span
                        className={`text-[9px] font-bold px-1 rounded-full ${
                          hasOverload
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dayRevs.length} J
                      </span>
                    )}
                  </div>

                  {/* Pills preview */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayRevs.slice(0, 2).map((r, rIdx) => (
                      <div
                        key={rIdx}
                        className="text-[9px] font-semibold px-1 py-0.5 rounded truncate text-white shadow-xs"
                        style={{ backgroundColor: getCourseOrUeColor(r) }}
                      >
                        J{r.jStep} {r.courseTitle}
                      </div>
                    ))}
                    {dayRevs.length > 2 && (
                      <div className="text-[8px] text-slate-400 font-bold px-1">
                        +{dayRevs.length - 2} autre(s)
                      </div>
                    )}
                  </div>

                  {/* Bottom indicator */}
                  {dayRevs.length > 0 && (
                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full"
                        style={{ width: `${(completedInDay / dayRevs.length) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Day Detail Inspector */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider">
                  Détail du Jour
                </span>
                <h3 className="text-sm font-extrabold text-white">
                  {formatDate(selectedDate, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-slate-300 border border-slate-800">
                {selectedDayRevisions.length} révision(s)
              </span>
            </div>

            {/* Quick Add J on this date button */}
            <div className="mt-3">
              <button
                onClick={() => onOpenAddRevisionModal(selectedDate)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-sky-500/20 text-xs font-bold transition-all shadow-xs"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>+ Planifier un J sur cette date</span>
              </button>
            </div>

            {/* List of sessions for selected day */}
            <div className="mt-3 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {selectedDayRevisions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Aucune révision programmée pour cette date.
                </div>
              ) : (
                selectedDayRevisions.map(s => {
                  const course = courses.find(c => c.id === s.courseId);
                  const isDone = s.status === 'VALIDE';

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        isDone
                          ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
                          : 'bg-slate-900/90 border-slate-800 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800/40 text-[10px]">
                            J{s.jStep}
                          </span>
                          <span
                            className="font-bold text-white px-1.5 py-0.5 rounded text-[9px]"
                            style={{ backgroundColor: getCourseOrUeColor(s) }}
                          >
                            {s.ueCode}
                          </span>
                          {course && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                course.difficulty >= 4
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                              title={`Difficulté : ${course.difficulty}/5`}
                            >
                              {'★'.repeat(course.difficulty || 3)}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isDone
                              ? 'bg-emerald-950 text-emerald-400'
                              : s.status === 'EN_RETARD'
                              ? 'bg-rose-950 text-rose-400'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      <div
                        onClick={() => course && onSelectCourse(course)}
                        className="font-bold text-slate-200 hover:text-sky-300 cursor-pointer line-clamp-2"
                      >
                        {s.courseTitle}
                      </div>

                      {/* Shift and Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onShiftRevision(s.id, -1)}
                            title="Avancer de 1 jour (-1j)"
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 text-[10px] font-bold font-mono"
                          >
                            -1j
                          </button>
                          <button
                            onClick={() => onShiftRevision(s.id, 1)}
                            title="Décaler de +1 jour (+1j)"
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-[10px] font-bold font-mono"
                          >
                            +1j
                          </button>
                          <button
                            onClick={() => onShiftRevision(s.id, 3)}
                            title="Décaler de +3 jours"
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold"
                          >
                            +3j
                          </button>
                          <button
                            onClick={() => onShiftRevision(s.id, 7)}
                            title="Décaler de +1 semaine"
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold"
                          >
                            +1 sem
                          </button>
                        </div>

                        {!isDone ? (
                          <button
                            onClick={() => onCompleteRevision(s.id, 'FACILE')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Valider</span>
                          </button>
                        ) : onUncompleteRevision ? (
                          <button
                            onClick={() => onUncompleteRevision(s.id)}
                            title="Repasser cette révision en non-validée"
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700/60 font-semibold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all whitespace-nowrap"
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                            <span>Refaire</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick shift whole UE footer */}
          <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Décaler toute une matière :
              </span>
              {(() => {
                const currentUe = subjects.find(s => s.id === (selectedBulkUeId || subjects[0]?.id));
                if (!currentUe) return null;
                return (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white uppercase tracking-wider shadow-2xs"
                    style={{ backgroundColor: currentUe.color || '#0284c7' }}
                  >
                    {currentUe.code}
                  </span>
                );
              })()}
            </div>

            <div className="space-y-2">
              {/* Row 1: Full-width Select */}
              <div className="w-full min-w-0">
                <select
                  value={selectedBulkUeId || (subjects[0]?.id ?? '')}
                  onChange={(e) => setSelectedBulkUeId(e.target.value)}
                  className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all shadow-2xs cursor-pointer"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Action Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const ueId = selectedBulkUeId || subjects[0]?.id;
                    if (ueId) onShiftSubject(ueId, -1);
                  }}
                  title="Avancer toutes les révisions de cette matière de 1 jour"
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950/70 border border-slate-200 dark:border-slate-700/60 text-sky-700 dark:text-sky-300 text-xs font-bold font-mono transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                >
                  -1j
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ueId = selectedBulkUeId || subjects[0]?.id;
                    if (ueId) onShiftSubject(ueId, 1);
                  }}
                  title="Reporter toutes les révisions de cette matière de 1 jour"
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-slate-200 dark:border-slate-700/60 text-amber-700 dark:text-amber-300 text-xs font-bold font-mono transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                >
                  +1j
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ueId = selectedBulkUeId || subjects[0]?.id;
                    if (ueId) onShiftSubject(ueId, 3);
                  }}
                  title="Reporter toutes les révisions de cette matière de 3 jours"
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-slate-200 dark:border-slate-700/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                >
                  +3j
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ueId = selectedBulkUeId || subjects[0]?.id;
                    if (ueId) onShiftSubject(ueId, 7);
                  }}
                  title="Reporter toutes les révisions de cette matière de 1 semaine (7 jours)"
                  className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/70 border border-slate-200 dark:border-slate-700/60 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono transition-all active:scale-95 text-center cursor-pointer shadow-2xs"
                >
                  +1 sem
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
