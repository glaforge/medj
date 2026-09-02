package fr.medj;

import fr.medj.model.*;
import fr.medj.service.*;
import io.micronaut.serde.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CourseKnowledgeBaseServiceTest {

    private FirestoreService firestoreService;
    private StorageService storageService;
    private CourseKnowledgeBaseService knowledgeBaseService;
    private GeminiMedicalService geminiMedicalService;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        storageService = new StorageService("./build/test-knowledge-uploads");
        knowledgeBaseService = new CourseKnowledgeBaseService(firestoreService, storageService);

        MedicalQcmTools qcmTools = new MedicalQcmTools(firestoreService);
        MedicalIllustrationTools illusTools = new MedicalIllustrationTools(firestoreService, storageService);
        MedicalFlashcardTools fcTools = new MedicalFlashcardTools(firestoreService);

        geminiMedicalService = new GeminiMedicalService(
            ObjectMapper.getDefault(),
            firestoreService,
            qcmTools,
            illusTools,
            fcTools,
            storageService,
            knowledgeBaseService
        );
        geminiMedicalService.init();
    }

    private byte[] createSamplePdf(String sampleText) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText(sampleText);
                stream.endText();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    @Test
    void testGetKnowledgeSources_ListsNotesPdfsAndScans() throws IOException {
        String courseId = "course-kb-test-1";

        // Store a PDF
        byte[] pdfBytes = createSamplePdf("UE5 Anatomie: Le plexus brachial est compose des racines C5 a T1.");
        String storageUrl = storageService.storeFile("plexus_brachial.pdf", "application/pdf", new ByteArrayInputStream(pdfBytes));

        Course course = new Course(
            courseId,
            "ue5",
            "UE5",
            "Plexus Brachial et Membre Superieur",
            "#0284c7",
            "Dr. Anatomie",
            LocalDate.now(),
            3,
            "EN_COURS",
            List.of("Anatomie", "UE5"),
            "Notes etudiantes : Le nerf radial chemine dans la gouttiere radiale.",
            List.of(
                new Course.DocumentAttachment(
                    "doc-pdf-1",
                    "plexus_brachial.pdf",
                    "PDF",
                    storageUrl,
                    pdfBytes.length,
                    LocalDateTime.now()
                )
            ),
            List.of(0, 1, 3, 7, 14, 30),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveCourse(course);

        // Add a scan
        HandwrittenScanResult scan = new HandwrittenScanResult(
            "scan-1",
            courseId,
            course.title(),
            "/api/storage/fiche1.png",
            List.of("/api/storage/fiche1.png"),
            "# Fiche Rapide : Fente humero-tricipitale et nerf radial",
            List.of("Le nerf musculocutane perfore le coraco-brachial"),
            List.of("Coraco-brachial", "Biceps brachial"),
            List.of("3 troncs primaires", "5 branches terminales"),
            List.of("Inversion classique fente humero-tricipitale vs scapulo-tricipitale"),
            List.of("Mnemonic: MARMU"),
            List.of(),
            LocalDateTime.now()
        );
        firestoreService.saveScan(scan);

        // Inspect sources
        CourseKnowledgeSourcesResponse resp = knowledgeBaseService.getKnowledgeSources(courseId);
        assertNotNull(resp);
        assertEquals(courseId, resp.courseId());
        assertEquals(3, resp.totalCount());

        assertTrue(resp.sources().stream().anyMatch(s -> "notes".equals(s.id()) && "NOTES".equals(s.type())));
        assertTrue(resp.sources().stream().anyMatch(s -> "doc-pdf-1".equals(s.id()) && "PDF".equals(s.type())));
        assertTrue(resp.sources().stream().anyMatch(s -> "scan-1".equals(s.id()) && "SCAN".equals(s.type())));
    }

    @Test
    void testBuildKnowledgeBase_GranularSelection() throws IOException {
        String courseId = "course-kb-test-2";

        byte[] pdfBytes = createSamplePdf("UE6 Pharmacologie: Biodisponibilite et Clairance renale.");
        String storageUrl = storageService.storeFile("pharmacocinetique.pdf", "application/pdf", new ByteArrayInputStream(pdfBytes));

        Course course = new Course(
            courseId,
            "ue6",
            "UE6",
            "Pharmacocinetique Generale",
            "#10b981",
            "Pr. Pharma",
            LocalDate.now(),
            4,
            "EN_COURS",
            List.of("Pharma"),
            "Notes perso : Volume de distribution Vd = D / C0.",
            List.of(
                new Course.DocumentAttachment(
                    "doc-pdf-pharma",
                    "pharmacocinetique.pdf",
                    "PDF",
                    storageUrl,
                    pdfBytes.length,
                    LocalDateTime.now()
                )
            ),
            List.of(0, 1, 3, 7, 14, 30),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveCourse(course);

        HandwrittenScanResult scan = new HandwrittenScanResult(
            "scan-pharma",
            courseId,
            course.title(),
            "/api/storage/pharma_scan.png",
            List.of("/api/storage/pharma_scan.png"),
            "# Fiche : Demi-vie d'elimination T1/2",
            List.of("T1/2 = ln(2) * Vd / CL"),
            List.of("Clairance", "Vd"),
            List.of("ln(2) = 0.693"),
            List.of("Piege sur clairance vs demi-vie"),
            List.of(),
            List.of(),
            LocalDateTime.now()
        );
        firestoreService.saveScan(scan);

        // Case 1: Select only notes
        CourseKnowledgeBaseService.CourseKnowledgeBase kbNotes = knowledgeBaseService.buildKnowledgeBase(
            courseId,
            List.of("notes"),
            true, true, true,
            null
        );
        assertTrue(kbNotes.hasContent());
        assertTrue(kbNotes.formattedContent().contains("Volume de distribution Vd = D / C0"));
        assertFalse(kbNotes.formattedContent().contains("Biodisponibilite"));
        assertFalse(kbNotes.formattedContent().contains("Demi-vie d'elimination"));
        assertEquals(1, kbNotes.sourcesUsed().size());

        // Case 2: Select only PDF
        CourseKnowledgeBaseService.CourseKnowledgeBase kbPdf = knowledgeBaseService.buildKnowledgeBase(
            courseId,
            List.of("doc-pdf-pharma"),
            true, true, true,
            null
        );
        assertTrue(kbPdf.hasContent());
        assertTrue(kbPdf.formattedContent().contains("Biodisponibilite"));
        assertFalse(kbPdf.formattedContent().contains("Volume de distribution Vd = D / C0"));
        assertFalse(kbPdf.formattedContent().contains("Demi-vie d'elimination"));
        assertEquals(1, kbPdf.sourcesUsed().size());

        // Case 3: Select only Scan
        CourseKnowledgeBaseService.CourseKnowledgeBase kbScan = knowledgeBaseService.buildKnowledgeBase(
            courseId,
            List.of("scan-pharma"),
            true, true, true,
            null
        );
        assertTrue(kbScan.hasContent());
        assertTrue(kbScan.formattedContent().contains("Demi-vie d'elimination"));
        assertTrue(kbScan.formattedContent().contains("Piege sur clairance"));
        assertFalse(kbScan.formattedContent().contains("Volume de distribution"));
        assertEquals(1, kbScan.sourcesUsed().size());

        // Case 4: Select all
        CourseKnowledgeBaseService.CourseKnowledgeBase kbAll = knowledgeBaseService.buildKnowledgeBase(
            courseId,
            null, // null = all allowed
            true, true, true,
            "Insister sur la clairance totale"
        );
        assertTrue(kbAll.hasContent());
        assertTrue(kbAll.formattedContent().contains("Volume de distribution"));
        assertTrue(kbAll.formattedContent().contains("Biodisponibilite"));
        assertTrue(kbAll.formattedContent().contains("Demi-vie d'elimination"));
        assertTrue(kbAll.formattedContent().contains("Insister sur la clairance totale"));
        assertEquals(3, kbAll.sourcesUsed().size());
    }

    @Test
    void testPdfBoxTextExtraction() throws IOException {
        String original = "Biophysique PASS: Equation de Nernst et potentiel de membrane.";
        byte[] pdf = createSamplePdf(original);
        String extracted = knowledgeBaseService.extractTextFromPdf(pdf, 10);
        assertNotNull(extracted);
        assertTrue(extracted.contains("Biophysique PASS"));
        assertTrue(extracted.contains("Equation de Nernst"));
    }

    @Test
    void testGenerateQcmAndFlashcardWithKnowledgeBaseFallback() {
        String courseId = "course-demo-biochimie";
        Course course = new Course(
            courseId,
            "ue1",
            "UE1",
            "Biochimie : Cycle de Krebs",
            "#ec4899",
            "Pr. Bioch",
            LocalDate.now(),
            3,
            "EN_COURS",
            List.of("Biochimie"),
            "Cycle de Krebs se deroule dans la matrice mitochondriale. Bilan : 3 NADH, 1 FADH2, 1 GTP par tour.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveCourse(course);

        // Generate QCMs using knowledge base
        List<QcmQuestion> qcms = geminiMedicalService.generatePassQcm(
            courseId,
            course.title(),
            course.ueCode(),
            null, // content is null, should be filled from knowledge base
            3,
            List.of("notes"),
            true, false, false
        );
        assertNotNull(qcms);
        assertEquals(3, qcms.size());
        assertEquals(courseId, qcms.get(0).courseId());

        // Generate Flashcards using knowledge base
        List<Flashcard> cards = geminiMedicalService.generateFlashcards(
            courseId,
            course.title(),
            course.ueCode(),
            course.ueId(),
            null,
            5,
            List.of("notes"),
            true, false, false
        );
        assertNotNull(cards);
        assertFalse(cards.isEmpty());
        assertEquals(courseId, cards.get(0).courseId());
    }
}
