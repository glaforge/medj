package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record QcmItem(
    String itemLetter, // "A", "B", "C", "D", "E"
    String text,
    boolean isTrue,
    String explanation,
    boolean isTrap,
    String trapDetails
) {}
