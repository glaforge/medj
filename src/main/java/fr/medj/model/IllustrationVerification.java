package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record IllustrationVerification(
    String status, // "VALIDE" | "AVERTISSEMENT" | "ERREURS_DETECTEES"
    int score, // 0 to 100
    String summary,
    List<String> verifiedPoints,
    List<String> detectedIssues,
    @Nullable String suggestedFixPrompt,
    @Nullable List<String> editingInstructions,
    String tutorAdvice,
    @Nullable List<GroundingSource> groundingSources,
    LocalDateTime verifiedAt
) {
    public IllustrationVerification(
        String status,
        int score,
        String summary,
        List<String> verifiedPoints,
        List<String> detectedIssues,
        String tutorAdvice,
        @Nullable List<GroundingSource> groundingSources,
        LocalDateTime verifiedAt
    ) {
        this(status, score, summary, verifiedPoints, detectedIssues, null, List.of(), tutorAdvice, groundingSources, verifiedAt);
    }
}
