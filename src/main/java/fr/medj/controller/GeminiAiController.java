package fr.medj.controller;

import fr.medj.model.*;
import fr.medj.service.FirestoreService;
import fr.medj.service.GeminiMedicalService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.serde.annotation.Serdeable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;

@Secured(SecurityRule.IS_ANONYMOUS)
@Controller("/api/gemini")
public class GeminiAiController {
    private static final Logger LOG = LoggerFactory.getLogger(GeminiAiController.class);

    private final GeminiMedicalService geminiMedicalService;
    private final FirestoreService firestoreService;
    private final fr.medj.service.StorageService storageService;

    public GeminiAiController(
        GeminiMedicalService geminiMedicalService,
        FirestoreService firestoreService,
        fr.medj.service.StorageService storageService
    ) {
        this.geminiMedicalService = geminiMedicalService;
        this.firestoreService = firestoreService;
        this.storageService = storageService;
    }

    @Serdeable
    public record GenerateQcmRequest(
        String courseId,
        String courseTitle,
        String ueCode,
        String content,
        int count
    ) {}

    @Post("/generate-qcm")
    public HttpResponse<List<QcmQuestion>> generateQcm(@Body GenerateQcmRequest request) {
        if (request == null || request.content() == null || request.content().isBlank()) {
            return HttpResponse.badRequest();
        }

        List<QcmQuestion> qcms = geminiMedicalService.generatePassQcm(
            request.courseId() != null ? request.courseId() : "course-custom",
            request.courseTitle() != null ? request.courseTitle() : "Cours de Médecine PASS",
            request.ueCode() != null ? request.ueCode() : "UE",
            request.content(),
            request.count() > 0 ? request.count() : 3
        );

        return HttpResponse.ok(qcms);
    }

    @Post(value = "/scan-annale", consumes = MediaType.MULTIPART_FORM_DATA)
    public HttpResponse<List<QcmQuestion>> scanAnnale(
        CompletedFileUpload file,
        @QueryValue Optional<String> courseId,
        @QueryValue Optional<String> courseTitle,
        @QueryValue Optional<String> ueCode
    ) {
        try {
            if (file == null) {
                return HttpResponse.badRequest();
            }
            byte[] bytes = file.getBytes();
            String mimeType = detectMimeType(file, bytes);
            String filename = (file.getFilename() != null && !file.getFilename().isBlank()) ? file.getFilename() : "scan_annale.pdf";

            String storageUrl = storageService.storeFile(filename, mimeType, new java.io.ByteArrayInputStream(bytes));
            LOG.info("Received and stored annale file upload: name='{}', size={} bytes, storageUrl='{}'",
                filename, bytes.length, storageUrl);

            Optional<Course> matchedCourse = courseId.flatMap(firestoreService::getCourse);
            String effectiveCourseId = matchedCourse.map(Course::id).or(() -> courseId).orElse("course-annale");
            String effectiveCourseTitle = matchedCourse.map(Course::title).or(() -> courseTitle).orElse("Annale Concours Blanc");
            String effectiveUeCode = matchedCourse.map(Course::ueCode).or(() -> ueCode).orElse("UE5");

            // Attach document to course if targetCourseId is specified
            matchedCourse.ifPresent(c -> {
                List<Course.DocumentAttachment> docs = new ArrayList<>(c.documents() != null ? c.documents() : List.of());
                docs.add(new Course.DocumentAttachment(
                    "doc-" + UUID.randomUUID(),
                    filename,
                    mimeType.contains("pdf") ? "PDF" : "QCM_SCAN",
                    storageUrl,
                    bytes.length,
                    LocalDateTime.now()
                ));
                Course updated = new Course(
                    c.id(), c.ueId(), c.ueCode(), c.title(), c.color(), c.professor(),
                    c.taughtDate(), c.difficulty(), c.status(), c.tags(), c.notes(),
                    docs, c.customIntervals(), c.createdAt(), LocalDateTime.now()
                );
                firestoreService.saveCourse(updated);
                LOG.info("Attached annale document '{}' to course '{}' ([{}])", filename, c.id(), c.title());
            });

            List<QcmQuestion> scanned = geminiMedicalService.scanExistingQcmAnnales(
                bytes,
                mimeType,
                effectiveCourseId,
                effectiveCourseTitle,
                effectiveUeCode
            );

            return HttpResponse.ok(scanned);
        } catch (IOException e) {
            LOG.error("Failed to read file for annale scan: {}", e.getMessage(), e);
            return HttpResponse.serverError();
        }
    }

