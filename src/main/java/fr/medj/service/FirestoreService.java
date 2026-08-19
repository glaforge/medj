package fr.medj.service;

import fr.medj.model.*;
import io.micronaut.context.annotation.Value;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Singleton
public class FirestoreService {
    private static final Logger LOG = LoggerFactory.getLogger(FirestoreService.class);

    @Value("${medj.google.cloud.project-id:medj-pass}")
    private String projectId;

    @Value("${medj.google.cloud.firestore-collection-prefix:medj_}")
    private String collectionPrefix;

    // In-memory / fast local repository maps
    private final Map<String, SubjectUE> subjects = new ConcurrentHashMap<>();
    private final Map<String, Course> courses = new ConcurrentHashMap<>();
    private final Map<String, RevisionSession> revisions = new ConcurrentHashMap<>();
    private final Map<String, QcmQuestion> qcms = new ConcurrentHashMap<>();
    private final Map<String, QcmAttempt> qcmAttempts = new ConcurrentHashMap<>();
    private final Map<String, HandwrittenScanResult> scans = new ConcurrentHashMap<>();
    private final Map<String, TutorConversationThread> tutorThreads = new ConcurrentHashMap<>();
    private final Map<String, MedicalIllustration> illustrations = new ConcurrentHashMap<>();
    private final List<AiTutorMessage> tutorMessages = Collections.synchronizedList(new ArrayList<>());
    private volatile JScheduleConfig scheduleConfig = JScheduleConfig.defaultConfiguration();

    @PostConstruct
    public void init() {
        LOG.info("Initializing MedJ Data Service (Project: {})", projectId);
        // Load default PASS UEs
        for (SubjectUE ue : SubjectUE.getDefaultPassUEs()) {
            subjects.put(ue.id(), ue);
        }
        seedSampleDataIfEmpty();
    }

    private void seedSampleDataIfEmpty() {
        if (!courses.isEmpty()) return;

        LOG.info("Seeding Université Paris Cité official PASS curriculum (UE1 to UE8)...");
        List<Course> officialCourses = ParisCiteCurriculumSeeder.createOfficialCourses();
        for (Course course : officialCourses) {
            courses.put(course.id(), course);
        }

        List<QcmQuestion> officialQcms = ParisCiteCurriculumSeeder.createSampleQcms();
        for (QcmQuestion qcm : officialQcms) {
            qcms.put(qcm.id(), qcm);
        }

        // Seed Sample Tutor Thread
        String c1Id = "course-ue5-07";
        Course c1 = courses.get(c1Id);
        if (c1 != null) {
            String th1Id = "thread-anatomie-plexus";
            TutorConversationThread th1 = new TutorConversationThread(
                th1Id,
                "Pièges sur le plexus brachial et nerf médian",
                c1Id,
                c1.title(),
                "UE5",
                List.of(
                    new AiTutorMessage(
                        "msg-seed-1",
                        "user",
                        "Quels sont les pièges fréquents sur le plexus brachial au concours PASS ?",
                        c1Id,
                        c1.title(),
                        LocalDateTime.now().minusHours(2)
                    ),
                    new AiTutorMessage(
                        "msg-seed-2",
                        "model",
                        "Voici les **3 pièges classiques** en anatomie PASS sur le plexus brachial :\n\n1. **Origine des troncs secondaires** : Ne pas confondre le tronc secondaire *antéro-médial* (nerf ulnaire + racine médiale du nerf médian) et le tronc secondaire *postérieur* (nerfs radial et axillaire).\n2. **Territoire moteur du nerf musculocutané** : Il innerve exclusivement la loge **antérieure** du bras (biceps, coracobrachial, brachial), et PAS la loge postérieure (radial).\n3. **Signe clinique du canal carpien** : Atteinte du nerf **médian** au poignet, qui entraîne un déficit des 3 premiers doigts (pouce, index, majeur).",
                        c1Id,
                        c1.title(),
                        LocalDateTime.now().minusHours(2).plusMinutes(1)
                    )
                ),
                LocalDateTime.now().minusHours(2),
                LocalDateTime.now().minusHours(2)
            );
            tutorThreads.put(th1Id, th1);
        }
        LOG.info("Seeded {} official courses and {} QCMs for Paris Cité PASS", courses.size(), qcms.size());
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
        return subject;
    }

    public boolean deleteSubject(String id) {
        return subjects.remove(id) != null;
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
        return course;
    }

    public boolean deleteCourse(String id) {
        courses.remove(id);
        // Remove associated revision sessions
        revisions.entrySet().removeIf(e -> e.getValue().courseId().equals(id));
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
        return session;
    }

    public void saveRevisions(List<RevisionSession> sessionList) {
        for (RevisionSession s : sessionList) {
            revisions.put(s.id(), s);
        }
    }

    public Optional<RevisionSession> getRevision(String id) {
        return Optional.ofNullable(revisions.get(id));
    }

    public boolean deleteRevision(String id) {
        return revisions.remove(id) != null;
    }

    // --- QCMs ---
    public List<QcmQuestion> getAllQcms() {
        return new ArrayList<>(qcms.values());
    }

    public List<QcmQuestion> getQcmsForCourse(String courseId) {
        return qcms.values().stream()
            .filter(q -> q.courseId().equals(courseId))
            .collect(Collectors.toList());
    }

    public Optional<QcmQuestion> getQcm(String id) {
        return Optional.ofNullable(qcms.get(id));
    }

    public QcmQuestion saveQcm(QcmQuestion qcm) {
        qcms.put(qcm.id(), qcm);
        return qcm;
    }

    public boolean deleteQcm(String id) {
        return qcms.remove(id) != null;
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
        return scan;
    }

    public boolean deleteScan(String id) {
        return scans.remove(id) != null;
    }

    // --- AI Tutor History & Conversation Threads ---
    public List<TutorConversationThread> getAllTutorThreads() {
        return tutorThreads.values().stream()
            .sorted(Comparator.comparing(TutorConversationThread::updatedAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<TutorConversationThread> getTutorThread(String id) {
        return Optional.ofNullable(tutorThreads.get(id));
    }

    public TutorConversationThread saveTutorThread(TutorConversationThread thread) {
        tutorThreads.put(thread.id(), thread);
        return thread;
    }

    public boolean deleteTutorThread(String id) {
        return tutorThreads.remove(id) != null;
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

    // --- Medical Illustrations & Fill-in-the-Blank Drawings ---
    public List<MedicalIllustration> getAllIllustrations() {
        return illustrations.values().stream()
            .sorted(Comparator.comparing(MedicalIllustration::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public List<MedicalIllustration> getIllustrationsForCourse(String courseId) {
        return illustrations.values().stream()
            .filter(i -> i.courseId().equals(courseId))
            .sorted(Comparator.comparing(MedicalIllustration::createdAt).reversed())
            .collect(Collectors.toList());
    }

    public Optional<MedicalIllustration> getIllustration(String id) {
        return Optional.ofNullable(illustrations.get(id));
    }

    public MedicalIllustration saveIllustration(MedicalIllustration illustration) {
        illustrations.put(illustration.id(), illustration);
        return illustration;
    }

    public boolean deleteIllustration(String id) {
        return illustrations.remove(id) != null;
    }

    // --- Configuration ---
    public JScheduleConfig getScheduleConfig() {
        return scheduleConfig;
    }

    public JScheduleConfig updateScheduleConfig(JScheduleConfig config) {
        this.scheduleConfig = config;
        return this.scheduleConfig;
    }
}
