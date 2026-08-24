package fr.medj.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import fr.medj.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Loads the official PASS (Parcours Accès Santé Spécifique) curriculum
 * and sample dataset for Université Paris Cité from an external JSON resource
 * (src/main/resources/sample-data/paris-cite-curriculum.json).
 *
 * Courses are dynamically staggered across the two university semesters:
 * - Semestre 1 (UE1, UE2, UE3) : 74 courses scheduled 2 per weekday (Monday-Friday) starting September.
 * - Semestre 2 (UE4, UE5, UE6, UE7, UE8) : 112 courses scheduled 2 per weekday (Monday-Friday) starting January.
 */
public final class ParisCiteCurriculumSeeder {
    private static final Logger LOG = LoggerFactory.getLogger(ParisCiteCurriculumSeeder.class);
    private static final String JSON_PATH = "/sample-data/paris-cite-curriculum.json";

    private static final ObjectMapper MAPPER = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private ParisCiteCurriculumSeeder() {}

    /**
     * Generates a list of teaching days (Monday to Friday, skipping weekends) starting from startDate.
     */
    private static List<LocalDate> generateWeekdays(LocalDate startDate, int totalCourses, int coursesPerDay) {
        int requiredDays = (totalCourses + coursesPerDay - 1) / coursesPerDay;
        List<LocalDate> days = new ArrayList<>(requiredDays);
        LocalDate current = startDate;
        while (days.size() < requiredDays) {
            DayOfWeek dow = current.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                days.add(current);
            }
            current = current.plusDays(1);
        }
        return days;
    }

    private static JsonNode loadRootNode() {
        try (InputStream is = ParisCiteCurriculumSeeder.class.getResourceAsStream(JSON_PATH)) {
            if (is == null) {
                throw new IllegalStateException("Sample data JSON not found at classpath: " + JSON_PATH);
            }
            return MAPPER.readTree(is);
        } catch (Exception e) {
            LOG.error("Failed to read curriculum JSON from {}: {}", JSON_PATH, e.getMessage(), e);
            throw new RuntimeException("Could not load sample data JSON", e);
        }
    }

    public static List<SubjectUE> createDefaultSubjects() {
        try {
            JsonNode root = loadRootNode();
            JsonNode subjectsNode = root.get("subjects");
            if (subjectsNode != null && subjectsNode.isArray()) {
                return MAPPER.readValue(subjectsNode.traverse(), new TypeReference<List<SubjectUE>>() {});
            }
        } catch (Exception e) {
            LOG.error("Error deserializing default subjects: {}", e.getMessage(), e);
        }
        return SubjectUE.getDefaultPassUEs();
    }

    public static List<Course> createOfficialCourses() {
        LocalDate today = LocalDate.now();
        int academicStartYear = (today.getMonthValue() >= 8) ? today.getYear() : today.getYear() - 1;

        // Semestre 1 start: First Monday of September
        LocalDate s1Start = LocalDate.of(academicStartYear, 9, 1);
        while (s1Start.getDayOfWeek() != DayOfWeek.MONDAY) {
            s1Start = s1Start.plusDays(1);
        }

        // Semestre 2 start: First Monday of January
        LocalDate s2Start = LocalDate.of(academicStartYear + 1, 1, 1);
        while (s2Start.getDayOfWeek() != DayOfWeek.MONDAY) {
            s2Start = s2Start.plusDays(1);
        }

        List<LocalDate> s1Days = generateWeekdays(s1Start, 74, 2);
        List<LocalDate> s2Days = generateWeekdays(s2Start, 112, 2);

        try {
            JsonNode root = loadRootNode();
            JsonNode coursesNode = root.get("courses");
            if (coursesNode != null && coursesNode.isArray()) {
                List<Course> courses = new ArrayList<>(coursesNode.size());
                int s1Index = 0;
                int s2Index = 0;

                for (JsonNode cNode : coursesNode) {
                    String id = cNode.get("id").asText();
                    String ueId = cNode.get("ueId").asText();
                    String ueCode = cNode.get("ueCode").asText();
                    String title = cNode.get("title").asText();
                    String color = cNode.get("color").asText();
                    String professor = cNode.has("professor") ? cNode.get("professor").asText() : "";
                    int semester = cNode.has("semester") ? cNode.get("semester").asInt() : (List.of("UE1", "UE2", "UE3").contains(ueCode) ? 1 : 2);
                    int difficulty = cNode.has("difficulty") ? cNode.get("difficulty").asInt() : 3;
                    String status = cNode.has("status") ? cNode.get("status").asText() : "EN_COURS";
                    String notes = cNode.has("notes") ? cNode.get("notes").asText() : "";

                    List<String> tags = new ArrayList<>();
                    if (cNode.has("tags") && cNode.get("tags").isArray()) {
                        for (JsonNode t : cNode.get("tags")) tags.add(t.asText());
                    }

                    List<Integer> intervals = new ArrayList<>();
                    if (cNode.has("customIntervals") && cNode.get("customIntervals").isArray()) {
                        for (JsonNode iv : cNode.get("customIntervals")) intervals.add(iv.asInt());
                    } else {
                        intervals = List.of();
                    }

                    LocalDate taughtDate;
                    if (semester == 1) {
                        int dayIdx = s1Index / 2;
                        taughtDate = dayIdx < s1Days.size() ? s1Days.get(dayIdx) : s1Start;
                        s1Index++;
                    } else {
                        int dayIdx = s2Index / 2;
                        taughtDate = dayIdx < s2Days.size() ? s2Days.get(dayIdx) : s2Start;
                        s2Index++;
                    }

                    courses.add(new Course(
                        id,
                        ueId,
                        ueCode,
                        title,
                        color,
                        professor,
                        taughtDate,
                        difficulty,
                        status,
                        tags,
                        notes,
                        List.of(),
                        intervals,
                        taughtDate.atTime(8, 30),
                        taughtDate.atTime(8, 30)
                    ));
                }
                return courses;
            }
        } catch (Exception e) {
            LOG.error("Failed to parse official courses from JSON: {}", e.getMessage(), e);
        }

        return List.of();
    }

    public static List<QcmQuestion> createSampleQcms() {
        try {
            JsonNode root = loadRootNode();
            JsonNode qcmsNode = root.get("qcms");
            if (qcmsNode != null && qcmsNode.isArray()) {
                List<QcmQuestion> qcms = new ArrayList<>(qcmsNode.size());
                for (JsonNode qNode : qcmsNode) {
                    String id = qNode.get("id").asText();
                    String courseId = qNode.get("courseId").asText();
                    String courseTitle = qNode.get("courseTitle").asText();
                    String ueCode = qNode.get("ueCode").asText();
                    String questionStem = qNode.get("questionStem").asText();
                    int difficulty = qNode.has("difficulty") ? qNode.get("difficulty").asInt() : 3;
                    String source = qNode.has("source") ? qNode.get("source").asText() : "PARIS_CITE_CONCOURS";
                    String examYear = qNode.has("examYear") ? qNode.get("examYear").asText() : "2024";

                    List<QcmItem> items = new ArrayList<>();
                    if (qNode.has("items") && qNode.get("items").isArray()) {
                        for (JsonNode itemNode : qNode.get("items")) {
                            items.add(new QcmItem(
                                itemNode.get("itemLetter").asText(),
                                itemNode.get("text").asText(),
                                itemNode.get("isTrue").asBoolean(),
                                itemNode.get("explanation").asText(),
                                itemNode.has("isTrap") && itemNode.get("isTrap").asBoolean(),
                                itemNode.has("trapDetails") ? itemNode.get("trapDetails").asText() : ""
                            ));
                        }
                    }

                    List<String> tags = new ArrayList<>();
                    if (qNode.has("tags") && qNode.get("tags").isArray()) {
                        for (JsonNode t : qNode.get("tags")) tags.add(t.asText());
                    }

                    List<String> mnemonics = new ArrayList<>();
                    if (qNode.has("mnemonics") && qNode.get("mnemonics").isArray()) {
                        for (JsonNode m : qNode.get("mnemonics")) mnemonics.add(m.asText());
                    }

                    qcms.add(new QcmQuestion(
                        id,
                        courseId,
                        courseTitle,
                        ueCode,
                        questionStem,
                        items,
                        difficulty,
                        source,
                        examYear,
                        tags,
                        mnemonics,
                        LocalDateTime.now()
                    ));
                }
                return qcms;
            }
        } catch (Exception e) {
            LOG.error("Failed to parse sample QCMs from JSON: {}", e.getMessage(), e);
        }
        return List.of();
    }

    public static List<Flashcard> createSampleFlashcards() {
        try {
            JsonNode root = loadRootNode();
            JsonNode fcNode = root.get("flashcards");
            if (fcNode != null && fcNode.isArray()) {
                List<Flashcard> cards = new ArrayList<>(fcNode.size());
                int dayOffset = 1;
                for (JsonNode cardNode : fcNode) {
                    String id = cardNode.get("id").asText();
                    String courseId = cardNode.get("courseId").asText();
                    String courseTitle = cardNode.get("courseTitle").asText();
                    String ueCode = cardNode.get("ueCode").asText();
                    String ueId = cardNode.get("ueId").asText();
                    String front = cardNode.get("front").asText();
                    String back = cardNode.get("back").asText();
                    String hint = cardNode.has("hint") ? cardNode.get("hint").asText() : null;
                    int difficulty = cardNode.has("difficulty") ? cardNode.get("difficulty").asInt() : 3;
                    boolean isFavorite = cardNode.has("isFavorite") && cardNode.get("isFavorite").asBoolean();

                    List<String> tags = new ArrayList<>();
                    if (cardNode.has("tags") && cardNode.get("tags").isArray()) {
                        for (JsonNode t : cardNode.get("tags")) tags.add(t.asText());
                    }

                    cards.add(new Flashcard(
                        id,
                        courseId,
                        courseTitle,
                        ueCode,
                        ueId,
                        front,
                        back,
                        hint,
                        difficulty,
                        isFavorite,
                        tags,
                        0,
                        null,
                        LocalDateTime.now().minusDays(dayOffset++)
                    ));
                }
                return cards;
            }
        } catch (Exception e) {
            LOG.error("Failed to parse sample flashcards from JSON: {}", e.getMessage(), e);
        }
        return List.of();
    }
}
