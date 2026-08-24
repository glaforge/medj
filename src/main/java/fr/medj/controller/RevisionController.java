package fr.medj.controller;

import fr.medj.model.Course;
import fr.medj.model.RevisionSession;
import fr.medj.model.SubjectUE;
import fr.medj.service.FirestoreService;
import fr.medj.service.JMethodEngineService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.serde.annotation.Serdeable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Secured(SecurityRule.IS_ANONYMOUS)
@Controller("/api/revisions")
public class RevisionController {
    private static final Logger LOG = LoggerFactory.getLogger(RevisionController.class);

    private final FirestoreService firestoreService;
    private final JMethodEngineService jMethodEngineService;

    public RevisionController(
        FirestoreService firestoreService,
        JMethodEngineService jMethodEngineService
    ) {
        this.firestoreService = firestoreService;
        this.jMethodEngineService = jMethodEngineService;
    }

    @Get
    public List<RevisionSession> getRevisions(
        @QueryValue Optional<String> date,
        @QueryValue Optional<String> courseId,
        @QueryValue Optional<String> ueId,
        @QueryValue Optional<String> status
    ) {
        List<RevisionSession> list = firestoreService.getAllRevisions();

        if (date.isPresent() && !date.get().isBlank()) {
            LocalDate d = LocalDate.parse(date.get());
            list = list.stream().filter(r -> r.scheduledDate().equals(d)).toList();
        }
        if (courseId.isPresent() && !courseId.get().isBlank()) {
            list = list.stream().filter(r -> r.courseId().equals(courseId.get())).toList();
        }
        if (ueId.isPresent() && !ueId.get().isBlank()) {
            list = list.stream().filter(r -> r.ueId().equalsIgnoreCase(ueId.get())).toList();
        }
        if (status.isPresent() && !status.get().isBlank()) {
            list = list.stream().filter(r -> r.status().equalsIgnoreCase(status.get())).toList();
        }

        return list;
    }

    @Get("/today")
    public Map<String, Object> getTodaySummary() {
        LocalDate today = LocalDate.now();
        List<RevisionSession> all = firestoreService.getAllRevisions();

        Map<String, Course> courseMap = firestoreService.getAllCourses().stream()
            .collect(Collectors.toMap(Course::id, c -> c, (a, b) -> a));
        Map<String, SubjectUE> subjectMap = firestoreService.getAllSubjects().stream()
            .collect(Collectors.toMap(SubjectUE::id, s -> s, (a, b) -> a));

        Comparator<RevisionSession> priorityComparator = jMethodEngineService.getDailyPriorityComparator(courseMap, subjectMap);

        List<RevisionSession> dueToday = all.stream()
            .filter(r -> r.scheduledDate().equals(today) && !"VALIDE".equals(r.status()))
            .sorted(priorityComparator)
            .toList();

        List<RevisionSession> overdue = all.stream()
            .filter(r -> r.scheduledDate().isBefore(today) && !"VALIDE".equals(r.status()))
            .sorted(priorityComparator)
            .toList();

        List<RevisionSession> completedToday = all.stream()
            .filter(r -> today.equals(r.completedDate()))
            .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("todayDate", today);
        response.put("dueToday", dueToday);
        response.put("overdue", overdue);
        response.put("completedToday", completedToday);
        response.put("totalDueCount", dueToday.size() + overdue.size());
        response.put("completedCount", completedToday.size());

        return response;
    }

    @Get("/workload")
    public Map<String, Object> getWorkloadOverview(
        @QueryValue Optional<String> start,
        @QueryValue Optional<String> end
    ) {
        LocalDate startDate = start.map(LocalDate::parse).orElse(LocalDate.now().minusDays(7));
        LocalDate endDate = end.map(LocalDate::parse).orElse(LocalDate.now().plusMonths(1));

        Map<LocalDate, List<RevisionSession>> byDate = jMethodEngineService.getWorkloadByDate(startDate, endDate);
        List<LocalDate> overloaded = jMethodEngineService.getOverloadedDays(firestoreService.getScheduleConfig().dailyOverloadThreshold());

        Map<String, Object> response = new HashMap<>();
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("workloadByDate", byDate);
        response.put("overloadedDays", overloaded);
        response.put("dailyThreshold", firestoreService.getScheduleConfig().dailyOverloadThreshold());

        return response;
    }

    @Serdeable
    public record CompleteSessionRequest(
        String evaluation, // "TRES_FACILE", "FACILE", "MOYEN", "DIFFICILE", "ECHEC"
        Double scorePercent,
        Integer timeSpentMinutes,
        String notes
    ) {}

    @Post("/{id}/complete")
    public HttpResponse<RevisionSession> completeRevision(
        @PathVariable String id,
        @Body CompleteSessionRequest request
    ) {
        return jMethodEngineService.completeSession(
            id,
            request != null ? request.evaluation() : "MOYEN",
            request != null ? request.scorePercent() : null,
            request != null ? request.timeSpentMinutes() : 25,
            request != null ? request.notes() : null
        )
        .map(HttpResponse::ok)
        .orElseGet(HttpResponse::notFound);
    }

