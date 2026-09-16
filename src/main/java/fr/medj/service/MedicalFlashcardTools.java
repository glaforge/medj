package fr.medj.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import fr.medj.model.Course;
import fr.medj.model.Flashcard;
import fr.medj.model.SubjectUE;
import io.micronaut.core.type.Argument;
import io.micronaut.serde.ObjectMapper;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;

@Singleton
public class MedicalFlashcardTools {
    private static final Logger LOG = LoggerFactory.getLogger(MedicalFlashcardTools.class);

    private final FirestoreService firestoreService;
    private final ObjectMapper objectMapper;
    private final List<Flashcard> recentlyCreatedFlashcards = Collections.synchronizedList(new ArrayList<>());

    private String activeCourseId;
    private String activeCourseTitle;
    private String activeUeCode;
    private String activeUeId;

    public void setActiveCourse(String courseId, String courseTitle, String ueCode, String ueId) {
        this.activeCourseId = courseId;
        this.activeCourseTitle = courseTitle;
        this.activeUeCode = ueCode;
        this.activeUeId = ueId;
    }

    public MedicalFlashcardTools(FirestoreService firestoreService) {
        this(firestoreService, ObjectMapper.getDefault());
    }

    public MedicalFlashcardTools(FirestoreService firestoreService, ObjectMapper objectMapper) {
        this.firestoreService = firestoreService;
        this.objectMapper = objectMapper != null ? objectMapper : ObjectMapper.getDefault();
    }

    private record ResolvedCourse(
        String courseId,
        String courseTitle,
        String ueCode,
        String ueId
    ) {}

    private ResolvedCourse resolveCourse(String courseOrUe) {
        String resolvedCourseId = (activeCourseId != null && !activeCourseId.isBlank()) ? activeCourseId : "course-general";
        String resolvedCourseTitle = (activeCourseTitle != null && !activeCourseTitle.isBlank()) ? activeCourseTitle : "Cours PASS Médecine";
        String resolvedUeCode = (activeUeCode != null && !activeUeCode.isBlank()) ? activeUeCode : "UE";
        String resolvedUeId = (activeUeId != null && !activeUeId.isBlank()) ? activeUeId : "ue1";

        if (courseOrUe != null && !courseOrUe.isBlank()) {
            String target = courseOrUe.trim().toLowerCase();

            // 1. Direct match with active course
            if (activeCourseId != null && (activeCourseId.equalsIgnoreCase(target) || (activeCourseTitle != null && (activeCourseTitle.toLowerCase().contains(target) || target.contains(activeCourseTitle.toLowerCase()))))) {
                resolvedCourseId = activeCourseId;
                resolvedCourseTitle = activeCourseTitle;
                if (activeUeCode != null) resolvedUeCode = activeUeCode;
                if (activeUeId != null) resolvedUeId = activeUeId;
            } else {
                // 2. Specific Course ID or Title match in Firestore
                Optional<Course> courseOpt = firestoreService.getAllCourses().stream()
                    .filter(c -> c.id().equalsIgnoreCase(target) ||
                                 c.title().equalsIgnoreCase(target) ||
                                 c.title().toLowerCase().contains(target) ||
                                 target.contains(c.title().toLowerCase()))
                    .findFirst();

                if (courseOpt.isPresent()) {
                    Course c = courseOpt.get();
                    resolvedCourseId = c.id();
                    resolvedCourseTitle = c.title();
                    resolvedUeCode = c.ueCode();
                    resolvedUeId = c.ueId();
                } else if (activeCourseId != null && !activeCourseId.isBlank()) {
                    resolvedCourseId = activeCourseId;
                    resolvedCourseTitle = activeCourseTitle != null ? activeCourseTitle : resolvedCourseTitle;
                    if (activeUeCode != null) resolvedUeCode = activeUeCode;
                    if (activeUeId != null) resolvedUeId = activeUeId;
                } else {
                    Optional<SubjectUE> ueOpt = firestoreService.getAllSubjects().stream()
                        .filter(u -> u.id().equalsIgnoreCase(target) || u.code().equalsIgnoreCase(target))
                        .findFirst();
                    if (ueOpt.isPresent()) {
                        SubjectUE ue = ueOpt.get();
                        resolvedUeCode = ue.code();
                        resolvedUeId = ue.id();
                        resolvedCourseTitle = ue.name();
                    } else if (courseOrUe.toUpperCase().startsWith("UE") || courseOrUe.length() <= 8) {
                        resolvedUeCode = courseOrUe.toUpperCase();
                        resolvedUeId = courseOrUe.toLowerCase();
                        resolvedCourseTitle = "Matière " + resolvedUeCode;
                    }
                }
            }
        }
        return new ResolvedCourse(resolvedCourseId, resolvedCourseTitle, resolvedUeCode, resolvedUeId);
    }

