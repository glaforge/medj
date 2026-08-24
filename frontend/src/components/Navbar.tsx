import React from 'react';
import {
  Brain,
  Calendar,
  BookOpen,
  Camera,
  Bot,
  Settings,
  CalendarSync,
  HelpCircle,
  Award,
  Layers,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: 'dashboard' | 'calendar' | 'courses' | 'qcms' | 'flashcards' | 'tutor' | 'scans';
  onSelectTab: (tab: 'dashboard' | 'calendar' | 'courses' | 'qcms' | 'flashcards' | 'tutor' | 'scans') => void;
  onOpenScanner: () => void;
  onOpenSettings: () => void;
  onSyncCalendar: () => void;
  isSyncingCalendar: boolean;
  totalDueCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenScanner,
  onOpenSettings,
  onSyncCalendar,
  isSyncingCalendar,
  totalDueCount
}) => {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={() => onSelectTab('dashboard')}>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-sky-600 to-indigo-600 dark:from-white dark:via-sky-200 dark:to-sky-400 bg-clip-text text-transparent">
              MedJ
            </span>
          </div>

          {/* Center Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Aujourd'hui</span>
              {totalDueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                  {totalDueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('calendar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'calendar'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Planning</span>
            </button>

            <button
              onClick={() => onSelectTab('courses')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'courses'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Matières</span>
            </button>

            <button
              onClick={() => onSelectTab('qcms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'qcms'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>QCMs</span>
            </button>

            <button
              onClick={() => onSelectTab('flashcards')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'flashcards'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Flashcards</span>
            </button>

            <button
              onClick={() => onSelectTab('tutor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'tutor'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Bot className={`w-4 h-4 ${currentTab === 'tutor' ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
              <span>IA</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            
            {/* Quick Gemini Scan Button */}
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Scanner</span>
            </button>

            {/* Google Calendar Sync Button */}
            <button
              onClick={onSyncCalendar}
              disabled={isSyncingCalendar}
              title="Synchroniser avec Google Calendar"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-400 border border-slate-800 transition-all relative disabled:opacity-50"
            >
              <CalendarSync className={`w-4 h-4 ${isSyncingCalendar ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              title="Paramètres & Intervalles des J"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || 'User'}
                    title={user.email || 'Connecté'}
                    className="w-7 h-7 rounded-full border border-sky-400"
                  />
                ) : (
                  <div
                    title={user.email || 'Connecté'}
                    className="w-7 h-7 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center"
                  >
                    {user.email?.charAt(0).toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}

                <button
                  onClick={logout}
                  title={`Se déconnecter (${user.email})`}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/50 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 border border-slate-200 dark:border-slate-800 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile navigation bottom/sub bar */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-200 dark:border-slate-900 bg-white/95 dark:bg-slate-950/95 px-2">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            currentTab === 'dashboard' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Aujourd'hui</span>
        </button>
        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            currentTab === 'calendar' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Planning</span>
        </button>
        <button
          onClick={() => onSelectTab('courses')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            currentTab === 'courses' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Matières</span>
        </button>
        <button
          onClick={() => onSelectTab('qcms')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            currentTab === 'qcms' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>QCMs</span>
        </button>
        <button
          onClick={() => onSelectTab('flashcards')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            currentTab === 'flashcards' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Flashcards</span>
        </button>
        <button
          onClick={() => onSelectTab('tutor')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
            currentTab === 'tutor' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>IA</span>
        </button>
      </div>
    </header>
  );
};
export default Navbar;