    @Post(value = "/scan-handwritten", consumes = MediaType.MULTIPART_FORM_DATA)
    public HttpResponse<HandwrittenScanResult> scanHandwritten(
        CompletedFileUpload file,
        @QueryValue Optional<String> courseId,
        @QueryValue Optional<String> courseTitle,
        @QueryValue Optional<String> ueCode
    ) {
        try {
            if (file == null) {
                return HttpResponse.badRequest();
            }
            byte[] bytes = file.getBytes();
            String mimeType = detectMimeType(file, bytes);
            String filename = (file.getFilename() != null && !file.getFilename().isBlank()) ? file.getFilename() : "fiche_scan.pdf";

            String storageUrl = storageService.storeFile(filename, mimeType, new java.io.ByteArrayInputStream(bytes));
            LOG.info("Received and stored handwritten scan upload: name='{}', size={} bytes, storageUrl='{}'",
                filename, bytes.length, storageUrl);

            Optional<Course> matchedCourse = courseId.flatMap(firestoreService::getCourse);
            String effectiveCourseId = matchedCourse.map(Course::id).or(() -> courseId).orElse("course-scan");
            String effectiveCourseTitle = matchedCourse.map(Course::title).or(() -> courseTitle).orElse("Fiche de Révision Manuscrite");
            String effectiveUeCode = matchedCourse.map(Course::ueCode).or(() -> ueCode).orElse("UE");

            // Attach document to course if targetCourseId is specified
            matchedCourse.ifPresent(c -> {
                List<Course.DocumentAttachment> docs = new ArrayList<>(c.documents() != null ? c.documents() : List.of());
                docs.add(new Course.DocumentAttachment(
                    "doc-" + UUID.randomUUID(),
                    filename,
                    mimeType.contains("pdf") ? "PDF" : "FICHES_MANUSCRITE",
                    storageUrl,
                    bytes.length,
                    LocalDateTime.now()
                ));
                Course updated = new Course(
                    c.id(), c.ueId(), c.ueCode(), c.title(), c.color(), c.professor(),
                    c.taughtDate(), c.difficulty(), c.status(), c.tags(), c.notes(),
                    docs, c.customIntervals(), c.createdAt(), LocalDateTime.now()
                );
                firestoreService.saveCourse(updated);
                LOG.info("Attached handwritten document '{}' to course '{}' ([{}])", filename, c.id(), c.title());
            });

            HandwrittenScanResult result = geminiMedicalService.scanHandwrittenNotes(
                bytes,
                mimeType,
                effectiveCourseId,
                effectiveCourseTitle,
                effectiveUeCode
            );

            // Ensure scan result contains the real storage URL and effective course information
            if (result != null) {
                HandwrittenScanResult withUrl = new HandwrittenScanResult(
                    result.id(),
                    effectiveCourseId,
                    effectiveCourseTitle,
                    storageUrl,
                    result.transcriptionMarkdown(),
                    result.keyPoints(),
                    result.anatomicalTerms(),
                    result.keyFiguresAndValues(),
                    result.potentialExamTraps(),
                    result.mnemonics(),
                    result.generatedQcms(),
                    result.scannedAt()
                );
                firestoreService.saveScan(withUrl);
                return HttpResponse.ok(withUrl);
            }

            return HttpResponse.ok(result);
        } catch (IOException e) {
            LOG.error("Failed to read file for handwritten scan: {}", e.getMessage(), e);
            return HttpResponse.serverError();
        }
    }

