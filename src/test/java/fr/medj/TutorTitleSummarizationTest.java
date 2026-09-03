package fr.medj;

import io.micronaut.serde.ObjectMapper;
import fr.medj.service.FirestoreService;
import fr.medj.service.GeminiMedicalService;
import fr.medj.service.MedicalFlashcardTools;
import fr.medj.service.MedicalIllustrationTools;
import fr.medj.service.MedicalQcmTools;
import fr.medj.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class TutorTitleSummarizationTest {

    private GeminiMedicalService geminiMedicalService;

    @BeforeEach
    void setUp() {
        FirestoreService firestoreService = new FirestoreService();
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
    void testHeuristicTitleSummarization() {
        String q1 = "Bonjour, peux-tu m'expliquer le cycle de Krebs et la production d'ATP ?";
        String a1 = "Le cycle de Krebs se déroule dans la matrice mitochondriale et produit du NADH, FADH2 et GTP/ATP.";
        String t1 = geminiMedicalService.summarizeConversationTitle(q1, a1, "Bioénergétique mitochondriale");

        assertNotNull(t1);
        assertFalse(t1.toLowerCase().startsWith("bonjour"));
        assertFalse(t1.toLowerCase().startsWith("peux-tu"));
        assertTrue(t1.toLowerCase().contains("krebs") || t1.toLowerCase().contains("bioénergétique"));

        String q2 = "Crée-moi un QCM sur les récepteurs couplés aux protéines G (RCPG)";
        String t2 = geminiMedicalService.summarizeConversationTitle(q2, "Voici un QCM sur les RCPG...", "Pharmacologie");
        assertNotNull(t2);
        assertFalse(t2.toLowerCase().startsWith("crée-moi"));
        assertTrue(t2.toLowerCase().contains("récepteurs") || t2.toLowerCase().contains("rcpg"));

        String q3 = "Dessine-moi le coeur avec les cavités et valves";
        String t3 = geminiMedicalService.summarizeConversationTitle(q3, "Voici un schéma anatomique...", "Anatomie");
        assertNotNull(t3);
        assertFalse(t3.toLowerCase().startsWith("dessine-moi"));
        assertTrue(t3.toLowerCase().contains("coeur") || t3.toLowerCase().contains("cavité") || t3.toLowerCase().contains("valve"));
    }

    @Test
    void testLiveTitleSummarization() {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return;
        }
        geminiMedicalService.setApiKey(apiKey);
        geminiMedicalService.setModelName("gemini-3.8-flash");
        geminiMedicalService.init();

        String q = "Dessine-moi le coeur avec les cavités et valves";
        String a = "Voici un schéma anatomique des 4 cavités cardiaques...";
        String title = geminiMedicalService.summarizeConversationTitle(q, a, "Anatomie Cardiovasculaire");

        assertNotNull(title);
        assertFalse(title.isBlank());
        assertFalse(title.toLowerCase().startsWith("provide"), "Title should never start with English leak 'Provide'");
        assertFalse(title.toLowerCase().startsWith("here is"));
        assertTrue(title.length() >= 5);
        assertTrue(title.length() <= 80);
    }
}
