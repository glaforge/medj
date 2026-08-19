package fr.medj;

import fr.medj.model.ItemVerification;
import fr.medj.model.QcmItem;
import fr.medj.model.QcmQuestion;
import fr.medj.model.QcmVerificationResult;
import fr.medj.service.FirestoreService;
import fr.medj.service.GeminiMedicalService;
import fr.medj.service.MedicalIllustrationTools;
import fr.medj.service.MedicalQcmTools;
import fr.medj.service.StorageService;
import io.micronaut.serde.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class QcmVerificationTest {

    private GeminiMedicalService geminiMedicalService;
    private FirestoreService firestoreService;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        MedicalQcmTools medicalQcmTools = new MedicalQcmTools(firestoreService);
        StorageService storageService = new StorageService("./build/test-uploads");
        MedicalIllustrationTools medicalIllustrationTools = new MedicalIllustrationTools(firestoreService, storageService);
        ObjectMapper objectMapper = ObjectMapper.getDefault();
        geminiMedicalService = new GeminiMedicalService(objectMapper, firestoreService, medicalQcmTools, medicalIllustrationTools, storageService);
        geminiMedicalService.init();
    }

    @Test
    void testVerifyQcmFallbackReturnsValidVerificationResult() {
        QcmQuestion sampleQcm = new QcmQuestion(
            "qcm-test-1",
            "course-ue6",
            "Pharmacocinétique",
            "UE6",
            "Concernant les voies d'administration et la biodisponibilité :",
            List.of(
                new QcmItem("A", "La voie intraveineuse permet une biodisponibilité de 100%.", true, "VRAI", false, ""),
                new QcmItem("B", "Le premier passage hépatique s'applique à la voie sublinguale.", false, "FAUX", true, "Piège sublingual"),
                new QcmItem("C", "Le volume de distribution est un volume réel.", false, "FAUX", false, ""),
                new QcmItem("D", "La clairance totale est constante en cinétique d'ordre 1.", true, "VRAI", false, ""),
                new QcmItem("E", "L'inhibition enzymatique augmente la demi-vie du médicament substrat.", true, "VRAI", false, "")
            ),
            3,
            "MANUEL",
            "2025",
            List.of("Pharmacocinétique"),
            List.of("Moyen mnémotechnique"),
            LocalDateTime.now()
        );

        QcmVerificationResult result = geminiMedicalService.verifyAndFactCheckQcm(sampleQcm);

        assertNotNull(result);
        assertEquals("qcm-test-1", result.qcmId());
        assertNotNull(result.summary());
        assertNotNull(result.itemVerifications());
        assertEquals(5, result.itemVerifications().size());
        assertNotNull(result.groundingSources());
        assertFalse(result.groundingSources().isEmpty());
    }

    @Test
    void testVerificationSerialization() throws Exception {
        ObjectMapper objectMapper = ObjectMapper.getDefault();
        QcmVerificationResult result = new QcmVerificationResult(
            "qcm-test-2",
            false,
            "Erreur détectée sur l'item B",
            1,
            List.of(
                new ItemVerification("A", true, true, false, "Correct", "A text", "A expl"),
                new ItemVerification("B", true, false, true, "Inversion Vrai/Faux", "B text", "B expl")
            ),
            null,
            List.of()
        );

        String json = objectMapper.writeValueAsString(result);
        assertNotNull(json);
        assertTrue(json.contains("qcm-test-2"));
        assertTrue(json.contains("errorCount"));
        assertTrue(json.contains("itemVerifications"));

        QcmVerificationResult deserialized = objectMapper.readValue(json, QcmVerificationResult.class);
        assertEquals("qcm-test-2", deserialized.qcmId());
        assertFalse(deserialized.isAccurate());
        assertEquals(1, deserialized.errorCount());
        assertEquals(2, deserialized.itemVerifications().size());
    }
}