    private static String detectMimeType(CompletedFileUpload file, byte[] bytes) {
        String filename = (file != null && file.getFilename() != null) ? file.getFilename().toLowerCase().trim() : "";

        // 1. Filename extensions (highest precision)
        if (filename.endsWith(".pdf")) return "application/pdf";
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
        if (filename.endsWith(".webp")) return "image/webp";
        if (filename.endsWith(".heic")) return "image/heic";
        if (filename.endsWith(".heif")) return "image/heif";

        // 2. Magic bytes inspection
        if (bytes != null && bytes.length >= 4) {
            if (bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F') {
                return "application/pdf";
            }
            if (bytes.length >= 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
                return "image/png";
            }
            if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8) {
                return "image/jpeg";
            }
            if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F') {
                return "image/webp";
            }
        }

        // 3. HTTP Header Content-Type if available and valid
        if (file != null && file.getContentType().isPresent()) {
            String ct = file.getContentType().get().getName();
            if (ct != null && !ct.isBlank() && !"application/octet-stream".equalsIgnoreCase(ct)) {
                return ct;
            }
        }

        return "application/pdf";
    }

    @Get("/tutor/threads")
    public List<TutorConversationThread> getTutorThreads() {
        return firestoreService.getAllTutorThreads();
    }

    @Get("/tutor/threads/{id}")
    public HttpResponse<TutorConversationThread> getTutorThread(@PathVariable String id) {
        return firestoreService.getTutorThread(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Serdeable
    public record CreateThreadRequest(
        String title,
        String courseId,
        String courseTitle,
        String ueCode
    ) {}

    @Post("/tutor/threads")
    public HttpResponse<TutorConversationThread> createTutorThread(@Body CreateThreadRequest request) {
        String title = (request != null && request.title() != null && !request.title().isBlank())
            ? request.title()
            : (request != null && request.courseTitle() != null ? "Discussion : " + request.courseTitle() : "Nouvelle conversation");

        TutorConversationThread thread = new TutorConversationThread(
            "thread-" + UUID.randomUUID(),
            title,
            request != null ? request.courseId() : null,
            request != null ? request.courseTitle() : null,
            request != null ? request.ueCode() : null,
            new ArrayList<>(),
            LocalDateTime.now(),
            LocalDateTime.now()
        );
        firestoreService.saveTutorThread(thread);
        return HttpResponse.created(thread);
    }

    @Delete("/tutor/threads/{id}")
    public HttpResponse<Void> deleteTutorThread(@PathVariable String id) {
        if (firestoreService.deleteTutorThread(id)) {
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    @Serdeable
    public record AskTutorRequest(
        String threadId,
        String question,
        String courseContext,
        String courseId,
        String courseTitle
    ) {}

    @Post("/tutor")
    public HttpResponse<Map<String, Object>> askTutor(@Body AskTutorRequest request) {
        if (request == null || request.question() == null || request.question().isBlank()) {
            return HttpResponse.badRequest();
        }

        String threadId = request.threadId();
        TutorConversationThread thread = null;
        List<AiTutorMessage> history = new ArrayList<>();

        if (threadId != null && !threadId.isBlank()) {
            Optional<TutorConversationThread> threadOpt = firestoreService.getTutorThread(threadId);
            if (threadOpt.isPresent()) {
                thread = threadOpt.get();
                if (thread.messages() != null) {
                    history.addAll(thread.messages());
                }
            }
        }

        AiTutorMessage userMsg = new AiTutorMessage(
            "msg-" + UUID.randomUUID(),
            "user",
            request.question(),
            request.courseId(),
            request.courseTitle(),
            LocalDateTime.now()
        );

        GeminiMedicalService.TutorResponse tutorResponse = geminiMedicalService.askTutor(
            request.question(),
            request.courseContext(),
            request.courseId(),
            request.courseTitle(),
            history
        );

        AiTutorMessage modelMsg = new AiTutorMessage(
            "msg-" + UUID.randomUUID(),
            "model",
            tutorResponse.answer(),
            request.courseId(),
            request.courseTitle(),
            LocalDateTime.now(),
            tutorResponse.createdQcm(),
            tutorResponse.createdIllustration(),
            tutorResponse.createdFlashcard(),
            tutorResponse.groundingSources()
        );

        List<AiTutorMessage> updatedMessages = new ArrayList<>(history);
        updatedMessages.add(userMsg);
        updatedMessages.add(modelMsg);

        if (thread == null) {
            String title = request.question().trim();
            if (title.length() > 50) {
                title = title.substring(0, 47) + "...";
            }
            thread = new TutorConversationThread(
                threadId != null && !threadId.isBlank() ? threadId : "thread-" + UUID.randomUUID(),
                title,
                request.courseId(),
                request.courseTitle(),
                null,
                updatedMessages,
                LocalDateTime.now(),
                LocalDateTime.now()
            );
        } else {
            String title = thread.title();
            if ("Nouvelle conversation".equalsIgnoreCase(title) || title.startsWith("Discussion :")) {
                String q = request.question().trim();
                title = q.length() > 50 ? q.substring(0, 47) + "..." : q;
            }
            thread = new TutorConversationThread(
                thread.id(),
                title,
                thread.courseId() != null ? thread.courseId() : request.courseId(),
                thread.courseTitle() != null ? thread.courseTitle() : request.courseTitle(),
                thread.ueCode(),
                updatedMessages,
                thread.createdAt(),
                LocalDateTime.now()
            );
        }

        firestoreService.saveTutorThread(thread);
        firestoreService.addTutorMessage(userMsg);
        firestoreService.addTutorMessage(modelMsg);

        Map<String, Object> response = new HashMap<>();
        response.put("answer", tutorResponse.answer());
        response.put("createdQcm", tutorResponse.createdQcm());
        response.put("createdIllustration", tutorResponse.createdIllustration());
        response.put("createdFlashcard", tutorResponse.createdFlashcard());
        response.put("groundingSources", tutorResponse.groundingSources());
        response.put("messageId", modelMsg.id());
        response.put("threadId", thread.id());
        response.put("timestamp", modelMsg.timestamp());

        return HttpResponse.ok(response);
    }

    @Get("/qcms")
    public List<QcmQuestion> getQcms(@QueryValue Optional<String> courseId) {
        if (courseId.isPresent() && !courseId.get().isBlank()) {
            return firestoreService.getQcmsForCourse(courseId.get());
        }
        return firestoreService.getAllQcms();
    }

    @Get("/qcms/{id}")
    public HttpResponse<QcmQuestion> getQcm(@PathVariable String id) {
        return firestoreService.getQcm(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Post("/qcms/{id}/verify")
    public HttpResponse<QcmVerificationResult> verifyQcmById(@PathVariable String id) {
        Optional<QcmQuestion> qcmOpt = firestoreService.getQcm(id);
        if (qcmOpt.isEmpty()) {
            return HttpResponse.notFound();
        }
        QcmVerificationResult result = geminiMedicalService.verifyAndFactCheckQcm(qcmOpt.get());
        return HttpResponse.ok(result);
    }

    @Post("/verify-qcm")
    public HttpResponse<QcmVerificationResult> verifyQcm(@Body QcmQuestion qcm) {
        if (qcm == null) {
            return HttpResponse.badRequest();
        }
        QcmVerificationResult result = geminiMedicalService.verifyAndFactCheckQcm(qcm);
        return HttpResponse.ok(result);
    }

    @Post("/qcms")
    public HttpResponse<QcmQuestion> createCustomQcm(@Body QcmQuestion qcm) {
        if (qcm == null || qcm.questionStem() == null || qcm.questionStem().isBlank()) {
            return HttpResponse.badRequest();
        }
        String id = qcm.id() != null && !qcm.id().isBlank() ? qcm.id() : "qcm-" + UUID.randomUUID();
        QcmQuestion toSave = new QcmQuestion(
            id,
            qcm.courseId() != null ? qcm.courseId() : "course-general",
            qcm.courseTitle() != null ? qcm.courseTitle() : "Cours PASS",
            qcm.ueCode() != null ? qcm.ueCode() : "UE",
            qcm.questionStem(),
            qcm.items() != null ? qcm.items() : List.of(),
            qcm.difficulty() > 0 ? qcm.difficulty() : 3,
            qcm.source() != null ? qcm.source() : "MANUEL",
            qcm.examYear() != null ? qcm.examYear() : "2025",
            qcm.tags() != null ? qcm.tags() : List.of(),
            qcm.mnemonics() != null ? qcm.mnemonics() : List.of(),
            qcm.createdAt() != null ? qcm.createdAt() : LocalDateTime.now()
        );
        firestoreService.saveQcm(toSave);
        return HttpResponse.created(toSave);
    }

    @Put("/qcms/{id}")
    public HttpResponse<QcmQuestion> updateQcm(@PathVariable String id, @Body QcmQuestion qcm) {
        if (qcm == null) {
            return HttpResponse.badRequest();
        }
        Optional<QcmQuestion> existingOpt = firestoreService.getQcm(id);
        if (existingOpt.isEmpty()) {
            return HttpResponse.notFound();
        }
        QcmQuestion existing = existingOpt.get();
        QcmQuestion updated = new QcmQuestion(
            id,
            qcm.courseId() != null ? qcm.courseId() : existing.courseId(),
            qcm.courseTitle() != null ? qcm.courseTitle() : existing.courseTitle(),
            qcm.ueCode() != null ? qcm.ueCode() : existing.ueCode(),
            qcm.questionStem() != null ? qcm.questionStem() : existing.questionStem(),
            qcm.items() != null ? qcm.items() : existing.items(),
            qcm.difficulty() > 0 ? qcm.difficulty() : existing.difficulty(),
            existing.source(),
            existing.examYear(),
            qcm.tags() != null ? qcm.tags() : existing.tags(),
            qcm.mnemonics() != null ? qcm.mnemonics() : existing.mnemonics(),
            existing.createdAt()
        );
        firestoreService.saveQcm(updated);
        return HttpResponse.ok(updated);
    }

    @Delete("/qcms/{id}")
    public HttpResponse<Void> deleteQcm(@PathVariable String id) {
        if (firestoreService.deleteQcm(id)) {
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    @Post("/qcm-attempts")
    public HttpResponse<QcmAttempt> recordQcmAttempt(@Body QcmAttempt attempt) {
        if (attempt == null) {
            return HttpResponse.badRequest();
        }
        QcmAttempt toSave = new QcmAttempt(
            attempt.id() != null ? attempt.id() : "att-" + UUID.randomUUID(),
            attempt.courseId() != null ? attempt.courseId() : "course-general",
            attempt.courseTitle() != null ? attempt.courseTitle() : "Cours PASS",
            attempt.ueCode() != null ? attempt.ueCode() : "UE",
            attempt.totalQuestions(),
            attempt.totalPoints(),
            attempt.maxPoints() > 0 ? attempt.maxPoints() : attempt.totalQuestions(),
            attempt.scorePercent(),
            attempt.timeSpentSeconds(),
            attempt.questionResults() != null ? attempt.questionResults() : List.of(),
            attempt.completedAt() != null ? attempt.completedAt() : Instant.now()
        );
        firestoreService.saveQcmAttempt(toSave);
        return HttpResponse.ok(toSave);
    }

    @Get("/qcm-attempts")
    public List<QcmAttempt> getQcmAttempts(@QueryValue Optional<String> courseId) {
        if (courseId.isPresent() && !courseId.get().isBlank()) {
            return firestoreService.getQcmAttemptsForCourse(courseId.get());
        }
        return firestoreService.getAllQcmAttempts();
    }

    @Get("/scans")
    public List<HandwrittenScanResult> getScans(@QueryValue Optional<String> courseId) {
        if (courseId.isPresent() && !courseId.get().isBlank()) {
            return firestoreService.getScansForCourse(courseId.get());
        }
        return firestoreService.getAllScans();
    }

    @Delete("/scans/{id}")
    public HttpResponse<Void> deleteScan(@PathVariable String id) {
        if (firestoreService.deleteScan(id)) {
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    // --- Medical Illustrations & Fill-in-the-Blank Drawings ---

    @Serdeable
    public record GenerateIllustrationRequest(
        String title,
        String prompt,
        String courseId,
        String courseTitle,
        String ueCode,
        String illustrationType,
        List<String> legendItems
    ) {}

    @Post("/illustrations/generate")
    public HttpResponse<MedicalIllustration> generateIllustration(@Body GenerateIllustrationRequest request) {
        if (request == null || request.prompt() == null || request.prompt().isBlank()) {
            return HttpResponse.badRequest();
        }

        MedicalIllustration illustration = geminiMedicalService.generateMedicalIllustration(
            request.title() != null ? request.title() : "Schéma Médical PASS",
            request.courseId() != null ? request.courseId() : "course-general",
            request.courseTitle() != null ? request.courseTitle() : "Cours PASS",
            request.ueCode() != null ? request.ueCode() : "UE",
            request.illustrationType() != null ? request.illustrationType() : "SCHEMA_ANATOMIQUE",
            request.prompt(),
            request.legendItems() != null ? request.legendItems() : List.of()
        );

        return HttpResponse.ok(illustration);
    }

    @Serdeable
    public record RegenerateIllustrationRequest(
        String userAdjustmentPrompt
    ) {}

    @Post("/illustrations/{id}/regenerate")
    public HttpResponse<MedicalIllustration> regenerateIllustration(
        @PathVariable String id,
        @Body RegenerateIllustrationRequest request
    ) {
        String adjustment = (request != null) ? request.userAdjustmentPrompt() : "";
        MedicalIllustration regenerated = geminiMedicalService.regenerateMedicalIllustration(id, adjustment);
        if (regenerated == null) {
            return HttpResponse.notFound();
        }
        return HttpResponse.ok(regenerated);
    }

    @Post("/illustrations/{id}/verify")
    public HttpResponse<IllustrationVerification> verifyIllustration(@PathVariable String id) {
        IllustrationVerification verification = geminiMedicalService.verifyMedicalIllustration(id);
        if (verification == null) {
            return HttpResponse.notFound();
        }
        return HttpResponse.ok(verification);
    }

    @Get("/illustrations")
    public List<MedicalIllustration> getIllustrations(@QueryValue Optional<String> courseId) {
        if (courseId.isPresent() && !courseId.get().isBlank()) {
            return firestoreService.getIllustrationsForCourse(courseId.get());
        }
        return firestoreService.getAllIllustrations();
    }

    @Get("/illustrations/{id}")
    public HttpResponse<MedicalIllustration> getIllustration(@PathVariable String id) {
        return firestoreService.getIllustration(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Delete("/illustrations/{id}")
    public HttpResponse<Void> deleteIllustration(@PathVariable String id) {
        if (firestoreService.deleteIllustration(id)) {
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    // ==========================================
    // FLASHCARDS (Active Recall) ENDPOINTS
    // ==========================================

    @Serdeable
    public record GenerateFlashcardsRequest(
        String courseId,
        String courseTitle,
        String ueCode,
        String ueId,
        String content,
        Integer count
    ) {}

    @Post("/generate-flashcards")
    public HttpResponse<List<Flashcard>> generateFlashcards(@Body GenerateFlashcardsRequest request) {
        if (request == null) return HttpResponse.badRequest();
        int count = (request.count() != null && request.count() > 0) ? request.count() : 5;
        List<Flashcard> generated = geminiMedicalService.generateFlashcards(
            request.courseId(),
            request.courseTitle(),
            request.ueCode(),
            request.ueId(),
            request.content(),
            count
        );
        return HttpResponse.ok(generated);
    }

    @Get("/flashcards")
    public List<Flashcard> getFlashcards(
        @QueryValue Optional<String> courseId,
        @QueryValue Optional<String> ueId,
        @QueryValue Optional<Boolean> favorite
    ) {
        List<Flashcard> list = firestoreService.getAllFlashcards();
        if (courseId != null && courseId.isPresent() && !courseId.get().isBlank() && !"ALL".equalsIgnoreCase(courseId.get())) {
            list = list.stream().filter(f -> f.courseId().equalsIgnoreCase(courseId.get())).toList();
        }
        if (ueId != null && ueId.isPresent() && !ueId.get().isBlank() && !"ALL".equalsIgnoreCase(ueId.get())) {
            list = list.stream().filter(f -> f.ueId().equalsIgnoreCase(ueId.get()) || f.ueCode().equalsIgnoreCase(ueId.get())).toList();
        }
        if (favorite != null && favorite.isPresent() && favorite.get()) {
            list = list.stream().filter(Flashcard::isFavorite).toList();
        }
        return list;
    }

    @Get("/flashcards/{id}")
    public HttpResponse<Flashcard> getFlashcard(@PathVariable String id) {
        return firestoreService.getFlashcard(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Post("/flashcards")
    public HttpResponse<Flashcard> createFlashcard(@Body Flashcard flashcard) {
        if (flashcard == null) return HttpResponse.badRequest();
        String id = (flashcard.id() != null && !flashcard.id().isBlank()) ? flashcard.id() : "fc-" + UUID.randomUUID();
        Flashcard toSave = new Flashcard(
            id,
            flashcard.courseId() != null ? flashcard.courseId() : "course-general",
            flashcard.courseTitle() != null ? flashcard.courseTitle() : "Cours PASS",
            flashcard.ueCode() != null ? flashcard.ueCode() : "UE",
            flashcard.ueId() != null ? flashcard.ueId() : "ue1",
            flashcard.front() != null ? flashcard.front() : "Question",
            flashcard.back() != null ? flashcard.back() : "Réponse",
            flashcard.hint(),
            flashcard.difficulty() > 0 ? flashcard.difficulty() : 3,
            flashcard.isFavorite(),
            flashcard.tags() != null ? flashcard.tags() : List.of(),
            flashcard.reviewCount(),
            flashcard.lastReviewedAt(),
            flashcard.createdAt() != null ? flashcard.createdAt() : LocalDateTime.now()
        );
        Flashcard saved = firestoreService.saveFlashcard(toSave);
        return HttpResponse.created(saved);
    }

    @Put("/flashcards/{id}")
    public HttpResponse<Flashcard> updateFlashcard(@PathVariable String id, @Body Flashcard flashcard) {
        if (flashcard == null) return HttpResponse.badRequest();
        Flashcard toSave = new Flashcard(
            id,
            flashcard.courseId(),
            flashcard.courseTitle(),
            flashcard.ueCode(),
            flashcard.ueId(),
            flashcard.front(),
            flashcard.back(),
            flashcard.hint(),
            flashcard.difficulty(),
            flashcard.isFavorite(),
            flashcard.tags(),
            flashcard.reviewCount(),
            flashcard.lastReviewedAt(),
            flashcard.createdAt() != null ? flashcard.createdAt() : LocalDateTime.now()
        );
        Flashcard updated = firestoreService.saveFlashcard(toSave);
        return HttpResponse.ok(updated);
    }

    @Delete("/flashcards/{id}")
    public HttpResponse<Void> deleteFlashcard(@PathVariable String id) {
        if (firestoreService.deleteFlashcard(id)) {
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    @Post("/flashcards/{id}/favorite")
    public HttpResponse<Flashcard> toggleFlashcardFavorite(@PathVariable String id) {
        return firestoreService.toggleFlashcardFavorite(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Serdeable
    public record ReviewFlashcardRequest(String rating) {}

    @Post("/flashcards/{id}/review")
    public HttpResponse<Flashcard> recordFlashcardReview(@PathVariable String id, @Body ReviewFlashcardRequest request) {
        String rating = request != null ? request.rating() : "GOOD";
        return firestoreService.recordFlashcardReview(id, rating)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Post("/flashcards/{id}/verify")
    public HttpResponse<FlashcardVerification> verifyFlashcardById(@PathVariable String id) {
        Optional<Flashcard> fcOpt = firestoreService.getFlashcard(id);
        if (fcOpt.isEmpty()) {
            return HttpResponse.notFound();
        }
        FlashcardVerification result = geminiMedicalService.verifyAndFactCheckFlashcard(fcOpt.get());
        return HttpResponse.ok(result);
    }

    @Post("/verify-flashcard")
    public HttpResponse<FlashcardVerification> verifyFlashcard(@Body Flashcard flashcard) {
        if (flashcard == null) {
            return HttpResponse.badRequest();
        }
        FlashcardVerification result = geminiMedicalService.verifyAndFactCheckFlashcard(flashcard);
        return HttpResponse.ok(result);
    }
}
