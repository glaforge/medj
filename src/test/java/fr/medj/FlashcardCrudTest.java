package fr.medj;

import fr.medj.controller.GeminiAiController;
import fr.medj.model.Flashcard;
import fr.medj.service.*;
import io.micronaut.http.HttpResponse;
import io.micronaut.serde.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class FlashcardCrudTest {

    private FirestoreService firestoreService;
    private MedicalFlashcardTools medicalFlashcardTools;
    private GeminiAiController geminiAiController;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        StorageService storageService = new StorageService("./build/test-uploads");
        MedicalQcmTools medicalQcmTools = new MedicalQcmTools(firestoreService);
        MedicalIllustrationTools medicalIllustrationTools = new MedicalIllustrationTools(firestoreService, storageService);
        medicalFlashcardTools = new MedicalFlashcardTools(firestoreService);
        ObjectMapper objectMapper = ObjectMapper.getDefault();
        GeminiMedicalService geminiMedicalService = new GeminiMedicalService(
            objectMapper,
            firestoreService,
            medicalQcmTools,
            medicalIllustrationTools,
            medicalFlashcardTools,
            storageService
        );
        geminiMedicalService.init();
        geminiAiController = new GeminiAiController(geminiMedicalService, firestoreService, storageService);
    }

    @Test
    void testInitialSeedFlashcardsPresent() {
        List<Flashcard> all = firestoreService.getAllFlashcards();
        assertNotNull(all);
        assertFalse(all.isEmpty(), "Initial seed flashcards should be loaded");
        assertTrue(all.size() >= 5);

        // Check Laplace formula card
        boolean hasLaplace = all.stream().anyMatch(f -> f.front().contains("Laplace") || f.back().contains("Laplace"));
        assertTrue(hasLaplace, "Laplace formula flashcard should be present");
    }

    @Test
    void testCreateUpdateAndFavoriteFlashcard() {
        Flashcard created = firestoreService.saveFlashcard(new Flashcard(
            "fc-test-custom",
            "course-ue5-bras",
            "Anatomie du bras",
            "UE5",
            "ue5",
            "Quel est le trajet du nerf radial ?",
            "Passe dans le sillon du nerf radial de la face postérieure de l'humérus.",
            "Pensez au risque de fracture diaphysaire humérale.",
            4,
            false,
            List.of("Anatomie", "UE5", "Nerf"),
            0,
            null,
            LocalDateTime.now()
        ));

        assertNotNull(created);
        assertEquals("fc-test-custom", created.id());
        assertFalse(created.isFavorite());

        // Toggle Favorite
        Flashcard fav = firestoreService.toggleFlashcardFavorite("fc-test-custom").orElseThrow();
        assertNotNull(fav);
        assertTrue(fav.isFavorite());

        // Filter favorites via controller
        List<Flashcard> favOnly = geminiAiController.getFlashcards(null, null, java.util.Optional.of(true));
        assertTrue(favOnly.stream().anyMatch(f -> f.id().equals("fc-test-custom")));

        // Record review
        Flashcard reviewed = firestoreService.recordFlashcardReview("fc-test-custom", "EASY").orElseThrow();
        assertNotNull(reviewed);
        assertEquals(1, reviewed.reviewCount());
        assertNotNull(reviewed.lastReviewedAt());
    }

    @Test
    void testMedicalFlashcardToolsExecution() {
        String toolResult = medicalFlashcardTools.createAndSaveFlashcard(
            "Quelle est la définition du volume de distribution ?",
            "Volume fictif dans lequel devrait se distribuer la quantité totale de médicament pour être à la même concentration que dans le plasma.",
            "Vd = Dose / C0 (volume virtuel)",
            "UE6",
            3,
            "Pharmacologie, UE6, Cinétique"
        );

        assertNotNull(toolResult);
        assertTrue(toolResult.contains("Volume fictif"));

        List<Flashcard> recentlyCreated = medicalFlashcardTools.getAndClearRecentlyCreatedFlashcards();
        assertFalse(recentlyCreated.isEmpty());
        assertEquals("UE6", recentlyCreated.get(0).ueCode());
        assertEquals("Vd = Dose / C0 (volume virtuel)", recentlyCreated.get(0).hint());
    }

    @Test
    void testControllerFlashcardsEndpoints() {
        List<Flashcard> list = geminiAiController.getFlashcards(null, null, null);
        assertNotNull(list);
        assertFalse(list.isEmpty());

        HttpResponse<Flashcard> direct = geminiAiController.getFlashcard(list.get(0).id());
        assertNotNull(direct);
        assertEquals(list.get(0).id(), direct.body().id());
    }
}
