package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record Flashcard(
    String id,
    String courseId,
    String courseTitle,
    String ueCode,
    String ueId,
    String front, // Recto / Question ou concept clé
    String back,  // Verso / Réponse détaillée ou explication
    @Nullable String hint, // Indice de mémorisation / amorce
    int difficulty, // 1 (facile) à 5 (difficile / concours)
    boolean isFavorite, // Favori ⭐
    List<String> tags,
    int reviewCount,
    @Nullable LocalDateTime lastReviewedAt,
    LocalDateTime createdAt,
    @Nullable List<String> frontImages, // Photos rattachées au Recto
    @Nullable List<String> backImages   // Photos rattachées au Verso
) {
    public Flashcard(
        String id,
        String courseId,
        String courseTitle,
        String ueCode,
        String ueId,
        String front,
        String back,
        @Nullable String hint,
        int difficulty,
        boolean isFavorite,
        List<String> tags,
        int reviewCount,
        @Nullable LocalDateTime lastReviewedAt,
        LocalDateTime createdAt
    ) {
        this(id, courseId, courseTitle, ueCode, ueId, front, back, hint, difficulty, isFavorite, tags, reviewCount, lastReviewedAt, createdAt, List.of(), List.of());
    }

    public Flashcard(
        String id,
        String courseId,
        String courseTitle,
        String ueCode,
        String ueId,
        String front,
        String back,
        @Nullable String hint,
        int difficulty,
        boolean isFavorite,
        List<String> tags,
        LocalDateTime createdAt
    ) {
        this(id, courseId, courseTitle, ueCode, ueId, front, back, hint, difficulty, isFavorite, tags, 0, null, createdAt, List.of(), List.of());
    }
}