    private List<String> buildTags(String tagsCsv, String ueCode) {
        List<String> tags = new ArrayList<>();
        if (tagsCsv != null && !tagsCsv.isBlank()) {
            for (String t : tagsCsv.split(",")) {
                String clean = t.trim();
                if (!clean.isEmpty()) tags.add(clean);
            }
        }
        if (ueCode != null && !tags.contains(ueCode)) {
            tags.add(0, ueCode);
        }
        return tags;
    }

    /**
     * LangChain4j Tool enabling Gemini to create and persist active recall flashcards.
     */
    @Tool("Génère et enregistre une fiche de mémorisation active / flashcard médicale granulaire (Question simple au Recto / Réponse succincte au Verso / Indice) rattachée au cours en base de données.")
    public String createAndSaveFlashcard(
        @P("Question simple et ciblée du Recto portant sur un point unique (face visible de la carte)") String front,
        @P("Réponse succincte, directe et percutante du Verso (1 à 2 phrases max, formule ou valeur directe ; éviter absolument les pavés de texte)") String back,
        @P("Indice de mémorisation / amorce optionnelle pour aider l'étudiant à se remémorer") String hint,
        @P("Identifiant, titre ou code du cours ou de l'UE (ex: 'UE3', 'Pharmacocinétique', 'course-ue5-membre-sup')") String courseOrUe,
        @P("Niveau de difficulté de 1 (facile) à 5 (difficile / pièges de concours)") int difficulty,
        @P("Mots-clés / tags de la flashcard séparés par des virgules") String tagsCsv
    ) {
        LOG.info("LangChain4j @Tool createAndSaveFlashcard invoked for front: '{}'", front);

        ResolvedCourse rc = resolveCourse(courseOrUe);
        List<String> tags = buildTags(tagsCsv, rc.ueCode());

        String cardId = "fc-" + UUID.randomUUID();
        Flashcard flashcard = new Flashcard(
            cardId,
            rc.courseId(),
            rc.courseTitle(),
            rc.ueCode(),
            rc.ueId(),
            front != null ? front.trim() : "Question",
            back != null ? back.trim() : "Réponse",
            (hint != null && !hint.isBlank()) ? hint.trim() : null,
            Math.max(1, Math.min(5, difficulty)),
            false,
            tags,
            0,
            null,
            LocalDateTime.now()
        );

        firestoreService.saveFlashcard(flashcard);
        recentlyCreatedFlashcards.add(flashcard);

        LOG.info("Successfully created and persisted Flashcard id='{}', front='{}', course='{}'",
            cardId, front, rc.courseTitle());

        return String.format("Flashcard créée avec succès (ID: %s, Cours: %s). Recto: '%s' | Verso: '%s'",
            cardId, rc.courseTitle(), front, back);
    }

