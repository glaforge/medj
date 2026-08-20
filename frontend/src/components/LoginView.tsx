import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, AlertTriangle, Stethoscope, Sparkles, BookOpen } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await login();
    } catch (err: any) {
      console.error('Login error details:', err);
      const code = err.code || '';
      const msg = err.message || '';
      if (code === 'auth/operation-not-allowed' || msg.includes('CONFIGURATION_NOT_FOUND') || code === 'auth/configuration-not-found') {
        setErrorMsg("Le fournisseur de connexion Google n'est pas encore activé dans la console Firebase. Veuillez l'activer sous Firebase Console > Authentication > Sign-in method > Google.");
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg("Ce domaine (medj.web.app) n'est pas encore ajouté aux domaines autorisés dans Firebase Authentication > Paramètres > Domaines autorisés.");
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg("La fenêtre de connexion Google s'est fermée avant la fin de l'authentification. Vérifiez que le fournisseur Google est activé dans la console Firebase.");
      } else {
        setErrorMsg(`Erreur (${code || 'AUTH_ERROR'}) : ${msg || 'Impossible de se connecter avec Google.'}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Gradient Shapes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 z-10">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 mb-4">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            MedJ <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 font-semibold border border-sky-200 dark:border-sky-800">PASS / LAS</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Méthode des J & IA Médicale pour Étudiants en Médecine
          </p>
        </div>

        {/* Security / Whitelist Note */}
        <div className="mb-6 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-300 flex gap-3 items-start">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Accès Sécurisé Réservé</span>
            Cette instance MedJ est strictement protégée. Seuls les comptes autorisés (l'étudiant et l'administrateur) ont accès aux données.
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-300 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">Erreur de connexion</span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          onClick={handleLogin}
          disabled={loading || signingIn}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signingIn || loading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Se connecter avec Google</span>
            </>
          )}
        </button>

        {/* Feature bullets */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Planning J & Lissage de charge intelligent</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Génération QCMs, Fiches & Tuteur Médical Gemini</span>
          </div>
        </div>
      </div>
    </div>
  );
};
