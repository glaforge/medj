package fr.medj;

import fr.medj.model.Course;
import fr.medj.model.QcmQuestion;
import fr.medj.model.RevisionSession;
import fr.medj.model.SubjectUE;
import fr.medj.service.FirestoreService;
import fr.medj.service.JMethodEngineService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@MicronautTest
public class ParisCiteCurriculumSeederTest {

    @Inject
    FirestoreService firestoreService;

    @Inject
    JMethodEngineService jMethodEngineService;

    @Test
    void testOfficialParisCiteCurriculumSeeding() {
        // Explicitly trigger seeding
        firestoreService.seedSampleData();
        jMethodEngineService.initializeDefaultRevisions();

        // 1. Verify all 8 official UEs + Mineure are loaded
        List<SubjectUE> subjects = firestoreService.getAllSubjects();
        assertTrue(subjects.size() >= 8, "Expected at least 8 UEs");

        List<String> expectedUeCodes = List.of("UE1", "UE2", "UE3", "UE4", "UE5", "UE6", "UE7", "UE8");
        for (String code : expectedUeCodes) {
            assertTrue(subjects.stream().anyMatch(s -> s.code().equalsIgnoreCase(code)), "Missing UE: " + code);
        }

        // 2. Verify all 186 courses are seeded
        List<Course> courses = firestoreService.getAllCourses();
        assertEquals(186, courses.size(), "Expected 186 Paris Cité courses in total");

        // 3. Verify course distribution across each UE
        Map<String, Long> countByUe = courses.stream()
            .collect(Collectors.groupingBy(Course::ueCode, Collectors.counting()));

        assertEquals(25L, countByUe.get("UE1"));
        assertEquals(25L, countByUe.get("UE2"));
        assertEquals(24L, countByUe.get("UE3"));
        assertEquals(23L, countByUe.get("UE4"));
        assertEquals(24L, countByUe.get("UE5"));
        assertEquals(23L, countByUe.get("UE6"));
        assertEquals(27L, countByUe.get("UE7"));
        assertEquals(15L, countByUe.get("UE8"));

        // 4. Verify Semesters 1 and 2 Distribution : 2 courses/day, 5 days/week (Monday to Friday)
        List<Course> s1Courses = courses.stream()
            .filter(c -> List.of("UE1", "UE2", "UE3").contains(c.ueCode()))
            .toList();
        assertEquals(74, s1Courses.size(), "Expected 74 courses in S1");

        List<Course> s2Courses = courses.stream()
            .filter(c -> List.of("UE4", "UE5", "UE6", "UE7", "UE8").contains(c.ueCode()))
            .toList();
        assertEquals(112, s2Courses.size(), "Expected 112 courses in S2");

        // All courses must be taught on weekdays only (No Saturday, No Sunday)
        for (Course c : courses) {
            DayOfWeek dow = c.taughtDate().getDayOfWeek();
            assertNotEquals(DayOfWeek.SATURDAY, dow, "Course " + c.title() + " scheduled on Saturday!");
            assertNotEquals(DayOfWeek.SUNDAY, dow, "Course " + c.title() + " scheduled on Sunday!");
        }

        // S1 courses must be grouped exactly 2 per teaching day across 37 weekdays
        Map<LocalDate, List<Course>> s1ByDate = s1Courses.stream()
            .collect(Collectors.groupingBy(Course::taughtDate));
        assertEquals(37, s1ByDate.size(), "S1 should be spread over exactly 37 weekdays");
        for (Map.Entry<LocalDate, List<Course>> entry : s1ByDate.entrySet()) {
            assertEquals(2, entry.getValue().size(), "Every S1 class day must have exactly 2 courses: " + entry.getKey());
        }

        // S2 courses must be grouped exactly 2 per teaching day across 56 weekdays
        Map<LocalDate, List<Course>> s2ByDate = s2Courses.stream()
            .collect(Collectors.groupingBy(Course::taughtDate));
        assertEquals(56, s2ByDate.size(), "S2 should be spread over exactly 56 weekdays");
        for (Map.Entry<LocalDate, List<Course>> entry : s2ByDate.entrySet()) {
            assertEquals(2, entry.getValue().size(), "Every S2 class day must have exactly 2 courses: " + entry.getKey());
        }

        // 5. Verify spaced repetition revision sessions are generated for all courses
        List<RevisionSession> revisions = firestoreService.getAllRevisions();
        long distinctCoursesWithRevs = revisions.stream().map(RevisionSession::courseId).distinct().count();
        assertEquals(186, distinctCoursesWithRevs, "All 186 courses must have generated revision sessions");
        assertTrue(revisions.size() >= 186 * 5, "Expected custom weekly schedule to generate at least 5 sessions per course");

        // Verify that revisions are staggered smoothly across the calendar
        Map<LocalDate, List<RevisionSession>> revsByDate = revisions.stream()
            .collect(Collectors.groupingBy(RevisionSession::scheduledDate));
        assertTrue(revsByDate.size() >= 50, "Revisions should be spread over distinct calendar days");

        // 6. Verify QCM bank is populated with rich questions
        List<QcmQuestion> qcms = firestoreService.getAllQcms();
        assertTrue(qcms.size() >= 8, "Expected at least 8 seeded QCMs across all UEs");
        for (QcmQuestion q : qcms) {
            assertEquals(5, q.items().size(), "Each PASS QCM question must have 5 items (A-E)");
            assertNotNull(q.questionStem());
            assertFalse(q.questionStem().isBlank());
        }
    }

    @Test
    void testClearDataAndReseed() {
        // Seed first
        firestoreService.seedSampleData();
        assertTrue(firestoreService.getAllCourses().size() > 0);

        // Clear
        var clearResult = firestoreService.clearAllData();
        assertTrue((Boolean) clearResult.get("success"));
        assertEquals(0, firestoreService.getAllCourses().size());
        assertEquals(0, firestoreService.getAllRevisions().size());
        assertEquals(0, firestoreService.getAllQcms().size());
        assertEquals(0, firestoreService.getAllFlashcards().size());
        assertEquals(0, firestoreService.getAllSubjects().size(), "Subjects should also be cleared");

        // Check sample data status
        var status = firestoreService.getSampleDataStatus();
        assertEquals(false, status.get("hasData"));
        assertEquals(0, status.get("coursesCount"));
        assertEquals(0, status.get("subjectsCount"));
    }
}