    /**
     * LangChain4j Tool enabling Gemini to create and persist multiple active recall flashcards in a single batch.
     */
    @Tool("Génère et enregistre plusieurs fiches de mémorisation active / flashcards médicales granulaires d'un coup en base de données à partir d'une liste JSON (privilégier plusieurs cartes simples et ciblées plutôt qu'une seule carte surchargée d'informations).")
    public String createAndSaveFlashcards(
        @P("Liste des flashcards granulaires à créer sous forme JSON: [{\"front\":\"Question simple et ciblée\",\"back\":\"Réponse succincte (1-2 phrases max)\",\"hint\":\"Indice\",\"difficulty\":3,\"tagsCsv\":\"UE1,Biomembranes\"}]") String flashcardsJson,
        @P("Identifiant, titre ou code du cours ou de l'UE (ex: 'UE1', 'Biochimie', 'course-ue1-membranes')") String courseOrUe
    ) {
        LOG.info("LangChain4j @Tool createAndSaveFlashcards invoked with payload length: {}",
            flashcardsJson != null ? flashcardsJson.length() : 0);

        if (flashcardsJson == null || flashcardsJson.isBlank()) {
            return "Aucune flashcard fournie.";
        }

        String cleanJson = flashcardsJson.trim();
        if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replaceAll("^```[a-zA-Z]*\\s*", "").replaceAll("\\s*```$", "").trim();
        }

        List<Map<String, Object>> items = new ArrayList<>();
        try {
            if (cleanJson.startsWith("[")) {
                List<Map> rawList = objectMapper.readValue(cleanJson, Argument.listOf(Map.class));
                if (rawList != null) {
                    for (Map m : rawList) {
                        items.add((Map<String, Object>) m);
                    }
                }
            } else if (cleanJson.startsWith("{")) {
                Map rawMap = objectMapper.readValue(cleanJson, Argument.of(Map.class));
                if (rawMap != null) {
                    items.add((Map<String, Object>) rawMap);
                }
            }
        } catch (Exception e) {
            LOG.warn("Could not parse flashcards JSON via ObjectMapper: {}", e.getMessage());
        }

        if (items.isEmpty()) {
            return "Impossible d'extraire des flashcards valides du format JSON fourni.";
        }

        ResolvedCourse rc = resolveCourse(courseOrUe);
        List<Flashcard> createdBatch = new ArrayList<>();

        for (Map<String, Object> item : items) {
            Object frontObj = item.get("front") != null ? item.get("front") : item.get("question");
            Object backObj = item.get("back") != null ? item.get("back") : item.get("answer");
            Object hintObj = item.get("hint");
            Object diffObj = item.get("difficulty");
            Object tagsObj = item.get("tagsCsv") != null ? item.get("tagsCsv") : item.get("tags");

            String front = frontObj != null ? frontObj.toString().trim() : null;
            String back = backObj != null ? backObj.toString().trim() : null;
            String hint = (hintObj != null && !hintObj.toString().isBlank()) ? hintObj.toString().trim() : null;

            if (front == null || front.isBlank() || back == null || back.isBlank()) {
                continue;
            }

            int difficulty = 3;
            if (diffObj instanceof Number n) {
                difficulty = n.intValue();
            } else if (diffObj != null) {
                try {
                    difficulty = Integer.parseInt(diffObj.toString().trim());
                } catch (NumberFormatException ignored) {}
            }
            difficulty = Math.max(1, Math.min(5, difficulty));

            String tagsCsv = tagsObj != null ? tagsObj.toString() : null;
            List<String> tags = buildTags(tagsCsv, rc.ueCode());

            String cardId = "fc-" + UUID.randomUUID();
            Flashcard flashcard = new Flashcard(
                cardId,
                rc.courseId(),
                rc.courseTitle(),
                rc.ueCode(),
                rc.ueId(),
                front,
                back,
                hint,
                difficulty,
                false,
                tags,
                0,
                null,
                LocalDateTime.now()
            );

            firestoreService.saveFlashcard(flashcard);
            recentlyCreatedFlashcards.add(flashcard);
            createdBatch.add(flashcard);
        }

        LOG.info("Successfully created and persisted {} flashcards for course '{}'",
            createdBatch.size(), rc.courseTitle());

        return String.format("%d flashcard(s) créée(s) et enregistrée(s) avec succès pour le cours '%s'.",
            createdBatch.size(), rc.courseTitle());
    }

    public List<Flashcard> getAndClearRecentlyCreatedFlashcards() {
        synchronized (recentlyCreatedFlashcards) {
            List<Flashcard> copy = new ArrayList<>(recentlyCreatedFlashcards);
            recentlyCreatedFlashcards.clear();
            return copy;
        }
    }
}
