package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record Course(
    String id,
    String ueId,
    String ueCode,
    String title,
    String color, // Custom hex color code, e.g. #0284c7
    String professor,
    LocalDate taughtDate,
    int difficulty,
    String status, // "EN_COURS", "VALIDE", "ARCHIVE"
    List<String> tags,
    String notes,
    List<DocumentAttachment> documents,
    List<Integer> customIntervals,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    @Serdeable
    public record DocumentAttachment(
        String id,
        String name,
        String fileType, // "PDF", "IMAGE", "FICHES_MANUSCRITE", "QCM_SCAN"
        String storageUrl,
        long sizeBytes,
        LocalDateTime uploadedAt
    ) {}
}
