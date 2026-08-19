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
    private final Map<String, Flashcard> flashcards = new ConcurrentHashMap<>();
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

        // Seed Sample Flashcards for Active Recall
        List<Flashcard> sampleCards = List.of(
            new Flashcard(
                "fc-seed-1",
                "course-ue3-03",
                "Élasticité de la paroi vasculaire et loi de Laplace",
                "UE3",
                "ue3",
                "Quelle est la loi de Laplace pour un vaisseau cylindrique (relation entre Tension pariétale T, Pression transmurale P et Rayon r) ?",
                "Pour un cylindre : $T = P \\times r$.\n\nLa tension pariétale est directement proportionnelle à la pression transmurale et au rayon du vaisseau. Pour une sphère (ex: alvéole pulmonaire), la formule est $T = \\frac{P \\times r}{2}$.",
                "Pensez à la formule simple T = P × r pour le cylindre et division par 2 pour la sphère.",
                3,
                true,
                List.of("UE3", "Biophysique", "Hémodynamique", "Laplace"),
                LocalDateTime.now().minusDays(3)
            ),
            new Flashcard(
                "fc-seed-2",
                "course-ue5-07",
                "Membre supérieur : Plexus brachial, loges du bras et de l'avant-bras",
                "UE5",
                "ue5",
                "Quels muscles sont innervés par le nerf musculocutané et quelle est sa racine d'origine ?",
                "Le nerf musculocutané (racines **C5, C6, C7**, issu du tronc secondaire antéro-latéral) innerve les **3 muscles de la loge antérieure du bras** :\n1. Muscle biceps brachial\n2. Muscle coraco-brachial\n3. Muscle brachial\n\nIl assure la flexion du coude et la supination.",
                "Loge antérieure du bras uniquement (3 muscles fléchisseurs).",
                2,
                true,
                List.of("UE5", "Anatomie", "Plexus brachial", "Nerf musculocutané"),
                LocalDateTime.now().minusDays(2)
            ),
            new Flashcard(
                "fc-seed-3",
                "course-ue6-02",
                "Pharmacocinétique : Clairance, demi-vie et volume de distribution",
                "UE6",
                "ue6",
                "Donner la définition et la formule de la clairance corporelle totale ($Cl_{tot}$) en fonction de la Dose, de la biodisponibilité $F$ et de l'$AUC$.",
                "La clairance corporelle totale représente le **volume virtuel de plasma totalement épuré d'un médicament par unité de temps** (en mL/min ou L/h) :\n\n$$Cl_{tot} = \\frac{Dose \\times F}{AUC}$$\n\nPour une administration intraveineuse ($F = 1$), $Cl_{tot} = \\frac{Dose_{IV}}{AUC}$.",
                "Cl = Volume épuré par unité de temps (Dose * F / AUC).",
                3,
                false,
                List.of("UE6", "Pharmacocinétique", "Clairance", "Formules"),
                LocalDateTime.now().minusDays(1)
            ),
            new Flashcard(
                "fc-seed-4",
                "course-ue1-04",
                "Enzymologie : Cinétique de Michaelis-Menten et inhibiteurs",
                "UE1",
                "ue1",
                "Écrire l'équation de Michaelis-Menten et donner la signification de la constante de Michaelis ($K_m$).",
                "Équation de Michaelis-Menten :\n$$v = \\frac{V_{max} \\cdot [S]}{K_m + [S]}$$\n\n$K_m$ est la concentration en substrat pour laquelle la vitesse de réaction est égale à la **moitié de la vitesse maximale** ($v = \\frac{V_{max}}{2}$). Un $K_m$ faible traduit une **forte affinité** de l'enzyme pour son substrat.",
                "Km = [S] quand v = Vmax / 2. Affinité inversement proportionnelle à Km.",
                2,
                true,
                List.of("UE1", "Biochimie", "Enzymologie", "Michaelis-Menten"),
                LocalDateTime.now().minusDays(4)
            ),
            new Flashcard(
                "fc-seed-5",
                "course-ue4-02",
                "Épidémiologie diagnostique : Sensibilité, Spécificité, VPP et VPN",
                "UE4",
                "ue4",
                "Comment évoluent la Valeur Prédictive Positive (VPP) et la Valeur Prédictive Négative (VPN) lorsque la prévalence d'une maladie augmente dans la population ?",
                "Lorsque la **prévalence augmente** :\n- La **VPP augmente** (un test positif a plus de chances de correspondre à un vrai malade).\n- La **VPN diminue**.\n\n*Rappel* : La Sensibilité ($Se$) et la Spécificité ($Sp$) sont des caractéristiques intrinsèques du test et **ne dépendent pas de la prévalence**.",
                "VPP suit la prévalence (augmente quand prévalence augmente). Se et Sp sont constantes.",
                3,
                false,
                List.of("UE4", "Biostatistiques", "Épidémiologie", "Bayes"),
                LocalDateTime.now().minusDays(5)
            )
        );
        for (Flashcard card : sampleCards) {
            flashcards.put(card.id(), card);
        }

        LOG.info("Seeded {} official courses, {} QCMs and {} Flashcards for Paris Cité PASS", courses.size(), qcms.size(), flashcards.size());
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
        if (courseId == null || courseId.isBlank()) return List.of();
        Optional<Course> courseOpt = Optional.ofNullable(courses.get(courseId));
        String courseTitleLower = courseOpt.map(c -> c.title().toLowerCase()).orElse("");

        return qcms.values().stream()
            .filter(q -> {
                if (q.courseId() != null && q.courseId().equalsIgnoreCase(courseId)) return true;
                if (!courseTitleLower.isBlank()) {
                    if (q.courseTitle() != null && (q.courseTitle().equalsIgnoreCase(courseTitleLower) || q.courseTitle().toLowerCase().contains(courseTitleLower) || courseTitleLower.contains(q.courseTitle().toLowerCase()))) {
                        return true;
                    }
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
        if (courseId == null || courseId.isBlank()) return List.of();
        Optional<Course> courseOpt = Optional.ofNullable(courses.get(courseId));
        String courseTitleLower = courseOpt.map(c -> c.title().toLowerCase()).orElse("");

        return illustrations.values().stream()
            .filter(i -> {
                if (i.courseId() != null && i.courseId().equalsIgnoreCase(courseId)) return true;
                if (!courseTitleLower.isBlank()) {
                    if (i.courseTitle() != null && (i.courseTitle().equalsIgnoreCase(courseTitleLower) || i.courseTitle().toLowerCase().contains(courseTitleLower) || courseTitleLower.contains(i.courseTitle().toLowerCase()))) {
                        return true;
                    }
                    if (i.title() != null) {
                        String titleLower = i.title().toLowerCase();
                        if (titleLower.contains(courseTitleLower) || courseTitleLower.contains(titleLower)) return true;
                        if (courseTitleLower.contains("équilibres acido-basiques") && (titleLower.contains("équilibres acido-basiques") || titleLower.contains("acido-basique") || titleLower.contains("tampons"))) return true;
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
        return illustration;
    }

    public boolean deleteIllustration(String id) {
        return illustrations.remove(id) != null;
    }

    // --- Flashcards (Active Recall) ---
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
                if (!courseTitleLower.isBlank()) {
                    if (f.courseTitle() != null && (f.courseTitle().equalsIgnoreCase(courseTitleLower) || f.courseTitle().toLowerCase().contains(courseTitleLower) || courseTitleLower.contains(f.courseTitle().toLowerCase()))) {
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
        return card;
    }

    public boolean deleteFlashcard(String id) {
        return flashcards.remove(id) != null;
    }

    public Optional<Flashcard> toggleFlashcardFavorite(String id) {
        Flashcard existing = flashcards.get(id);
        if (existing == null) return Optional.empty();
        Flashcard updated = new Flashcard(
            existing.id(),
            existing.courseId(),
            existing.courseTitle(),
            existing.ueCode(),
            existing.ueId(),
            existing.front(),
            existing.back(),
            existing.hint(),
            existing.difficulty(),
            !existing.isFavorite(),
            existing.tags(),
            existing.reviewCount(),
            existing.lastReviewedAt(),
            existing.createdAt()
        );
        flashcards.put(id, updated);
        return Optional.of(updated);
    }

    public Optional<Flashcard> recordFlashcardReview(String id, String rating) {
        Flashcard existing = flashcards.get(id);
        if (existing == null) return Optional.empty();
        Flashcard updated = new Flashcard(
            existing.id(),
            existing.courseId(),
            existing.courseTitle(),
            existing.ueCode(),
            existing.ueId(),
            existing.front(),
            existing.back(),
            existing.hint(),
            existing.difficulty(),
            existing.isFavorite(),
            existing.tags(),
            existing.reviewCount() + 1,
            LocalDateTime.now(),
            existing.createdAt()
        );
        flashcards.put(id, updated);
        return Optional.of(updated);
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
