import React, { useState, useEffect } from 'react';
import { Course, SubjectUE, Flashcard, FlashcardVerification } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PrintFlashcardsModal } from './PrintFlashcardsModal';
import { FlashcardVerificationModal } from './FlashcardVerificationModal';
import {
  Layers,
  Plus,
  Search,
  Star,
  Play,
  Sparkles,
  RotateCw,
  Lightbulb,
  Edit3,
  Trash2,
  Filter,
  CheckCircle2,
  BookOpen,
  Shuffle,
  Eye,
  EyeOff,
  Link2,
  Share2,
  Printer,
  ShieldCheck
} from 'lucide-react';

interface FlashcardBankViewProps {
  courses: Course[];
  subjects: SubjectUE[];
  targetFlashcardId?: string | null;
  onNavigate?: (path: string) => void;
  onOpenEditModal: (flashcard?: Flashcard, defaultCourseId?: string) => void;
  onStartStudy: (flashcards: Flashcard[], initialIndex?: number, title?: string) => void;
  onShowToast: (msg: string) => void;
}

export const FlashcardBankView: React.FC<FlashcardBankViewProps> = ({
  courses,
  subjects,
  targetFlashcardId,
  onNavigate,
  onOpenEditModal,
  onStartStudy,
  onShowToast
}) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUe, setSelectedUe] = useState('ALL');
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'ALL'>('ALL');
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Verification state
  const [verifyingCard, setVerifyingCard] = useState<Flashcard | null>(null);
  const [verificationResult, setVerificationResult] = useState<FlashcardVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    setIsLoading(true);
    try {
      const list = await api.getFlashcards();
      setFlashcards(list);
    } catch (e) {
      console.error('Failed to load flashcards', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll into view & reveal target flashcard if opened via direct URL (/flashcards/:id)
  useEffect(() => {
    if (!isLoading && targetFlashcardId && flashcards.length > 0) {
      const targetCard = flashcards.find(f => f.id === targetFlashcardId);
      if (targetCard) {
        setSelectedUe('ALL');
        setSelectedCourseId('ALL');
        setDifficultyFilter('ALL');
        setFavoriteOnly(false);
        setSearchQuery('');
        setRevealedCardIds(prev => new Set([...prev, targetFlashcardId]));
      }

      setTimeout(() => {
        const el = document.getElementById(`flashcard-card-${targetFlashcardId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  }, [isLoading, targetFlashcardId, flashcards]);

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Optimistic update
    setFlashcards(prev => prev.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
    try {
      await api.toggleFlashcardFavorite(id);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      loadFlashcards();
    }
  };

  const copyDirectLink = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/flashcards/${cardId}`;
    navigator.clipboard.writeText(url);
    window.history.pushState(null, '', `/flashcards/${cardId}`);
    onShowToast(`✓ Lien direct copié : /flashcards/${cardId}`);
    if (onNavigate) {
      onNavigate(`/flashcards/${cardId}`);
    }
  };

  const handleDeleteFlashcard = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer définitivement cette flashcard ?')) return;

    try {
      await api.deleteFlashcard(id);
      setFlashcards(prev => prev.filter(f => f.id !== id));
      onShowToast('✓ Flashcard supprimée avec succès.');
    } catch (err) {
      console.error('Failed to delete flashcard', err);
      alert('Erreur lors de la suppression de la flashcard.');
    }
  };

  const toggleRevealAnswer = (id: string) => {
    setRevealedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleVerifyFlashcard = async (card: Flashcard) => {
    setVerifyingCard(card);
    setVerificationResult(null);
    setIsVerifying(true);
    try {
      const result = await api.verifyFlashcardById(card.id);
      setVerificationResult(result);
    } catch (err) {
      console.error('Failed to verify flashcard', err);
      onShowToast('❌ Erreur lors de la vérification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApplyCorrection = async (correctedCard: Flashcard) => {
    try {
      const updated = await api.updateFlashcard(correctedCard.id, correctedCard);
      setFlashcards(prev => prev.map(f => f.id === updated.id ? updated : f));
      onShowToast('✓ Flashcard optimisée avec succès !');
    } catch (err) {
      console.error('Failed to apply correction', err);
      onShowToast('❌ Erreur lors de la mise à jour');
    }
  };

  const handleGenerateAiFlashcards = async () => {
    let targetCourse: Course | undefined;
    if (selectedCourseId !== 'ALL') {
      targetCourse = courses.find(c => c.id === selectedCourseId);
    } else if (selectedUe !== 'ALL') {
      targetCourse = courses.find(c => c.ueCode?.toLowerCase() === selectedUe.toLowerCase() || c.ueId?.toLowerCase() === selectedUe.toLowerCase());
    } else if (courses.length > 0) {
      targetCourse = courses[0];
    }

    const courseId = targetCourse?.id || (selectedCourseId !== 'ALL' ? selectedCourseId : undefined);
    const courseTitle = targetCourse?.title || (selectedUe !== 'ALL' ? `Révisions UE ${selectedUe}` : 'Médecine PASS - Mémorisation Active');
    const ueCode = targetCourse?.ueCode || (selectedUe !== 'ALL' ? selectedUe : 'PASS');
    const ueId = targetCourse?.ueId || (selectedUe !== 'ALL' ? selectedUe.toLowerCase() : 'ue1');
    const content = targetCourse?.notes || targetCourse?.title || `Concepts fondamentaux, formules et pièges de concours pour ${ueCode}`;

    setIsGeneratingAi(true);
    try {
      const generated = await api.generateFlashcards(
        courseId,
        courseTitle,
        ueCode,
        ueId,
        content,
        5
      );
      setFlashcards(prev => [...generated, ...prev]);
      onShowToast(`✨ ${generated.length} flashcards générées par IA pour [${ueCode}] ${courseTitle} !`);
    } catch (e: any) {
      console.error('Failed to generate flashcards by AI', e);
      onShowToast('❌ Erreur lors de la génération IA des flashcards.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Cascading course filter based on selected UE
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

  const filteredCards = flashcards.filter(f => {
    const qText = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      f.front.toLowerCase().includes(qText) ||
      f.back.toLowerCase().includes(qText) ||
      (f.hint && f.hint.toLowerCase().includes(qText)) ||
      (f.courseTitle && f.courseTitle.toLowerCase().includes(qText)) ||
      (f.ueCode && f.ueCode.toLowerCase().includes(qText)) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(qText)));

    const matchesUe = selectedUe === 'ALL' || f.ueCode?.toLowerCase() === selectedUe.toLowerCase() || f.ueId?.toLowerCase() === selectedUe.toLowerCase();
    const matchesCourse = selectedCourseId === 'ALL' || f.courseId === selectedCourseId;
    const matchesFav = !favoriteOnly || f.isFavorite;
    const matchesDiff = difficultyFilter === 'ALL' || f.difficulty === difficultyFilter;

    return matchesSearch && matchesUe && matchesCourse && matchesFav && matchesDiff;
  });

  const getSubject = (ueCode?: string) => subjects.find(s => s.code.toLowerCase() === ueCode?.toLowerCase());
  const favoriteCount = flashcards.filter(f => f.isFavorite).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>Flashcards & Mémorisation Active</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800/40 shrink-0">
              {flashcards.length} carte{flashcards.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
            Entraînez votre mémoire à long terme (Anki / Quizlet) avec défilement 3D, indices et formules.
          </p>
        </div>

        {/* Global Action Buttons (Single Row) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* AI Generator button */}
          <button
            onClick={handleGenerateAiFlashcards}
            disabled={isGeneratingAi}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            title="Générer 5 flashcards pertinentes avec Gemini pour le cours sélectionné"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingAi ? 'Génération...' : 'Générer (IA)'}</span>
          </button>

          {/* New manual card */}
          <button
            onClick={() => onOpenEditModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle carte</span>
          </button>

          {/* Print Flashcards button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={filteredCards.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs shrink-0"
            title={`Imprimer ou exporter en PDF les ${filteredCards.length} flashcards sélectionnées`}
          >
            <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Imprimer ({filteredCards.length})</span>
          </button>

          {/* Start Study Player on filtered selection */}
          <button
            onClick={() => onStartStudy(filteredCards, 0, selectedCourseId !== 'ALL' ? courses.find(c => c.id === selectedCourseId)?.title : (selectedUe !== 'ALL' ? `Flashcards ${selectedUe}` : 'Toutes les flashcards'))}
            disabled={filteredCards.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>S'entraîner ({filteredCards.length})</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Search, Cascading UE -> Course, Favorites ⭐, Difficulty) */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search bar */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher (question, formule, tag)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* UE Filter */}
          <select
            value={selectedUe}
            onChange={(e) => handleUeChange(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
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
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500 truncate"
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

          {/* Favorite ⭐ Filter Toggle */}
          <button
            type="button"
            onClick={() => setFavoriteOnly(!favoriteOnly)}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              favoriteOnly
                ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-400 font-bold'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoriteOnly ? 'fill-amber-400 text-amber-500' : ''}`} />
            <span>Favoris ({favoriteCount})</span>
          </button>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Toutes difficultés</option>
            <option value={1}>Difficulté : ★☆☆☆☆ (1)</option>
            <option value={2}>Difficulté : ★★☆☆☆ (2)</option>
            <option value={3}>Difficulté : ★★★☆☆ (3)</option>
            <option value={4}>Difficulté : ★★★★☆ (4)</option>
            <option value={5}>Difficulté : ★★★★★ (5)</option>
          </select>

        </div>
      </div>

      {/* Flashcards Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
          <span>Chargement des flashcards...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 space-y-3 shadow-xs">
          <Layers className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300">Aucune flashcard ne correspond à vos critères</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Modifiez vos filtres, créez une flashcard ou générez-en automatiquement avec Gemini.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => onOpenEditModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs"
            >
              + Créer manuellement
            </button>
            <button
              onClick={handleGenerateAiFlashcards}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/20 transition-all"
            >
              ✨ Générer par IA
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card, idx) => {
            const isRevealed = revealedCardIds.has(card.id);
            const isTarget = targetFlashcardId === card.id;
            const sub = getSubject(card.ueCode);

            return (
              <div
                key={card.id}
                id={`flashcard-card-${card.id}`}
                className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 group relative shadow-sm ${
                  isTarget
                    ? 'border-amber-500 ring-2 ring-amber-500 shadow-xl shadow-amber-500/20 bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/80'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-white shadow-2xs"
                      style={{ backgroundColor: sub?.color || '#d97706' }}
                    >
                      {card.ueCode}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                      {card.courseTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Copy Direct Link Button */}
                    <button
                      type="button"
                      onClick={(e) => copyDirectLink(e, card.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      title="Copier le lien direct de la flashcard (/flashcards/...)"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>

                    {/* Star Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, card.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      title={card.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris ⭐'}
                    >
                      <Star className={`w-4 h-4 ${card.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Question (Recto) */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                    <span>Recto (Question)</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-3 leading-relaxed font-sans">
                    <MarkdownRenderer content={card.front} />
                  </div>
                </div>

                {/* Hint if present */}
                {card.hint && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-900 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-lg">
                    <Lightbulb className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate"><strong>Indice :</strong> {card.hint}</span>
                  </div>
                )}

                {/* Answer (Verso) Toggle Preview */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleRevealAnswer(card.id)}
                    className="flex items-center justify-between w-full text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      {isRevealed ? <EyeOff className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
                      <span>{isRevealed ? 'Masquer la réponse' : 'Afficher la réponse (Verso)'}</span>
                    </span>
                  </button>

                  {isRevealed && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-emerald-300 dark:border-emerald-500/30 text-xs text-slate-900 dark:text-slate-200 animate-fadeIn">
                      <MarkdownRenderer content={card.back} />
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => onStartStudy([card], 0, card.courseTitle)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 transition-all cursor-pointer shadow-2xs"
                  >
                    <Play className="w-3 h-3 fill-amber-600 dark:fill-amber-400" />
                    <span>S'entraîner</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyFlashcard(card)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                      title="Vérifier la flashcard par IA (Fact-Checking)"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(card)}
                      className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Modifier la flashcard"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFlashcard(e, card.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Supprimer la flashcard"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Print Flashcards Modal */}
      <PrintFlashcardsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        flashcards={filteredCards}
        subjects={subjects}
        contextTitle={
          selectedCourseId !== 'ALL'
            ? courses.find(c => c.id === selectedCourseId)?.title
            : (selectedUe !== 'ALL' ? `Flashcards ${selectedUe}` : 'Banque de Flashcards MedJ')
        }
        onShowToast={onShowToast}
      />

      {/* Fact-Checking Verification Modal */}
      <FlashcardVerificationModal
        isOpen={verifyingCard !== null}
        onClose={() => {
          setVerifyingCard(null);
          setVerificationResult(null);
        }}
        flashcard={verifyingCard}
        verificationResult={verificationResult}
        isLoading={isVerifying}
        onApplyCorrection={handleApplyCorrection}
      />

    </div>
  );
};
