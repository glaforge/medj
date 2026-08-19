package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record MedicalIllustration(
    String id,
    String courseId,
    String courseTitle,
    String ueCode,
    String title,
    String imageUrl,
    String illustrationType, // "DESSIN_A_TROUS" | "SCHEMA_ANATOMIQUE" | "SCHEMA_FONCTIONNEL" | "CROQUIS_SYNTHETIQUE"
    String prompt,
    String refinedVisualPrompt,
    List<String> legendItems, // e.g. ["1. Oreillette droite", "2. Valve tricuspide", ...]
    @Nullable List<GroundingSource> groundingSources,
    LocalDateTime createdAt,
    @Nullable IllustrationVerification verification
) {
    // Backward compatibility constructor without verification
    public MedicalIllustration(
        String id,
        String courseId,
        String courseTitle,
        String ueCode,
        String title,
        String imageUrl,
        String illustrationType,
        String prompt,
        String refinedVisualPrompt,
        List<String> legendItems,
        @Nullable List<GroundingSource> groundingSources,
        LocalDateTime createdAt
    ) {
        this(id, courseId, courseTitle, ueCode, title, imageUrl, illustrationType, prompt, refinedVisualPrompt, legendItems, groundingSources, createdAt, null);
    }
}
