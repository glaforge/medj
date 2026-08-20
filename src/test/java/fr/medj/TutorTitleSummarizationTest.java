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
    }
}
