package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record HandwrittenScanResult(
    String id,
    String courseId,
    String courseTitle,
    String imageUrl,
    List<String> imageUrls,
    String transcriptionMarkdown,
    List<String> keyPoints,
    List<String> anatomicalTerms,
    List<String> keyFiguresAndValues,
    List<String> potentialExamTraps,
    List<String> mnemonics,
    List<QcmQuestion> generatedQcms,
    @Nullable String illustrationUrl,
    @Nullable String illustrationId,
    LocalDateTime scannedAt
) {
    public HandwrittenScanResult(
        String id,
        String courseId,
        String courseTitle,
        String imageUrl,
        List<String> imageUrls,
        String transcriptionMarkdown,
        List<String> keyPoints,
        List<String> anatomicalTerms,
        List<String> keyFiguresAndValues,
        List<String> potentialExamTraps,
        List<String> mnemonics,
        List<QcmQuestion> generatedQcms,
        LocalDateTime scannedAt
    ) {
        this(
            id,
            courseId,
            courseTitle,
            imageUrl,
            imageUrls,
            transcriptionMarkdown,
            keyPoints,
            anatomicalTerms,
            keyFiguresAndValues,
            potentialExamTraps,
            mnemonics,
            generatedQcms,
            null,
            null,
            scannedAt
        );
    }

    public HandwrittenScanResult(
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
    ) {
        this(
            id,
            courseId,
            courseTitle,
            imageUrl,
            imageUrl != null && !imageUrl.isBlank() ? List.of(imageUrl) : List.of(),
            transcriptionMarkdown,
            keyPoints,
            anatomicalTerms,
            keyFiguresAndValues,
            potentialExamTraps,
            mnemonics,
            generatedQcms,
            null,
            null,
            scannedAt
        );
    }
}
