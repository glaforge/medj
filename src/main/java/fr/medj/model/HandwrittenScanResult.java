package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record HandwrittenScanResult(
    String id,
    String courseId,
    String courseTitle,
    String imageUrl,
    String transcriptionMarkdown,
    List<String> keyPoints,
    List<String> anatomicalTerms,
    List<String> keyFiguresAndValues,
    List<String> potentialExamTraps,
    List<String> mnemonics,
    List<QcmQuestion> generatedQcms,
    LocalDateTime scannedAt
) {}
