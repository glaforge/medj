package fr.medj;

import fr.medj.model.SubjectUE;
import fr.medj.service.FirestoreService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class SubjectCrudTest {

    private FirestoreService firestoreService;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
    }

    @Test
    void testCreateUpdateAndDeleteSubject() {
        int initialCount = firestoreService.getAllSubjects().size();

        // 1. Create a custom UE with decimal coefficient (e.g. 4.5)
        String testId = "ue-test-spec";
        SubjectUE newSubject = new SubjectUE(
            testId,
            "UE8",
            "Spécifique Médecine & Odontologie",
            "Anatomie de la tête et du cou, morphogenèse cranio-faciale",
            "#14B8A6",
            4.5,
            List.of(0, 1, 3, 7, 14, 30, 60, 90),
            "Microscope"
        );

        firestoreService.saveSubject(newSubject);
        assertEquals(initialCount + 1, firestoreService.getAllSubjects().size());
        assertTrue(firestoreService.getSubject(testId).isPresent());
        assertEquals("UE8", firestoreService.getSubject(testId).get().code());
        assertEquals(4.5, firestoreService.getSubject(testId).get().coefficient(), 0.001);

        // 2. Update Subject with another decimal coefficient (e.g. 14.5)
        SubjectUE updated = new SubjectUE(
            testId,
            "UE8-MED",
            "Spécifique Médecine Avancée",
            "Programme approfondi tête et cou",
            "#06B6D4",
            14.5,
            List.of(0, 1, 3, 7, 14, 30, 60, 90, 120),
            "Brain"
        );

        firestoreService.saveSubject(updated);
        SubjectUE retrieved = firestoreService.getSubject(testId).orElseThrow();
        assertEquals("UE8-MED", retrieved.code());
        assertEquals("Spécifique Médecine Avancée", retrieved.name());
        assertEquals(14.5, retrieved.coefficient(), 0.001);
        assertEquals("#06B6D4", retrieved.color());
        assertEquals(9, retrieved.customIntervals().size());

        // 3. Delete Subject
        assertTrue(firestoreService.deleteSubject(testId));
        assertFalse(firestoreService.getSubject(testId).isPresent());
        assertEquals(initialCount, firestoreService.getAllSubjects().size());
    }
}
