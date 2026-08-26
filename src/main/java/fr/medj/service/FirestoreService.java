package fr.medj.service;

import com.google.cloud.firestore.*;
import fr.medj.model.*;
import io.micronaut.context.annotation.Value;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ForkJoinPool;
import java.util.stream.Collectors;

@Singleton
public class FirestoreService {
    private static final Logger LOG = LoggerFactory.getLogger(FirestoreService.class);

    @Value("${medj.google.cloud.project-id:medj-505807}")
    private String projectId;

    @Value("${medj.google.cloud.firestore-collection-prefix:medj_}")
    private String collectionPrefix;

    @Value("${medj.seed-sample-data:false}")
    private boolean seedSampleData;

    @Value("${medj.google.cloud.firestore.enabled:true}")
    private boolean firestoreEnabled = true;

    private Firestore firestore;

    // Fast in-memory caching layer
    private final Map<String, SubjectUE> subjects = new ConcurrentHashMap<>();
    private final Map<String, Course> courses = new ConcurrentHashMap<>();
    private final Map<String, RevisionSession> revisions = new ConcurrentHashMap<>();
    private final Map<String, QcmQuestion> qcms = new ConcurrentHashMap<>();
    private final Map<String, QcmAttempt> qcmAttempts = new ConcurrentHashMap<>();
    private final Map<String, HandwrittenScanResult> scans = new ConcurrentHashMap<>();
    private final Map<String, TutorConversationThread> tutorThreads = new ConcurrentHashMap<>();
    private final Map<String, MedicalIllustration> illustrations = new ConcurrentHashMap<>();
    private final Map<String, Flashcard> flashcards = new ConcurrentHashMap<>();
    private final List<AiTutorMessage> tutorMessages = Collections.synchronizedList(new ArrayList<>());
    private volatile JScheduleConfig scheduleConfig = JScheduleConfig.defaultConfiguration();

    @PostConstruct
    public void init() {
        LOG.info("Initializing MedJ Data Service (Project: {}, Prefix: '{}', Firestore Enabled: {})", projectId, collectionPrefix, firestoreEnabled);
        
        if (firestoreEnabled) {
            try {
                FirestoreOptions options = FirestoreOptions.newBuilder()
                    .setProjectId(projectId)
                    .build();
                this.firestore = options.getService();
                LOG.info("Connected to Google Cloud Firestore in project '{}'", projectId);
                loadDataFromFirestore();
            } catch (Exception e) {
                LOG.warn("Cloud Firestore client not initialized, running in standalone in-memory mode: {}", e.getMessage());
                this.firestore = null;
            }
        } else {
            LOG.info("Cloud Firestore disabled by configuration, running in-memory repository");
            this.firestore = null;
        }

        if (courses.isEmpty() && subjects.isEmpty() && seedSampleData) {
            LOG.info("medj.seed-sample-data=true and database is empty: Seeding initial Paris Cité curriculum...");
            seedSampleData();
        } else {
            LOG.info("MedJ initialized with {} UEs, {} courses, {} revisions, {} QCMs, {} flashcards in cache",
                subjects.size(), courses.size(), revisions.size(), qcms.size(), flashcards.size());
        }
    }

    private void loadDataFromFirestore() {
        if (firestore == null) return;
        try {
            LOG.info("Loading existing datasets from Cloud Firestore collections...");

            // 1. Subjects
            for (DocumentSnapshot doc : firestore.collection(col("subjects")).get().get().getDocuments()) {
                SubjectUE s = docToSubject(doc);
                if (s != null) subjects.put(s.id(), s);
            }

            // 2. Courses
            for (DocumentSnapshot doc : firestore.collection(col("courses")).get().get().getDocuments()) {
                Course c = docToCourse(doc);
                if (c != null) courses.put(c.id(), c);
            }

            // 3. Revisions
            for (DocumentSnapshot doc : firestore.collection(col("revisions")).get().get().getDocuments()) {
                RevisionSession r = docToRevision(doc);
                if (r != null) revisions.put(r.id(), r);
            }

            // 4. QCMs
            for (DocumentSnapshot doc : firestore.collection(col("qcms")).get().get().getDocuments()) {
                QcmQuestion q = docToQcm(doc);
                if (q != null) qcms.put(q.id(), q);
            }

            // 5. Flashcards
            for (DocumentSnapshot doc : firestore.collection(col("flashcards")).get().get().getDocuments()) {
                Flashcard f = docToFlashcard(doc);
                if (f != null) flashcards.put(f.id(), f);
            }

            // 6. Illustrations
            for (DocumentSnapshot doc : firestore.collection(col("illustrations")).get().get().getDocuments()) {
                MedicalIllustration i = docToIllustration(doc);
                if (i != null) illustrations.put(i.id(), i);
            }

            // 7. Scans
            for (DocumentSnapshot doc : firestore.collection(col("scans")).get().get().getDocuments()) {
                HandwrittenScanResult scan = docToScan(doc);
                if (scan != null) scans.put(scan.id(), scan);
            }

            // 8. Threads
            for (DocumentSnapshot doc : firestore.collection(col("threads")).get().get().getDocuments()) {
                TutorConversationThread t = docToThread(doc);
                if (t != null) tutorThreads.put(t.id(), t);
            }

            // 9. Config
            DocumentSnapshot cfgDoc = firestore.collection(col("config")).document("schedule").get().get();
            if (cfgDoc.exists()) {
                List<Long> ivs = (List<Long>) cfgDoc.get("defaultIntervals");
                Long thresh = cfgDoc.getLong("dailyOverloadThreshold");
                Boolean autoSm = cfgDoc.getBoolean("autoSmoothingEnabled");
                String fac = cfgDoc.getString("facultyPreset");
                String gCalId = cfgDoc.getString("googleCalendarId");
                Boolean calSync = cfgDoc.getBoolean("calendarSyncEnabled");

                this.scheduleConfig = new JScheduleConfig(
                    ivs != null ? ivs.stream().map(Long::intValue).collect(Collectors.toList()) : List.of(),
                    thresh != null ? thresh.intValue() : 6,
                    autoSm != null ? autoSm : true,
                    fac != null ? fac : "Méthode PASS Personnalisée (J0, J1, Samedi, Dimanches)",
                    gCalId != null ? gCalId : "",
                    calSync != null ? calSync : true
                );
            }

            LOG.info("Successfully synced data from Cloud Firestore: {} subjects, {} courses, {} revisions, {} QCMs",
                subjects.size(), courses.size(), revisions.size(), qcms.size());
        } catch (Exception e) {
            LOG.warn("Failed to load initial dataset from Cloud Firestore: {}", e.getMessage());
        }
    }

