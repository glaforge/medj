package fr.medj.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import fr.medj.model.Course;
import fr.medj.model.Flashcard;
import fr.medj.model.SubjectUE;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;

@Singleton
public class MedicalFlashcardTools {
    private static final Logger LOG = LoggerFactory.getLogger(MedicalFlashcardTools.class);

    private final FirestoreService firestoreService;
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
        this.firestoreService = firestoreService;
    }

    /**
     * LangChain4j Tool enabling Gemini to create and persist active recall flashcards.
     */
    @Tool("Génère et enregistre une fiche de mémorisation active / flashcard médicale (Question Recto / Réponse Verso / Indice) rattachée au cours en base de données.")
    public String createAndSaveFlashcard(
        @P("Question ou concept clé du Recto (face visible de la carte)") String front,
        @P("Réponse détaillée, formule ou explication du Verso (face cachée)") String back,
        @P("Indice de mémorisation / amorce optionnelle pour aider l'étudiant à se remémorer") String hint,
        @P("Identifiant, titre ou code du cours ou de l'UE (ex: 'UE3', 'Pharmacocinétique', 'course-ue5-membre-sup')") String courseOrUe,
        @P("Niveau de difficulté de 1 (facile) à 5 (difficile / pièges de concours)") int difficulty,
        @P("Mots-clés / tags de la flashcard séparés par des virgules") String tagsCsv
    ) {
        LOG.info("LangChain4j @Tool createAndSaveFlashcard invoked for front: '{}'", front);

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

        List<String> tags = new ArrayList<>();
        if (tagsCsv != null && !tagsCsv.isBlank()) {
            for (String t : tagsCsv.split(",")) {
                String clean = t.trim();
                if (!clean.isEmpty()) tags.add(clean);
            }
        }
        if (!tags.contains(resolvedUeCode)) {
            tags.add(0, resolvedUeCode);
        }

        String cardId = "fc-" + UUID.randomUUID();
        Flashcard flashcard = new Flashcard(
            cardId,
            resolvedCourseId,
            resolvedCourseTitle,
            resolvedUeCode,
            resolvedUeId,
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
            cardId, front, resolvedCourseTitle);

        return String.format("Flashcard créée avec succès (ID: %s, Cours: %s). Recto: '%s' | Verso: '%s'",
            cardId, resolvedCourseTitle, front, back);
    }

    public List<Flashcard> getAndClearRecentlyCreatedFlashcards() {
        synchronized (recentlyCreatedFlashcards) {
            List<Flashcard> copy = new ArrayList<>(recentlyCreatedFlashcards);
            recentlyCreatedFlashcards.clear();
            return copy;
        }
    }
}
