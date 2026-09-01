import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Server,
  Activity,
  CheckCircle2,
  RefreshCw,
  Zap,
  BookOpen,
  Brain,
  ShieldCheck
} from 'lucide-react';

interface ColdStartLoaderProps {
  onRetry?: () => void;
  statusMessage?: string;
}

const MEDICAL_TIPS = [
  {
    icon: '💡',
    title: 'Méthode des J & Répétition Espacée',
    text: 'Revoir un cours à J₀, J₁, J₃, J₇, J₁₄, J₃₀ permet d\'ancrer durablement plus de 80% des notions dans la mémoire à long terme.'
  },
  {
    icon: '🧠',
    title: 'Plasticité Synaptique & Sommeil',
    text: 'La phase de sommeil lent profond est cruciale pour consolider les traces mnésiques encodées pendant vos révisions de la journée.'
  },
  {
    icon: '⚡',
    title: 'Pièges Fréquents en QCM PASS',
    text: 'Soyez vigilants sur les inversions classiques : droite/gauche, proximal/distal, agoniste/antagoniste et unités physiologiques.'
  },
  {
    icon: '🎯',
    title: 'Lissage Intelligent de la Charge',
    text: 'MedJ rééquilibre automatiquement les journées surchargées tout en ancrant strictement vos cours prioritaires et difficiles.'
  },
  {
    icon: '📖',
    title: 'Rappel Actif (Active Recall)',
    text: 'Se tester activement via des flashcards et QCMs est 3× plus efficace qu\'une simple relecture passive de polycopiés.'
  },
  {
    icon: '🩺',
    title: 'Régularité & Réussite',
    text: 'En première année de santé, 30 minutes de révision quotidienne bien cadencée surpassent les nuits blanches de révision.'
  }
];

export const ColdStartLoader: React.FC<ColdStartLoaderProps> = ({ onRetry, statusMessage }) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFade, setTipFade] = useState(true);

  // Timer for elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tip rotation every 4.5 seconds with fade animation
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipFade(false);
      setTimeout(() => {
        setCurrentTipIndex(prev => (prev + 1) % MEDICAL_TIPS.length);
        setTipFade(true);
      }, 250);
    }, 4500);
    return () => clearInterval(tipTimer);
  }, []);

  // Dynamic status text based on elapsed time (Cold Start progression)
  const getDynamicStatus = () => {
    if (statusMessage) return statusMessage;
    if (secondsElapsed < 2) {
      return 'Initialisation de votre espace MedJ...';
    }
    if (secondsElapsed < 6) {
      return 'Réveil du serveur Cloud Run en cours...';
    }
    if (secondsElapsed < 11) {
      return 'Synchronisation de la base médicale et des fiches PASS...';
    }
    return 'Finalisation du chargement de vos révisions...';
  };

  const getSubStatus = () => {
    if (secondsElapsed < 2) {
      return 'Vérification de la session et des accès sécurisés';
    }
    if (secondsElapsed < 6) {
      return 'Démarrage de l\'instance serverless suite à une mise en veille';
    }
    if (secondsElapsed < 11) {
      return 'Chargement des UEs, cours, QCMs et répétitions espacées';
    }
    return 'Les données sont en cours d\'affichage...';
  };

  const currentTip = MEDICAL_TIPS[currentTipIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden px-4 selection:bg-sky-500 selection:text-white">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="max-w-md w-full glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 shadow-2xl relative overflow-hidden text-center z-10">
        
        {/* Top Logo & Animated Orbital Spinner */}
        <div className="relative flex items-center justify-center mx-auto mb-6">
          {/* Outer glowing pulsing halo */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500/30 via-teal-400/20 to-indigo-500/30 blur-md animate-ping opacity-30"></div>
          
          {/* Rotating outer spinner ring */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500 via-teal-400 to-indigo-500 p-[2.5px] animate-spin shadow-lg shadow-sky-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              {/* Inner glowing icon */}
              {secondsElapsed < 3 ? (
                <Sparkles className="w-8 h-8 text-sky-400 animate-pulse" />
              ) : secondsElapsed < 7 ? (
                <Server className="w-8 h-8 text-teal-400 animate-bounce" />
              ) : (
                <Activity className="w-8 h-8 text-sky-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Brand Title */}
        <div className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white inline-flex items-center gap-2">
            <span>MedJ</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              PASS / LAS
            </span>
          </h1>
        </div>

        {/* Dynamic Status Heading */}
        <div className="min-h-[56px] flex flex-col justify-center mb-5">
          <h2 className="text-sm sm:text-base font-bold text-slate-100 transition-all duration-300">
            {getDynamicStatus()}
          </h2>
          <p className="text-xs text-slate-400 mt-1 transition-all duration-300">
            {getSubStatus()}
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-semibold text-slate-300">Auth</span>
          </div>
          <div className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
            secondsElapsed >= 2
              ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-500'
          }`}>
            <Server className={`w-4 h-4 ${secondsElapsed >= 2 ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-[10px] font-semibold">Serveur</span>
          </div>
          <div className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
            secondsElapsed >= 6
              ? 'bg-teal-950/40 border-teal-500/40 text-teal-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-500'
          }`}>
            <Brain className={`w-4 h-4 ${secondsElapsed >= 6 ? 'text-teal-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-[10px] font-semibold">Données J</span>
          </div>
        </div>

        {/* Activity animated bar */}
        <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden p-0.5 border border-slate-800/80 mb-6 relative">
          <div className="bg-gradient-to-r from-sky-500 via-teal-400 to-indigo-500 h-full rounded-full animate-pulse w-full"></div>
        </div>

        {/* Rotating Medical Tip Box */}
        <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800/80 text-left relative overflow-hidden mb-4">
          <div className={`transition-opacity duration-300 ${tipFade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{currentTip.icon}</span>
              <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                {currentTip.title}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentTip.text}
            </p>
          </div>
        </div>

        {/* Long wait action (if > 15 seconds) */}
        {secondsElapsed >= 15 && (
          <div className="pt-2 animate-fadeIn">
            <p className="text-[11px] text-amber-400 mb-2 font-medium">
              Le démarrage prend un peu plus de temps que d'habitude...
            </p>
            <button
              onClick={() => {
                if (onRetry) {
                  onRetry();
                } else {
                  window.location.reload();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser la page</span>
            </button>
          </div>
        )}

        {/* Bottom micro metadata */}
        <div className="mt-4 pt-4 border-t border-slate-900/80 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Cloud Run Serverless
          </span>
          <span className="font-mono">
            {secondsElapsed}s
          </span>
        </div>

      </div>
    </div>
  );
};