    private String col(String name) {
        return (collectionPrefix != null ? collectionPrefix : "medj_") + name;
    }

    private void asyncSave(String collectionName, String docId, Map<String, Object> data) {
        if (firestore == null) return;
        ForkJoinPool.commonPool().execute(() -> {
            try {
                firestore.collection(col(collectionName)).document(docId).set(data).get();
            } catch (Exception e) {
                LOG.error("Failed to async save doc {}/{} to Firestore: {}", collectionName, docId, e.getMessage());
            }
        });
    }

    private void asyncDelete(String collectionName, String docId) {
        if (firestore == null) return;
        ForkJoinPool.commonPool().execute(() -> {
            try {
                firestore.collection(col(collectionName)).document(docId).delete().get();
            } catch (Exception e) {
                LOG.error("Failed to async delete doc {}/{} from Firestore: {}", collectionName, docId, e.getMessage());
            }
        });
    }

    // --- Subject UEs ---
    public List<SubjectUE> getAllSubjects() {
        return new ArrayList<>(subjects.values());
    }

    public Optional<SubjectUE> getSubject(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        SubjectUE exact = subjects.get(id);
        if (exact != null) return Optional.of(exact);
        String trimmed = id.trim();
        SubjectUE trimmedMatch = subjects.get(trimmed);
        if (trimmedMatch != null) return Optional.of(trimmedMatch);
        return subjects.values().stream()
            .filter(s -> s.id().equalsIgnoreCase(trimmed) || s.code().equalsIgnoreCase(trimmed))
            .findFirst();
    }

    public SubjectUE saveSubject(SubjectUE subject) {
        subjects.put(subject.id(), subject);
        Map<String, Object> data = new HashMap<>();
        data.put("id", subject.id());
        data.put("code", subject.code());
        data.put("name", subject.name());
        data.put("description", subject.description());
        data.put("color", subject.color());
        data.put("coefficient", subject.coefficient());
        data.put("customIntervals", subject.customIntervals());
        data.put("icon", subject.icon());
        asyncSave("subjects", subject.id(), data);
        return subject;
    }

    public boolean deleteSubject(String id) {
        SubjectUE removed = subjects.remove(id);
        if (removed == null) {
            // Find by matching id or code case-insensitively
            Optional<SubjectUE> found = subjects.values().stream()
                .filter(s -> s.id().equalsIgnoreCase(id) || s.code().equalsIgnoreCase(id))
                .findFirst();
            if (found.isPresent()) {
                removed = subjects.remove(found.get().id());
            }
        }
        if (removed != null) {
            String subId = removed.id();
            String subCode = removed.code();
            asyncDelete("subjects", subId);

            // Cascade delete all courses belonging to this UE
            List<String> courseIdsToDelete = courses.values().stream()
                .filter(c -> c.ueId().equalsIgnoreCase(subId) || c.ueId().equalsIgnoreCase(subCode) || (c.ueCode() != null && c.ueCode().equalsIgnoreCase(subCode)))
                .map(Course::id)
                .collect(Collectors.toList());

            for (String cId : courseIdsToDelete) {
                deleteCourse(cId);
            }
            return true;
        }
        return false;
    }

