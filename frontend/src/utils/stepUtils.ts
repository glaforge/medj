import { Brain, CircleHelp, AlertTriangle, Layers, Infinity, LucideIcon } from 'lucide-react';
import { RevisionSession, RevisionStepType, Course, SubjectUE } from '../types';

export interface StepDefinition {
  type: RevisionStepType;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  badgeClass: string;
  chipClass: string;
  accentColor: string;
}

export const REVISION_STEPS: Record<RevisionStepType, StepDefinition> = {
  APP: {
    type: 'APP',
    code: 'APP',
    title: 'Compréhension et apprentissage',
    subtitle: 'Assimilation initiale',
    description: 'Assimilation et compréhension du cours en amphi ou vidéo le jour même',
    icon: Brain,
    badgeClass: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800/60',
    chipClass: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800/60',
    accentColor: '#0284c7'
  },
  QCM: {
    type: 'QCM',
    code: 'QCM',
    title: 'Révision et QCMs',
    subtitle: 'Test actif immédiat',
    description: 'Première restitution active et entraînement intensif sur QCMs d’annales',
    icon: CircleHelp,
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60',
    chipClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800/60',
    accentColor: '#10b981'
  },
  ERR: {
    type: 'ERR',
    code: 'ERR',
    title: "Consolidation et carnet d'erreurs",
    subtitle: 'Analyse des pièges',
    description: 'Analyse approfondie des erreurs QCM, fiches mémo et carnet d’erreurs',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/60',
    chipClass: 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800/60',
    accentColor: '#f59e0b'
  },
  SAM: {
    type: 'SAM',
    code: 'SAM',
    title: 'Révision du samedi',
    subtitle: 'Synthèse hebdo',
    description: 'Révision transversale de tous les cours dispensés durant la semaine',
    icon: Layers,
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/60',
    chipClass: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800/60',
    accentColor: '#6366f1'
  },
  DIM: {
    type: 'DIM',
    code: 'DIM',
    title: 'Révision du dimanche',
    subtitle: 'Cumulatif long terme',
    description: 'Révision cumulative de tous les cours depuis le début du semestre',
    icon: Infinity,
    badgeClass: 'bg-fuchsia-100 dark:bg-fuchsia-950/70 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-800/60',
    chipClass: 'text-fuchsia-700 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/70 border-fuchsia-200 dark:border-fuchsia-800/60',
    accentColor: '#d946ef'
  }
};

export const ALL_REVISION_STEPS: RevisionStepType[] = ['APP', 'QCM', 'ERR', 'SAM', 'DIM'];

export const REVISION_STEP_PRIORITY: Record<RevisionStepType, number> = {
  APP: 0,
  QCM: 1,
  ERR: 2,
  SAM: 3,
  DIM: 4
};

export function getRevisionStepPriority(session: { stepType?: RevisionStepType | string; jStep?: number; scheduledDate?: string }): number {
  const stepInfo = getStepInfo(session);
  return REVISION_STEP_PRIORITY[stepInfo.type] ?? 99;
}

/**
 * Compare two revision sessions following pedagogical priority:
 * 1. Step priority: APP (0) -> QCM (1) -> ERR (2) -> SAM (3) -> DIM (4)
 * 2. Course difficulty descending (5 -> 1)
 * 3. Subject UE coefficient descending
 * 4. Course title alphabetical
 * 5. J-step ascending
 */
export function compareRevisionsByStepPriority(
  a: RevisionSession,
  b: RevisionSession,
  courses?: Course[],
  subjects?: SubjectUE[]
): number {
  const prioA = getRevisionStepPriority(a);
  const prioB = getRevisionStepPriority(b);
  if (prioA !== prioB) {
    return prioA - prioB;
  }

  // Secondary priority 1: Course difficulty descending (5 -> 1)
  if (courses && courses.length > 0) {
    const courseA = courses.find(c => c.id === a.courseId);
    const courseB = courses.find(c => c.id === b.courseId);
    const diffA = courseA?.difficulty ?? 3;
    const diffB = courseB?.difficulty ?? 3;
    if (diffB !== diffA) return diffB - diffA;
  }

  // Secondary priority 2: UE coefficient descending
  if (subjects && subjects.length > 0) {
    const ueA = subjects.find(sub => sub.id.toLowerCase() === a.ueId.toLowerCase() || sub.code.toLowerCase() === a.ueId.toLowerCase());
    const ueB = subjects.find(sub => sub.id.toLowerCase() === b.ueId.toLowerCase() || sub.code.toLowerCase() === b.ueId.toLowerCase());
    const coeffA = ueA?.coefficient ?? 10;
    const coeffB = ueB?.coefficient ?? 10;
    if (coeffB !== coeffA) return coeffB - coeffA;
  }

  // Secondary priority 3: Course title alphabetical (French locale)
  const titleA = a.courseTitle || '';
  const titleB = b.courseTitle || '';
  const titleComp = titleA.localeCompare(titleB, 'fr', { sensitivity: 'base' });
  if (titleComp !== 0) return titleComp;

  // Secondary priority 4: J-step ascending
  return (a.jStep ?? 0) - (b.jStep ?? 0);
}

export function getStepInfo(session: { stepType?: RevisionStepType | string; jStep?: number; scheduledDate?: string }): StepDefinition {
  if (session.stepType && (session.stepType in REVISION_STEPS)) {
    return REVISION_STEPS[session.stepType as RevisionStepType];
  }

  // Fallbacks by jStep or scheduled day of week
  switch (session.jStep) {
    case 0:
      return REVISION_STEPS.APP;
    case 1:
      return REVISION_STEPS.QCM;
    case 2:
      return REVISION_STEPS.ERR;
    case 3:
      return REVISION_STEPS.SAM;
    case 4:
      return REVISION_STEPS.DIM;
    default: {
      if (session.scheduledDate) {
        const d = new Date(session.scheduledDate + 'T00:00:00');
        if (d.getDay() === 6) return REVISION_STEPS.SAM;
        if (d.getDay() === 0) return REVISION_STEPS.DIM;
      }
      return REVISION_STEPS.DIM;
    }
  }
}
