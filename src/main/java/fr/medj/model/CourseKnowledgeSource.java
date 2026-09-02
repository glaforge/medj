package fr.medj.model;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record CourseKnowledgeSource(
    String id,            // "notes", or document ID ("doc-..."), or scan ID ("scan-...")
    String type,          // "NOTES", "PDF", "SCAN"
    String title,         // e.g. "Notes de cours rédigées", "Polycopie_Anatomie.pdf", "Fiche manuscrite"
    String description,   // Short snippet or summary
    long sizeBytes,       // Characters or file size in bytes
    @Nullable String previewUrl,
    @Nullable LocalDateTime date,
    List<String> tags
) {}
