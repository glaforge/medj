export interface SubjectUE {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  ects?: number;
  coefficient?: number;
  defaultIntervals?: number[];
  customIntervals?: number[];
  icon: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  fileType: 'PDF' | 'IMAGE' | 'FICHES_MANUSCRITE' | 'QCM_SCAN';
  storageUrl: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Course {
  id: string;
  ueId: string;
  ueCode: string;
  title: string;
  color?: string; // Hex color code
  professor?: string;
  taughtDate: string; // YYYY-MM-DD
  difficulty: number; // 1-5
  status: 'EN_COURS' | 'VALIDE' | 'ARCHIVE';
  tags: string[];
  notes?: string;
  documents: DocumentAttachment[];
  customIntervals?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface RevisionSession {
  id: string;
  courseId: string;
  courseTitle: string;
  ueId: string;
  ueCode: string;
  ueColor: string;
  jStep: number;
  scheduledDate: string; // YYYY-MM-DD
  completedDate?: string;
  status: 'A_FAIRE' | 'VALIDE' | 'REPORTE' | 'EN_RETARD';
  evaluation?: 'TRES_FACILE' | 'FACILE' | 'MOYEN' | 'DIFFICILE' | 'ECHEC';
  scorePercent?: number;
  timeSpentMinutes?: number;
  calendarEventId?: string;
  notes?: string;
}

export interface QcmItem {
  itemLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  isTrue: boolean;
  explanation: string;
  isTrap: boolean;
  trapDetails?: string;
}

export interface QcmQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  ueCode: string;
  questionStem: string;
  items: QcmItem[];
  difficulty: number;
  source: 'MANUAL' | 'GEMINI_GENERATED' | 'SCANNED_ANNALE';
  examYear?: string;
  tags: string[];
  mnemonics: string[];
  createdAt: string;
}

export interface QcmQuestionResult {
  questionId: string;
  questionStem: string;
  exactItemsCount: number; // 0-5
  pointsEarned: number; // 0.0, 0.2, 0.5, 1.0
  hadTrapFallen: boolean;
}

export interface QcmAttempt {
  id?: string;
  courseId: string;
  courseTitle: string;
  ueCode: string;
  totalQuestions: number;
  totalPoints: number;
  maxPoints: number;
  scorePercent: number;
  timeSpentSeconds: number;
  questionResults: QcmQuestionResult[];
  completedAt?: string;
}

export interface HandwrittenScanResult {
  id: string;
  courseId: string;
  courseTitle: string;
  imageUrl: string;
  transcriptionMarkdown: string;
  keyPoints: string[];
  anatomicalTerms: string[];
  keyFiguresAndValues: string[];
  potentialExamTraps: string[];
  mnemonics: string[];
  generatedQcms?: QcmQuestion[];
  scannedAt: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
  domain?: string;
}

export interface IllustrationVerification {
  status: 'VALIDE' | 'AVERTISSEMENT' | 'ERREURS_DETECTEES';
  score: number;
  summary: string;
  verifiedPoints: string[];
  detectedIssues: string[];
  suggestedFixPrompt?: string;
  editingInstructions?: string[];
  tutorAdvice: string;
  groundingSources?: GroundingSource[];
  verifiedAt: string;
}

export interface MedicalIllustration {
  id: string;
  courseId: string;
  courseTitle: string;
  ueCode: string;
  title: string;
  imageUrl: string;
  illustrationType: 'DESSIN_A_TROUS' | 'SCHEMA_ANATOMIQUE' | 'SCHEMA_FONCTIONNEL' | 'CROQUIS_SYNTHETIQUE';
  prompt: string;
  refinedVisualPrompt: string;
  legendItems: string[];
  groundingSources?: GroundingSource[];
  createdAt: string;
  verification?: IllustrationVerification;
}

export interface AiTutorMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  courseId?: string;
  courseTitle?: string;
  timestamp: string;
  createdQcm?: QcmQuestion;
  createdIllustration?: MedicalIllustration;
  groundingSources?: GroundingSource[];
}

export interface TutorConversationThread {
  id: string;
  title: string;
  courseId?: string;
  courseTitle?: string;
  ueCode?: string;
  messages: AiTutorMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface JScheduleConfig {
  defaultIntervals: number[];
  dailyOverloadThreshold: number;
  autoSmoothingEnabled: boolean;
  facultyPreset: string;
  googleCalendarId?: string;
  calendarSyncEnabled: boolean;
}

export interface TodaySummary {
  todayDate: string;
  dueToday: RevisionSession[];
  overdue: RevisionSession[];
  completedToday: RevisionSession[];
  totalDueCount: number;
  completedCount: number;
}

export interface ItemVerification {
  itemLetter: 'A' | 'B' | 'C' | 'D' | 'E' | string;
  currentIsTrue: boolean;
  proposedIsTrue: boolean;
  hasError: boolean;
  explanation: string;
  correctedText?: string;
  correctedExplanation?: string;
}

export interface QcmVerificationResult {
  qcmId: string;
  isAccurate: boolean;
  summary: string;
  errorCount: number;
  itemVerifications: ItemVerification[];
  correctedQcm?: QcmQuestion | null;
  groundingSources: GroundingSource[];
}

