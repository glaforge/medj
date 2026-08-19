package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record QcmQuestion(
    String id,
    String courseId,
    String courseTitle,
    String ueCode,
    String questionStem,
    List<QcmItem> items,
    int difficulty, // 1 to 5
    String source, // "MANUAL", "GEMINI_GENERATED", "SCANNED_ANNALE"
    String examYear,
    List<String> tags,
    List<String> mnemonics,
    LocalDateTime createdAt
) {}
