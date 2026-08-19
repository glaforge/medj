package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record ItemVerification(
    String itemLetter,
    boolean currentIsTrue,
    boolean proposedIsTrue,
    boolean hasError,
    String explanation,
    String correctedText,
    String correctedExplanation
) {}
