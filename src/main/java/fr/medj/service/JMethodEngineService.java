package fr.medj.service;

import fr.medj.model.Course;
import fr.medj.model.RevisionSession;
import fr.medj.model.SubjectUE;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Singleton
public class JMethodEngineService {
    private static final Logger LOG = LoggerFactory.getLogger(JMethodEngineService.class);

    private final FirestoreService firestoreService;

    public JMethodEngineService(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
        initializeDefaultRevisions();
    }

    public synchronized void initializeDefaultRevisions() {
        for (Course course : firestoreService.getAllCourses()) {
            if (firestoreService.getRevisionsForCourse(course.id()).isEmpty()) {
                generateSessionsForCourse(course, course.customIntervals());
            }
        }
    }

    private boolean isDefaultIntervals(List<Integer> intervals) {
        return intervals != null && (
            intervals.equals(List.of(0, 1, 3, 7, 14, 30, 60)) ||
            intervals.equals(List.of(0, 1, 2, 3, 4))
        );
    }

    public List<RevisionSession> generateSessionsForCourse(Course course, List<Integer> customIntervals) {
        SubjectUE ue = firestoreService.getSubject(course.ueId())
            .orElse(new SubjectUE(course.ueId(), course.ueCode(), "UE Inconnue", "", "#3B82F6", 10, List.of(), "Book"));

        LocalDate taughtDate = course.taughtDate() != null ? course.taughtDate() : LocalDate.now();
        LocalDate today = LocalDate.now();

        List<RevisionSession> sessions = new ArrayList<>();

        String sessionColor = (ue.color() != null && !ue.color().isBlank())
            ? ue.color()
            : (course.color() != null && !course.color().isBlank() ? course.color() : "#0284c7");

        // If explicit custom intervals are provided (and distinct from defaults), use them
        if (customIntervals != null && !customIntervals.isEmpty() && !isDefaultIntervals(customIntervals)) {
            for (int j : customIntervals) {
                LocalDate scheduledDate = taughtDate.plusDays(j);
                String status = scheduledDate.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
                
                // J0 is usually marked done if taught in the past
                LocalDate completedDate = null;
                String evaluation = null;
                if (j == 0 && scheduledDate.isBefore(today)) {
                    status = "VALIDE";
                    completedDate = scheduledDate;
                    evaluation = "FACILE";
                }

                String sessionId = "rev-" + course.id() + "-j" + j;
                RevisionSession session = new RevisionSession(
                    sessionId,
                    course.id(),
                    course.title(),
                    ue.id(),
                    ue.code(),
                    sessionColor,
                    j,
                    RevisionSession.inferStepType(j, scheduledDate),
                    scheduledDate,
                    completedDate,
                    status,
                    evaluation,
                    null,
                    null,
                    null,
                    ""
                );
                sessions.add(session);
            }
        } else {
            // Standard Personalized PASS Schedule (5 Cognitive Steps):
            DayOfWeek dayOfWeek = taughtDate.getDayOfWeek();

            // 0. APP : Compréhension et apprentissage (Jour du cours)
            LocalDate appDate = taughtDate;
            String appStatus = appDate.isBefore(today) ? "VALIDE" : "A_FAIRE";
            LocalDate appCompleted = appDate.isBefore(today) ? appDate : null;
            String appEval = appDate.isBefore(today) ? "FACILE" : null;
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-app",
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                0,
                "APP",
                appDate,
                appCompleted,
                appStatus,
                appEval,
                null,
                null,
                null,
                ""
            ));

