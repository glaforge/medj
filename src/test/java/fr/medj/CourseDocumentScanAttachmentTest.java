package fr.medj;

import fr.medj.controller.CourseController;
import fr.medj.controller.GeminiAiController;
import fr.medj.model.Course;
import fr.medj.model.HandwrittenScanResult;
import fr.medj.model.QcmQuestion;
import fr.medj.service.*;
import io.micronaut.core.io.buffer.ReadBufferFactory;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.http.multipart.FormFieldMetadata;
import io.micronaut.serde.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class CourseDocumentScanAttachmentTest {

    private FirestoreService firestoreService;
    private StorageService storageService;
    private GeminiMedicalService geminiMedicalService;
    private CourseController courseController;
    private GeminiAiController geminiAiController;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        firestoreService.seedSampleData();

        storageService = new StorageService("./build/test-storage-" + System.currentTimeMillis());

        JMethodEngineService jMethodEngineService = new JMethodEngineService(firestoreService);
        MedicalQcmTools medicalQcmTools = new MedicalQcmTools(firestoreService);
        MedicalIllustrationTools medicalIllustrationTools = new MedicalIllustrationTools(firestoreService, storageService);
        MedicalFlashcardTools medicalFlashcardTools = new MedicalFlashcardTools(firestoreService);
        ObjectMapper objectMapper = ObjectMapper.getDefault();

        geminiMedicalService = new GeminiMedicalService(
            objectMapper,
            firestoreService,
            medicalQcmTools,
            medicalIllustrationTools,
            medicalFlashcardTools,
            storageService
        );
        geminiMedicalService.init();

        courseController = new CourseController(firestoreService, jMethodEngineService, storageService);
        geminiAiController = new GeminiAiController(geminiMedicalService, firestoreService, storageService);
    }

    private CompletedFileUpload createCompletedFileUpload(String filename, String content, String contentType) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        return CompletedFileUpload.ofMemory(
            new FormFieldMetadata("file", filename, MediaType.of(contentType)),
            ReadBufferFactory.getJdkFactory().adapt(bytes)
        );
    }

    @Test
    void testDirectUploadAndAttachDocumentToCourse() throws IOException {
        String courseId = "course-ue5-07"; // Official Paris Cité course
        Optional<Course> courseBefore = firestoreService.getCourse(courseId);
        assertTrue(courseBefore.isPresent(), "Seed course should exist");
        int initialDocCount = courseBefore.get().documents() != null ? courseBefore.get().documents().size() : 0;

        // 1. Upload PDF document directly to the course
        CompletedFileUpload mockFile = createCompletedFileUpload("polycopie_anatomie_plexus.pdf", "%PDF-1.4 sample content", "application/pdf");
        HttpResponse<Course> response = courseController.uploadAndAttachDocument(courseId, mockFile, Optional.of("PDF"));

        assertEquals(200, response.status().getCode());
        Course updatedCourse = response.body();
        assertNotNull(updatedCourse);
        assertNotNull(updatedCourse.documents());
        assertEquals(initialDocCount + 1, updatedCourse.documents().size());

        Course.DocumentAttachment attached = updatedCourse.documents().get(updatedCourse.documents().size() - 1);
        assertEquals("polycopie_anatomie_plexus.pdf", attached.name());
        assertEquals("PDF", attached.fileType());
        assertTrue(attached.storageUrl().contains("/api/storage/"));
        assertTrue(attached.sizeBytes() > 0);

        // 2. Fetch fresh course from database
        Optional<Course> reloadedCourse = firestoreService.getCourse(courseId);
        assertTrue(reloadedCourse.isPresent());
        assertEquals(initialDocCount + 1, reloadedCourse.get().documents().size());

        // 3. Delete document attachment
        HttpResponse<Course> deleteRes = courseController.deleteDocumentAttachment(courseId, attached.id());
        assertEquals(200, deleteRes.status().getCode());
        Course afterDelete = deleteRes.body();
        assertNotNull(afterDelete);
        assertEquals(initialDocCount, afterDelete.documents().size());
    }

    @Test
    void testAttachExistingDocumentToCourse() {
        String courseId = "course-ue5-07";
        Course.DocumentAttachment attachment = new Course.DocumentAttachment(
            "doc-custom-123",
            "fiche_resume_muscles.pdf",
            "PDF",
            "/api/storage/fiche_resume_muscles.pdf",
            1024,
            LocalDateTime.now()
        );

        HttpResponse<Course> res = courseController.attachExistingDocument(courseId, attachment);
        assertEquals(200, res.status().getCode());
        Course updated = res.body();
        assertNotNull(updated);
        assertTrue(updated.documents().stream().anyMatch(d -> d.id().equals("doc-custom-123")));
    }

    @Test
    void testHandwrittenScanAttachesDocumentAndSavesScanToCourse() throws IOException {
        String courseId = "course-ue5-07";
        Course targetCourse = firestoreService.getCourse(courseId).orElseThrow();
        int initialDocCount = targetCourse.documents() != null ? targetCourse.documents().size() : 0;

        CompletedFileUpload scanFile = createCompletedFileUpload("fiche_manuscrite_nerf_median.png", "image_binary_data", "image/png");

        // Execute scan with target course
        HttpResponse<HandwrittenScanResult> scanResponse = geminiAiController.scanHandwritten(
            scanFile,
            Optional.of(courseId),
            Optional.of(targetCourse.title()),
            Optional.of(targetCourse.ueCode())
        );

        assertEquals(200, scanResponse.status().getCode());
        HandwrittenScanResult scanResult = scanResponse.body();
        assertNotNull(scanResult);
        assertEquals(courseId, scanResult.courseId());
        assertNotNull(scanResult.transcriptionMarkdown());
        assertTrue(scanResult.imageUrl().contains("/api/storage/"));

        // Verify document is attached to course
        Course refreshedCourse = firestoreService.getCourse(courseId).orElseThrow();
        assertNotNull(refreshedCourse.documents());
        assertEquals(initialDocCount + 1, refreshedCourse.documents().size());
        Course.DocumentAttachment doc = refreshedCourse.documents().get(refreshedCourse.documents().size() - 1);
        assertEquals("fiche_manuscrite_nerf_median.png", doc.name());
        assertEquals("FICHES_MANUSCRITE", doc.fileType());

        // Verify scan can be retrieved for this course
        List<HandwrittenScanResult> courseScans = geminiAiController.getScans(Optional.of(courseId));
        assertFalse(courseScans.isEmpty());
        assertTrue(courseScans.stream().anyMatch(s -> s.courseId().equals(courseId)));

        // Verify scan deletion
        HttpResponse<Void> delRes = geminiAiController.deleteScan(scanResult.id());
        assertEquals(204, delRes.status().getCode());
        assertTrue(firestoreService.getScan(scanResult.id()).isEmpty());
    }

    @Test
    void testAnnaleScanAttachesDocumentAndProducesQcms() throws IOException {
        String courseId = "course-ue5-07";
        Course targetCourse = firestoreService.getCourse(courseId).orElseThrow();
        int initialDocCount = targetCourse.documents() != null ? targetCourse.documents().size() : 0;

        CompletedFileUpload annaleFile = createCompletedFileUpload("concours_blanc_ue5_2025.pdf", "%PDF annale content", "application/pdf");

        HttpResponse<List<QcmQuestion>> annaleResponse = geminiAiController.scanAnnale(
            annaleFile,
            Optional.of(courseId),
            Optional.of(targetCourse.title()),
            Optional.of(targetCourse.ueCode())
        );

        assertEquals(200, annaleResponse.status().getCode());
        List<QcmQuestion> qcms = annaleResponse.body();
        assertNotNull(qcms);
        assertFalse(qcms.isEmpty());

        // Verify document attachment on course
        Course refreshedCourse = firestoreService.getCourse(courseId).orElseThrow();
        assertNotNull(refreshedCourse.documents());
        assertEquals(initialDocCount + 1, refreshedCourse.documents().size());
        Course.DocumentAttachment doc = refreshedCourse.documents().get(refreshedCourse.documents().size() - 1);
        assertEquals("concours_blanc_ue5_2025.pdf", doc.name());
        assertEquals("PDF", doc.fileType());
    }

    @Test
    void testCaseInsensitiveAndTrimmedCourseLookup() {
        Optional<Course> courseUpper = firestoreService.getCourse("COURSE-UE5-07");
        assertTrue(courseUpper.isPresent(), "Case-insensitive lookup should succeed");
        assertEquals("course-ue5-07", courseUpper.get().id());

        Optional<Course> courseTrimmed = firestoreService.getCourse("  course-ue5-07  ");
        assertTrue(courseTrimmed.isPresent(), "Trimmed lookup should succeed");

        Optional<Course> nonExistent = firestoreService.getCourse("non-existent-course-999");
        assertTrue(nonExistent.isEmpty());
    }
}
