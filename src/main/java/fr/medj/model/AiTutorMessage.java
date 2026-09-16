package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record AiTutorMessage(
    String id,
    String role, // "user" or "model"
    String content,
    String courseId,
    String courseTitle,
    LocalDateTime timestamp,
    @Nullable QcmQuestion createdQcm,
    @Nullable MedicalIllustration createdIllustration,
    @Nullable Flashcard createdFlashcard,
    List<GroundingSource> groundingSources,
    @Nullable List<TutorAttachment> attachments,
    @Nullable List<Flashcard> createdFlashcards
) {
    public AiTutorMessage(String id, String role, String content, String courseId, String courseTitle, LocalDateTime timestamp) {
        this(id, role, content, courseId, courseTitle, timestamp, null, null, null, List.of(), List.of(), List.of());
    }

    public AiTutorMessage(String id, String role, String content, String courseId, String courseTitle, LocalDateTime timestamp, List<TutorAttachment> attachments) {
        this(id, role, content, courseId, courseTitle, timestamp, null, null, null, List.of(), attachments != null ? attachments : List.of(), List.of());
    }

    public AiTutorMessage(String id, String role, String content, String courseId, String courseTitle, LocalDateTime timestamp, QcmQuestion createdQcm) {
        this(id, role, content, courseId, courseTitle, timestamp, createdQcm, null, null, List.of(), List.of(), List.of());
    }

    public AiTutorMessage(String id, String role, String content, String courseId, String courseTitle, LocalDateTime timestamp, QcmQuestion createdQcm, List<GroundingSource> groundingSources) {
        this(id, role, content, courseId, courseTitle, timestamp, createdQcm, null, null, groundingSources, List.of(), List.of());
    }

    public AiTutorMessage(String id, String role, String content, String courseId, String courseTitle, LocalDateTime timestamp, QcmQuestion createdQcm, MedicalIllustration createdIllustration, Flashcard createdFlashcard, List<GroundingSource> groundingSources) {
        this(id, role, content, courseId, courseTitle, timestamp, createdQcm, createdIllustration, createdFlashcard, groundingSources, List.of(), createdFlashcard != null ? List.of(createdFlashcard) : List.of());
    }

    public AiTutorMessage(String id, String role, String content, String courseId, String courseTitle, LocalDateTime timestamp, QcmQuestion createdQcm, MedicalIllustration createdIllustration, Flashcard createdFlashcard, List<GroundingSource> groundingSources, List<TutorAttachment> attachments) {
        this(id, role, content, courseId, courseTitle, timestamp, createdQcm, createdIllustration, createdFlashcard, groundingSources, attachments, createdFlashcard != null ? List.of(createdFlashcard) : List.of());
    }

    public List<Flashcard> allFlashcards() {
        if (createdFlashcards != null && !createdFlashcards.isEmpty()) {
            return createdFlashcards;
        }
        return createdFlashcard != null ? List.of(createdFlashcard) : List.of();
    }
}