    @Post("/{id}/uncomplete")
    public HttpResponse<RevisionSession> uncompleteRevision(@PathVariable String id) {
        return jMethodEngineService.uncompleteSession(id)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Serdeable
    public record ShiftSessionRequest(int daysToAdd) {}

    @Post("/{id}/shift")
    public HttpResponse<RevisionSession> shiftRevision(
        @PathVariable String id,
        @Body ShiftSessionRequest request
    ) {
        int days = request != null ? request.daysToAdd() : 1;
        return jMethodEngineService.shiftSession(id, days)
            .map(HttpResponse::ok)
            .orElseGet(HttpResponse::notFound);
    }

    @Serdeable
    public record ShiftSubjectRequest(String ueId, int daysToAdd) {}

    @Post("/shift-subject")
    public HttpResponse<List<RevisionSession>> shiftSubject(@Body ShiftSubjectRequest request) {
        if (request == null || request.ueId() == null) {
            return HttpResponse.badRequest();
        }
        List<RevisionSession> updated = jMethodEngineService.shiftSubject(request.ueId(), request.daysToAdd());
        return HttpResponse.ok(updated);
    }

    @Serdeable
    public record SmoothWorkloadRequest(Integer dailyLimit) {}

    @Post("/smooth-workload")
    public HttpResponse<Map<String, Object>> smoothWorkload(@Body SmoothWorkloadRequest request) {
        int limit = (request != null && request.dailyLimit() != null && request.dailyLimit() > 0)
            ? request.dailyLimit()
            : firestoreService.getScheduleConfig().dailyOverloadThreshold();

        List<RevisionSession> adjusted = jMethodEngineService.performWorkloadSmoothing(limit);

        Map<String, Object> response = new HashMap<>();
        response.put("adjustedSessionsCount", adjusted.size());
        response.put("adjustedSessions", adjusted);
        response.put("appliedLimit", limit);

        return HttpResponse.ok(response);
    }

    @Serdeable
    public record CreateRevisionRequest(
        String courseId,
        Integer jStep,
        LocalDate scheduledDate
    ) {}

    @Post
    public HttpResponse<RevisionSession> createRevisionSession(@Body CreateRevisionRequest request) {
        if (request == null || request.courseId() == null || request.courseId().isBlank()) {
            return HttpResponse.badRequest();
        }

        Optional<Course> courseOpt = firestoreService.getCourse(request.courseId());
        if (courseOpt.isEmpty()) return HttpResponse.notFound();

        Course course = courseOpt.get();
        SubjectUE ue = firestoreService.getSubject(course.ueId())
            .orElse(new SubjectUE(course.ueId(), course.ueCode(), "UE", "", "#0284c7", 10, List.of(), "Book"));

        LocalDate taughtDate = course.taughtDate() != null ? course.taughtDate() : LocalDate.now();
        LocalDate scheduledDate;
        int jStep;

        if (request.jStep() != null && request.jStep() >= 0) {
            jStep = request.jStep();
            scheduledDate = request.scheduledDate() != null ? request.scheduledDate() : taughtDate.plusDays(jStep);
        } else if (request.scheduledDate() != null) {
            scheduledDate = request.scheduledDate();
            jStep = (int) ChronoUnit.DAYS.between(taughtDate, scheduledDate);
            if (jStep < 0) jStep = 0;
        } else {
            return HttpResponse.badRequest();
        }

        String sessionColor = (ue.color() != null && !ue.color().isBlank())
            ? ue.color()
            : (course.color() != null && !course.color().isBlank() ? course.color() : "#0284c7");
        String sessionId = "rev-" + course.id() + "-j" + jStep + "-" + UUID.randomUUID().toString().substring(0, 6);
        
        LocalDate today = LocalDate.now();
        String status = scheduledDate.isBefore(today) ? "EN_RETARD" : "A_FAIRE";

        RevisionSession session = new RevisionSession(
            sessionId,
            course.id(),
            course.title(),
            ue.id(),
            ue.code(),
            sessionColor,
            jStep,
            scheduledDate,
            null,
            status,
            null,
            null,
            null,
            null,
            ""
        );

        firestoreService.saveRevision(session);
        LOG.info("Created custom revision session J{} for course '{}' scheduled on {}", jStep, course.title(), scheduledDate);
        return HttpResponse.created(session);
    }

    @Delete("/{id}")
    public HttpResponse<Void> deleteRevision(
        @PathVariable String id,
        @QueryValue(defaultValue = "false") boolean deleteFollowing
    ) {
        if (deleteFollowing) {
            if (firestoreService.deleteRevisionAndFollowing(id)) {
                return HttpResponse.noContent();
            }
            return HttpResponse.notFound();
        } else {
            if (firestoreService.deleteRevision(id)) {
                return HttpResponse.noContent();
            }
            return HttpResponse.notFound();
        }
    }
}
