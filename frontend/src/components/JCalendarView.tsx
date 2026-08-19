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
  CalendarDays,
  CalendarPlus,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  RotateCcw,
  Check,
  Zap,
  CalendarRange,
  GripVertical
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
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayString());
  const [selectedUeFilter, setSelectedUeFilter] = useState<string>('ALL');
  const [selectedBulkUeId, setSelectedBulkUeId] = useState<string>('');

  // Drag & Drop State
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

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

  // Helper for date formatting
  const formatYMD = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayStr = getLocalTodayString();

  // Jump to today
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setCurrentWeekDate(now);
    setSelectedDate(todayStr);
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Week navigation (Monday to Sunday)
  const getMonday = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  const prevWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d);
  };

  const mondayOfWeek = getMonday(currentWeekDate);
  const sundayOfWeek = new Date(mondayOfWeek);
  sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);

  // Filter revisions by UE
  const filteredRevisions = revisions.filter(r => {
    if (selectedUeFilter === 'ALL') return true;
    return r.ueId.toLowerCase() === selectedUeFilter.toLowerCase();
  });

  // Map revisions by date
  const revisionsByDate: Record<string, RevisionSession[]> = {};
  for (const rev of filteredRevisions) {
    if (!revisionsByDate[rev.scheduledDate]) {
      revisionsByDate[rev.scheduledDate] = [];
    }
    revisionsByDate[rev.scheduledDate].push(rev);
  }

  // Handle Drag & Drop Drop Event
  const handleDropOnDate = (targetDateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
    setDraggedSessionId(null);
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data.sessionId && data.fromDate && data.fromDate !== targetDateStr) {
        const fromParts = data.fromDate.split('-').map(Number);
        const toParts = targetDateStr.split('-').map(Number);
        const fromUtc = Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2]);
        const toUtc = Date.UTC(toParts[0], toParts[1] - 1, toParts[2]);
        const diffDays = Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
        if (diffDays !== 0) {
          onShiftRevision(data.sessionId, diffDays);
        }
      }
    } catch (err) {
      console.error('Failed to handle drop', err);
    }
  };

  // Month Grid Calculation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const daysInGrid: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
  const prevMonthDate = new Date(year, month, 0);
  const prevMonthLastDay = prevMonthDate.getDate();
  const prevYear = prevMonthDate.getFullYear();
  const prevMonthNum = prevMonthDate.getMonth();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const dateStr = formatYMD(prevYear, prevMonthNum, day);
    daysInGrid.push({ dateStr, dayNum: day, isCurrentMonth: false, isToday: false });
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = formatYMD(year, month, day);
    daysInGrid.push({ dateStr, dayNum: day, isCurrentMonth: true, isToday: dateStr === todayStr });
  }

  // Week Grid Calculation (7 days)
  const weekDays: { dateStr: string; dayDate: Date; dayName: string; dayNum: number; monthName: string; isToday: boolean }[] = [];
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayOfWeek);
    d.setDate(mondayOfWeek.getDate() + i);
    const dateStr = formatYMD(d.getFullYear(), d.getMonth(), d.getDate());
    weekDays.push({
      dateStr,
      dayDate: d,
      dayName: dayNames[i],
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('fr-FR', { month: 'short' }),
      isToday: dateStr === todayStr
    });
  }

  // Weekly stats
  const totalWeeklySessions = weekDays.reduce((acc, wd) => acc + (revisionsByDate[wd.dateStr]?.length || 0), 0);
  const totalWeeklyCompleted = weekDays.reduce(
    (acc, wd) => acc + (revisionsByDate[wd.dateStr]?.filter(r => r.status === 'VALIDE').length || 0),
    0
  );
  const weeklyCompletionRate = totalWeeklySessions > 0 ? Math.round((totalWeeklyCompleted / totalWeeklySessions) * 100) : 0;
  const weeklyOverloadedDays = weekDays.filter(wd => (revisionsByDate[wd.dateStr]?.length || 0) > 5).length;

  // Selected date's revisions sorted by priority
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
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
            <span>Planning Dynamique des J</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Visualisez vos courbes d'espacement et ajustez vos révisions par glisser-déposer (Drag & Drop) ou décalage
          </p>
        </div>

        {/* View Mode Switcher + Month/Week Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          
          {/* Mode Switcher: Mois / Semaine */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mois</span>
            </button>

            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semaine</span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={viewMode === 'month' ? prevMonth : prevWeek}
              title={viewMode === 'month' ? 'Mois précédent' : 'Semaine précédente'}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 capitalize min-w-32 text-center select-none">
              {viewMode === 'month'
                ? currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                : `${mondayOfWeek.getDate()} ${mondayOfWeek.toLocaleDateString('fr-FR', { month: 'short' })} — ${sundayOfWeek.getDate()} ${sundayOfWeek.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`}
            </span>

            <button
              onClick={viewMode === 'month' ? nextMonth : nextWeek}
              title={viewMode === 'month' ? 'Mois suivant' : 'Semaine suivante'}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Today shortcut button */}
          <button
            onClick={goToToday}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Revenir à aujourd'hui"
          >
            Aujourd'hui
          </button>

          {/* Add revision button */}
          <button
            onClick={() => onOpenAddRevisionModal(selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/20 active:scale-95 transition-all cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>+ Planifier un J</span>
          </button>

          {/* Workload smoothing */}
          <button
            onClick={onTriggerSmoothing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/20 active:scale-95 transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="hidden sm:inline">Lissage de Charge</span>
          </button>
        </div>
      </div>

      {/* UE Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedUeFilter('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedUeFilter === 'ALL'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Toutes les UE
        </button>
        {subjects.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedUeFilter(sub.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedUeFilter === sub.id
                ? 'text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
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

      {/* VIEW 1: MONTHLY CALENDAR VIEW */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Monthly Calendar Grid (2 cols) */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
            
            {/* Day of week headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                <div key={d} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 py-1 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Days cells with Drag & Drop */}
            <div className="grid grid-cols-7 gap-1.5">
              {daysInGrid.map((dayItem, idx) => {
                const dayRevs = revisionsByDate[dayItem.dateStr] || [];
                const isSelected = dayItem.dateStr === selectedDate;
                const hasOverload = dayRevs.length > 5;
                const completedInDay = dayRevs.filter(r => r.status === 'VALIDE').length;
                const isHoveredForDrop = dragOverDate === dayItem.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(dayItem.dateStr)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverDate(dayItem.dateStr);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverDate === dayItem.dateStr) setDragOverDate(null);
                    }}
                    onDrop={(e) => handleDropOnDate(dayItem.dateStr, e)}
                    className={`min-h-20 sm:min-h-24 p-1.5 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                      isHoveredForDrop
                        ? 'ring-2 ring-sky-500 bg-sky-100/80 dark:bg-sky-950/80 border-sky-400 scale-[1.02] shadow-md'
                        : isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/30 shadow-md shadow-sky-950/20'
                        : dayItem.isToday
                        ? 'bg-sky-50/60 dark:bg-slate-900/90 border-sky-500/50'
                        : dayItem.isCurrentMonth
                        ? 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                        : 'bg-slate-50/40 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          dayItem.isToday
                            ? 'w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center'
                            : dayItem.isCurrentMonth
                            ? 'text-slate-900 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {dayItem.dayNum}
                      </span>

                      {dayRevs.length > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1 rounded-full ${
                            hasOverload
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {dayRevs.length} J
                        </span>
                      )}
                    </div>

                    {/* Pills preview (Draggable) */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayRevs.slice(0, 2).map((r, rIdx) => (
                        <div
                          key={rIdx}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData('text/plain', JSON.stringify({ sessionId: r.id, fromDate: r.scheduledDate }));
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedSessionId(r.id);
                          }}
                          onDragEnd={() => {
                            setDraggedSessionId(null);
                            setDragOverDate(null);
                          }}
                          className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate text-white shadow-2xs cursor-grab active:cursor-grabbing transition-opacity ${
                            draggedSessionId === r.id ? 'opacity-30' : ''
                          }`}
                          style={{ backgroundColor: getCourseOrUeColor(r) }}
                        >
                          J{r.jStep} {r.courseTitle}
                        </div>
                      ))}
                      {dayRevs.length > 2 && (
                        <div className="text-[8px] text-slate-500 dark:text-slate-400 font-bold px-1">
                          +{dayRevs.length - 2} autre(s)
                        </div>
                      )}
                    </div>

                    {/* Bottom progress indicator */}
                    {dayRevs.length > 0 && (
                      <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all"
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
          <div className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 tracking-wider">
                    Détail du Jour
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {formatDate(selectedDate, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  {selectedDayRevisions.length} révision(s)
                </span>
              </div>

              {/* Quick Add J on this date button */}
              <div className="mt-3">
                <button
                  onClick={() => onOpenAddRevisionModal(selectedDate)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-sky-700 dark:text-sky-400 hover:text-sky-600 border border-sky-300 dark:border-sky-500/20 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>+ Planifier un J sur cette date</span>
                </button>
              </div>

              {/* List of sessions for selected day (Draggable) */}
              <div className="mt-3 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {selectedDayRevisions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
                    Aucune révision programmée pour cette date.
                  </div>
                ) : (
                  selectedDayRevisions.map(s => {
                    const course = courses.find(c => c.id === s.courseId);
                    const isDone = s.status === 'VALIDE';

                    return (
                      <div
                        key={s.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ sessionId: s.id, fromDate: s.scheduledDate }));
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedSessionId(s.id);
                        }}
                        onDragEnd={() => {
                          setDraggedSessionId(null);
                          setDragOverDate(null);
                        }}
                        className={`p-3 rounded-xl border text-xs space-y-2 transition-all cursor-grab active:cursor-grabbing ${
                          draggedSessionId === s.id
                            ? 'opacity-30 scale-95 border-dashed border-sky-400'
                            : isDone
                            ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/40 opacity-75'
                            : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800/40 text-[10px]">
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
                                    ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400'
                                : s.status === 'EN_RETARD'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>

                        <div
                          onClick={() => course && onSelectCourse(course)}
                          className="font-bold text-slate-900 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer line-clamp-2"
                        >
                          {s.courseTitle}
                        </div>

                        {/* Shift and Action buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onShiftRevision(s.id, -1)}
                              title="Avancer de 1 jour (-1j)"
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 text-[10px] font-bold font-mono cursor-pointer"
                            >
                              -1j
                            </button>
                            <button
                              onClick={() => onShiftRevision(s.id, 1)}
                              title="Décaler de +1 jour (+1j)"
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 text-[10px] font-bold font-mono cursor-pointer"
                            >
                              +1j
                            </button>
                            <button
                              onClick={() => onShiftRevision(s.id, 3)}
                              title="Décaler de +3 jours"
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                            >
                              +3j
                            </button>
                            <button
                              onClick={() => onShiftRevision(s.id, 7)}
                              title="Décaler de +1 semaine"
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                            >
                              +1 sem
                            </button>
                          </div>

                          {!isDone ? (
                            <button
                              onClick={() => onCompleteRevision(s.id, 'FACILE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Valider</span>
                            </button>
                          ) : onUncompleteRevision ? (
                            <button
                              onClick={() => onUncompleteRevision(s.id)}
                              title="Repasser cette révision en non-validée"
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 border border-slate-300 dark:border-slate-700/60 font-semibold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-amber-500" />
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
      )}

      {/* VIEW 2: WEEKLY DETAILED PLANNING VIEW (7 Columns with Drag & Drop) */}
      {viewMode === 'week' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Weekly Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total semaine</span>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{totalWeeklySessions} J prévus</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                📅
              </div>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Validés</span>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalWeeklyCompleted} validés</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Taux de complétion</span>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{weeklyCompletionRate}%</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                📈
              </div>
            </div>

            <div className="p-3.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Surcharge (&gt;5)</span>
                <div className={`text-lg font-black mt-0.5 ${weeklyOverloadedDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {weeklyOverloadedDays} jour{weeklyOverloadedDays > 1 ? 's' : ''}
                </div>
              </div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${weeklyOverloadedDays > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                ⚠️
              </div>
            </div>
          </div>

          {/* 7 Columns Week Grid with Drag and Drop Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 items-start overflow-x-auto pb-2">
            {weekDays.map(wd => {
              const dayRevs = revisionsByDate[wd.dateStr] || [];
              const sortedRevs = [...dayRevs].sort((a, b) => {
                const courseA = courses.find(c => c.id === a.courseId);
                const courseB = courses.find(c => c.id === b.courseId);
                const diffA = courseA?.difficulty ?? 3;
                const diffB = courseB?.difficulty ?? 3;
                if (diffB !== diffA) return diffB - diffA;
                return a.jStep - b.jStep;
              });

              const completedInDay = dayRevs.filter(r => r.status === 'VALIDE').length;
              const hasOverload = dayRevs.length > 5;
              const isSelected = wd.dateStr === selectedDate;
              const isHoveredForDrop = dragOverDate === wd.dateStr;

              return (
                <div
                  key={wd.dateStr}
                  onClick={() => setSelectedDate(wd.dateStr)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverDate(wd.dateStr);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (dragOverDate === wd.dateStr) setDragOverDate(null);
                  }}
                  onDrop={(e) => handleDropOnDate(wd.dateStr, e)}
                  className={`rounded-2xl border transition-all flex flex-col min-h-[520px] backdrop-blur-md shadow-xs ${
                    isHoveredForDrop
                      ? 'ring-2 ring-sky-500 bg-sky-100/80 dark:bg-sky-950/80 border-sky-400 shadow-lg scale-[1.01]'
                      : isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20'
                      : wd.isToday
                      ? 'border-sky-500/60 dark:border-sky-500/40 bg-sky-50/40 dark:bg-slate-900/90'
                      : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60'
                  }`}
                >
                  {/* Day Column Header */}
                  <div className={`p-3 border-b rounded-t-2xl flex items-center justify-between ${
                    wd.isToday
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-black uppercase tracking-wider ${wd.isToday ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {wd.dayName}
                        </span>
                      </div>
                      <div className={`text-[11px] font-semibold ${wd.isToday ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {wd.dayNum} {wd.monthName}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Count badge */}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        wd.isToday
                          ? 'bg-white/20 text-white'
                          : hasOverload
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {dayRevs.length} J
                      </span>

                      {/* Add button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddRevisionModal(wd.dateStr);
                        }}
                        title={`Ajouter une révision pour le ${wd.dayName} ${wd.dayNum} ${wd.monthName}`}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          wd.isToday
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-slate-100 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600'
                        }`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar under header */}
                  {dayRevs.length > 0 && (
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(completedInDay / dayRevs.length) * 100}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Sessions List for this day (Draggable Cards) */}
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                    {sortedRevs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
                        <span className="text-xl mb-1">☕</span>
                        <span className="text-[11px] font-semibold">Aucun J prévu</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAddRevisionModal(wd.dateStr);
                          }}
                          className="mt-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          + Planifier
                        </button>
                      </div>
                    ) : (
                      sortedRevs.map(s => {
                        const course = courses.find(c => c.id === s.courseId);
                        const isDone = s.status === 'VALIDE';
                        const ueColor = getCourseOrUeColor(s);
                        const isBeingDragged = draggedSessionId === s.id;

                        return (
                          <div
                            key={s.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ sessionId: s.id, fromDate: s.scheduledDate }));
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedSessionId(s.id);
                            }}
                            onDragEnd={() => {
                              setDraggedSessionId(null);
                              setDragOverDate(null);
                            }}
                            style={{ borderLeftColor: ueColor }}
                            className={`p-2.5 rounded-xl border-t border-r border-b border-l-4 text-xs space-y-2 transition-all bg-white dark:bg-slate-950 shadow-2xs hover:shadow-sm cursor-grab active:cursor-grabbing select-none group ${
                              isBeingDragged
                                ? 'opacity-30 scale-95 border-dashed border-sky-400 ring-2 ring-sky-400/50'
                                : isDone
                                ? 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/40 opacity-75'
                                : s.status === 'EN_RETARD'
                                ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            {/* Top row: Drag Handle, J-step, UE badge, and 1-Click Validation Checkbox */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
                                <span className="font-mono font-black text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-1.5 py-0.2 rounded border border-sky-200 dark:border-sky-800 text-[10px]">
                                  J{s.jStep}
                                </span>
                                <span
                                  className="font-bold text-white px-1.5 py-0.2 rounded text-[9px] shadow-2xs"
                                  style={{ backgroundColor: ueColor }}
                                >
                                  {s.ueCode}
                                </span>
                              </div>

                              {/* Dedicated 1-Click Validation Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isDone && onUncompleteRevision) {
                                    onUncompleteRevision(s.id);
                                  } else {
                                    onCompleteRevision(s.id, 'FACILE');
                                  }
                                }}
                                title={isDone ? 'Marquer comme non-validé' : 'Valider cette révision'}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500 border border-emerald-600 text-white shadow-2xs active:scale-90'
                                    : 'border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-transparent hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 active:scale-90'
                                }`}
                              >
                                <Check className={`w-3.5 h-3.5 ${isDone ? 'stroke-[3]' : 'stroke-[2]'}`} />
                              </button>
                            </div>

                            {/* Course Title */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (course) onSelectCourse(course);
                              }}
                              className={`font-bold text-[11px] hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer line-clamp-2 leading-tight ${
                                isDone
                                  ? 'line-through text-slate-500 dark:text-slate-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                              title={s.courseTitle}
                            >
                              {s.courseTitle}
                            </div>

                            {/* Clean Bottom Row: Quick Shift buttons */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[9px]">
                              <div className="text-[9px] font-semibold">
                                {!isDone && s.status === 'EN_RETARD' ? (
                                  <span className="text-rose-600 dark:text-rose-400">⚠️ En retard</span>
                                ) : !isDone && course && course.difficulty >= 4 ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold" title={`Difficulté : ${course.difficulty}/5`}>
                                    {'★'.repeat(course.difficulty)}
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftRevision(s.id, -1);
                                  }}
                                  title="Avancer de 1 jour (-1j)"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold font-mono transition-colors cursor-pointer"
                                >
                                  -1j
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftRevision(s.id, 1);
                                  }}
                                  title="Décaler de +1 jour (+1j)"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold font-mono transition-colors cursor-pointer"
                                >
                                  +1j
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftRevision(s.id, 3);
                                  }}
                                  title="Décaler de +3 jours (+3j)"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                                >
                                  +3j
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftRevision(s.id, 7);
                                  }}
                                  title="Décaler de 1 semaine (+7j)"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                                >
                                  +7j
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Visual Drop Target Highlight inside Column */}
                    {isHoveredForDrop && (
                      <div className="p-3 rounded-xl border-2 border-dashed border-sky-400 dark:border-sky-500 bg-sky-100/50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-center font-bold text-[11px] animate-pulse">
                        📥 Déposer ici ({wd.dayName})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Bulk Shift Banner in Weekly View */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Décaler toute une matière :
              </span>
              <div className="w-48">
                <select
                  value={selectedBulkUeId || (subjects[0]?.id ?? '')}
                  onChange={(e) => setSelectedBulkUeId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate focus:border-sky-500 outline-none transition-all cursor-pointer"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const ueId = selectedBulkUeId || subjects[0]?.id;
                  if (ueId) onShiftSubject(ueId, -1);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950/70 border border-slate-200 dark:border-slate-700/60 text-sky-700 dark:text-sky-300 text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                -1j
              </button>
              <button
                type="button"
                onClick={() => {
                  const ueId = selectedBulkUeId || subjects[0]?.id;
                  if (ueId) onShiftSubject(ueId, 1);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-slate-200 dark:border-slate-700/60 text-amber-700 dark:text-amber-300 text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                +1j
              </button>
              <button
                type="button"
                onClick={() => {
                  const ueId = selectedBulkUeId || subjects[0]?.id;
                  if (ueId) onShiftSubject(ueId, 3);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-slate-200 dark:border-slate-700/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                +3j
              </button>
              <button
                type="button"
                onClick={() => {
                  const ueId = selectedBulkUeId || subjects[0]?.id;
                  if (ueId) onShiftSubject(ueId, 7);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/70 border border-slate-200 dark:border-slate-700/60 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                +1 sem
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
