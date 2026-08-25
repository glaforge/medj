import React, { useState, useEffect, useRef } from 'react';
import { Course, AiTutorMessage, TutorConversationThread, QcmQuestion, MedicalIllustration } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MedicalIllustrationModal } from './MedicalIllustrationModal';
import { CourseCombobox } from './CourseCombobox';
import { printMedicalWorksheet } from '../utils/printWorksheet';
import { formatDate, formatTime } from '../utils/dateUtils';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  Bot,
  Send,
  Sparkles,
  User,
  BookOpen,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Zap,
  Plus,
  Trash2,
  MessageSquare,
  History,
  ChevronLeft,
  Search,
  Clock,
  Award,
  CheckCircle2,
  Play,
  Eye,
  EyeOff,
  Globe,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Star
} from 'lucide-react';

interface AiTutorChatProps {
  courses: Course[];
  initialCourse?: Course;
  initialThreadId?: string;
  onStartQcmQuiz?: (course: Course) => void;
  onNavigateToCourse?: (course: Course) => void;
  onQcmCreated?: () => void;
  onFlashcardCreated?: () => void;
}

export const AiTutorChat: React.FC<AiTutorChatProps> = ({
  courses,
  initialCourse,
  initialThreadId,
  onStartQcmQuiz,
  onNavigateToCourse,
  onQcmCreated,
  onFlashcardCreated
}) => {
  const [threads, setThreads] = useState<TutorConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourse?.id || '');
  const [messages, setMessages] = useState<AiTutorMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [revealedQcmIds, setRevealedQcmIds] = useState<Set<string>>(new Set());
  const [selectedIllustration, setSelectedIllustration] = useState<MedicalIllustration | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const DEFAULT_WELCOME_MSG: AiTutorMessage = {
    id: 'welcome',
    role: 'model',
    content: "Bonjour ! Je suis votre **Tuteur IA PASS d'élite**. Posez-moi vos questions, demandez des explications physiologiques ou demandez-moi : *« Crée-moi un QCM sur ce point »* pour générer et enregistrer automatiquement des QCMs dans vos cours !",
    timestamp: new Date().toISOString()
  };

  useEffect(() => {
    loadThreads();
  }, [initialCourse?.id, initialThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadThreads = async () => {
    try {
      const list = await api.getTutorThreads();
      setThreads(list);

      const targetThreadId = initialThreadId;
      const targetCourseId = initialCourse?.id;

      if (targetThreadId) {
        const found = list.find(t => t.id === targetThreadId);
        if (found) {
          selectThread(found);
          return;
        }
      }

      if (targetCourseId) {
        setSelectedCourseId(targetCourseId);
        const matching = list.find(t => t.courseId === targetCourseId);
        if (matching) {
          selectThread(matching);
        } else {
          startNewConversation(targetCourseId);
        }
      } else if (list.length > 0 && !activeThreadId) {
        selectThread(list[0]);
      } else if (list.length === 0) {
        startNewConversation();
      }
    } catch (e) {
      console.error('Failed to load tutor threads', e);
    }
  };

  const selectThread = (thread: TutorConversationThread) => {
    setActiveThreadId(thread.id);
    setSelectedCourseId(thread.courseId || '');
    setMessages(thread.messages && thread.messages.length > 0 ? thread.messages : [DEFAULT_WELCOME_MSG]);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const startNewConversation = (courseIdOverride?: string) => {
    const cId = courseIdOverride !== undefined ? courseIdOverride : selectedCourseId;
    setActiveThreadId(null);
    setSelectedCourseId(cId);
    setMessages([DEFAULT_WELCOME_MSG]);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer définitivement cette conversation ?')) return;

    try {
      await api.deleteTutorThread(threadId);
      const updated = threads.filter(t => t.id !== threadId);
      setThreads(updated);

      if (activeThreadId === threadId) {
        if (updated.length > 0) {
          selectThread(updated[0]);
        } else {
          startNewConversation();
        }
      }
    } catch (err) {
      console.error('Failed to delete thread', err);
    }
  };

  const currentCourse = courses.find(c => c.id === selectedCourseId);

  const handleSendMessage = async (textToSend?: string) => {
    const q = textToSend || inputQuestion;
    if (!q.trim() || isLoading) return;

    const userMsg: AiTutorMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: q,
      courseId: currentCourse?.id,
      courseTitle: currentCourse?.title,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const courseContext = currentCourse
        ? `Cours : ${currentCourse.title} (UE: ${currentCourse.ueCode})\nNotes: ${currentCourse.notes || ''}`
        : 'Cours général PASS médecine';

      const res = await api.askTutor(
        q,
        courseContext,
        currentCourse?.id,
        currentCourse?.title,
        activeThreadId || undefined
      );

      const modelMsg: AiTutorMessage = {
        id: res.messageId || 'model-' + Date.now(),
        role: 'model',
        content: res.answer,
        courseId: currentCourse?.id,
        courseTitle: currentCourse?.title,
        timestamp: res.timestamp || new Date().toISOString(),
        createdQcm: res.createdQcm,
        createdIllustration: res.createdIllustration,
        createdFlashcard: res.createdFlashcard,
        groundingSources: res.groundingSources
      };

      setMessages(prev => [...prev, modelMsg]);

      if (res.createdQcm && onQcmCreated) {
        onQcmCreated();
      }
      if (res.createdFlashcard && onFlashcardCreated) {
        onFlashcardCreated();
      }

      // Refresh threads list & ensure activeThreadId is set
      if (res.threadId) {
        setActiveThreadId(res.threadId);
      }
      const updatedThreads = await api.getTutorThreads();
      setThreads(updatedThreads);

    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          content: "Désolé, une erreur s'est produite lors de la communication avec Gemini. Veuillez réessayer.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptTemplate: string) => {
    handleSendMessage(promptTemplate);
  };

  const filteredThreads = threads.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) ||
           (t.courseTitle && t.courseTitle.toLowerCase().includes(q)) ||
           (t.ueCode && t.ueCode.toLowerCase().includes(q));
  });

  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/75 overflow-hidden flex h-[calc(100vh-140px)] min-h-[550px] animate-fadeIn relative shadow-lg">
      
      {/* MOBILE BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden animate-fadeIn"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR: CONVERSATION HISTORY */}
      <div
        className={`
          ${
            isSidebarOpen
              ? 'fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] md:static md:w-80 shadow-2xl md:shadow-none'
              : 'w-0 hidden md:flex md:w-16'
          }
          transition-all duration-300 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full
        `}
      >
        {isSidebarOpen ? (
          <div className="flex flex-col h-full p-4 space-y-4">
            
            {/* Sidebar Top: New Chat + Toggle */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => startNewConversation()}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nouvelle discussion</span>
              </button>

              <button
                onClick={() => setIsSidebarOpen(false)}
                title="Fermer l'historique"
                className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all flex items-center justify-center shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Search conversations */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher une discussion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-none">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                <History className="w-3 h-3" />
                <span>Historique ({filteredThreads.length})</span>
              </div>

              {filteredThreads.length === 0 ? (
                <div className="text-center py-8 px-2 text-slate-400 dark:text-slate-500 text-xs">
                  {searchQuery ? 'Aucune conversation trouvée.' : 'Aucune discussion enregistrée pour le moment.'}
                </div>
              ) : (
                filteredThreads.map(t => {
                  const isActive = activeThreadId === t.id;
                  const c = courses.find(course => course.id === t.courseId);
                  const color = c?.color || '#0284c7';
                  const dateStr = formatDate(t.updatedAt || t.createdAt, {
                    day: 'numeric',
                    month: 'short'
                  });

                  return (
                    <div
                      key={t.id}
                      onClick={() => selectThread(t)}
                      className={`group relative p-3 rounded-2xl cursor-pointer transition-all border text-xs flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-300 dark:border-sky-500/60 shadow-xs'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/90 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`} />
                          <span className={`font-bold truncate ${isActive ? 'text-sky-950 dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white'}`}>
                            {t.title || 'Discussion sans titre'}
                          </span>
                        </div>

                        {/* Delete thread button */}
                        <button
                          onClick={(e) => handleDeleteThread(e, t.id)}
                          title="Supprimer la conversation"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/80 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Footer: Course badge + date */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                        {t.ueCode ? (
                          <span
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shadow-2xs"
                            style={{
                              backgroundColor: color,
                              color: getContrastTextColor(color)
                            }}
                          >
                            {t.ueCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Général</span>
                        )}

                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        ) : (
          /* Collapsed Mini Sidebar (Desktop only) */
          <div className="flex flex-col items-center py-4 space-y-4 h-full">
            <button
              onClick={() => setIsSidebarOpen(true)}
              title="Ouvrir l'historique des discussions"
              className="p-3 rounded-2xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-800 transition-all shadow-xs"
            >
              <History className="w-5 h-5" />
            </button>

            <button
              onClick={() => startNewConversation()}
              title="Nouvelle conversation"
              className="p-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/40 dark:bg-slate-900/30 min-w-0">
        
        {/* Tutor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* History Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              title="Afficher l'historique"
              className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-semibold shrink-0 transition-all ${
                isSidebarOpen ? 'md:hidden' : 'flex'
              }`}
            >
              <History className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-sky-950/20 shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">Tuteur Médical IA</h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-amber-300" /> 3.7 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                Assistance médicale, mémoire multi-tours et création automatique de QCMs
              </p>
            </div>
          </div>

          {/* Course Context Combobox & Course Link */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <div className="flex-1 sm:w-72">
              <CourseCombobox
                courses={courses}
                selectedCourseId={selectedCourseId}
                onSelectCourse={(id) => setSelectedCourseId(id)}
                generalOptionLabel="-- Contexte général PASS --"
                placeholder="Rechercher un cours (UE, nom, mot-clé)..."
              />
            </div>

            {currentCourse && onNavigateToCourse && (
              <button
                onClick={() => onNavigateToCourse(currentCourse)}
                title={`Ouvrir la fiche du cours : ${currentCourse.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs group"
              >
                <BookOpen className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-sky-600 dark:text-sky-400" />
                <span className="hidden lg:inline">Fiche de cours</span>
                <ExternalLink className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Prompts Bar */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/30">
          <button
            onClick={() => handleQuickPrompt("Crée et enregistre un QCM d'entraînement PASS officiel sur ce point précis.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/60 dark:hover:bg-pink-900/60 text-[11px] font-bold text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-500/40 whitespace-nowrap transition-all shadow-2xs"
          >
            <Award className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>🎯 Créer un QCM</span>
          </button>

          <button
            onClick={() => handleQuickPrompt("Génère-moi un schéma anatomique médical complet et détaillé avec toutes ses légendes et libellés en français sur ce cours (pas un dessin à trous).")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[11px] font-bold text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 whitespace-nowrap transition-all shadow-2xs"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>🔬 Schéma Médical Complet</span>
          </button>

          <button
            onClick={() => handleQuickPrompt("Génère-moi une planche d'entraînement de dessin à trous numérotée sur ce cours avec corrigé en français pour m'entraîner à légender.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-[11px] font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 whitespace-nowrap transition-all shadow-2xs"
          >
            <span>🎯</span>
            <span>Planche à trous</span>
          </button>

          <button
            onClick={() => handleQuickPrompt("Quels sont les 3 pièges de concours les plus vicieux sur ce chapitre ?")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-[11px] font-bold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 whitespace-nowrap transition-all shadow-2xs"
          >
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Pièges de concours</span>
          </button>

          <button
            onClick={() => handleQuickPrompt("Donne-moi un moyen mnémotechnique percutant pour mémoriser les éléments clés.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-[11px] font-bold text-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40 whitespace-nowrap transition-all shadow-2xs"
          >
            <Lightbulb className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Moyen mnémotechnique</span>
          </button>

          <button
            onClick={() => handleQuickPrompt("Explique-moi ce concept avec une analogie simple et concrète.")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 whitespace-nowrap transition-all shadow-2xs"
          >
            <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Analogie simple</span>
          </button>
        </div>

        {/* Message Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100/60 dark:bg-slate-900/30">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none shadow-md'
                    : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 rounded-tl-none font-sans'
                }`}
              >
                {msg.role === 'model' ? (
                  <MarkdownRenderer
                    content={
                      msg.content
                        ? msg.content.replace(/\n*---\s*\n+###?\s*🌐?\s*Sources\s*&?\s*Liens\s*Web[\s\S]*$/i, '').trim()
                        : ''
                    }
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Embedded Interactive Created QCM Card */}
                {msg.createdQcm && (() => {
                  const isRevealed = msg.createdQcm.id ? revealedQcmIds.has(msg.createdQcm.id) : false;
                  const toggleRevealThisQcm = () => {
                    if (!msg.createdQcm?.id) return;
                    setRevealedQcmIds(prev => {
                      const next = new Set(prev);
                      if (next.has(msg.createdQcm!.id)) {
                        next.delete(msg.createdQcm!.id);
                      } else {
                        next.add(msg.createdQcm!.id);
                      }
                      return next;
                    });
                  };

                  return (
                    <div className="mt-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-950/90 border border-emerald-300 dark:border-emerald-500/40 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-emerald-200 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            QCM Enregistré dans le Cours
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                            {msg.createdQcm.ueCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold hidden sm:block">
                            Difficulté : {'★'.repeat(msg.createdQcm.difficulty || 3)}{'☆'.repeat(5 - (msg.createdQcm.difficulty || 3))}
                          </div>

                          <button
                            onClick={toggleRevealThisQcm}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shadow-2xs ${
                              isRevealed
                                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                                : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                            }`}
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{isRevealed ? 'Masquer les réponses' : 'Afficher les réponses'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        <MarkdownRenderer content={msg.createdQcm.questionStem} inline />
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5">
                        {msg.createdQcm.items.map((item) => (
                          <div
                            key={item.itemLetter}
                            className={`p-2.5 rounded-xl border text-[11px] space-y-1 transition-all shadow-2xs ${
                              isRevealed
                                ? item.isTrue
                                  ? 'bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                  : 'bg-rose-50/90 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-950 dark:text-rose-100'
                                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200 flex-1 min-w-0">
                                <span className="font-mono font-bold text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-950 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
                                  {item.itemLetter}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <MarkdownRenderer content={item.text} inline />
                                </div>
                              </div>

                              {isRevealed && (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 animate-fadeIn shadow-2xs ${
                                    item.isTrue
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40'
                                  }`}
                                >
                                  {item.isTrue ? 'VRAI' : 'FAUX'}
                                </span>
                              )}
                            </div>

                            {isRevealed && item.explanation && (
                              <div className={`text-[10px] pl-6 border-l-2 ml-2 animate-fadeIn font-medium ${
                                item.isTrue
                                  ? 'text-emerald-900/85 dark:text-slate-300 border-emerald-300 dark:border-emerald-800'
                                  : 'text-rose-900/85 dark:text-slate-300 border-rose-300 dark:border-rose-800'
                              }`}>
                                <MarkdownRenderer content={item.explanation} inline />
                                {item.isTrap && (
                                  <span className="ml-1.5 text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/40 px-1 py-0.2 rounded inline-flex items-center gap-1">
                                    ⚠️ Piège de concours
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Mnemonic pill if present */}
                      {isRevealed && msg.createdQcm.mnemonics && msg.createdQcm.mnemonics.length > 0 && (() => {
                        const rawMne = msg.createdQcm.mnemonics[0] || '';
                        const cleanedMne = rawMne
                          .replace(/^moyen\s+mn[ée]motechnique\s*:\s*/i, '')
                          .replace(/^astuce\s+mn[ée]motechnique\s*:\s*/i, '');

                        return (
                          <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-indigo-950/40 border border-amber-200 dark:border-indigo-500/20 text-[10px] text-amber-950 dark:text-indigo-200 flex items-center gap-2 animate-fadeIn shadow-2xs">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                            <div className="leading-snug">
                              <strong className="font-extrabold text-amber-900 dark:text-amber-300 mr-1">💡 Moyen mnémotechnique :</strong>
                              <MarkdownRenderer content={cleanedMne} inline />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action Button */}
                      {onStartQcmQuiz && currentCourse && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => onStartQcmQuiz(currentCourse)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Lancer l'entraînement sur ce cours</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Embedded Interactive Created Illustration Card */}
                {msg.createdIllustration && (
                  <div className="mt-3 p-4 rounded-2xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/40 shadow-md space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-purple-200 dark:border-purple-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-300 dark:border-purple-700/60 uppercase tracking-wider">
                          <span>{msg.createdIllustration.illustrationType === 'DESSIN_A_TROUS' ? '🎯' : '🔬'}</span>
                          <span>{msg.createdIllustration.illustrationType === 'DESSIN_A_TROUS' ? 'Planche à Trous Générée' : 'Schéma Médical'}</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {msg.createdIllustration.ueCode || 'PASS'}
                        </span>
                      </div>

                      <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400">
                        gemini-3-pro-image (Nano Banana Pro)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Generous HD Image Preview */}
                      <div
                        onClick={() => setSelectedIllustration(msg.createdIllustration!)}
                        className="w-full max-w-lg mx-auto h-64 bg-white dark:bg-slate-950 rounded-2xl border border-purple-200 dark:border-purple-800 overflow-hidden cursor-pointer group relative shadow-md flex items-center justify-center"
                      >
                        <img
                          src={msg.createdIllustration.imageUrl}
                          alt={msg.createdIllustration.title}
                          className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-purple-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2">
                          <span className="p-2 rounded-xl bg-purple-600/90 shadow-lg flex items-center gap-1.5">
                            <span>🔍</span> S'entraîner / Imprimer A4
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {msg.createdIllustration.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                          {msg.createdIllustration.prompt}
                        </p>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          🏷️ {msg.createdIllustration.legendItems?.length || 0} repères configurés
                        </div>

                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedIllustration(msg.createdIllustration!)}
                            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <span>🔍</span>
                            <span>S'entraîner à légender</span>
                          </button>
                          <button
                            onClick={() => printMedicalWorksheet(msg.createdIllustration!, true)}
                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-slate-800 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-300 dark:border-purple-700/60 shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <span>🖨️</span>
                            <span>Imprimer Planche A4</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Embedded Created Flashcard Card */}
                {msg.createdFlashcard && (
                  <div className="mt-3 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 shadow-md space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 uppercase tracking-wider">
                          <Layers className="w-3 h-3" />
                          <span>Flashcard Créée</span>
                        </span>
                        {msg.createdFlashcard.ueCode && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {msg.createdFlashcard.ueCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                        ✓ Enregistrée dans le cours
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Question (Recto)
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                          <MarkdownRenderer content={msg.createdFlashcard.front} />
                        </div>
                      </div>

                      {msg.createdFlashcard.hint && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700/40">
                          💡 <strong>Indice :</strong> {msg.createdFlashcard.hint}
                        </div>
                      )}

                      <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/40">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Réponse (Verso)
                        </div>
                        <div className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                          <MarkdownRenderer content={msg.createdFlashcard.back} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Search Grounding Sources Badges */}
                {(() => {
                  const rawSources =
                    msg.groundingSources && msg.groundingSources.length > 0
                      ? msg.groundingSources
                      : msg.role === 'model'
                      ? (() => {
                          const linkRegex = /\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g;
                          const found: { title: string; uri: string; domain: string }[] = [];
                          const seen = new Set<string>();
                          let match;
                          while ((match = linkRegex.exec(msg.content)) !== null) {
                            const title = match[1];
                            const uri = match[2];
                            if (!seen.has(uri)) {
                              seen.add(uri);
                              let domain = '';
                              try {
                                domain = new URL(uri).hostname.replace(/^www\./, '');
                              } catch {}
                              found.push({ title, uri, domain });
                            }
                          }
                          return found;
                        })()
                      : [];

                  if (rawSources.length === 0) return null;

                  // Deduplicate by unique URI
                  const seenUris = new Set<string>();
                  const displaySources = rawSources.filter(src => {
                    if (!src.uri || seenUris.has(src.uri)) return false;
                    seenUris.add(src.uri);
                    return true;
                  });

                  if (displaySources.length === 0) return null;

                  return (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                        <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Sources & Références Web consultées (Google Search) :</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {displaySources.map((src, sIdx) => {
                          const showDomain = src.domain && !src.domain.includes('vertexaisearch') && !src.title.includes(src.domain);
                          return (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500/50 text-[10px] text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 transition-all shadow-2xs group"
                              title={src.uri}
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 shrink-0" />
                              <span className="font-semibold truncate max-w-[220px]">{src.title || src.domain || src.uri}</span>
                              {showDomain && (
                                <span className="text-[9px] text-slate-500 font-mono">({src.domain})</span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 text-right flex items-center justify-end gap-1">
                  <Clock className="w-2.5 h-2.5 opacity-60" />
                  <span>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 text-xs text-sky-700 dark:text-sky-400 flex items-center gap-2 shadow-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Le Tuteur IA réfléchit avec Gemini...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Box */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/60 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              currentCourse
                ? `Poser une question ou demander un QCM sur ${currentCourse.title}...`
                : "Poser une question ou demander : « Crée-moi un QCM sur les récepteurs RCPG »..."
            }
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
          />

          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="p-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold disabled:opacity-40 transition-all shadow-md shadow-sky-950/20 active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Interactive Medical Illustration Modal (Full viewer, print, test, & adjustment) */}
      {selectedIllustration && (
        <MedicalIllustrationModal
          illustration={selectedIllustration}
          onClose={() => setSelectedIllustration(null)}
          onUpdated={(updated) => {
            setSelectedIllustration(updated);
            // Update message in conversation if present
            setMessages(prev => prev.map(m => {
              if (m.createdIllustration?.id === updated.id) {
                return { ...m, createdIllustration: updated };
              }
              return m;
            }));
          }}
          onDeleted={(id) => {
            setSelectedIllustration(null);
            setMessages(prev => prev.map(m => {
              if (m.createdIllustration?.id === id) {
                return { ...m, createdIllustration: undefined };
              }
              return m;
            }));
          }}
        />
      )}

    </div>
  );
};
export default AiTutorChat;
