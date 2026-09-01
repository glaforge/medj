package fr.medj;

import fr.medj.controller.CourseController;
import fr.medj.model.Course;
import fr.medj.model.RevisionSession;
import fr.medj.model.SubjectUE;
import fr.medj.service.FirestoreService;
import fr.medj.service.JMethodEngineService;
import fr.medj.service.StorageService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CourseCrudTest {

    private FirestoreService firestoreService;
    private JMethodEngineService jMethodEngineService;
    private CourseController courseController;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        jMethodEngineService = new JMethodEngineService(firestoreService);
        StorageService storageService = new StorageService("build/test-uploads");
        courseController = new CourseController(firestoreService, jMethodEngineService, storageService);
    }

    @Test
    void testCreateUpdateCourseDifficultyAndTitle() {
        // 1. Create a subject UE
        SubjectUE ue = new SubjectUE(
            "ue-anat",
            "UE5",
            "Anatomie Générale",
            "Anatomie descriptive et fonctionnelle",
            "#EC4899",
            10.0,
            List.of(),
            "HeartPulse"
        );
        firestoreService.saveSubject(ue);

        // 2. Create a course with initial difficulty 2
        Course newCourse = new Course(
            "course-test-osteo",
            "ue-anat",
            "UE5",
            "Ostéologie du membre supérieur",
            "#EC4899",
            "Pr. Dupont",
            LocalDate.of(2026, 9, 10),
            2,
            "EN_COURS",
            List.of("Anatomie", "Membre"),
            "Notes initiales",
            List.of(),
            List.of(),
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        HttpResponse<Course> createResponse = courseController.createCourse(newCourse);
        assertEquals(HttpStatus.CREATED, createResponse.getStatus());
        Course created = createResponse.body();
        assertNotNull(created);
        assertEquals(2, created.difficulty());
        assertEquals("Ostéologie du membre supérieur", created.title());

        // Verify revision sessions were generated
        List<RevisionSession> sessions = firestoreService.getRevisionsForCourse("course-test-osteo");
        assertFalse(sessions.isEmpty());
        assertEquals("Ostéologie du membre supérieur", sessions.get(0).courseTitle());

        // 3. Update course with increased difficulty (2 -> 5) and modified title
        Course updateInput = new Course(
            "course-test-osteo",
            "ue-anat",
            "UE5",
            "Ostéologie du membre supérieur & Arthrologie",
            "#EC4899",
            "Pr. Dupont & Pr. Martin",
            LocalDate.of(2026, 9, 10),
            5,
            "EN_COURS",
            List.of("Anatomie", "Membre", "Concours"),
            "Notes mises à jour avec pièges",
            List.of(),
            List.of(),
            created.createdAt(),
            LocalDateTime.now()
        );

        HttpResponse<Course> updateResponse = courseController.updateCourse("course-test-osteo", updateInput);
        assertEquals(HttpStatus.OK, updateResponse.getStatus());
        Course updated = updateResponse.body();
        assertNotNull(updated);
        assertEquals(5, updated.difficulty(), "Course difficulty should now be 5");
        assertEquals("Ostéologie du membre supérieur & Arthrologie", updated.title());
        assertEquals("Pr. Dupont & Pr. Martin", updated.professor());
        assertTrue(updated.tags().contains("Concours"));

        // Verify that updated difficulty is reflected in FirestoreService and JMethodEngine
        Course retrieved = firestoreService.getCourse("course-test-osteo").orElseThrow();
        assertEquals(5, retrieved.difficulty());
        assertEquals("Ostéologie du membre supérieur & Arthrologie", retrieved.title());

        // Verify title change was propagated to revision sessions
        List<RevisionSession> updatedSessions = firestoreService.getRevisionsForCourse("course-test-osteo");
        for (RevisionSession s : updatedSessions) {
            assertEquals("Ostéologie du membre supérieur & Arthrologie", s.courseTitle());
        }

        // 4. Delete course
        HttpResponse<Void> deleteResponse = courseController.deleteCourse("course-test-osteo");
        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatus());
        assertTrue(firestoreService.getCourse("course-test-osteo").isEmpty());
    }
}
