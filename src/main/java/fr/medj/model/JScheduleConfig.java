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
            List.of(0, 1, 3, 7, 14, 30, 60),
            6,
            true,
            "PASS Standard (Toutes Facultés)",
            "",
            true
        );
    }
}
