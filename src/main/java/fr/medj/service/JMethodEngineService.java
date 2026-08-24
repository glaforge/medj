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
        return intervals != null && intervals.equals(List.of(0, 1, 3, 7, 14, 30, 60));
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

        // If explicit custom intervals are provided (and distinct from default [0, 1, 3, 7, 14, 30, 60]), use them
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
            // Standard Customized PASS Schedule:
            // 1. J0 : Jour même (taughtDate)
            LocalDate j0Date = taughtDate;
            String j0Status = j0Date.isBefore(today) ? "VALIDE" : "A_FAIRE";
            LocalDate j0Completed = j0Date.isBefore(today) ? j0Date : null;
            String j0Eval = j0Date.isBefore(today) ? "FACILE" : null;
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-j0",
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                0,
                j0Date,
                j0Completed,
                j0Status,
                j0Eval,
                null,
                null,
                null,
                ""
            ));

            // 2. J1 : Lendemain (taughtDate + 1)
            LocalDate j1Date = taughtDate.plusDays(1);
            String j1Status = j1Date.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-j1",
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                1,
                j1Date,
                null,
                j1Status,
                null,
                null,
                null,
                null,
                ""
            ));

            // 3. Samedi suivant le J1
            LocalDate saturdayDate = j1Date.with(TemporalAdjusters.next(DayOfWeek.SATURDAY));
            int satJStep = (int) ChronoUnit.DAYS.between(taughtDate, saturdayDate);
            String satStatus = saturdayDate.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
            sessions.add(new RevisionSession(
                "rev-" + course.id() + "-j" + satJStep,
                course.id(),
                course.title(),
                ue.id(),
                ue.code(),
                sessionColor,
                satJStep,
                saturdayDate,
                null,
                satStatus,
                null,
                null,
                null,
                null,
                ""
            ));

            // 4. Dimanches suivants jusqu'à la fin du semestre (31 mai pour S2 / mois 1-5, sinon 31 décembre pour S1)
            LocalDate semesterEndDate;
            if (taughtDate.getMonthValue() >= 1 && taughtDate.getMonthValue() <= 5) {
                semesterEndDate = LocalDate.of(taughtDate.getYear(), 5, 31);
            } else {
                semesterEndDate = LocalDate.of(taughtDate.getYear(), 12, 31);
            }

            LocalDate currentSunday = saturdayDate.plusDays(1);
            while (!currentSunday.isAfter(semesterEndDate)) {
                int sunJStep = (int) ChronoUnit.DAYS.between(taughtDate, currentSunday);
                String sunStatus = currentSunday.isBefore(today) ? "EN_RETARD" : "A_FAIRE";
                sessions.add(new RevisionSession(
                    "rev-" + course.id() + "-j" + sunJStep,
                    course.id(),
                    course.title(),
                    ue.id(),
                    ue.code(),
                    sessionColor,
                    sunJStep,
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
     * Retourne un comparateur pour ordonner les révisions du jour par ordre de priorité :
     * 1. Cours les plus difficiles en premier (difficulté 5 -> 1)
     * 2. Matières à plus fort coefficient / ECTS
     * 3. Cycles J les plus précoces (J0, J1, J3 avant J30, J60)
     */
    public Comparator<RevisionSession> getDailyPriorityComparator(Map<String, Course> courseMap, Map<String, SubjectUE> subjectMap) {
        return Comparator
            .comparingInt((RevisionSession r) -> getCourseDifficulty(r, courseMap)).reversed()
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
