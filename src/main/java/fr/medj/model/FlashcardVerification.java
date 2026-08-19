package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record FlashcardVerification(
    String flashcardId,
    boolean isAccurate,
    String status, // "VALIDE" | "CORRECTIONS_RECOMMANDEES" | "INEXACTITUDES_DETECTEES"
    int score, // 0 to 100
    String summary,
    String frontReview,
    String backReview,
    @Nullable String hintReview,
    List<String> keyMedicalPoints,
    List<String> detectedIssues,
    Flashcard correctedFlashcard,
    @Nullable List<GroundingSource> groundingSources,
    LocalDateTime verifiedAt
) {}
