package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;

@Serdeable
public record RevisionSession(
    String id,
    String courseId,
    String courseTitle,
    String ueId,
    String ueCode,
    String ueColor,
    int jStep, // e.g. 0, 1, 3, 7, 14, 30, 60
    LocalDate scheduledDate,
    LocalDate completedDate,
    String status, // "A_FAIRE", "VALIDE", "REPORTE", "EN_RETARD"
    String evaluation, // "TRES_FACILE", "FACILE", "MOYEN", "DIFFICILE", "ECHEC"
    Double scorePercent,
    Integer timeSpentMinutes,
    String calendarEventId,
    String notes
) {}
