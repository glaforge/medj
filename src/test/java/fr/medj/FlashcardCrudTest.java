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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class FlashcardCrudTest {

    private FirestoreService firestoreService;
    private MedicalFlashcardTools medicalFlashcardTools;
    private GeminiAiController geminiAiController;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        firestoreService.seedSampleData();
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
        List<Flashcard> favOnly = geminiAiController.getFlashcards(null, null, Optional.of(true));
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

    @Test
    void testResetFlashcardReviewsTargetedAndGlobal() {
        List<Flashcard> list = firestoreService.getAllFlashcards();
        assertTrue(list.size() >= 2);
        String id1 = list.get(0).id();
        String id2 = list.get(1).id();

        geminiAiController.recordFlashcardReview(id1, new GeminiAiController.ReviewFlashcardRequest("GOOD"));
        geminiAiController.recordFlashcardReview(id2, new GeminiAiController.ReviewFlashcardRequest("EASY"));

        assertNotNull(firestoreService.getFlashcard(id1).orElseThrow().lastReviewedAt());
        assertNotNull(firestoreService.getFlashcard(id2).orElseThrow().lastReviewedAt());

        var targetedResp = geminiAiController.resetFlashcardReviews(
            new GeminiAiController.ResetFlashcardReviewsRequest(List.of(id1))
        );
        assertEquals(1, targetedResp.body().get("resetCount"));
        assertNull(firestoreService.getFlashcard(id1).orElseThrow().lastReviewedAt());
        assertEquals(1, firestoreService.getFlashcard(id1).orElseThrow().reviewCount());
        assertNotNull(firestoreService.getFlashcard(id2).orElseThrow().lastReviewedAt());

        var globalResp = geminiAiController.resetFlashcardReviews(null);
        assertTrue(((Number) globalResp.body().get("resetCount")).intValue() >= 1);
        assertNull(firestoreService.getFlashcard(id2).orElseThrow().lastReviewedAt());
    }

    @Test
    void testFlashcardFrontAndBackPhotosWithOptionalText() {
        Flashcard imageOnlyFrontInput = new Flashcard(
            null,
            "course-ue5-bras",
            "Anatomie du bras",
            "UE5",
            "ue5",
            "",
            "1. Nerf médian — 2. Artère brachiale",
            "Coupe transversale du bras",
            4,
            false,
            List.of("UE5", "Schéma"),
            0,
            null,
            null,
            List.of("/api/storage/schema-muet-1.png", "/api/storage/schema-muet-2.png"),
            List.of("/api/storage/schema-legende.png")
        );

        HttpResponse<Flashcard> createResp = geminiAiController.createFlashcard(imageOnlyFrontInput);
        Flashcard saved = createResp.body();
        assertNotNull(saved);
        assertEquals("", saved.front(), "Empty front text must be allowed when frontImages are attached");
        assertEquals(List.of("/api/storage/schema-muet-1.png", "/api/storage/schema-muet-2.png"), saved.frontImages());
        assertEquals(List.of("/api/storage/schema-legende.png"), saved.backImages());

        // Ensure toggleFavorite, recordReview, and resetFlashcardReviews preserve photos
        Flashcard afterFav = geminiAiController.toggleFlashcardFavorite(saved.id()).body();
        assertNotNull(afterFav);
        assertTrue(afterFav.isFavorite());
        assertEquals(2, afterFav.frontImages().size());
        assertEquals(1, afterFav.backImages().size());

        Flashcard afterReview = geminiAiController.recordFlashcardReview(
            saved.id(),
            new GeminiAiController.ReviewFlashcardRequest("GOOD")
        ).body();
        assertNotNull(afterReview);
        assertEquals(2, afterReview.frontImages().size());
        assertEquals(1, afterReview.backImages().size());

        geminiAiController.resetFlashcardReviews(
            new GeminiAiController.ResetFlashcardReviewsRequest(List.of(saved.id()))
        );
        Flashcard afterReset = firestoreService.getFlashcard(saved.id()).orElseThrow();
        assertEquals(2, afterReset.frontImages().size());
        assertEquals(1, afterReset.backImages().size());

        // Update images (remove one front image, add a second back image)
        Flashcard updatePayload = new Flashcard(
            saved.id(),
            saved.courseId(),
            saved.courseTitle(),
            saved.ueCode(),
            saved.ueId(),
            "Identifiez les éléments fléchés :",
            saved.back(),
            saved.hint(),
            saved.difficulty(),
            true,
            saved.tags(),
            saved.reviewCount(),
            saved.lastReviewedAt(),
            saved.createdAt(),
            List.of("/api/storage/schema-muet-1.png"),
            List.of("/api/storage/schema-legende.png", "/api/storage/zoom-histologie.jpg")
        );
        Flashcard updated = geminiAiController.updateFlashcard(saved.id(), updatePayload).body();
        assertNotNull(updated);
        assertEquals(1, updated.frontImages().size());
        assertEquals(2, updated.backImages().size());
    }
}
