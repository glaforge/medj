package fr.medj;

import fr.medj.model.Course;
import fr.medj.model.RevisionSession;
import fr.medj.service.FirestoreService;
import fr.medj.service.JMethodEngineService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
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
    void testCustomWeeklyScheduleSemester1() {
        LocalDate mondaySept7 = LocalDate.of(2026, 9, 7); // Monday in S1
        Course course = new Course(
            "test-course-s1",
            "ue1",
            "UE1",
            "Biochimie : Enzymologie",
            "#0284c7",
            "Pr. Test",
            mondaySept7,
            4,
            "EN_COURS",
            List.of("Enzymes"),
            "Notes",
            List.of(),
            List.of(), // default schedule
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, course.customIntervals());
        Assertions.assertFalse(sessions.isEmpty());

        // J0: Jour même (Monday 2026-09-07)
        Assertions.assertEquals(mondaySept7, sessions.get(0).scheduledDate());
        Assertions.assertEquals(0, sessions.get(0).jStep());

        // J1: Lendemain (Tuesday 2026-09-08)
        Assertions.assertEquals(mondaySept7.plusDays(1), sessions.get(1).scheduledDate());
        Assertions.assertEquals(1, sessions.get(1).jStep());

        // Samedi suivant (Saturday 2026-09-12)
        Assertions.assertEquals(LocalDate.of(2026, 9, 12), sessions.get(2).scheduledDate());
        Assertions.assertEquals(DayOfWeek.SATURDAY, sessions.get(2).scheduledDate().getDayOfWeek());

        // All subsequent sessions must be Sundays up to 2026-12-31
        LocalDate lastSunday = null;
        for (int i = 3; i < sessions.size(); i++) {
            RevisionSession s = sessions.get(i);
            Assertions.assertEquals(DayOfWeek.SUNDAY, s.scheduledDate().getDayOfWeek(), "Session " + i + " must be a Sunday");
            Assertions.assertFalse(s.scheduledDate().isAfter(LocalDate.of(2026, 12, 31)), "Sunday cannot exceed Dec 31");
            if (lastSunday != null) {
                Assertions.assertEquals(lastSunday.plusWeeks(1), s.scheduledDate(), "Sundays must be spaced by exactly 1 week");
            }
            lastSunday = s.scheduledDate();
        }
        Assertions.assertEquals(LocalDate.of(2026, 12, 27), lastSunday, "Last Sunday of S1 should be Dec 27, 2026");
    }

    @Test
    void testCustomWeeklyScheduleSemester2() {
        LocalDate fridayJan15 = LocalDate.of(2027, 1, 15); // Friday in S2
        Course course = new Course(
            "test-course-s2",
            "ue5",
            "UE5",
            "Anatomie : Tronc cérébral",
            "#ec4899",
            "Pr. Test",
            fridayJan15,
            3,
            "EN_COURS",
            List.of("Anatomie"),
            "",
            List.of(),
            null,
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, course.customIntervals());
        Assertions.assertFalse(sessions.isEmpty());

        // J0: Jour même (Friday 2027-01-15)
        Assertions.assertEquals(fridayJan15, sessions.get(0).scheduledDate());
        Assertions.assertEquals(0, sessions.get(0).jStep());

        // J1: Lendemain (Saturday 2027-01-16)
        Assertions.assertEquals(fridayJan15.plusDays(1), sessions.get(1).scheduledDate());
        Assertions.assertEquals(1, sessions.get(1).jStep());

        // Samedi suivant (Saturday 2027-01-23)
        Assertions.assertEquals(LocalDate.of(2027, 1, 23), sessions.get(2).scheduledDate());
        Assertions.assertEquals(DayOfWeek.SATURDAY, sessions.get(2).scheduledDate().getDayOfWeek());

        // All subsequent sessions must be Sundays up to 2027-05-31
        LocalDate lastSunday = null;
        for (int i = 3; i < sessions.size(); i++) {
            RevisionSession s = sessions.get(i);
            Assertions.assertEquals(DayOfWeek.SUNDAY, s.scheduledDate().getDayOfWeek());
            Assertions.assertFalse(s.scheduledDate().isAfter(LocalDate.of(2027, 5, 31)), "Sunday cannot exceed May 31 for S2");
            lastSunday = s.scheduledDate();
        }
        Assertions.assertEquals(LocalDate.of(2027, 5, 30), lastSunday, "Last Sunday of S2 should be May 30, 2027");
    }

    @Test
    void testDeleteRevisionAndFollowing() {
        LocalDate mondaySept7 = LocalDate.of(2026, 9, 7);
        Course course = new Course(
            "test-course-delete-cascade",
            "ue2",
            "UE2",
            "Histologie : Tissu Conjonctif",
            "#10b981",
            "Pr. Test",
            mondaySept7,
            3,
            "EN_COURS",
            List.of("Histologie"),
            "",
            List.of(),
            List.of(),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveCourse(course);

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, null);
        int initialCount = sessions.size();
        Assertions.assertTrue(initialCount > 10);

        // Pick a Sunday in October (e.g. session index 7: 2026-10-11)
        RevisionSession targetSunday = sessions.get(7);
        LocalDate targetDate = targetSunday.scheduledDate();

        // Delete target Sunday and all following sessions
        boolean deleted = firestoreService.deleteRevisionAndFollowing(targetSunday.id());
        Assertions.assertTrue(deleted);

        List<RevisionSession> remaining = firestoreService.getRevisionsForCourse(course.id());
        Assertions.assertTrue(remaining.size() < initialCount);
        Assertions.assertEquals(7, remaining.size()); // 0..6 remaining (J0, J1, Sat, and 4 Sundays before target)

        for (RevisionSession r : remaining) {
            Assertions.assertTrue(r.scheduledDate().isBefore(targetDate), "Remaining revisions must all be before the deletion target date");
        }

        // Deleting a single revision
        RevisionSession toDeleteSingle = remaining.get(1); // J1
        firestoreService.deleteRevision(toDeleteSingle.id());
        List<RevisionSession> afterSingleDelete = firestoreService.getRevisionsForCourse(course.id());
        Assertions.assertEquals(6, afterSingleDelete.size());
    }

    @Test
    void testExplicitCustomIntervalsRespected() {
        LocalDate start = LocalDate.now();
        Course course = new Course(
            "test-custom-explicit",
            "ue1",
            "UE1",
            "Biochimie : Intervalles libres",
            "#0284c7",
            "Pr. Test",
            start,
            4,
            "EN_COURS",
            List.of(),
            "",
            List.of(),
            List.of(0, 2, 5, 10), // explicit custom intervals
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, course.customIntervals());
        Assertions.assertEquals(4, sessions.size());
        Assertions.assertEquals(0, sessions.get(0).jStep());
        Assertions.assertEquals(2, sessions.get(1).jStep());
        Assertions.assertEquals(5, sessions.get(2).jStep());
        Assertions.assertEquals(10, sessions.get(3).jStep());
    }

    @Test
    void testCourseAugust24AnatomieLowerLimbs() {
        LocalDate aug24 = LocalDate.of(2026, 8, 24); // Monday (like in user screenshot)
        Course course = new Course(
            "course-aug24-anat",
            "ue5",
            "UE5",
            "Les membres inférieurs",
            "#EC4899",
            "Pr. Anatomie",
            aug24,
            3,
            "EN_COURS",
            List.of("Membres"),
            "",
            List.of(),
            List.of(),
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        List<RevisionSession> sessions = jMethodEngineService.generateSessionsForCourse(course, course.customIntervals());
        Assertions.assertFalse(sessions.isEmpty());

        // 1. J0: Monday 2026-08-24
        Assertions.assertEquals(LocalDate.of(2026, 8, 24), sessions.get(0).scheduledDate());
        Assertions.assertEquals(0, sessions.get(0).jStep());

        // 2. J1: Tuesday 2026-08-25
        Assertions.assertEquals(LocalDate.of(2026, 8, 25), sessions.get(1).scheduledDate());
        Assertions.assertEquals(1, sessions.get(1).jStep());

        // 3. Samedi suivant: Saturday 2026-08-29 (J5)
        Assertions.assertEquals(LocalDate.of(2026, 8, 29), sessions.get(2).scheduledDate());
        Assertions.assertEquals(5, sessions.get(2).jStep());
        Assertions.assertEquals(DayOfWeek.SATURDAY, sessions.get(2).scheduledDate().getDayOfWeek());

        // 4. Dimanches suivants jusqu'au 31 décembre 2026
        Assertions.assertEquals(LocalDate.of(2026, 8, 30), sessions.get(3).scheduledDate());
        Assertions.assertEquals(6, sessions.get(3).jStep());
        Assertions.assertEquals(DayOfWeek.SUNDAY, sessions.get(3).scheduledDate().getDayOfWeek());

        Assertions.assertEquals(LocalDate.of(2026, 9, 6), sessions.get(4).scheduledDate());
        Assertions.assertEquals(13, sessions.get(4).jStep());
        Assertions.assertEquals(DayOfWeek.SUNDAY, sessions.get(4).scheduledDate().getDayOfWeek());

        // Last session is Sunday Dec 27, 2026
        RevisionSession last = sessions.get(sessions.size() - 1);
        Assertions.assertEquals(LocalDate.of(2026, 12, 27), last.scheduledDate());
        Assertions.assertEquals(DayOfWeek.SUNDAY, last.scheduledDate().getDayOfWeek());
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
