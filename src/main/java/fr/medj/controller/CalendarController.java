package fr.medj.controller;

import fr.medj.model.JScheduleConfig;
import fr.medj.service.FirestoreService;
import fr.medj.service.GoogleCalendarService;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.serde.annotation.Serdeable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@Secured(SecurityRule.IS_ANONYMOUS)
@Controller("/api")
public class CalendarController {
    private static final Logger LOG = LoggerFactory.getLogger(CalendarController.class);

    private final GoogleCalendarService googleCalendarService;
    private final FirestoreService firestoreService;

    public CalendarController(
        GoogleCalendarService googleCalendarService,
        FirestoreService firestoreService
    ) {
        this.googleCalendarService = googleCalendarService;
        this.firestoreService = firestoreService;
    }

    @Serdeable
    public record SyncCalendarRequest(
        String accessToken,
        String calendarId
    ) {}

    @Post("/calendar/sync")
    public HttpResponse<Map<String, Object>> syncCalendar(@Nullable @Body SyncCalendarRequest request) {
        String token = (request != null && request.accessToken() != null) ? request.accessToken() : "default-token";
        String calId = (request != null && request.calendarId() != null) ? request.calendarId() : "primary";

        Map<String, Object> result = googleCalendarService.syncWithGoogleCalendar(token, calId);
        return HttpResponse.ok(result);
    }

    @Get(value = "/calendar/feed.ics", produces = "text/calendar; charset=UTF-8")
    public HttpResponse<String> getIcalFeed() {
        String icsContent = googleCalendarService.generateICalendarFeed();
        return HttpResponse.ok(icsContent)
            .header("Content-Disposition", "attachment; filename=\"medj-revisions-pass.ics\"")
            .contentType(MediaType.of("text/calendar; charset=UTF-8"));
    }

    @Get("/config")
    public JScheduleConfig getConfig() {
        return firestoreService.getScheduleConfig();
    }

    @Put("/config")
    public HttpResponse<JScheduleConfig> updateConfig(@Body JScheduleConfig config) {
        if (config == null) return HttpResponse.badRequest();
        JScheduleConfig updated = firestoreService.updateScheduleConfig(config);
        return HttpResponse.ok(updated);
    }
}
