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
    int jStep, // e.g. 0, 1, 2, 3, 4
    String stepType, // "APP", "QCM", "ERR", "SAM", "DIM"
    LocalDate scheduledDate,
    LocalDate completedDate,
    String status, // "A_FAIRE", "VALIDE", "REPORTE", "EN_RETARD"
    String evaluation, // "TRES_FACILE", "FACILE", "MOYEN", "DIFFICILE", "ECHEC"
    Double scorePercent,
    Integer timeSpentMinutes,
    String calendarEventId,
    String notes
) {
    public RevisionSession(
        String id,
        String courseId,
        String courseTitle,
        String ueId,
        String ueCode,
        String ueColor,
        int jStep,
        LocalDate scheduledDate,
        LocalDate completedDate,
        String status,
        String evaluation,
        Double scorePercent,
        Integer timeSpentMinutes,
        String calendarEventId,
        String notes
    ) {
        this(
            id,
            courseId,
            courseTitle,
            ueId,
            ueCode,
            ueColor,
            jStep,
            inferStepType(jStep, scheduledDate),
            scheduledDate,
            completedDate,
            status,
            evaluation,
            scorePercent,
            timeSpentMinutes,
            calendarEventId,
            notes
        );
    }

    public static String inferStepType(int jStep, LocalDate date) {
        return switch (jStep) {
            case 0 -> "APP";
            case 1 -> "QCM";
            case 2 -> "ERR";
            case 3 -> "SAM";
            case 4 -> "DIM";
            default -> {
                if (date != null && date.getDayOfWeek() == java.time.DayOfWeek.SATURDAY) yield "SAM";
                if (date != null && date.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) yield "DIM";
                yield "DIM";
            }
        };
    }
}
