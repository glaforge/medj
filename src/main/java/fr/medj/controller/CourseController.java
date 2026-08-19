package fr.medj.controller;

import fr.medj.model.Course;
import fr.medj.model.RevisionSession;
import fr.medj.model.SubjectUE;
import fr.medj.service.FirestoreService;
import fr.medj.service.JMethodEngineService;
import fr.medj.service.StorageService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.*;

@Secured(SecurityRule.IS_ANONYMOUS)
@Controller("/api")
public class CourseController {
    private static final Logger LOG = LoggerFactory.getLogger(CourseController.class);

    private final FirestoreService firestoreService;
    private final JMethodEngineService jMethodEngineService;
    private final StorageService storageService;

    public CourseController(
        FirestoreService firestoreService,
        JMethodEngineService jMethodEngineService,
        StorageService storageService
    ) {
        this.firestoreService = firestoreService;
        this.jMethodEngineService = jMethodEngineService;
        this.storageService = storageService;
    }

    @Get("/subjects")
    public List<SubjectUE> getSubjects() {
        return firestoreService.getAllSubjects();
    }

    @Get("/subjects/{id}")
    public HttpResponse<SubjectUE> getSubject(@PathVariable String id) {
        return firestoreService.getSubject(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Post("/subjects")
    public HttpResponse<SubjectUE> createSubject(@Body SubjectUE subjectInput) {
        if (subjectInput == null || subjectInput.code() == null || subjectInput.code().isBlank()) {
            return HttpResponse.badRequest();
        }
        String id = subjectInput.id() != null && !subjectInput.id().isBlank()
            ? subjectInput.id()
            : "ue-" + UUID.randomUUID().toString().substring(0, 8);

        SubjectUE newSubject = new SubjectUE(
            id,
            subjectInput.code().trim().toUpperCase(),
            subjectInput.name() != null ? subjectInput.name().trim() : "Nouvelle Matière",
            subjectInput.description() != null ? subjectInput.description().trim() : "",
            subjectInput.color() != null && !subjectInput.color().isBlank() ? subjectInput.color() : "#0284c7",
            subjectInput.coefficient() > 0 ? subjectInput.coefficient() : 10,
            subjectInput.customIntervals() != null && !subjectInput.customIntervals().isEmpty()
                ? subjectInput.customIntervals()
                : List.of(0, 1, 3, 7, 14, 30, 60),
            subjectInput.icon() != null && !subjectInput.icon().isBlank() ? subjectInput.icon() : "Book"
        );

        firestoreService.saveSubject(newSubject);
        LOG.info("Created Subject/UE '{}' [{}] (ID: {})", newSubject.name(), newSubject.code(), newSubject.id());
        return HttpResponse.created(newSubject);
    }

    @Put("/subjects/{id}")
    public HttpResponse<SubjectUE> updateSubject(@PathVariable String id, @Body SubjectUE subjectInput) {
        Optional<SubjectUE> existingOpt = firestoreService.getSubject(id);
        if (existingOpt.isEmpty()) {
            return HttpResponse.notFound();
        }
        SubjectUE existing = existingOpt.get();
        SubjectUE updated = new SubjectUE(
            id,
            subjectInput.code() != null && !subjectInput.code().isBlank() ? subjectInput.code().trim().toUpperCase() : existing.code(),
            subjectInput.name() != null && !subjectInput.name().isBlank() ? subjectInput.name().trim() : existing.name(),
            subjectInput.description() != null ? subjectInput.description().trim() : existing.description(),
            subjectInput.color() != null && !subjectInput.color().isBlank() ? subjectInput.color() : existing.color(),
            subjectInput.coefficient() > 0 ? subjectInput.coefficient() : existing.coefficient(),
            subjectInput.customIntervals() != null && !subjectInput.customIntervals().isEmpty() ? subjectInput.customIntervals() : existing.customIntervals(),
            subjectInput.icon() != null && !subjectInput.icon().isBlank() ? subjectInput.icon() : existing.icon()
        );

        firestoreService.saveSubject(updated);

        // Update UE code and color on associated courses if changed
        if (!updated.code().equalsIgnoreCase(existing.code()) || !updated.color().equalsIgnoreCase(existing.color())) {
            for (Course c : firestoreService.getAllCourses()) {
                if (c.ueId().equalsIgnoreCase(id) || c.ueCode().equalsIgnoreCase(existing.code())) {
                    Course updatedCourse = new Course(
                        c.id(),
                        c.ueId(),
                        updated.code(),
                        c.title(),
                        c.color() != null && !c.color().equalsIgnoreCase(existing.color()) ? c.color() : updated.color(),
                        c.professor(),
                        c.taughtDate(),
                        c.difficulty(),
                        c.status(),
                        c.tags(),
                        c.notes(),
                        c.documents(),
                        c.customIntervals(),
                        c.createdAt(),
                        LocalDateTime.now()
                    );
                    firestoreService.saveCourse(updatedCourse);
                }
            }
        }

        LOG.info("Updated Subject/UE ID: '{}' -> [{}] {}", id, updated.code(), updated.name());
        return HttpResponse.ok(updated);
    }

    @Delete("/subjects/{id}")
    public HttpResponse<Void> deleteSubject(@PathVariable String id) {
        if (firestoreService.deleteSubject(id)) {
            LOG.info("Deleted Subject/UE ID: {}", id);
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    @Get("/courses")
    public List<Course> getCourses(@QueryValue Optional<String> ueId) {
        List<Course> all = firestoreService.getAllCourses();
        if (ueId.isPresent() && !ueId.get().isBlank()) {
            return all.stream()
                .filter(c -> c.ueId().equalsIgnoreCase(ueId.get()))
                .toList();
        }
        return all;
    }

    @Get("/courses/{id}")
    public HttpResponse<Course> getCourse(@PathVariable String id) {
        return firestoreService.getCourse(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Post("/courses")
    public HttpResponse<Course> createCourse(@Body Course courseInput) {
        String id = (courseInput.id() != null && !courseInput.id().isBlank())
            ? courseInput.id()
            : "course-" + UUID.randomUUID();

        Course newCourse = new Course(
            id,
            courseInput.ueId(),
            courseInput.ueCode(),
            courseInput.title(),
            courseInput.color(),
            courseInput.professor() != null ? courseInput.professor() : "",
            courseInput.taughtDate(),
            courseInput.difficulty() > 0 ? courseInput.difficulty() : 3,
            courseInput.status() != null ? courseInput.status() : "EN_COURS",
            courseInput.tags() != null ? courseInput.tags() : List.of(),
            courseInput.notes() != null ? courseInput.notes() : "",
            courseInput.documents() != null ? courseInput.documents() : List.of(),
            courseInput.customIntervals() != null ? courseInput.customIntervals() : List.of(0, 1, 3, 7, 14, 30, 60),
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        firestoreService.saveCourse(newCourse);
        // Automatically generate spaced repetition sessions for this course
        jMethodEngineService.generateSessionsForCourse(newCourse, newCourse.customIntervals());

        LOG.info("Created course '{}' (ID: {})", newCourse.title(), newCourse.id());
        return HttpResponse.created(newCourse);
    }

    @Put("/courses/{id}")
    public HttpResponse<Course> updateCourse(@PathVariable String id, @Body Course courseInput) {
        Optional<Course> existing = firestoreService.getCourse(id);
        if (existing.isEmpty()) return HttpResponse.notFound();

        Course current = existing.get();
        Course updated = new Course(
            id,
            courseInput.ueId() != null ? courseInput.ueId() : current.ueId(),
            courseInput.ueCode() != null ? courseInput.ueCode() : current.ueCode(),
            courseInput.title() != null ? courseInput.title() : current.title(),
            courseInput.color() != null ? courseInput.color() : current.color(),
            courseInput.professor() != null ? courseInput.professor() : current.professor(),
            courseInput.taughtDate() != null ? courseInput.taughtDate() : current.taughtDate(),
            courseInput.difficulty() > 0 ? courseInput.difficulty() : current.difficulty(),
            courseInput.status() != null ? courseInput.status() : current.status(),
            courseInput.tags() != null ? courseInput.tags() : current.tags(),
            courseInput.notes() != null ? courseInput.notes() : current.notes(),
            courseInput.documents() != null ? courseInput.documents() : current.documents(),
            courseInput.customIntervals() != null ? courseInput.customIntervals() : current.customIntervals(),
            current.createdAt(),
            LocalDateTime.now()
        );

        firestoreService.saveCourse(updated);

        // If color was changed, propagate to existing revision sessions
        if (courseInput.color() != null && !courseInput.color().isBlank() && !courseInput.color().equalsIgnoreCase(current.color())) {
            for (RevisionSession s : firestoreService.getRevisionsForCourse(id)) {
                RevisionSession updatedSession = new RevisionSession(
                    s.id(),
                    s.courseId(),
                    s.courseTitle(),
                    s.ueId(),
                    s.ueCode(),
                    courseInput.color(),
                    s.jStep(),
                    s.scheduledDate(),
                    s.completedDate(),
                    s.status(),
                    s.evaluation(),
                    s.scorePercent(),
                    s.timeSpentMinutes(),
                    s.calendarEventId(),
                    s.notes()
                );
                firestoreService.saveRevision(updatedSession);
            }
        }

        return HttpResponse.ok(updated);
    }

    @Delete("/courses/{id}")
    public HttpResponse<Void> deleteCourse(@PathVariable String id) {
        if (firestoreService.deleteCourse(id)) {
            return HttpResponse.noContent();
        }
        return HttpResponse.notFound();
    }

    @Post(value = "/courses/{courseId}/documents", consumes = MediaType.MULTIPART_FORM_DATA)
    public HttpResponse<Course> uploadAndAttachDocument(
        @PathVariable String courseId,
        CompletedFileUpload file,
        @QueryValue Optional<String> fileType
    ) {
        if (file == null) {
            return HttpResponse.badRequest();
        }
        Optional<Course> courseOpt = firestoreService.getCourse(courseId);
        if (courseOpt.isEmpty()) {
            return HttpResponse.notFound();
        }

        try {
            byte[] bytes = file.getBytes();
            String filename = (file.getFilename() != null && !file.getFilename().isBlank()) ? file.getFilename() : "document.pdf";
            String mime = file.getContentType().map(MediaType::getName).orElse("application/octet-stream");
            if (filename.toLowerCase().endsWith(".pdf")) mime = "application/pdf";
            else if (filename.toLowerCase().endsWith(".png")) mime = "image/png";
            else if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) mime = "image/jpeg";

            String storageUrl = storageService.storeFile(filename, mime, new java.io.ByteArrayInputStream(bytes));

            String detectedType = fileType.orElseGet(() -> {
                if (filename.toLowerCase().endsWith(".pdf")) return "PDF";
                if (filename.toLowerCase().matches(".*\\.(png|jpg|jpeg|webp|gif)")) return "IMAGE";
                return "PDF";
            });

            Course c = courseOpt.get();
            List<Course.DocumentAttachment> docs = new ArrayList<>(c.documents() != null ? c.documents() : List.of());
            docs.add(new Course.DocumentAttachment(
                "doc-" + UUID.randomUUID(),
                filename,
                detectedType,
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
            LOG.info("Directly uploaded and attached document '{}' to course '{}' ([{}])", filename, c.id(), c.title());
            return HttpResponse.ok(updated);
        } catch (IOException e) {
            LOG.error("Failed to upload document to course {}: {}", courseId, e.getMessage(), e);
            return HttpResponse.serverError();
        }
    }

    @Post("/courses/{courseId}/attach-document")
    public HttpResponse<Course> attachExistingDocument(
        @PathVariable String courseId,
        @Body Course.DocumentAttachment attachment
    ) {
        if (attachment == null || attachment.storageUrl() == null || attachment.storageUrl().isBlank()) {
            return HttpResponse.badRequest();
        }
        return firestoreService.getCourse(courseId).map(c -> {
            List<Course.DocumentAttachment> docs = new ArrayList<>(c.documents() != null ? c.documents() : List.of());
            String docId = attachment.id() != null && !attachment.id().isBlank() ? attachment.id() : "doc-" + UUID.randomUUID();
            docs.add(new Course.DocumentAttachment(
                docId,
                attachment.name() != null ? attachment.name() : "document",
                attachment.fileType() != null ? attachment.fileType() : "PDF",
                attachment.storageUrl(),
                attachment.sizeBytes(),
                attachment.uploadedAt() != null ? attachment.uploadedAt() : LocalDateTime.now()
            ));

            Course updated = new Course(
                c.id(), c.ueId(), c.ueCode(), c.title(), c.color(), c.professor(),
                c.taughtDate(), c.difficulty(), c.status(), c.tags(), c.notes(),
                docs, c.customIntervals(), c.createdAt(), LocalDateTime.now()
            );

            firestoreService.saveCourse(updated);
            LOG.info("Attached existing document '{}' to course '{}'", attachment.name(), c.id());
            return HttpResponse.ok(updated);
        }).orElseGet(HttpResponse::notFound);
    }

    @Delete("/courses/{courseId}/documents/{docId}")
    public HttpResponse<Course> deleteDocumentAttachment(@PathVariable String courseId, @PathVariable String docId) {
        return firestoreService.getCourse(courseId).map(c -> {
            List<Course.DocumentAttachment> docs = (c.documents() != null ? c.documents() : List.<Course.DocumentAttachment>of())
                .stream()
                .filter(d -> !d.id().equals(docId))
                .toList();
            Course updated = new Course(
                c.id(), c.ueId(), c.ueCode(), c.title(), c.color(), c.professor(),
                c.taughtDate(), c.difficulty(), c.status(), c.tags(), c.notes(),
                docs, c.customIntervals(), c.createdAt(), LocalDateTime.now()
            );
            firestoreService.saveCourse(updated);
            LOG.info("Deleted document '{}' from course '{}'", docId, courseId);
            return HttpResponse.ok(updated);
        }).orElseGet(HttpResponse::notFound);
    }

    @Post(value = "/storage/upload", consumes = MediaType.MULTIPART_FORM_DATA)
    public HttpResponse<Map<String, Object>> uploadFile(CompletedFileUpload file) {
        try {
            String url = storageService.storeFile(
                file.getFilename(),
                file.getContentType().map(MediaType::getName).orElse("application/octet-stream"),
                file.getInputStream()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("url", url);
            response.put("name", file.getFilename());
            response.put("sizeBytes", file.getSize());
            response.put("uploadedAt", LocalDateTime.now());

            return HttpResponse.ok(response);
        } catch (IOException e) {
            LOG.error("Failed to upload file: {}", e.getMessage());
            return HttpResponse.serverError();
        }
    }

    @Get("/storage/{filename}")
    public HttpResponse<byte[]> getStorageFile(@PathVariable String filename) {
        File file = storageService.getFile(filename);
        if (!file.exists()) {
            return HttpResponse.notFound();
        }
        try {
            byte[] bytes = Files.readAllBytes(file.toPath());
            String contentType = Files.probeContentType(file.toPath());
            return HttpResponse.ok(bytes)
                .contentType(contentType != null ? MediaType.of(contentType) : MediaType.APPLICATION_OCTET_STREAM_TYPE);
        } catch (IOException e) {
            return HttpResponse.serverError();
        }
    }
}
