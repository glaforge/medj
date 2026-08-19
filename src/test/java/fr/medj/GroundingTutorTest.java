package fr.medj;

import fr.medj.model.AiTutorMessage;
import fr.medj.model.GroundingSource;
import fr.medj.service.FirestoreService;
import fr.medj.service.GeminiMedicalService;
import fr.medj.service.MedicalIllustrationTools;
import fr.medj.service.MedicalQcmTools;
import fr.medj.service.MedicalFlashcardTools;
import fr.medj.service.StorageService;
import io.micronaut.serde.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class GroundingTutorTest {

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
    void testGroundingSourceDomainExtraction() {
        GroundingSource source1 = new GroundingSource("Campus Anatomie", "https://unf3s.cerimes.fr/campus-pass/cours-1", null);
        assertEquals("unf3s.cerimes.fr", source1.domain());
        assertEquals("Campus Anatomie", source1.title());
        assertEquals("https://unf3s.cerimes.fr/campus-pass/cours-1", source1.uri());

        GroundingSource source2 = new GroundingSource("Académie de Médecine", "https://www.academie-medecine.fr/index.php", null);
        assertEquals("academie-medecine.fr", source2.domain());
    }

    @Test
    void testAskTutorReturnsGroundingSourcesInDemoFallback() {
        GeminiMedicalService.TutorResponse response = geminiMedicalService.askTutor(
            "Explique-moi les récepteurs nicotiniques",
            "UE6 Pharmacologie",
            List.of()
        );

        assertNotNull(response);
        assertNotNull(response.answer());
        assertNotNull(response.groundingSources());
        assertFalse(response.groundingSources().isEmpty());

        // Check grounding sources returned cleanly in structured list
        assertFalse(response.groundingSources().isEmpty());
        for (GroundingSource source : response.groundingSources()) {
            assertNotNull(source.uri());
            assertNotNull(source.domain());
        }
    }

    @Test
    void testAiTutorMessageGroundingSerialization() throws IOException {
        ObjectMapper objectMapper = ObjectMapper.getDefault();
        List<GroundingSource> sources = List.of(
            new GroundingSource("Site Médical", "https://pharmacomedicale.org/page1", "pharmacomedicale.org")
        );

        AiTutorMessage msg = new AiTutorMessage(
            "msg-123",
            "model",
            "Réponse médicale avec explications",
            "course-1",
            "Pharmacologie",
            LocalDateTime.now(),
            null,
            sources
        );

        String json = objectMapper.writeValueAsString(msg);
        assertNotNull(json);
        assertTrue(json.contains("groundingSources"));
        assertTrue(json.contains("pharmacomedicale.org"));
    }

    @Test
    void testLiveGoogleSearchGroundingWithLangChain4j() {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            System.out.println("Skipping live grounding test because GEMINI_API_KEY is not set.");
            return;
        }

        GeminiMedicalService service = new GeminiMedicalService(
            ObjectMapper.getDefault(),
            firestoreService,
            new MedicalQcmTools(firestoreService),
            new MedicalIllustrationTools(firestoreService, new StorageService("./build/test-uploads")),
            new MedicalFlashcardTools(firestoreService),
            new StorageService("./build/test-uploads")
        );
        service.setApiKey(apiKey);
        service.setModelName("gemini-3.7-flash");
        service.init();

        GeminiMedicalService.TutorResponse response = service.askTutor(
            "Quelles sont les dernières recommandations de la HAS pour le traitement de l'hypertension artérielle ?",
            "UE6 Pharmacologie",
            List.of()
        );

        System.out.println("Live tutor response answer: " + response.answer());
        for (GroundingSource src : response.groundingSources()) {
            System.out.println("Source: " + src.title() + " -> " + src.uri() + " (" + src.domain() + ")");
        }

        assertNotNull(response.answer());
        assertFalse(response.groundingSources().isEmpty(), "Grounding sources should not be empty with Google Search Grounding enabled");
    }

    @Test
    void testLivePdfScanWithGemini() throws Exception {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            System.out.println("Skipping live PDF scan test because GEMINI_API_KEY is not set.");
            return;
        }

        // Generate a simple PDF in memory
        org.apache.pdfbox.pdmodel.PDDocument doc = new org.apache.pdfbox.pdmodel.PDDocument();
        org.apache.pdfbox.pdmodel.PDPage page = new org.apache.pdfbox.pdmodel.PDPage();
        doc.addPage(page);
        org.apache.pdfbox.pdmodel.PDPageContentStream stream = new org.apache.pdfbox.pdmodel.PDPageContentStream(doc, page);
        stream.beginText();
        stream.setFont(new org.apache.pdfbox.pdmodel.font.PDType1Font(org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName.HELVETICA_BOLD), 14);
        stream.newLineAtOffset(50, 700);
        stream.showText("UE7 Sante Publique : Service Public d'Information en Sante (SPIS)");
        stream.endText();
        stream.close();

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        doc.save(baos);
        doc.close();
        byte[] pdfBytes = baos.toByteArray();

        GeminiMedicalService service = new GeminiMedicalService(
            ObjectMapper.getDefault(),
            firestoreService,
            new MedicalQcmTools(firestoreService),
            new MedicalIllustrationTools(firestoreService, new StorageService("./build/test-uploads")),
            new MedicalFlashcardTools(firestoreService),
            new StorageService("./build/test-uploads")
        );
        service.setApiKey(apiKey);
        service.setModelName("gemini-3.7-flash");
        service.init();

        fr.medj.model.HandwrittenScanResult result = service.scanHandwrittenNotes(
            pdfBytes,
            "application/pdf",
            "course-ue7-spis",
            "Service Public d'Information en Santé",
            "UE7"
        );

        System.out.println("Scan PDF result transcription: " + result.transcriptionMarkdown());
        System.out.println("Key points: " + result.keyPoints());

        assertNotNull(result);
        assertNotNull(result.transcriptionMarkdown());
        assertFalse(result.transcriptionMarkdown().contains("Innervation et Loges du Bras"), "Should NOT return the hardcoded anatomy fallback for a PDF upload!");
    }
}
