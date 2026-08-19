package fr.medj;

import fr.medj.model.Flashcard;
import fr.medj.model.FlashcardVerification;
import fr.medj.model.GroundingSource;
import fr.medj.service.FirestoreService;
import fr.medj.service.GeminiMedicalService;
import fr.medj.service.MedicalFlashcardTools;
import fr.medj.service.MedicalIllustrationTools;
import fr.medj.service.MedicalQcmTools;
import fr.medj.service.StorageService;
import io.micronaut.serde.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class FlashcardVerificationTest {

    private GeminiMedicalService geminiMedicalService;
    private FirestoreService firestoreService;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        MedicalQcmTools medicalQcmTools = new MedicalQcmTools(firestoreService);
        StorageService storageService = new StorageService("./build/test-uploads");
        MedicalIllustrationTools medicalIllustrationTools = new MedicalIllustrationTools(firestoreService, storageService);
        MedicalFlashcardTools medicalFlashcardTools = new MedicalFlashcardTools(firestoreService);
        ObjectMapper objectMapper = ObjectMapper.getDefault();
        geminiMedicalService = new GeminiMedicalService(objectMapper, firestoreService, medicalQcmTools, medicalIllustrationTools, medicalFlashcardTools, storageService);
        geminiMedicalService.init();
    }

    @Test
    void testVerifyFlashcardFallbackReturnsValidVerificationResult() {
        Flashcard sampleCard = new Flashcard(
            "fc-test-1",
            "course-ue1-16",
            "Équilibres acido-basiques",
            "UE1",
            "ue1",
            "Quelle est l'équation de Henderson-Hasselbalch ?",
            "pH = pKa + log([A-]/[AH])",
            "Pensez au rapport base conjuguée sur acide faible",
            3,
            false,
            List.of("UE1", "AcideBase", "pH"),
            0,
            null,
            LocalDateTime.now()
        );

        FlashcardVerification result = geminiMedicalService.verifyAndFactCheckFlashcard(sampleCard);

        assertNotNull(result);
        assertEquals("fc-test-1", result.flashcardId());
        assertTrue(result.isAccurate());
        assertEquals("VALIDE", result.status());
        assertTrue(result.score() >= 80);
        assertNotNull(result.summary());
        assertNotNull(result.frontReview());
        assertNotNull(result.backReview());
        assertNotNull(result.keyMedicalPoints());
        assertFalse(result.keyMedicalPoints().isEmpty());
        assertNotNull(result.groundingSources());
        assertFalse(result.groundingSources().isEmpty());
    }

    @Test
    void testFlashcardVerificationSerialization() throws Exception {
        ObjectMapper objectMapper = ObjectMapper.getDefault();
        Flashcard sampleCard = new Flashcard(
            "fc-test-2",
            "course-ue1-16",
            "Équilibres acido-basiques",
            "UE1",
            "ue1",
            "Recto original",
            "Verso original",
            "Indice",
            3,
            false,
            List.of("UE1"),
            0,
            null,
            LocalDateTime.now()
        );

        FlashcardVerification result = new FlashcardVerification(
            "fc-test-2",
            false,
            "CORRECTIONS_RECOMMANDEES",
            75,
            "Quelques ajustements de précision requis.",
            "Question un peu large.",
            "Formule exacte mais manque les unités.",
            "Indice bien ciblé.",
            List.of("Équilibre acido-basique sanguin", "Tampon bicarbonate"),
            List.of("Préciser les conditions physiologiques"),
            sampleCard,
            List.of(new GroundingSource("HAS", "https://has-sante.fr", "has-sante.fr")),
            LocalDateTime.now()
        );

        String json = objectMapper.writeValueAsString(result);
        assertNotNull(json);
        assertTrue(json.contains("fc-test-2"));
        assertTrue(json.contains("CORRECTIONS_RECOMMANDEES"));
        assertTrue(json.contains("frontReview"));
        assertTrue(json.contains("backReview"));

        FlashcardVerification deserialized = objectMapper.readValue(json, FlashcardVerification.class);
        assertEquals("fc-test-2", deserialized.flashcardId());
        assertFalse(deserialized.isAccurate());
        assertEquals("CORRECTIONS_RECOMMANDEES", deserialized.status());
        assertEquals(75, deserialized.score());
        assertEquals("Question un peu large.", deserialized.frontReview());
        assertEquals("Verso original", deserialized.correctedFlashcard().back());
    }
}
