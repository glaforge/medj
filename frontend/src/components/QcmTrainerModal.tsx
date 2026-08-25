import React, { useState, useEffect, useRef } from 'react';
import { Course, QcmQuestion } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import confetti from 'canvas-confetti';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatPoints } from '../utils/dateUtils';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Award,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Trophy,
  Check,
  AlertTriangle
} from 'lucide-react';

interface QcmTrainerModalProps {
  course: Course;
  initialQcms?: QcmQuestion[];
  isOpen: boolean;
  onClose: () => void;
  onSessionCompleted?: (scorePercent: number) => void;
}

export const QcmTrainerModal: React.FC<QcmTrainerModalProps> = ({
  course,
  initialQcms,
  isOpen,
  onClose,
  onSessionCompleted
}) => {
  useEscapeKey(isOpen, onClose);

  const [qcms, setQcms] = useState<QcmQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // User answers: key = "qcmId-A", value = boolean | null
  const [userAnswers, setUserAnswers] = useState<Record<string, boolean | null>>({});
  const [isSubmitted, setIsSubmitted] = useState<Record<number, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(90); // 90s per QCM in real PASS exam
  const [timerActive, setTimerActive] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const savePromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadQcms();
      setCurrentIndex(0);
      setUserAnswers({});
      setIsSubmitted({});
      setSecondsLeft(90);
      setTimerActive(true);
      setIsFinished(false);
      savePromiseRef.current = null;
    }
  }, [isOpen, course.id, initialQcms]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && timerActive && secondsLeft > 0 && !isFinished) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timerActive, secondsLeft, isFinished]);

  const loadQcms = async () => {
    setLoading(true);
    try {
      if (initialQcms && initialQcms.length > 0) {
        setQcms(initialQcms);
        setLoading(false);
        return;
      }
      let list = await api.getQcms(course.id);
      if (list.length === 0) {
        list = await api.generateQcm(
          course.id,
          course.title,
          course.ueCode || 'UE',
          course.notes || course.title,
          3
        );
      }
      setQcms(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentQcm = qcms[currentIndex];

  const handleSelectAnswer = (qcmId: string, itemLetter: string, val: boolean) => {
    if (isSubmitted[currentIndex]) return;
    const key = `${qcmId}-${itemLetter}`;
    setUserAnswers(prev => ({
      ...prev,
      [key]: prev[key] === val ? null : val
    }));
  };

  // PASS Scoring rule for this single QCM
  const calculateScoreForQcm = (qcm: QcmQuestion) => {
    let exactCount = 0;
    qcm.items.forEach(item => {
      const userVal = userAnswers[`${qcm.id}-${item.itemLetter}`];
      if (userVal === item.isTrue) {
        exactCount++;
      }
    });

    // French PASS grading grid: 5=1.0, 4=0.5, 3=0.2, else 0
    let points = 0;
    if (exactCount === 5) points = 1.0;
    else if (exactCount === 4) points = 0.5;
    else if (exactCount === 3) points = 0.2;

    return { exactCount, points };
  };

  const handleSubmitCurrent = () => {
    setIsSubmitted(prev => ({ ...prev, [currentIndex]: true }));
    if (currentQcm) {
      const { exactCount } = calculateScoreForQcm(currentQcm);
      if (exactCount === 5) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
    }
  };

  const [sessionStartTime] = useState<number>(Date.now());

  const handleNextQcm = () => {
    if (currentIndex < qcms.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSecondsLeft(90);
    } else {
      // Finished all QCMs
      setIsFinished(true);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
      
      // Auto-record attempt in background
      savePromiseRef.current = saveAttemptRecord();
    }
  };

  const saveAttemptRecord = async () => {
    try {
      let totalPoints = 0;
      const questionResults = qcms.map(q => {
        const { exactCount, points } = calculateScoreForQcm(q);
        totalPoints += points;
        const hadTrapFallen = q.items.some(item => {
          const userVal = userAnswers[`${q.id}-${item.itemLetter}`];
          return item.isTrap && userVal !== item.isTrue;
        });
        return {
          questionId: q.id,
          questionStem: q.questionStem,
          exactItemsCount: exactCount,
          pointsEarned: points,
          hadTrapFallen
        };
      });

      const scorePercent = qcms.length > 0 ? Math.round((totalPoints / qcms.length) * 100) : 100;
      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));

      const res = await api.recordQcmAttempt({
        courseId: course.id,
        courseTitle: course.title,
        ueCode: course.ueCode || 'UE',
        totalQuestions: qcms.length,
        totalPoints: Number(totalPoints.toFixed(1)),
        maxPoints: qcms.length,
        scorePercent,
        timeSpentSeconds,
        questionResults,
        completedAt: new Date().toISOString()
      });
      return res;
    } catch (err) {
      console.error('Failed to record QCM attempt:', err);
    }
  };

  const handleFinalClose = async () => {
    if (!savePromiseRef.current) {
      savePromiseRef.current = saveAttemptRecord();
    }
    try {
      await savePromiseRef.current;
    } catch (err) {
      console.error('Error awaiting QCM save', err);
    }

    let totalPoints = 0;
    qcms.forEach(q => {
      totalPoints += calculateScoreForQcm(q).points;
    });
    const scorePercent = qcms.length > 0 ? Math.round((totalPoints / qcms.length) * 100) : 100;
    if (onSessionCompleted) {
      onSessionCompleted(scorePercent);
    }
    onClose();
  };

  // Overall results
  let rawGrandTotal = 0;
  qcms.forEach(q => {
    rawGrandTotal += calculateScoreForQcm(q).points;
  });
  const grandTotalPoints = Math.round(rawGrandTotal * 10) / 10;
  const grandScorePercent = qcms.length > 0 ? Math.round((grandTotalPoints / qcms.length) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col justify-between shadow-2xl bg-white dark:bg-slate-900 overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 font-mono">
                  {course.ueCode || 'PASS'}
                </span>
                {!isFinished && (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    QCM {currentIndex + 1} / {qcms.length || 1}
                  </span>
                )}
                {isFinished && (
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    Séance Terminée
                  </span>
                )}
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-md">
                {course.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isFinished && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                secondsLeft < 20
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-400 animate-pulse'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sky-700 dark:text-sky-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            )}

            <button
              onClick={handleFinalClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-sky-500 dark:text-sky-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Génération et chargement des QCMs PASS en cours...</p>
            </div>
          ) : isFinished ? (
            /* FINAL RECAP SCREEN */
            <div className="space-y-6 text-center py-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-500 p-0.5 mx-auto shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/50">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[22px] flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Résultats de la Séance de Révision</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {grandScorePercent >= 80
                    ? "Excellente performance ! Vous maîtrisez parfaitement les notions et les pièges de ce cours."
                    : grandScorePercent >= 50
                    ? "Bonne assimilation globale. Pensez à revoir les détails anatomiques et pharmacologiques pièges."
                    : "Courage ! Révisez la fiche synthétique du cours et retentez les QCMs."}
                </p>
              </div>

              {/* Score metrics box */}
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Score PASS</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatPoints(grandTotalPoints)} / {qcms.length} pt{qcms.length > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Réussite</div>
                  <div className="text-xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
                    {grandScorePercent}%
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">QCMs Traités</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {qcms.length}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown per QCM */}
              <div className="max-w-xl mx-auto space-y-2 text-left pt-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Détail par question :
                </div>
                {qcms.map((q, idx) => {
                  const { exactCount, points } = calculateScoreForQcm(q);
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-sm">
                        <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200 dark:border-slate-800">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 dark:text-slate-300 truncate font-medium">{q.questionStem}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {exactCount}/5 items
                        </span>
                        <span className={`font-extrabold px-2 py-0.5 rounded text-[11px] ${
                          points === 1
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/40'
                            : points > 0
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-800/40'
                        }`}>
                          +{formatPoints(points)} pt
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : !currentQcm ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
              Aucun QCM disponible pour ce cours.
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Question Stem (Énoncé) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed shadow-2xs">
                <MarkdownRenderer content={currentQcm.questionStem} inline />
              </div>

              {/* Items A to E */}
              <div className="space-y-2.5">
                {currentQcm.items?.map(item => {
                  const key = `${currentQcm.id}-${item.itemLetter}`;
                  const userVal = userAnswers[key];
                  const submitted = isSubmitted[currentIndex];
                  const isCorrect = submitted && userVal === item.isTrue;

                  return (
                    <div
                      key={item.itemLetter}
                      className={`p-3.5 rounded-xl border transition-all shadow-2xs ${
                        submitted
                          ? isCorrect
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/50 text-emerald-950 dark:text-emerald-100'
                            : 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/50 text-rose-950 dark:text-rose-100'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center font-bold text-xs text-sky-700 dark:text-sky-400 border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
                            {item.itemLetter}
                          </span>
                          <div className="text-xs leading-relaxed font-semibold pt-0.5 text-slate-900 dark:text-slate-100 flex-1 min-w-0">
                            <MarkdownRenderer content={item.text} inline />
                          </div>
                        </div>

                        {/* True / False Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSelectAnswer(currentQcm.id, item.itemLetter, true)}
                            disabled={submitted}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                              userVal === true
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30 scale-105'
                                : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            VRAI
                          </button>

                          <button
                            onClick={() => handleSelectAnswer(currentQcm.id, item.itemLetter, false)}
                            disabled={submitted}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                              userVal === false
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/30 scale-105'
                                : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            FAUX
                          </button>
                        </div>
                      </div>

                      {/* Explanation Reveal after submit */}
                      {submitted && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60 text-xs space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-extrabold ${item.isTrue ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                              Correction : {item.isTrue ? 'VRAI' : 'FAUX'}
                            </span>
                            {item.isTrap && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                ⚠️ Piège de concours
                              </span>
                            )}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed font-medium">
                            <MarkdownRenderer content={item.explanation} inline />
                          </div>
                          {item.trapDetails && (
                            <div className="text-amber-800 dark:text-amber-300/90 text-[10px] italic">
                              Détail piège : <MarkdownRenderer content={item.trapDetails} inline />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mnemonic & Score Banner after submit */}
              {isSubmitted[currentIndex] && (
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-sky-800 dark:text-sky-300">
                      Score obtenu sur ce QCM : {calculateScoreForQcm(currentQcm).points} / 1 point ({calculateScoreForQcm(currentQcm).exactCount}/5 items justes)
                    </span>
                  </div>
                  {currentQcm.mnemonics && currentQcm.mnemonics.length > 0 && (() => {
                    const cleanedMnemonics = currentQcm.mnemonics.map(m =>
                      m.replace(/^moyen\s+mn[ée]motechnique\s*:\s*/i, '')
                       .replace(/^astuce\s+mn[ée]motechnique\s*:\s*/i, '')
                    );

                    return (
                      <div className="text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed pt-1 flex items-start gap-1.5">
                        <span className="font-extrabold text-amber-800 dark:text-amber-300 shrink-0">💡 Astuce mnémotechnique :</span>
                        <div className="font-medium text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                          <MarkdownRenderer content={cleanedMnemonics.join(' • ')} inline />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/80">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Barème PASS : 5/5 = 1 pt • 4/5 = 0.5 pt • 3/5 = 0.2 pt
          </div>

          <div className="flex items-center gap-3">
            {isFinished ? (
              <button
                onClick={handleFinalClose}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Terminer & Enregistrer la révision</span>
              </button>
            ) : !isSubmitted[currentIndex] ? (
              <button
                onClick={handleSubmitCurrent}
                disabled={loading || !currentQcm}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all"
              >
                Valider mes réponses
              </button>
            ) : (
              <button
                onClick={handleNextQcm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all"
              >
                <span>{currentIndex < qcms.length - 1 ? 'QCM Suivant' : 'Terminer la séance'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default QcmTrainerModal;
