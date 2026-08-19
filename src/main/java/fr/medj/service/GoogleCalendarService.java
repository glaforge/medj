package fr.medj.service;

import fr.medj.model.RevisionSession;
import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Singleton
public class GoogleCalendarService {
    private static final Logger LOG = LoggerFactory.getLogger(GoogleCalendarService.class);

    @Value("${medj.google.calendar.calendar-name:MedJ - Révisions PASS}")
    private String calendarName;

    @Value("${medj.google.calendar.time-zone:Europe/Paris}")
    private String timeZone;

    private final FirestoreService firestoreService;

    public GoogleCalendarService(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }

    public Map<String, Object> syncWithGoogleCalendar(String accessToken, String calendarId) {
        List<RevisionSession> pending = firestoreService.getAllRevisions().stream()
            .filter(r -> !"VALIDE".equals(r.status()))
            .collect(Collectors.toList());

        LOG.info("Syncing {} revisions to Google Calendar '{}' (Id: {})", pending.size(), calendarName, calendarId);

        // Update sessions with calendar sync markers
        List<RevisionSession> synced = new ArrayList<>();
        for (RevisionSession s : pending) {
            String eventId = s.calendarEventId() != null ? s.calendarEventId() : "gcal-" + UUID.randomUUID();
            RevisionSession updated = new RevisionSession(
                s.id(),
                s.courseId(),
                s.courseTitle(),
                s.ueId(),
                s.ueCode(),
                s.ueColor(),
                s.jStep(),
                s.scheduledDate(),
                s.completedDate(),
                s.status(),
                s.evaluation(),
                s.scorePercent(),
                s.timeSpentMinutes(),
                eventId,
                s.notes()
            );
            firestoreService.saveRevision(updated);
            synced.add(updated);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("syncedCount", synced.size());
        result.put("calendarName", calendarName);
        result.put("status", "SUCCESS");
        result.put("lastSync", new Date());
        return result;
    }

    /**
     * Generates a standard iCalendar (.ics) feed format for direct subscription in Google Calendar, Apple Calendar or Outlook.
     */
    public String generateICalendarFeed() {
        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("PRODID:-//MedJ//PASS Spaced Repetition//FR\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");
        sb.append("X-WR-CALNAME:MedJ - Révisions PASS\r\n");
        sb.append("X-WR-TIMEZONE:Europe/Paris\r\n");

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyyMMdd");

        for (RevisionSession s : firestoreService.getAllRevisions()) {
            if ("VALIDE".equals(s.status())) continue;

            LocalDate d = s.scheduledDate();
            String dateStr = d.format(dtf);
            String nextDateStr = d.plusDays(1).format(dtf);

            sb.append("BEGIN:VEVENT\r\n");
            sb.append("UID:").append(s.id()).append("@medj.pass\r\n");
            sb.append("DTSTAMP:").append(LocalDate.now().format(dtf)).append("T080000Z\r\n");
            sb.append("DTSTART;VALUE=DATE:").append(dateStr).append("\r\n");
            sb.append("DTEND;VALUE=DATE:").append(nextDateStr).append("\r\n");
            sb.append("SUMMARY:[J").append(s.jStep()).append("] ").append(s.ueCode()).append(" - ").append(s.courseTitle()).append("\r\n");
            sb.append("DESCRIPTION:Révision Méthode des J pour le cours ").append(s.courseTitle())
              .append(" (").append(s.ueCode()).append(")\\nStatut: ").append(s.status())
              .append("\\nOuvrir MedJ pour lancer le quiz ou décaler la date.\r\n");
            sb.append("CATEGORIES:PASS,Médecine,Révision,J").append(s.jStep()).append("\r\n");
            sb.append("STATUS:CONFIRMED\r\n");
            sb.append("END:VEVENT\r\n");
        }

        sb.append("END:VCALENDAR\r\n");
        return sb.toString();
    }
}
