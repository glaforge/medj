package fr.medj;

import fr.medj.model.QcmItem;
import fr.medj.model.QcmQuestion;
import fr.medj.service.FirestoreService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class QcmCrudTest {

    private FirestoreService firestoreService;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
    }

    @Test
    void testCreateUpdateAndDeleteQcm() {
        String testId = "qcm-test-edit-1";
        QcmQuestion newQcm = new QcmQuestion(
            testId,
            "course-1",
            "La Membrane Plasmique",
            "UE2",
            "Énoncé initial : Concernant la membrane plasmique :",
            List.of(
                new QcmItem("A", "Les lipides sont distribués de façon asymétrique.", true, "VRAI", false, ""),
                new QcmItem("B", "Le cholestérol augmente toujours la fluidité membranaire.", false, "FAUX : Effet tampon/modérateur.", true, "Piège classique"),
                new QcmItem("C", "Les protéines transmembranaires ont souvent une hélice alpha hydrophobe.", true, "VRAI", false, ""),
                new QcmItem("D", "Le transport actif secondaire consomme directement de l'ATP.", false, "FAUX : Utilise un gradient électrochimique.", true, "Piège primaire vs secondaire"),
                new QcmItem("E", "Les radeaux lipidiques sont riches en sphingomyéline.", true, "VRAI", false, "")
            ),
            3,
            "MANUEL",
            "2025",
            List.of("BioCell", "Membrane"),
            List.of("Radeaux = Sphingolipides + Cholestérol"),
            LocalDateTime.now()
        );

        // 1. Save
        firestoreService.saveQcm(newQcm);
        assertTrue(firestoreService.getQcm(testId).isPresent());
        assertEquals("Énoncé initial : Concernant la membrane plasmique :", firestoreService.getQcm(testId).get().questionStem());

        // 2. Update (change stem, change item B from false to true, modify explanation)
        QcmQuestion updatedQcm = new QcmQuestion(
            testId,
            "course-1",
            "La Membrane Plasmique",
            "UE2",
            "Énoncé modifié manuellement : Concernant la membrane plasmique et ses lipides :",
            List.of(
                new QcmItem("A", "Les lipides sont distribués de façon asymétrique.", true, "VRAI", false, ""),
                new QcmItem("B", "Le cholestérol joue un rôle de régulateur bidirectionnel de la fluidité.", true, "VRAI : Tamponne la fluidité à chaud et à froid.", false, ""),
                new QcmItem("C", "Les protéines transmembranaires ont souvent une hélice alpha hydrophobe.", true, "VRAI", false, ""),
                new QcmItem("D", "Le transport actif secondaire consomme directement de l'ATP.", false, "FAUX", true, ""),
                new QcmItem("E", "Les radeaux lipidiques sont riches en sphingomyéline.", true, "VRAI", false, "")
            ),
            4,
            "MANUEL",
            "2025",
            List.of("BioCell"),
            List.of(),
            LocalDateTime.now()
        );

        firestoreService.saveQcm(updatedQcm);
        QcmQuestion retrieved = firestoreService.getQcm(testId).orElseThrow();
        assertEquals("Énoncé modifié manuellement : Concernant la membrane plasmique et ses lipides :", retrieved.questionStem());
        assertEquals(4, retrieved.difficulty());
        assertTrue(retrieved.items().get(1).isTrue()); // item B is now TRUE
        assertEquals("Le cholestérol joue un rôle de régulateur bidirectionnel de la fluidité.", retrieved.items().get(1).text());

        // 3. Delete
        assertTrue(firestoreService.deleteQcm(testId));
        assertFalse(firestoreService.getQcm(testId).isPresent());
    }
}
