package fr.medj;

import fr.medj.model.Course;
import fr.medj.model.RevisionSession;
import fr.medj.service.FirestoreService;
import fr.medj.service.JMethodEngineService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@MicronautTest
public class JMethodEngineServiceTest {

    @Inject
    FirestoreService firestoreService;

    @Inject
    JMethodEngineService jMethodEngineService;

    @Test
    void testSpacedRepetitionIntervalGeneration() {
        LocalDate start = LocalDate.now();
        Course course = new Course(
            "test-course-1",
            "ue1",
            "UE1",
            "Biochimie : Enzymologie & Cinétique Michaelienne",
            "#0284c7",
            "Pr. Test",
            start,
            4,
            "EN_COURS",
            List.of("Enzymes", "Vmax"),
            "Notes de test",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, course.customIntervals());
        Assertions.assertEquals(7, sessions.size());

        Assertions.assertEquals(start, sessions.get(0).scheduledDate());
        Assertions.assertEquals(0, sessions.get(0).jStep());

        Assertions.assertEquals(start.plusDays(1), sessions.get(1).scheduledDate());
        Assertions.assertEquals(1, sessions.get(1).jStep());

        Assertions.assertEquals(start.plusDays(3), sessions.get(2).scheduledDate());
        Assertions.assertEquals(3, sessions.get(2).jStep());

        Assertions.assertEquals(start.plusDays(7), sessions.get(3).scheduledDate());
        Assertions.assertEquals(7, sessions.get(3).jStep());

        Assertions.assertEquals(start.plusDays(14), sessions.get(4).scheduledDate());
        Assertions.assertEquals(14, sessions.get(4).jStep());

        Assertions.assertEquals(start.plusDays(30), sessions.get(5).scheduledDate());
        Assertions.assertEquals(30, sessions.get(5).jStep());

        Assertions.assertEquals(start.plusDays(60), sessions.get(6).scheduledDate());
        Assertions.assertEquals(60, sessions.get(6).jStep());
    }

    @Test
    void testSessionShiftingAndWorkloadSmoothing() {
        LocalDate today = LocalDate.now();
        Course course = new Course(
            "test-course-shift",
            "ue5",
            "UE5",
            "Ostéologie du Crâne",
            "#ec4899",
            "Pr. Test",
            today,
            3,
            "EN_COURS",
            List.of("Crâne"),
            "",
            List.of(),
            List.of(0, 1, 3),
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, course.customIntervals());
        RevisionSession j1 = sessions.get(1);

        Optional<RevisionSession> shifted = jMethodEngineService.shiftSession(j1.id(), 2);
        Assertions.assertTrue(shifted.isPresent());
        Assertions.assertEquals(today.plusDays(3), shifted.get().scheduledDate());
        Assertions.assertEquals("REPORTE", shifted.get().status());

        // Test workload smoothing
        List<RevisionSession> smoothed = jMethodEngineService.performWorkloadSmoothing(5);
        Assertions.assertNotNull(smoothed);
    }

    @Test
    void testWorkloadSmoothingPrioritizesDifficultCoursesOverEasyCourses() {
        LocalDate today = LocalDate.now();
        LocalDate targetOverloadedDate = today.plusDays(10);

        // Course Difficile (5/5)
        Course hardCourse = new Course(
            "hard-course-ue1",
            "ue1",
            "UE1",
            "Thermodynamique & Bioénergétique (Difficile)",
            "#0284c7",
            "Pr. Hard",
            today,
            5, // Difficulté max
            "EN_COURS",
            List.of("Thermodynamique"),
            "",
            List.of(),
            List.of(10),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveCourse(hardCourse);

        // Course Facile (1/5)
        Course easyCourse = new Course(
            "easy-course-ue7",
            "ue7",
            "UE7",
            "Histoire de la Santé (Facile)",
            "#10b981",
            "Pr. Easy",
            today,
            1, // Difficulté min
            "EN_COURS",
            List.of("Histoire"),
            "",
            List.of(),
            List.of(10),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveCourse(easyCourse);

        // Manually create revisions for both on targetOverloadedDate
        RevisionSession hardRev = new RevisionSession(
            "rev-hard-j10",
            hardCourse.id(),
            hardCourse.title(),
            hardCourse.ueId(),
            hardCourse.ueCode(),
            hardCourse.color(),
            10,
            targetOverloadedDate,
            null,
            "A_FAIRE",
            null,
            null,
            null,
            null,
            ""
        );

        RevisionSession easyRev = new RevisionSession(
            "rev-easy-j10",
            easyCourse.id(),
            easyCourse.title(),
            easyCourse.ueId(),
            easyCourse.ueCode(),
            easyCourse.color(),
            10,
            targetOverloadedDate,
            null,
            "A_FAIRE",
            null,
            null,
            null,
            null,
            ""
        );

        firestoreService.saveRevision(hardRev);
        firestoreService.saveRevision(easyRev);

        // Apply smoothing with daily limit = 1 for target date
        List<RevisionSession> adjusted = jMethodEngineService.performWorkloadSmoothing(1);

        // Retrieve both revisions
        Optional<RevisionSession> hardAfter = firestoreService.getRevision("rev-hard-j10");
        Optional<RevisionSession> easyAfter = firestoreService.getRevision("rev-easy-j10");

        Assertions.assertTrue(hardAfter.isPresent());
        Assertions.assertTrue(easyAfter.isPresent());

        // Hard course MUST stay on targetOverloadedDate
        Assertions.assertEquals(targetOverloadedDate, hardAfter.get().scheduledDate(), "Le cours difficile (5/5) doit rester prioritaire sur sa date cible");

        // Easy course MUST have been shifted to a later date
        Assertions.assertTrue(easyAfter.get().scheduledDate().isAfter(targetOverloadedDate), "Le cours facile (1/5) doit être relégué à un jour ultérieur");
        Assertions.assertEquals("REPORTE", easyAfter.get().status());
    }
}
