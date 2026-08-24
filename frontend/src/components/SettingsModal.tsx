import React, { useState, useEffect } from 'react';
import { JScheduleConfig } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useTheme, Theme } from '../context/ThemeContext';
import {
  X,
  Settings,
  Calendar,
  Sparkles,
  Download,
  CalendarSync,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Cloud,
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
  Database,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (config: JScheduleConfig) => void;
  onLoadSampleData?: () => void;
  onClearData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  onLoadSampleData,
  onClearData
}) => {
  useEscapeKey(isOpen, onClose);
  const { theme, setTheme } = useTheme();

  const [config, setConfig] = useState<JScheduleConfig>({
    defaultIntervals: [0, 1, 3, 7, 14, 30, 60],
    dailyOverloadThreshold: 6,
    autoSmoothingEnabled: true,
    facultyPreset: 'PASS Standard (Toutes Facultés)',
    calendarSyncEnabled: true
  });
  const [intervalsStr, setIntervalsStr] = useState('0, 1, 3, 7, 14, 30, 60');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingGcal, setIsSyncingGcal] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [sampleDataStatus, setSampleDataStatus] = useState<{
    hasData: boolean;
    coursesCount: number;
    revisionsCount: number;
    qcmsCount: number;
    flashcardsCount: number;
  } | null>(null);
  const [isLoadingSampleAction, setIsLoadingSampleAction] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadDataStatus();
    }
  }, [isOpen]);

  const loadDataStatus = async () => {
    try {
      const status = await api.getSampleDataStatus();
      setSampleDataStatus(status);
    } catch (e) {
      console.error('Failed to get sample data status', e);
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
      if (cfg.defaultIntervals) {
        setIntervalsStr(cfg.defaultIntervals.join(', '));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await api.updateConfig({
        ...config,
        defaultIntervals: []
      });

      setConfig(updated);
      if (onConfigUpdated) onConfigUpdated(updated);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncGoogleCalendar = async () => {
    setIsSyncingGcal(true);
    setSyncStatusMsg(null);
    try {
      const res = await api.syncGoogleCalendar();
      setSyncStatusMsg(`Synchronisation réussie : ${res.syncedCount} séances ajoutées à l'agenda Google '${res.calendarName}' !`);
    } catch (e) {
      setSyncStatusMsg("Erreur lors de la synchronisation avec Google Calendar.");
    } finally {
      setIsSyncingGcal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">Paramètres & Apparence</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Mode visuel clair/sombre, algorithmes J et intégrations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          
          {/* Visual Theme Selection (Light / Dark mode) */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Palette className="w-4 h-4 text-sky-500" />
              Apparence & Mode Visuel
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Dark Mode Card */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-2 text-left transition-all relative cursor-pointer ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                    <Moon className="w-4 h-4" />
                  </div>
                  {theme === 'dark' && <Check className="w-4 h-4 text-sky-400 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-xs">Mode Sombre</div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Idéal pour le repos visuel et les sessions de nuit</p>
                </div>
              </button>

              {/* Light Mode Card */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-2 text-left transition-all relative cursor-pointer ${
                  theme === 'light'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-xl ${theme === 'light' ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                    <Sun className="w-4 h-4" />
                  </div>
                  {theme === 'light' && <Check className="w-4 h-4 text-sky-500 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-xs">Mode Clair</div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Contraste net et lumineux pour lecture diurne</p>
                </div>
              </button>

              {/* System Mode Card */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-3 rounded-2xl border flex flex-col items-start gap-2 text-left transition-all relative cursor-pointer ${
                  theme === 'system'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-2 rounded-xl ${theme === 'system' ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                    <Monitor className="w-4 h-4" />
                  </div>
                  {theme === 'system' && <Check className="w-4 h-4 text-sky-500 dark:text-sky-400 stroke-[3]" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200 text-xs">Système</div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Suit automatiquement les réglages de votre appareil</p>
                </div>
              </button>

            </div>
          </div>

          {/* Spaced repetition settings */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-500" />
              Méthode des J : Rythme & Seuils
            </h3>

            {/* Rythme personnalisé card */}
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="font-bold text-xs text-sky-900 dark:text-sky-200">
                  Méthode PASS Personnalisée
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                  <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 block text-xs">J0</span>
                  <span className="text-[10px] text-slate-500">Jour même</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                  <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 block text-xs">J1</span>
                  <span className="text-[10px] text-slate-500">Lendemain</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">Samedi</span>
                  <span className="text-[10px] text-slate-500">Suivant J1</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-100 dark:border-sky-900/40 text-center shadow-2xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">Dimanches</span>
                  <span className="text-[10px] text-slate-500">Jusqu'à fin sem.</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Chaque nouveau cours génère automatiquement ses révisions le jour même, le lendemain, le samedi suivant et chaque dimanche jusqu'au 31 décembre (S1) ou 31 mai (S2).
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Seuil d'alerte de surcharge quotidienne :
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={config.dailyOverloadThreshold}
                  onChange={(e) => setConfig({ ...config, dailyOverloadThreshold: parseInt(e.target.value, 10) || 6 })}
                  className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 font-mono font-bold text-center"
                />
                <span className="text-slate-500 dark:text-slate-400">révisions maximum par jour</span>
              </div>
            </div>
          </div>

          {/* Google Calendar sync */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <CalendarSync className="w-4 h-4 text-sky-500" />
              Synchronisation Google Calendar
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-200">Agenda "MedJ - Révisions PASS"</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Synchronise automatiquement les séances de J sur votre compte Google</div>
                </div>
                <button
                  onClick={handleSyncGoogleCalendar}
                  disabled={isSyncingGcal}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                >
                  <CalendarSync className={`w-3.5 h-3.5 ${isSyncingGcal ? 'animate-spin' : ''}`} />
                  <span>{isSyncingGcal ? 'Sync...' : 'Synchroniser'}</span>
                </button>
              </div>

              {syncStatusMsg && (
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                  {syncStatusMsg}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Abonnement flux iCal (.ics) direct :</span>
                <a
                  href="/api/calendar/feed.ics"
                  download="medj-revisions-pass.ics"
                  className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger le fichier .ics</span>
                </a>
              </div>
            </div>
          </div>

          {/* Data & Demo Management */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              Données & Programme d'exemple
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Par défaut, MedJ se lance en <strong>mode vierge</strong> pour vous permettre de planifier vos propres cours. Vous pouvez charger à tout moment le programme officiel PASS Paris Cité (186 cours & QCMs) pour tester l'application ou réinitialiser votre espace.
              </div>

              {sampleDataStatus && (
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span>📊 Actuellement :</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">{sampleDataStatus.coursesCount} cours</span>
                  <span>•</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{sampleDataStatus.revisionsCount} révisions</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{sampleDataStatus.qcmsCount} QCMs</span>
                  <span>•</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{sampleDataStatus.flashcardsCount} flashcards</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                {onLoadSampleData && (
                  <button
                    type="button"
                    disabled={isLoadingSampleAction}
                    onClick={async () => {
                      if (window.confirm('Charger les 186 cours, révisions, QCMs et flashcards du programme officiel PASS Paris Cité ?')) {
                        setIsLoadingSampleAction(true);
                        try {
                          await onLoadSampleData();
                          await loadDataStatus();
                        } finally {
                          setIsLoadingSampleAction(false);
                        }
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Database className="w-3.5 h-3.5 text-amber-500" />
                    <span>Charger les données d'exemple (Paris Cité)</span>
                  </button>
                )}

                {onClearData && (
                  <button
                    type="button"
                    disabled={isLoadingSampleAction}
                    onClick={async () => {
                      if (window.confirm('⚠️ ATTENTION : Voulez-vous vraiment effacer tous vos cours, révisions et QCMs pour repartir sur un espace 100% vierge ?')) {
                        setIsLoadingSampleAction(true);
                        try {
                          await onClearData();
                          await loadDataStatus();
                        } finally {
                          setIsLoadingSampleAction(false);
                        }
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tout effacer</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cloud & AI Engine Status */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-500" />
              Statut Cloud & IA
            </h3>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Base de Données :</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">Google Cloud Firestore (Prêt / Mode Local Actif)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Moteur IA :</span>
                <span className="font-bold text-sky-700 dark:text-sky-400">Google GenAI Java SDK (Gemini 3.7 Flash)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Fixed Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-950/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
          </button>
        </div>

      </div>
    </div>
  );
};
