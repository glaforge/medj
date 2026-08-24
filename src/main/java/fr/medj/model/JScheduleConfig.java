package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record JScheduleConfig(
    List<Integer> defaultIntervals,
    int dailyOverloadThreshold,
    boolean autoSmoothingEnabled,
    String facultyPreset,
    String googleCalendarId,
    boolean calendarSyncEnabled
) {
    public static JScheduleConfig defaultConfiguration() {
        return new JScheduleConfig(
            List.of(),
            6,
            true,
            "Méthode PASS Personnalisée (J0, J1, Samedi, Dimanches)",
            "",
            true
        );
    }
}
