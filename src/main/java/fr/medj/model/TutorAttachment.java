package fr.medj.model;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.serde.annotation.Serdeable;

@Serdeable
@Introspected
public record TutorAttachment(
    String id,
    String filename,
    String mimeType,
    String storageUrl,
    long fileSize
) {}
