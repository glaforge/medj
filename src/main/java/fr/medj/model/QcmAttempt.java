package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;
import java.util.List;

@Serdeable
public record QcmAttempt(
    String id,
    String courseId,
    String courseTitle,
    String ueCode,
    int totalQuestions,
    double totalPoints,
    double maxPoints,
    double scorePercent,
    int timeSpentSeconds,
    List<QcmQuestionResult> questionResults,
    Instant completedAt
) {
    @Serdeable
    public record QcmQuestionResult(
        String questionId,
        String questionStem,
        int exactItemsCount, // e.g. 5, 4, 3, 2, 1, 0
        double pointsEarned, // e.g. 1.0, 0.5, 0.2, 0.0
        boolean hadTrapFallen
    ) {}
}
