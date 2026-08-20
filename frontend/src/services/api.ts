import {
  SubjectUE,
  Course,
  RevisionSession,
  QcmQuestion,
  Flashcard,
  FlashcardReviewRating,
  HandwrittenScanResult,
  JScheduleConfig,
  TodaySummary
} from '../types';
import { getAuthToken } from './firebase';

const API_BASE = '/api';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export const api = {
  // Subjects / UEs
  async getSubjects(): Promise<SubjectUE[]> {
    try {
      const res = await authFetch(`${API_BASE}/subjects`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('medj_subjects_cache', JSON.stringify(data));
        return data;
      }
    } catch {
      // offline fallback
    }
    const cached = localStorage.getItem('medj_subjects_cache');
    return cached ? JSON.parse(cached) : [];
  },

  async getSubject(id: string): Promise<SubjectUE> {
    const res = await authFetch(`${API_BASE}/subjects/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch subject');
    return res.json();
  },

  async createSubject(subject: Partial<SubjectUE>): Promise<SubjectUE> {
    const res = await authFetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    if (!res.ok) throw new Error('Failed to create subject');
    return res.json();
  },

  async updateSubject(id: string, subject: Partial<SubjectUE>): Promise<SubjectUE> {
    const res = await authFetch(`${API_BASE}/subjects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subject),
    });
    if (!res.ok) throw new Error('Failed to update subject');
    return res.json();
  },

  async deleteSubject(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/subjects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete subject');
  },

  // Courses
  async getCourses(ueId?: string): Promise<Course[]> {
    try {
      const url = ueId ? `${API_BASE}/courses?ueId=${encodeURIComponent(ueId)}` : `${API_BASE}/courses`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('medj_courses_cache', JSON.stringify(data));
        return data;
      }
    } catch {
      // offline fallback
    }
    const cached = localStorage.getItem('medj_courses_cache');
    return cached ? JSON.parse(cached) : [];
  },

  async createCourse(course: Partial<Course>): Promise<Course> {
    const res = await authFetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    if (!res.ok) throw new Error('Failed to create course');
    return res.json();
  },

  async updateCourse(id: string, course: Partial<Course>): Promise<Course> {
    const res = await authFetch(`${API_BASE}/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    if (!res.ok) throw new Error('Failed to update course');
    return res.json();
  },

  async getCourse(id: string): Promise<Course> {
    const res = await authFetch(`${API_BASE}/courses/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch course');
    return res.json();
  },

  async deleteCourse(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/courses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete course');
  },

  async deleteDocumentAttachment(courseId: string, docId: string): Promise<Course> {
    const res = await authFetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document attachment');
    return res.json();
  },

  async uploadCourseDocument(courseId: string, file: File, fileType?: string): Promise<Course> {
    const formData = new FormData();
    formData.append('file', file);
    const url = fileType
      ? `${API_BASE}/courses/${encodeURIComponent(courseId)}/documents?fileType=${encodeURIComponent(fileType)}`
      : `${API_BASE}/courses/${encodeURIComponent(courseId)}/documents`;
    const res = await authFetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to attach document to course');
    return res.json();
  },

  async attachDocumentToCourse(courseId: string, doc: Partial<import('../types').DocumentAttachment>): Promise<Course> {
    const res = await authFetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}/attach-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error('Failed to attach existing document');
    return res.json();
  },

  // Revisions
  async getTodaySummary(): Promise<TodaySummary> {
    try {
      const res = await authFetch(`${API_BASE}/revisions/today`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('medj_today_summary', JSON.stringify(data));
        return data;
      }
    } catch {
      // offline fallback
    }
    const cached = localStorage.getItem('medj_today_summary');
    if (cached) return JSON.parse(cached);
    return {
      todayDate: new Date().toISOString().split('T')[0],
      dueToday: [],
      overdue: [],
      completedToday: [],
      totalDueCount: 0,
      completedCount: 0,
    };
  },

  async getAllRevisions(filters?: { date?: string; ueId?: string; courseId?: string }): Promise<RevisionSession[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.ueId) params.append('ueId', filters.ueId);
    if (filters?.courseId) params.append('courseId', filters.courseId);

    try {
      const res = await authFetch(`${API_BASE}/revisions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('medj_all_revisions', JSON.stringify(data));
        return data;
      }
    } catch {
      // offline fallback
    }
    const cached = localStorage.getItem('medj_all_revisions');
    return cached ? JSON.parse(cached) : [];
  },

  async completeRevision(id: string, evaluation: string, scorePercent?: number, timeSpentMinutes?: number, notes?: string): Promise<RevisionSession> {
    const res = await authFetch(`${API_BASE}/revisions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluation, scorePercent, timeSpentMinutes, notes }),
    });
    if (!res.ok) throw new Error('Failed to complete revision');
    return res.json();
  },

  async uncompleteRevision(id: string): Promise<RevisionSession> {
    const res = await authFetch(`${API_BASE}/revisions/${id}/uncomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to uncomplete revision');
    return res.json();
  },

  async shiftRevision(id: string, daysToAdd: number): Promise<RevisionSession> {
    const res = await authFetch(`${API_BASE}/revisions/${id}/shift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysToAdd }),
    });
    if (!res.ok) throw new Error('Failed to shift revision');
    return res.json();
  },

  async shiftSubject(ueId: string, daysToAdd: number): Promise<RevisionSession[]> {
    const res = await authFetch(`${API_BASE}/revisions/shift-subject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ueId, daysToAdd }),
    });
    if (!res.ok) throw new Error('Failed to shift subject');
    return res.json();
  },

  async smoothWorkload(dailyLimit?: number): Promise<{ adjustedSessionsCount: number; appliedLimit: number }> {
    const res = await authFetch(`${API_BASE}/revisions/smooth-workload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyLimit }),
    });
    if (!res.ok) throw new Error('Failed to smooth workload');
    return res.json();
  },

  async createRevisionSession(courseId: string, jStep?: number, scheduledDate?: string): Promise<RevisionSession> {
    const res = await authFetch(`${API_BASE}/revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, jStep, scheduledDate }),
    });
    if (!res.ok) throw new Error('Failed to create revision session');
    return res.json();
  },

  async deleteRevision(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/revisions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete revision');
  },

  async getWorkloadOverview(): Promise<{
    workloadByDate: Record<string, RevisionSession[]>;
    overloadedDays: string[];
    dailyThreshold: number;
  }> {
    const res = await authFetch(`${API_BASE}/revisions/workload`);
    if (!res.ok) throw new Error('Failed to load workload overview');
    return res.json();
  },

  // Gemini AI
  async generateQcm(courseId: string, courseTitle: string, ueCode: string, content: string, count: number = 3): Promise<QcmQuestion[]> {
    const res = await authFetch(`${API_BASE}/gemini/generate-qcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, courseTitle, ueCode, content, count }),
    });
    if (!res.ok) throw new Error('Failed to generate QCM');
    return res.json();
  },

  async scanAnnale(file: File, courseId?: string, courseTitle?: string, ueCode?: string): Promise<QcmQuestion[]> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (courseTitle) params.append('courseTitle', courseTitle);
    if (ueCode) params.append('ueCode', ueCode);

    const res = await authFetch(`${API_BASE}/gemini/scan-annale?${params.toString()}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to scan annale');
    return res.json();
  },

  async scanHandwritten(file: File, courseId?: string, courseTitle?: string, ueCode?: string): Promise<HandwrittenScanResult> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (courseTitle) params.append('courseTitle', courseTitle);
    if (ueCode) params.append('ueCode', ueCode);

    const res = await authFetch(`${API_BASE}/gemini/scan-handwritten?${params.toString()}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to scan handwritten notes');
    return res.json();
  },

  async askTutor(
    question: string,
    courseContext?: string,
    courseId?: string,
    courseTitle?: string,
    threadId?: string
  ): Promise<{
    answer: string;
    messageId: string;
    threadId: string;
    timestamp: string;
    createdQcm?: import('../types').QcmQuestion;
    createdIllustration?: import('../types').MedicalIllustration;
    createdFlashcard?: import('../types').Flashcard;
    groundingSources?: import('../types').GroundingSource[];
  }> {
    const res = await authFetch(`${API_BASE}/gemini/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, courseContext, courseId, courseTitle, threadId }),
    });
    if (!res.ok) throw new Error('Failed to reach AI Tutor');
    return res.json();
  },

  async getTutorThreads(courseId?: string): Promise<import('../types').TutorConversationThread[]> {
    const url = courseId
      ? `${API_BASE}/gemini/tutor/threads?courseId=${encodeURIComponent(courseId)}`
      : `${API_BASE}/gemini/tutor/threads`;
    const res = await authFetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getTutorThread(threadId: string): Promise<import('../types').TutorConversationThread> {
    const res = await authFetch(`${API_BASE}/gemini/tutor/threads/${encodeURIComponent(threadId)}`);
    if (!res.ok) throw new Error('Failed to fetch tutor thread');
    return res.json();
  },

  async createTutorThread(data?: { title?: string; courseId?: string; courseTitle?: string; ueCode?: string }): Promise<import('../types').TutorConversationThread> {
    const res = await authFetch(`${API_BASE}/gemini/tutor/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    if (!res.ok) throw new Error('Failed to create tutor thread');
    return res.json();
  },

  async deleteTutorThread(threadId: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/gemini/tutor/threads/${encodeURIComponent(threadId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete tutor thread');
  },

  async getQcms(courseId?: string): Promise<QcmQuestion[]> {
    const url = courseId ? `${API_BASE}/gemini/qcms?courseId=${encodeURIComponent(courseId)}` : `${API_BASE}/gemini/qcms`;
    const res = await authFetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getQcm(id: string): Promise<QcmQuestion> {
    const res = await authFetch(`${API_BASE}/gemini/qcms/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch QCM');
    return res.json();
  },

  async verifyQcm(qcm: QcmQuestion): Promise<import('../types').QcmVerificationResult> {
    const res = await authFetch(`${API_BASE}/gemini/verify-qcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qcm),
    });
    if (!res.ok) throw new Error('Failed to verify QCM');
    return res.json();
  },

  async verifyQcmById(id: string): Promise<import('../types').QcmVerificationResult> {
    const res = await authFetch(`${API_BASE}/gemini/qcms/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to verify QCM');
    return res.json();
  },

  async createCustomQcm(qcm: Partial<QcmQuestion>): Promise<QcmQuestion> {
    const res = await authFetch(`${API_BASE}/gemini/qcms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qcm),
    });
    if (!res.ok) throw new Error('Failed to create QCM');
    return res.json();
  },

  async updateQcm(id: string, qcm: Partial<QcmQuestion>): Promise<QcmQuestion> {
    const res = await authFetch(`${API_BASE}/gemini/qcms/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qcm),
    });
    if (!res.ok) throw new Error('Failed to update QCM');
    return res.json();
  },

  async deleteQcm(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/gemini/qcms/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete QCM');
  },

  async recordQcmAttempt(attempt: import('../types').QcmAttempt): Promise<import('../types').QcmAttempt> {
    const res = await authFetch(`${API_BASE}/gemini/qcm-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt),
    });
    if (!res.ok) throw new Error('Failed to record QCM attempt');
    return res.json();
  },

  async getQcmAttempts(courseId?: string): Promise<import('../types').QcmAttempt[]> {
    const url = courseId ? `${API_BASE}/gemini/qcm-attempts?courseId=${encodeURIComponent(courseId)}` : `${API_BASE}/gemini/qcm-attempts`;
    const res = await authFetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getScans(courseId?: string): Promise<HandwrittenScanResult[]> {
    const url = courseId ? `${API_BASE}/gemini/scans?courseId=${encodeURIComponent(courseId)}` : `${API_BASE}/gemini/scans`;
    const res = await authFetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async deleteScan(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/gemini/scans/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete scan');
  },

  // Medical Illustrations & Printable Fill-in-the-blank Drawings
  async getIllustrations(courseId?: string): Promise<import('../types').MedicalIllustration[]> {
    const url = courseId ? `${API_BASE}/gemini/illustrations?courseId=${encodeURIComponent(courseId)}` : `${API_BASE}/gemini/illustrations`;
    const res = await authFetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getIllustration(id: string): Promise<import('../types').MedicalIllustration> {
    const res = await authFetch(`${API_BASE}/gemini/illustrations/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch illustration');
    return res.json();
  },

  async generateIllustration(payload: {
    title?: string;
    prompt: string;
    courseId?: string;
    courseTitle?: string;
    ueCode?: string;
    illustrationType?: string;
    legendItems?: string[];
  }): Promise<import('../types').MedicalIllustration> {
    const res = await authFetch(`${API_BASE}/gemini/illustrations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate medical illustration');
    return res.json();
  },

  async regenerateIllustration(id: string, userAdjustmentPrompt?: string): Promise<import('../types').MedicalIllustration> {
    const res = await authFetch(`${API_BASE}/gemini/illustrations/${encodeURIComponent(id)}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAdjustmentPrompt: userAdjustmentPrompt || '' }),
    });
    if (!res.ok) throw new Error('Failed to regenerate illustration');
    return res.json();
  },

  async verifyIllustration(id: string): Promise<import('../types').IllustrationVerification> {
    const res = await authFetch(`${API_BASE}/gemini/illustrations/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to verify illustration with Gemini 3.7 Flash');
    return res.json();
  },

  async deleteIllustration(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/gemini/illustrations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete illustration');
  },

  // Google Calendar & Config
  async syncGoogleCalendar(): Promise<{ syncedCount: number; calendarName: string; status: string }> {
    const res = await authFetch(`${API_BASE}/calendar/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to sync calendar');
    return res.json();
  },

  async getConfig(): Promise<JScheduleConfig> {
    const res = await authFetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to get config');
    return res.json();
  },

  async updateConfig(config: Partial<JScheduleConfig>): Promise<JScheduleConfig> {
    const res = await authFetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },

  async uploadFile(file: File): Promise<{ url: string; name: string; sizeBytes: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authFetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  // Flashcards (Active Recall)
  async getFlashcards(courseId?: string, ueId?: string, favorite?: boolean): Promise<Flashcard[]> {
    const params = new URLSearchParams();
    if (courseId && courseId !== 'ALL') params.append('courseId', courseId);
    if (ueId && ueId !== 'ALL') params.append('ueId', ueId);
    if (favorite) params.append('favorite', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await authFetch(`${API_BASE}/gemini/flashcards${qs}`);
    if (!res.ok) throw new Error('Failed to load flashcards');
    return res.json();
  },

  async getFlashcard(id: string): Promise<Flashcard> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to load flashcard');
    return res.json();
  },

  async createFlashcard(flashcard: Partial<Flashcard>): Promise<Flashcard> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flashcard),
    });
    if (!res.ok) throw new Error('Failed to create flashcard');
    return res.json();
  },

  async updateFlashcard(id: string, flashcard: Partial<Flashcard>): Promise<Flashcard> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flashcard),
    });
    if (!res.ok) throw new Error('Failed to update flashcard');
    return res.json();
  },

  async deleteFlashcard(id: string): Promise<void> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete flashcard');
  },

  async toggleFlashcardFavorite(id: string): Promise<Flashcard> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards/${encodeURIComponent(id)}/favorite`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle flashcard favorite');
    return res.json();
  },

  async recordFlashcardReview(id: string, rating: FlashcardReviewRating): Promise<Flashcard> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    if (!res.ok) throw new Error('Failed to record flashcard review');
    return res.json();
  },

  async generateFlashcards(
    courseId?: string,
    courseTitle?: string,
    ueCode?: string,
    ueId?: string,
    content?: string,
    count: number = 5
  ): Promise<Flashcard[]> {
    const res = await authFetch(`${API_BASE}/gemini/generate-flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, courseTitle, ueCode, ueId, content, count }),
    });
    if (!res.ok) throw new Error('Failed to generate flashcards');
    return res.json();
  },

  async verifyFlashcardById(id: string): Promise<import('../types').FlashcardVerification> {
    const res = await authFetch(`${API_BASE}/gemini/flashcards/${encodeURIComponent(id)}/verify`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to verify flashcard');
    return res.json();
  },

  async verifyFlashcard(flashcard: Flashcard): Promise<import('../types').FlashcardVerification> {
    const res = await authFetch(`${API_BASE}/gemini/verify-flashcard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flashcard)
    });
    if (!res.ok) throw new Error('Failed to verify flashcard');
    return res.json();
  },

  // Sample Data Management
  async getSampleDataStatus(): Promise<{
    hasData: boolean;
    coursesCount: number;
    revisionsCount: number;
    qcmsCount: number;
    flashcardsCount: number;
    illustrationsCount: number;
  }> {
    const res = await authFetch(`${API_BASE}/sample-data/status`);
    if (!res.ok) throw new Error('Failed to get sample data status');
    return res.json();
  },

  async loadSampleData(): Promise<{
    success: boolean;
    coursesCount: number;
    qcmsCount: number;
    flashcardsCount: number;
    message: string;
  }> {
    const res = await authFetch(`${API_BASE}/sample-data/seed`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to seed sample data');
    return res.json();
  },

  async clearSampleData(): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await authFetch(`${API_BASE}/sample-data/clear`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear sample data');
    return res.json();
  }
};
