package fr.medj.model;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

@Serdeable
@Introspected
public record TutorConversationThread(
    String id,
    String title,
    String courseId,
    String courseTitle,
    String ueCode,
    List<AiTutorMessage> messages,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