    // --- Courses ---
    public List<Course> getAllCourses() {
        return courses.values().stream()
            .sorted(Comparator.comparing(Course::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<Course> getCourse(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        Course exact = courses.get(id);
        if (exact != null) return Optional.of(exact);
        String trimmed = id.trim();
        Course trimmedMatch = courses.get(trimmed);
        if (trimmedMatch != null) return Optional.of(trimmedMatch);
        return courses.values().stream()
            .filter(c -> c.id().equalsIgnoreCase(trimmed))
            .findFirst();
    }

    public Course saveCourse(Course course) {
        courses.put(course.id(), course);
        Map<String, Object> data = new HashMap<>();
        data.put("id", course.id());
        data.put("ueId", course.ueId());
        data.put("ueCode", course.ueCode());
        data.put("title", course.title());
        data.put("color", course.color());
        data.put("professor", course.professor());
        data.put("taughtDate", course.taughtDate() != null ? course.taughtDate().toString() : null);
        data.put("difficulty", course.difficulty());
        data.put("status", course.status());
        data.put("tags", course.tags());
        data.put("notes", course.notes());
        data.put("customIntervals", course.customIntervals());
        data.put("createdAt", course.createdAt() != null ? course.createdAt().toString() : LocalDateTime.now().toString());
        data.put("updatedAt", course.updatedAt() != null ? course.updatedAt().toString() : LocalDateTime.now().toString());

        if (course.documents() != null) {
            List<Map<String, Object>> docs = new ArrayList<>();
            for (Course.DocumentAttachment d : course.documents()) {
                Map<String, Object> dm = new HashMap<>();
                dm.put("id", d.id());
                dm.put("name", d.name());
                dm.put("fileType", d.fileType());
                dm.put("storageUrl", d.storageUrl());
                dm.put("sizeBytes", d.sizeBytes());
                dm.put("uploadedAt", d.uploadedAt() != null ? d.uploadedAt().toString() : LocalDateTime.now().toString());
                docs.add(dm);
            }
            data.put("documents", docs);
        }

        asyncSave("courses", course.id(), data);
        return course;
    }

    public boolean deleteCourse(String id) {
        courses.remove(id);
        asyncDelete("courses", id);
        revisions.entrySet().removeIf(e -> {
            if (e.getValue().courseId().equals(id)) {
                asyncDelete("revisions", e.getKey());
                return true;
            }
            return false;
        });
        return true;
    }

    // --- Revision Sessions ---
    public List<RevisionSession> getAllRevisions() {
        return revisions.values().stream()
            .sorted(Comparator.comparing(RevisionSession::scheduledDate))
            .collect(Collectors.toList());
    }

    public List<RevisionSession> getRevisionsForDate(LocalDate date) {
        return revisions.values().stream()
            .filter(r -> r.scheduledDate().equals(date))
            .collect(Collectors.toList());
    }

    public List<RevisionSession> getRevisionsForCourse(String courseId) {
        return revisions.values().stream()
            .filter(r -> r.courseId().equals(courseId))
            .sorted(Comparator.comparingInt(RevisionSession::jStep))
            .collect(Collectors.toList());
    }

    public RevisionSession saveRevision(RevisionSession session) {
        revisions.put(session.id(), session);
        Map<String, Object> data = new HashMap<>();
        data.put("id", session.id());
        data.put("courseId", session.courseId());
        data.put("courseTitle", session.courseTitle());
        data.put("ueId", session.ueId());
        data.put("ueCode", session.ueCode());
        data.put("ueColor", session.ueColor());
        data.put("jStep", session.jStep());
        data.put("scheduledDate", session.scheduledDate() != null ? session.scheduledDate().toString() : null);
        data.put("completedDate", session.completedDate() != null ? session.completedDate().toString() : null);
        data.put("status", session.status());
        data.put("evaluation", session.evaluation());
        data.put("scorePercent", session.scorePercent());
        data.put("timeSpentMinutes", session.timeSpentMinutes());
        data.put("calendarEventId", session.calendarEventId());
        data.put("notes", session.notes());
        asyncSave("revisions", session.id(), data);
        return session;
    }

    public void saveRevisions(List<RevisionSession> sessionList) {
        for (RevisionSession s : sessionList) {
            saveRevision(s);
        }
    }

    public Optional<RevisionSession> getRevision(String id) {
        return Optional.ofNullable(revisions.get(id));
    }

    public boolean deleteRevision(String id) {
        boolean removed = revisions.remove(id) != null;
        if (removed) asyncDelete("revisions", id);
        return removed;
    }

    public boolean deleteRevisionAndFollowing(String id) {
        RevisionSession target = revisions.get(id);
        if (target == null) return false;

        String courseId = target.courseId();
        LocalDate targetDate = target.scheduledDate();

        List<String> toDelete = revisions.values().stream()
            .filter(r -> r.courseId().equals(courseId) && !r.scheduledDate().isBefore(targetDate))
            .map(RevisionSession::id)
            .toList();

        for (String revId : toDelete) {
            revisions.remove(revId);
            asyncDelete("revisions", revId);
        }
        return true;
    }

    // --- QCMs ---
    public List<QcmQuestion> getAllQcms() {
        return new ArrayList<>(qcms.values());
    }

    public List<QcmQuestion> getQcmsForCourse(String courseId) {
        if (courseId == null || courseId.isBlank()) return List.of();
        Optional<Course> courseOpt = Optional.ofNullable(courses.get(courseId));
        String courseTitleLower = courseOpt.map(c -> c.title().toLowerCase()).orElse("");

        return qcms.values().stream()
            .filter(q -> {
                if (q.courseId() != null && q.courseId().equalsIgnoreCase(courseId)) return true;
                if (!courseTitleLower.isBlank() && q.courseTitle() != null) {
                    return q.courseTitle().equalsIgnoreCase(courseTitleLower) ||
                           q.courseTitle().toLowerCase().contains(courseTitleLower) ||
                           courseTitleLower.contains(q.courseTitle().toLowerCase());
                }
                return false;
            })
            .collect(Collectors.toList());
    }

    public Optional<QcmQuestion> getQcm(String id) {
        return Optional.ofNullable(qcms.get(id));
    }

    public QcmQuestion saveQcm(QcmQuestion qcm) {
        qcms.put(qcm.id(), qcm);
        Map<String, Object> data = new HashMap<>();
        data.put("id", qcm.id());
        data.put("courseId", qcm.courseId());
        data.put("courseTitle", qcm.courseTitle());
        data.put("ueCode", qcm.ueCode());
        data.put("questionStem", qcm.questionStem());
        data.put("difficulty", qcm.difficulty());
        data.put("source", qcm.source());
        data.put("examYear", qcm.examYear());
        data.put("tags", qcm.tags());
        data.put("mnemonics", qcm.mnemonics());
        data.put("createdAt", qcm.createdAt() != null ? qcm.createdAt().toString() : LocalDateTime.now().toString());

        if (qcm.items() != null) {
            List<Map<String, Object>> items = new ArrayList<>();
            for (QcmItem item : qcm.items()) {
                Map<String, Object> im = new HashMap<>();
                im.put("itemLetter", item.itemLetter());
                im.put("text", item.text());
                im.put("isTrue", item.isTrue());
                im.put("explanation", item.explanation());
                im.put("isTrap", item.isTrap());
                im.put("trapDetails", item.trapDetails());
                items.add(im);
            }
            data.put("items", items);
        }

        asyncSave("qcms", qcm.id(), data);
        return qcm;
    }

    public boolean deleteQcm(String id) {
        boolean removed = qcms.remove(id) != null;
        if (removed) asyncDelete("qcms", id);
        return removed;
    }

    // --- QCM Attempts History ---
    public List<QcmAttempt> getAllQcmAttempts() {
        return qcmAttempts.values().stream()
            .sorted(Comparator.comparing(QcmAttempt::completedAt))
            .collect(Collectors.toList());
    }

    public List<QcmAttempt> getQcmAttemptsForCourse(String courseId) {
        return qcmAttempts.values().stream()
            .filter(a -> a.courseId().equals(courseId))
            .sorted(Comparator.comparing(QcmAttempt::completedAt))
            .collect(Collectors.toList());
    }

    public QcmAttempt saveQcmAttempt(QcmAttempt attempt) {
        qcmAttempts.put(attempt.id(), attempt);
        Map<String, Object> data = new HashMap<>();
        data.put("id", attempt.id());
        data.put("courseId", attempt.courseId());
        data.put("courseTitle", attempt.courseTitle());
        data.put("ueCode", attempt.ueCode());
        data.put("totalQuestions", attempt.totalQuestions());
        data.put("totalPoints", attempt.totalPoints());
        data.put("maxPoints", attempt.maxPoints());
        data.put("scorePercent", attempt.scorePercent());
        data.put("timeSpentSeconds", attempt.timeSpentSeconds());
        data.put("completedAt", attempt.completedAt() != null ? attempt.completedAt().toString() : Instant.now().toString());

        if (attempt.questionResults() != null) {
            List<Map<String, Object>> qrs = new ArrayList<>();
            for (QcmAttempt.QcmQuestionResult qr : attempt.questionResults()) {
                Map<String, Object> qm = new HashMap<>();
                qm.put("questionId", qr.questionId());
                qm.put("questionStem", qr.questionStem());
                qm.put("exactItemsCount", qr.exactItemsCount());
                qm.put("pointsEarned", qr.pointsEarned());
                qm.put("hadTrapFallen", qr.hadTrapFallen());
                qrs.add(qm);
            }
            data.put("questionResults", qrs);
        }

        asyncSave("attempts", attempt.id(), data);
        return attempt;
    }

    // --- Handwritten Scans ---
    public List<HandwrittenScanResult> getAllScans() {
        return new ArrayList<>(scans.values());
    }

    public List<HandwrittenScanResult> getScansForCourse(String courseId) {
        if (courseId == null || courseId.isBlank()) return List.of();
        String target = courseId.trim();
        return scans.values().stream()
            .filter(s -> s.courseId() != null && s.courseId().trim().equalsIgnoreCase(target))
            .sorted(Comparator.comparing(HandwrittenScanResult::scannedAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<HandwrittenScanResult> getScan(String id) {
        return Optional.ofNullable(scans.get(id));
    }

    public HandwrittenScanResult saveScan(HandwrittenScanResult scan) {
        scans.put(scan.id(), scan);
        Map<String, Object> data = new HashMap<>();
        data.put("id", scan.id());
        data.put("courseId", scan.courseId());
        data.put("courseTitle", scan.courseTitle());
        data.put("imageUrl", scan.imageUrl());
        if (scan.imageUrls() != null) data.put("imageUrls", scan.imageUrls());
        data.put("transcriptionMarkdown", scan.transcriptionMarkdown());
        data.put("keyPoints", scan.keyPoints());
        data.put("anatomicalTerms", scan.anatomicalTerms());
        data.put("keyFiguresAndValues", scan.keyFiguresAndValues());
        data.put("potentialExamTraps", scan.potentialExamTraps());
        data.put("mnemonics", scan.mnemonics());
        if (scan.illustrationUrl() != null) data.put("illustrationUrl", scan.illustrationUrl());
        if (scan.illustrationId() != null) data.put("illustrationId", scan.illustrationId());
        data.put("scannedAt", scan.scannedAt() != null ? scan.scannedAt().toString() : LocalDateTime.now().toString());
        asyncSave("scans", scan.id(), data);
        return scan;
    }

    public Optional<HandwrittenScanResult> updateScanIllustration(String scanId, String illustrationId, String illustrationUrl) {
        HandwrittenScanResult existing = scans.get(scanId);
        if (existing == null) {
            return Optional.empty();
        }
        HandwrittenScanResult updated = new HandwrittenScanResult(
            existing.id(),
            existing.courseId(),
            existing.courseTitle(),
            existing.imageUrl(),
            existing.imageUrls(),
            existing.transcriptionMarkdown(),
            existing.keyPoints(),
            existing.anatomicalTerms(),
            existing.keyFiguresAndValues(),
            existing.potentialExamTraps(),
            existing.mnemonics(),
            existing.generatedQcms(),
            illustrationUrl,
            illustrationId,
            existing.scannedAt()
        );
        saveScan(updated);
        return Optional.of(updated);
    }

    public boolean deleteScan(String id) {
        boolean removed = scans.remove(id) != null;
        if (removed) asyncDelete("scans", id);
        return removed;
    }

    // --- AI Tutor History & Conversation Threads ---
    public List<TutorConversationThread> getAllTutorThreads() {
        return tutorThreads.values().stream()
            .sorted(Comparator.comparing(TutorConversationThread::updatedAt).reversed())
            .collect(Collectors.toList());
    }

    public List<TutorConversationThread> getTutorThreadsForCourse(String courseId) {
        if (courseId == null || courseId.isBlank()) {
            return getAllTutorThreads();
        }
        return tutorThreads.values().stream()
            .filter(t -> t.courseId() != null && t.courseId().equalsIgnoreCase(courseId.trim()))
            .sorted(Comparator.comparing(TutorConversationThread::updatedAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<TutorConversationThread> getTutorThread(String id) {
        return Optional.ofNullable(tutorThreads.get(id));
    }

    public TutorConversationThread saveTutorThread(TutorConversationThread thread) {
        tutorThreads.put(thread.id(), thread);
        Map<String, Object> data = new HashMap<>();
        data.put("id", thread.id());
        data.put("title", thread.title());
        data.put("courseId", thread.courseId());
        data.put("courseTitle", thread.courseTitle());
        data.put("ueCode", thread.ueCode());
        data.put("createdAt", thread.createdAt() != null ? thread.createdAt().toString() : LocalDateTime.now().toString());
        data.put("updatedAt", thread.updatedAt() != null ? thread.updatedAt().toString() : LocalDateTime.now().toString());

        if (thread.messages() != null) {
            List<Map<String, Object>> msgs = new ArrayList<>();
            for (AiTutorMessage m : thread.messages()) {
                Map<String, Object> mm = new HashMap<>();
                mm.put("id", m.id());
                mm.put("role", m.role());
                mm.put("content", m.content());
                mm.put("courseId", m.courseId());
                mm.put("courseTitle", m.courseTitle());
                mm.put("timestamp", m.timestamp() != null ? m.timestamp().toString() : LocalDateTime.now().toString());
                msgs.add(mm);
            }
            data.put("messages", msgs);
        }

        asyncSave("threads", thread.id(), data);
        return thread;
    }

    public boolean deleteTutorThread(String id) {
        boolean removed = tutorThreads.remove(id) != null;
        if (removed) asyncDelete("threads", id);
        return removed;
    }

    public List<AiTutorMessage> getTutorHistory(String courseId) {
        synchronized (tutorMessages) {
            return tutorMessages.stream()
                .filter(m -> courseId == null || courseId.isBlank() || m.courseId().equals(courseId))
                .collect(Collectors.toList());
        }
    }

    public void addTutorMessage(AiTutorMessage message) {
        tutorMessages.add(message);
    }

    // --- Medical Illustrations & Drawings ---
    public List<MedicalIllustration> getAllIllustrations() {
        return illustrations.values().stream()
            .sorted(Comparator.comparing(MedicalIllustration::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public List<MedicalIllustration> getIllustrationsForCourse(String courseId) {
        if (courseId == null || courseId.isBlank()) return List.of();
        Optional<Course> courseOpt = Optional.ofNullable(courses.get(courseId));
        String courseTitleLower = courseOpt.map(c -> c.title().toLowerCase()).orElse("");

        return illustrations.values().stream()
            .filter(i -> {
                if (i.courseId() != null && i.courseId().equalsIgnoreCase(courseId)) return true;
                if (!courseTitleLower.isBlank() && i.courseTitle() != null) {
                    if (i.courseTitle().equalsIgnoreCase(courseTitleLower) ||
                        i.courseTitle().toLowerCase().contains(courseTitleLower) ||
                        courseTitleLower.contains(i.courseTitle().toLowerCase())) {
                        return true;
                    }
                }
                return false;
            })
            .sorted(Comparator.comparing(MedicalIllustration::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<MedicalIllustration> getIllustration(String id) {
        return Optional.ofNullable(illustrations.get(id));
    }

    public MedicalIllustration saveIllustration(MedicalIllustration illustration) {
        illustrations.put(illustration.id(), illustration);
        Map<String, Object> data = new HashMap<>();
        data.put("id", illustration.id());
        data.put("courseId", illustration.courseId());
        data.put("courseTitle", illustration.courseTitle());
        data.put("ueCode", illustration.ueCode());
        data.put("title", illustration.title());
        data.put("imageUrl", illustration.imageUrl());
        data.put("illustrationType", illustration.illustrationType());
        data.put("prompt", illustration.prompt());
        data.put("refinedVisualPrompt", illustration.refinedVisualPrompt());
        data.put("legendItems", illustration.legendItems());
        data.put("createdAt", illustration.createdAt() != null ? illustration.createdAt().toString() : LocalDateTime.now().toString());
        asyncSave("illustrations", illustration.id(), data);
        return illustration;
    }

    public boolean deleteIllustration(String id) {
        boolean removed = illustrations.remove(id) != null;
        if (removed) asyncDelete("illustrations", id);
        return removed;
    }

    // --- Flashcards ---
    public List<Flashcard> getAllFlashcards() {
        return flashcards.values().stream()
            .sorted(Comparator.comparing(Flashcard::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public List<Flashcard> getFlashcardsForCourse(String courseId) {
        if (courseId == null || courseId.isBlank()) return List.of();
        Optional<Course> courseOpt = Optional.ofNullable(courses.get(courseId));
        String courseTitleLower = courseOpt.map(c -> c.title().toLowerCase()).orElse("");

        return flashcards.values().stream()
            .filter(f -> {
                if (f.courseId() != null && f.courseId().equalsIgnoreCase(courseId)) return true;
                if (!courseTitleLower.isBlank() && f.courseTitle() != null) {
                    if (f.courseTitle().equalsIgnoreCase(courseTitleLower) ||
                        f.courseTitle().toLowerCase().contains(courseTitleLower) ||
                        courseTitleLower.contains(f.courseTitle().toLowerCase())) {
                        return true;
                    }
                }
                return false;
            })
            .sorted(Comparator.comparing(Flashcard::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<Flashcard> getFlashcard(String id) {
        return Optional.ofNullable(flashcards.get(id));
    }

    public Flashcard saveFlashcard(Flashcard card) {
        flashcards.put(card.id(), card);
        Map<String, Object> data = new HashMap<>();
        data.put("id", card.id());
        data.put("courseId", card.courseId());
        data.put("courseTitle", card.courseTitle());
        data.put("ueCode", card.ueCode());
        data.put("ueId", card.ueId());
        data.put("front", card.front());
        data.put("back", card.back());
        data.put("hint", card.hint());
        data.put("difficulty", card.difficulty());
        data.put("isFavorite", card.isFavorite());
        data.put("tags", card.tags());
        data.put("reviewCount", card.reviewCount());
        data.put("lastReviewedAt", card.lastReviewedAt() != null ? card.lastReviewedAt().toString() : null);
        data.put("createdAt", card.createdAt() != null ? card.createdAt().toString() : LocalDateTime.now().toString());
        asyncSave("flashcards", card.id(), data);
        return card;
    }

    public boolean deleteFlashcard(String id) {
        boolean removed = flashcards.remove(id) != null;
        if (removed) asyncDelete("flashcards", id);
        return removed;
    }

    public Optional<Flashcard> toggleFlashcardFavorite(String id) {
        Flashcard existing = flashcards.get(id);
        if (existing == null) return Optional.empty();
        Flashcard updated = new Flashcard(
            existing.id(), existing.courseId(), existing.courseTitle(), existing.ueCode(), existing.ueId(),
            existing.front(), existing.back(), existing.hint(), existing.difficulty(), !existing.isFavorite(),
            existing.tags(), existing.reviewCount(), existing.lastReviewedAt(), existing.createdAt()
        );
        saveFlashcard(updated);
        return Optional.of(updated);
    }

    public Optional<Flashcard> recordFlashcardReview(String id, String rating) {
        Flashcard existing = flashcards.get(id);
        if (existing == null) return Optional.empty();
        Flashcard updated = new Flashcard(
            existing.id(), existing.courseId(), existing.courseTitle(), existing.ueCode(), existing.ueId(),
            existing.front(), existing.back(), existing.hint(), existing.difficulty(), existing.isFavorite(),
            existing.tags(), existing.reviewCount() + 1, LocalDateTime.now(), existing.createdAt()
        );
        saveFlashcard(updated);
        return Optional.of(updated);
    }

    // --- Configuration ---
    public JScheduleConfig getScheduleConfig() {
        return scheduleConfig;
    }

    public JScheduleConfig updateScheduleConfig(JScheduleConfig config) {
        this.scheduleConfig = config;
        Map<String, Object> data = new HashMap<>();
        data.put("defaultIntervals", config.defaultIntervals());
        data.put("dailyOverloadThreshold", config.dailyOverloadThreshold());
        data.put("autoSmoothingEnabled", config.autoSmoothingEnabled());
        data.put("facultyPreset", config.facultyPreset());
        data.put("googleCalendarId", config.googleCalendarId());
        data.put("calendarSyncEnabled", config.calendarSyncEnabled());
        asyncSave("config", "schedule", data);
        return this.scheduleConfig;
    }

    // --- Sample Data Management ---
    public synchronized Map<String, Object> seedSampleData() {
        LOG.info("Seeding Université Paris Cité official PASS curriculum and UEs from JSON...");
        for (SubjectUE ue : ParisCiteCurriculumSeeder.createDefaultSubjects()) {
            saveSubject(ue);
        }
        for (Course course : ParisCiteCurriculumSeeder.createOfficialCourses()) {
            saveCourse(course);
        }
        for (QcmQuestion qcm : ParisCiteCurriculumSeeder.createSampleQcms()) {
            saveQcm(qcm);
        }
        for (Flashcard card : ParisCiteCurriculumSeeder.createSampleFlashcards()) {
            saveFlashcard(card);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("success", true);
        stats.put("coursesCount", courses.size());
        stats.put("qcmsCount", qcms.size());
        stats.put("flashcardsCount", flashcards.size());
        stats.put("message", "Données d'exemple chargées avec succès.");
        return stats;
    }

    public synchronized Map<String, Object> clearAllData() {
        LOG.info("Clearing all MedJ user and sample data from memory and Firestore...");
        subjects.keySet().forEach(k -> asyncDelete("subjects", k));
        courses.keySet().forEach(k -> asyncDelete("courses", k));
        revisions.keySet().forEach(k -> asyncDelete("revisions", k));
        qcms.keySet().forEach(k -> asyncDelete("qcms", k));
        qcmAttempts.keySet().forEach(k -> asyncDelete("attempts", k));
        scans.keySet().forEach(k -> asyncDelete("scans", k));
        illustrations.keySet().forEach(k -> asyncDelete("illustrations", k));
        flashcards.keySet().forEach(k -> asyncDelete("flashcards", k));
        tutorThreads.keySet().forEach(k -> asyncDelete("threads", k));

        subjects.clear();
        courses.clear();
        revisions.clear();
        qcms.clear();
        qcmAttempts.clear();
        scans.clear();
        illustrations.clear();
        flashcards.clear();
        tutorThreads.clear();
        tutorMessages.clear();

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Toutes les données ont été réinitialisées.");
        return res;
    }

    public Map<String, Object> getSampleDataStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("hasData", !courses.isEmpty() || !subjects.isEmpty());
        status.put("subjectsCount", subjects.size());
        status.put("coursesCount", courses.size());
        status.put("revisionsCount", revisions.size());
        status.put("qcmsCount", qcms.size());
        status.put("flashcardsCount", flashcards.size());
        status.put("illustrationsCount", illustrations.size());
        return status;
    }

    // --- Deserialization Helpers ---
    private SubjectUE docToSubject(DocumentSnapshot doc) {
        try {
            List<Long> ivs = (List<Long>) doc.get("customIntervals");
            return new SubjectUE(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("code"),
                doc.getString("name"),
                doc.getString("description"),
                doc.getString("color"),
                doc.get("coefficient") instanceof Number coeffNum ? coeffNum.doubleValue() : 10.0,
                ivs != null ? ivs.stream().map(Long::intValue).collect(Collectors.toList()) : List.of(0, 1, 3, 7, 14, 30, 60),
                doc.getString("icon") != null ? doc.getString("icon") : "Book"
            );
        } catch (Exception e) {
            LOG.warn("Error parsing SubjectUE doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private Course docToCourse(DocumentSnapshot doc) {
        try {
            String taughtStr = doc.getString("taughtDate");
            String createdStr = doc.getString("createdAt");
            String updatedStr = doc.getString("updatedAt");
            List<Long> ivs = (List<Long>) doc.get("customIntervals");

            List<Course.DocumentAttachment> docList = new ArrayList<>();
            List<Map<String, Object>> docsRaw = (List<Map<String, Object>>) doc.get("documents");
            if (docsRaw != null) {
                for (Map<String, Object> m : docsRaw) {
                    String upStr = (String) m.get("uploadedAt");
                    Number size = (Number) m.get("sizeBytes");
                    docList.add(new Course.DocumentAttachment(
                        (String) m.get("id"),
                        (String) m.get("name"),
                        (String) m.get("fileType"),
                        (String) m.get("storageUrl"),
                        size != null ? size.longValue() : 0L,
                        upStr != null ? LocalDateTime.parse(upStr) : LocalDateTime.now()
                    ));
                }
            }

            return new Course(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("ueId"),
                doc.getString("ueCode"),
                doc.getString("title"),
                doc.getString("color"),
                doc.getString("professor") != null ? doc.getString("professor") : "",
                taughtStr != null ? LocalDate.parse(taughtStr) : LocalDate.now(),
                doc.getLong("difficulty") != null ? doc.getLong("difficulty").intValue() : 3,
                doc.getString("status") != null ? doc.getString("status") : "EN_COURS",
                (List<String>) doc.get("tags") != null ? (List<String>) doc.get("tags") : List.of(),
                doc.getString("notes") != null ? doc.getString("notes") : "",
                docList,
                ivs != null ? ivs.stream().map(Long::intValue).collect(Collectors.toList()) : List.of(),
                createdStr != null ? LocalDateTime.parse(createdStr) : LocalDateTime.now(),
                updatedStr != null ? LocalDateTime.parse(updatedStr) : LocalDateTime.now()
            );
        } catch (Exception e) {
            LOG.warn("Error parsing Course doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private RevisionSession docToRevision(DocumentSnapshot doc) {
        try {
            String sDate = doc.getString("scheduledDate");
            String cDate = doc.getString("completedDate");
            return new RevisionSession(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("courseId"),
                doc.getString("courseTitle"),
                doc.getString("ueId"),
                doc.getString("ueCode"),
                doc.getString("ueColor"),
                doc.getLong("jStep") != null ? doc.getLong("jStep").intValue() : 0,
                sDate != null ? LocalDate.parse(sDate) : LocalDate.now(),
                cDate != null ? LocalDate.parse(cDate) : null,
                doc.getString("status") != null ? doc.getString("status") : "A_FAIRE",
                doc.getString("evaluation"),
                doc.getDouble("scorePercent") != null ? doc.getDouble("scorePercent") : (doc.getLong("scorePercent") != null ? doc.getLong("scorePercent").doubleValue() : null),
                doc.getLong("timeSpentMinutes") != null ? doc.getLong("timeSpentMinutes").intValue() : null,
                doc.getString("calendarEventId"),
                doc.getString("notes")
            );
        } catch (Exception e) {
            LOG.warn("Error parsing RevisionSession doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private QcmQuestion docToQcm(DocumentSnapshot doc) {
        try {
            String created = doc.getString("createdAt");
            List<QcmItem> items = new ArrayList<>();
            List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) doc.get("items");
            if (itemsRaw != null) {
                for (Map<String, Object> im : itemsRaw) {
                    Boolean isTr = (Boolean) im.get("isTrue");
                    Boolean isTrap = (Boolean) im.get("isTrap");
                    items.add(new QcmItem(
                        (String) im.get("itemLetter"),
                        (String) im.get("text"),
                        isTr != null && isTr,
                        (String) im.get("explanation"),
                        isTrap != null && isTrap,
                        (String) im.get("trapDetails")
                    ));
                }
            }

            return new QcmQuestion(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("courseId"),
                doc.getString("courseTitle"),
                doc.getString("ueCode"),
                doc.getString("questionStem"),
                items,
                doc.getLong("difficulty") != null ? doc.getLong("difficulty").intValue() : 3,
                doc.getString("source") != null ? doc.getString("source") : "GEMINI_GENERATED",
                doc.getString("examYear"),
                (List<String>) doc.get("tags") != null ? (List<String>) doc.get("tags") : List.of(),
                (List<String>) doc.get("mnemonics") != null ? (List<String>) doc.get("mnemonics") : List.of(),
                created != null ? LocalDateTime.parse(created) : LocalDateTime.now()
            );
        } catch (Exception e) {
            LOG.warn("Error parsing QcmQuestion doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private Flashcard docToFlashcard(DocumentSnapshot doc) {
        try {
            String lastRev = doc.getString("lastReviewedAt");
            String created = doc.getString("createdAt");
            Boolean fav = doc.getBoolean("isFavorite");
            Number revCount = (Number) doc.get("reviewCount");

            return new Flashcard(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("courseId"),
                doc.getString("courseTitle"),
                doc.getString("ueCode"),
                doc.getString("ueId"),
                doc.getString("front"),
                doc.getString("back"),
                doc.getString("hint"),
                doc.getLong("difficulty") != null ? doc.getLong("difficulty").intValue() : 3,
                fav != null && fav,
                (List<String>) doc.get("tags") != null ? (List<String>) doc.get("tags") : List.of(),
                revCount != null ? revCount.intValue() : 0,
                lastRev != null ? LocalDateTime.parse(lastRev) : null,
                created != null ? LocalDateTime.parse(created) : LocalDateTime.now()
            );
        } catch (Exception e) {
            LOG.warn("Error parsing Flashcard doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private MedicalIllustration docToIllustration(DocumentSnapshot doc) {
        try {
            String created = doc.getString("createdAt");
            return new MedicalIllustration(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("courseId"),
                doc.getString("courseTitle"),
                doc.getString("ueCode"),
                doc.getString("title"),
                doc.getString("imageUrl"),
                doc.getString("illustrationType") != null ? doc.getString("illustrationType") : "SCHEMA_ANATOMIQUE",
                doc.getString("prompt"),
                doc.getString("refinedVisualPrompt"),
                (List<String>) doc.get("legendItems") != null ? (List<String>) doc.get("legendItems") : List.of(),
                null,
                created != null ? LocalDateTime.parse(created) : LocalDateTime.now(),
                null
            );
        } catch (Exception e) {
            LOG.warn("Error parsing MedicalIllustration doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private HandwrittenScanResult docToScan(DocumentSnapshot doc) {
        try {
            String scanned = doc.getString("scannedAt");
            List<String> imageUrls = (List<String>) doc.get("imageUrls");
            String singleImageUrl = doc.getString("imageUrl");
            if (imageUrls == null && singleImageUrl != null && !singleImageUrl.isBlank()) {
                imageUrls = List.of(singleImageUrl);
            }
            return new HandwrittenScanResult(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("courseId"),
                doc.getString("courseTitle"),
                singleImageUrl,
                imageUrls != null ? imageUrls : List.of(),
                doc.getString("transcriptionMarkdown"),
                (List<String>) doc.get("keyPoints") != null ? (List<String>) doc.get("keyPoints") : List.of(),
                (List<String>) doc.get("anatomicalTerms") != null ? (List<String>) doc.get("anatomicalTerms") : List.of(),
                (List<String>) doc.get("keyFiguresAndValues") != null ? (List<String>) doc.get("keyFiguresAndValues") : List.of(),
                (List<String>) doc.get("potentialExamTraps") != null ? (List<String>) doc.get("potentialExamTraps") : List.of(),
                (List<String>) doc.get("mnemonics") != null ? (List<String>) doc.get("mnemonics") : List.of(),
                List.of(),
                doc.getString("illustrationUrl"),
                doc.getString("illustrationId"),
                scanned != null ? LocalDateTime.parse(scanned) : LocalDateTime.now()
            );
        } catch (Exception e) {
            LOG.warn("Error parsing HandwrittenScanResult doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }

    private TutorConversationThread docToThread(DocumentSnapshot doc) {
        try {
            String created = doc.getString("createdAt");
            String updated = doc.getString("updatedAt");
            List<AiTutorMessage> msgs = new ArrayList<>();
            List<Map<String, Object>> msgsRaw = (List<Map<String, Object>>) doc.get("messages");
            if (msgsRaw != null) {
                for (Map<String, Object> mm : msgsRaw) {
                    String ts = (String) mm.get("timestamp");
                    msgs.add(new AiTutorMessage(
                        (String) mm.get("id"),
                        (String) mm.get("role"),
                        (String) mm.get("content"),
                        (String) mm.get("courseId"),
                        (String) mm.get("courseTitle"),
                        ts != null ? LocalDateTime.parse(ts) : LocalDateTime.now()
                    ));
                }
            }
            return new TutorConversationThread(
                doc.getString("id") != null ? doc.getString("id") : doc.getId(),
                doc.getString("title"),
                doc.getString("courseId"),
                doc.getString("courseTitle"),
                doc.getString("ueCode"),
                msgs,
                created != null ? LocalDateTime.parse(created) : LocalDateTime.now(),
                updated != null ? LocalDateTime.parse(updated) : LocalDateTime.now()
            );
        } catch (Exception e) {
            LOG.warn("Error parsing TutorConversationThread doc {}: {}", doc.getId(), e.getMessage());
            return null;
        }
    }
}