            // 1. QCM : Révision et QCMs (Lendemain du cours)
            // Si Jeudi -> Vendredi. Si Vendredi -> Samedi.
            LocalDate qcmDate = taughtDate.plusDays(1);
            String qcmStatus = qcmDate.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-qcm",
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                1,
                "QCM",
                qcmDate,
                null,
                qcmStatus,
                null,
                null,
                null,
                null,
                ""
            ));

            // 2. ERR : Consolidation et carnet d'erreurs
            // Règle du Jeudi : condensé le Vendredi (taughtDate + 1)
            // Règle du Vendredi : condensé le Samedi (taughtDate + 1)
            // Sinon : taughtDate + 2 (Lundi -> Mercredi, Mardi -> Jeudi, Mercredi -> Vendredi)
            LocalDate errDate = (dayOfWeek == DayOfWeek.THURSDAY || dayOfWeek == DayOfWeek.FRIDAY)
                ? taughtDate.plusDays(1)
                : taughtDate.plusDays(2);
            String errStatus = errDate.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-err",
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                2,
                "ERR",
                errDate,
                null,
                errStatus,
                null,
                null,
                null,
                null,
                ""
            ));

            // 3. SAM : Révision du samedi (tous les cours de la semaine en cours)
            LocalDate saturdayDate = taughtDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));
            String satStatus = saturdayDate.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-sam",
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                3,
                "SAM",
                saturdayDate,
                null,
                satStatus,
                null,
                null,
                null,
                null,
                ""
            ));

            // 4. DIM : Révision du dimanche (tous les cours depuis le début)
            // Première session le dimanche suivant le samedi, puis chaque dimanche jusqu'à fin du semestre
            LocalDate semesterEndDate;
            if (taughtDate.getMonthValue() >= 1 && taughtDate.getMonthValue() <= 5) {
                semesterEndDate = LocalDate.of(taughtDate.getYear(), 5, 31);
            } else {
                semesterEndDate = LocalDate.of(taughtDate.getYear(), 12, 31);
            }

            LocalDate currentSunday = saturdayDate.plusDays(1);
            while (!currentSunday.isAfter(semesterEndDate)) {
                String sunStatus = currentSunday.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
                sessions.add(new RevisionSession(
                    "rev-" + course.id() + "-dim-" + currentSunday,
                    course.id(),
                    course.title(),
                    ue.id(),
                    ue.code(),
                    sessionColor,
                    4,
                    "DIM",
                    currentSunday,
                    null,
                    sunStatus,
                    null,
                    null,
                    null,
                    null,
                    ""
                ));
                currentSunday = currentSunday.plusWeeks(1);
            }
        }

        firestoreService.saveRevisions(sessions);
        LOG.info("Generated {} revision sessions for course '{}'", sessions.size(), course.title());
        return sessions;
    }

    public Optional<RevisionSession> completeSession(String sessionId, String evaluation, Double scorePercent, Integer timeSpentMinutes, String notes) {
        Optional<RevisionSession> opt = firestoreService.getRevision(sessionId);
        if (opt.isEmpty()) return Optional.empty();

        RevisionSession s = opt.get();
        RevisionSession updated = new RevisionSession(
            s.id(),
            s.courseId(),
            s.courseTitle(),
            s.ueId(),
            s.ueCode(),
            s.ueColor(),
            s.jStep(),
            s.stepType(),
            s.scheduledDate(),
            LocalDate.now(),
            "VALIDE",
            evaluation != null ? evaluation : "MOYEN",
            scorePercent,
            timeSpentMinutes,
            s.calendarEventId(),
            notes != null ? notes : s.notes()
        );
        firestoreService.saveRevision(updated);
        return Optional.of(updated);
    }

    public Optional<RevisionSession> uncompleteSession(String sessionId) {
        Optional<RevisionSession> opt = firestoreService.getRevision(sessionId);
        if (opt.isEmpty()) return Optional.empty();

        RevisionSession s = opt.get();
        LocalDate today = LocalDate.now();
        String status = s.scheduledDate().isBefore(today) ? "EN_RETARD" : "A_FAIRE";

        RevisionSession updated = new RevisionSession(
            s.id(),
            s.courseId(),
            s.courseTitle(),
            s.ueId(),
            s.ueCode(),
            s.ueColor(),
            s.jStep(),
            s.stepType(),
            s.scheduledDate(),
            null,
            status,
            null,
            null,
            null,
            s.calendarEventId(),
            s.notes()
        );
        firestoreService.saveRevision(updated);
        LOG.info("Reset/uncompleted session {} back to status {}", sessionId, status);
        return Optional.of(updated);
    }

    public Optional<RevisionSession> shiftSession(String sessionId, int daysToAdd) {
        Optional<RevisionSession> opt = firestoreService.getRevision(sessionId);
        if (opt.isEmpty()) return Optional.empty();

        RevisionSession s = opt.get();
        LocalDate newDate = s.scheduledDate().plusDays(daysToAdd);
        
        RevisionSession updated = new RevisionSession(
            s.id(),
            s.courseId(),
            s.courseTitle(),
            s.ueId(),
            s.ueCode(),
            s.ueColor(),
            s.jStep(),
            s.stepType(),
            newDate,
            null,
            "REPORTE",
            s.evaluation(),
            s.scorePercent(),
            s.timeSpentMinutes(),
            s.calendarEventId(),
            s.notes()
        );
        firestoreService.saveRevision(updated);
        LOG.info("Shifted session {} by {} days to {}", sessionId, daysToAdd, newDate);
        return Optional.of(updated);
    }

    public List<RevisionSession> shiftSubject(String ueId, int daysToAdd) {
        LocalDate today = LocalDate.now();
        List<RevisionSession> updatedList = new ArrayList<>();

        for (RevisionSession s : firestoreService.getAllRevisions()) {
            if (s.ueId().equalsIgnoreCase(ueId) && !"VALIDE".equals(s.status()) && !s.scheduledDate().isBefore(today)) {
                RevisionSession updated = new RevisionSession(
                    s.id(),
                    s.courseId(),
                    s.courseTitle(),
                    s.ueId(),
                    s.ueCode(),
                    s.ueColor(),
                    s.jStep(),
                    s.stepType(),
                    s.scheduledDate().plusDays(daysToAdd),
                    null,
                    "REPORTE",
                    s.evaluation(),
                    s.scorePercent(),
                    s.timeSpentMinutes(),
                    s.calendarEventId(),
                    s.notes()
                );
                firestoreService.saveRevision(updated);
                updatedList.add(updated);
            }
        }
        LOG.info("Bulk shifted {} sessions for UE '{}' by {} days", updatedList.size(), ueId, daysToAdd);
        return updatedList;
    }

    public Map<LocalDate, List<RevisionSession>> getWorkloadByDate(LocalDate start, LocalDate end) {
        return firestoreService.getAllRevisions().stream()
            .filter(r -> (start == null || !r.scheduledDate().isBefore(start)) &&
                         (end == null || !r.scheduledDate().isAfter(end)))
            .collect(Collectors.groupingBy(RevisionSession::scheduledDate));
    }

    public List<LocalDate> getOverloadedDays(int threshold) {
        Map<LocalDate, List<RevisionSession>> workload = getWorkloadByDate(LocalDate.now(), LocalDate.now().plusMonths(2));
        return workload.entrySet().stream()
            .filter(e -> e.getValue().size() > threshold)
            .map(Map.Entry::getKey)
            .sorted()
            .collect(Collectors.toList());
    }

    public int getCourseDifficulty(RevisionSession session, Map<String, Course> courseMap) {
        if (session.courseId() != null && courseMap.containsKey(session.courseId())) {
            return courseMap.get(session.courseId()).difficulty();
        }
        return 3; // Valeur par défaut si non spécifié
    }

    public double getUeCoefficient(RevisionSession session, Map<String, SubjectUE> subjectMap) {
        if (session.ueId() != null && subjectMap.containsKey(session.ueId())) {
            return subjectMap.get(session.ueId()).coefficient();
        }
        return 10.0; // Valeur par défaut
    }

    /**
     * Retourne la priorité pédagogique du palier de révision :
     * 0: APP (Compréhension initiale)
     * 1: QCM (Entraînement actif J+1)
     * 2: ERR (Consolidation & carnet d'erreurs)
     * 3: SAM (Synthèse hebdomadaire)
     * 4: DIM (Révision cumulative)
     */
    public static int getStepPriority(RevisionSession session) {
        String type = session.stepType();
        if (type == null || type.isBlank()) {
            type = RevisionSession.inferStepType(session.jStep(), session.scheduledDate());
        }
        return switch (type) {
            case "APP" -> 0;
            case "QCM" -> 1;
            case "ERR" -> 2;
            case "SAM" -> 3;
            case "DIM" -> 4;
            default -> 5;
        };
    }

    /**
     * Retourne un comparateur pour ordonner les révisions du jour par ordre de priorité :
     * 1. Palier pédagogique prioritaire (APP -> QCM -> ERR -> SAM -> DIM)
     * 2. Cours les plus difficiles en premier (difficulté 5 -> 1)
     * 3. Matières à plus fort coefficient / ECTS
     * 4. Cycles J les plus précoces (J0, J1, J3 avant J30, J60)
     */
    public Comparator<RevisionSession> getDailyPriorityComparator(Map<String, Course> courseMap, Map<String, SubjectUE> subjectMap) {
        return Comparator
            .comparingInt(JMethodEngineService::getStepPriority)
            .thenComparing(Comparator.comparingInt((RevisionSession r) -> getCourseDifficulty(r, courseMap)).reversed())
            .thenComparing(Comparator.comparingDouble((RevisionSession r) -> getUeCoefficient(r, subjectMap)).reversed())
            .thenComparingInt(RevisionSession::jStep);
    }

    /**
     * Lissage de charge intelligent (Workload Smoothing avec Priorisation Pédagogique) :
     * 
     * Lorsque le nombre de révisions dépasse le seuil quotidien d'un jour surchargé :
     * 1. Les cours les plus difficiles (difficulté 4-5 / UE à fort coeff) sont prioritaires pour RESTER sur leur date cible.
     * 2. Les cours les plus faciles (difficulté 1-2) ou les cycles avancés (J30, J60) sont RELÉGUÉS en premier vers les jours suivants.
     * 3. Les étapes d'ancrage mnésique initiales (J0, J1, J3) sont protégées par rapport aux étapes tardives.
     */
    public List<RevisionSession> performWorkloadSmoothing(int targetDailyLimit) {
        LocalDate today = LocalDate.now();
        List<RevisionSession> allActive = firestoreService.getAllRevisions().stream()
            .filter(r -> !"VALIDE".equals(r.status()) && !r.scheduledDate().isBefore(today))
            .sorted(Comparator.comparing(RevisionSession::scheduledDate))
            .toList();

        Map<LocalDate, List<RevisionSession>> dailyMap = new TreeMap<>(
            allActive.stream().collect(Collectors.groupingBy(RevisionSession::scheduledDate))
        );

        Map<String, Course> courseMap = firestoreService.getAllCourses().stream()
            .collect(Collectors.toMap(Course::id, c -> c, (a, b) -> a));

        Map<String, SubjectUE> subjectMap = firestoreService.getAllSubjects().stream()
            .collect(Collectors.toMap(SubjectUE::id, s -> s, (a, b) -> a));

        List<RevisionSession> modifiedSessions = new ArrayList<>();

        for (Map.Entry<LocalDate, List<RevisionSession>> entry : new ArrayList<>(dailyMap.entrySet())) {
            LocalDate date = entry.getKey();
            List<RevisionSession> daySessions = entry.getValue();

            while (daySessions.size() > targetDailyLimit) {
                // Comparateur pour choisir la séance à DÉPLACER (à reléguer vers un jour ultérieur) :
                // 1. Cours les plus faciles déplacés en premier (difficulté 1 < 2 < 3 < 4 < 5)
                // 2. Matières à plus faible coefficient déplacées en premier
                // 3. Cycles J les plus élevés déplacés en premier (J60/J30 plus flexibles que J1/J3)
                Comparator<RevisionSession> toMoveComparator = Comparator
                    .comparingInt((RevisionSession r) -> getCourseDifficulty(r, courseMap))
                    .thenComparingDouble(r -> getUeCoefficient(r, subjectMap))
                    .thenComparing(Comparator.comparingInt(RevisionSession::jStep).reversed());

                RevisionSession toMove = daySessions.stream()
                    .min(toMoveComparator)
                    .orElse(daySessions.get(daySessions.size() - 1));

                daySessions.remove(toMove);

                // Recherche du jour le plus proche ayant une capacité restante
                LocalDate targetDate = date.plusDays(1);
                while (dailyMap.getOrDefault(targetDate, Collections.emptyList()).size() >= targetDailyLimit) {
                    targetDate = targetDate.plusDays(1);
                }

                RevisionSession moved = new RevisionSession(
                    toMove.id(),
                    toMove.courseId(),
                    toMove.courseTitle(),
                    toMove.ueId(),
                    toMove.ueCode(),
                    toMove.ueColor(),
                    toMove.jStep(),
                    toMove.stepType(),
                    targetDate,
                    null,
                    "REPORTE",
                    toMove.evaluation(),
                    toMove.scorePercent(),
                    toMove.timeSpentMinutes(),
                    toMove.calendarEventId(),
                    toMove.notes()
                );

                firestoreService.saveRevision(moved);
                modifiedSessions.add(moved);

                dailyMap.computeIfAbsent(targetDate, k -> new ArrayList<>()).add(moved);
            }
        }

        LOG.info("Workload smoothing adjusted {} revision sessions using difficulty & UE weight prioritization", modifiedSessions.size());
        return modifiedSessions;
    }
}
