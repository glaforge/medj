package fr.medj.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import fr.medj.model.Course;
import fr.medj.model.MedicalIllustration;
import fr.medj.model.SubjectUE;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;

@Singleton
public class MedicalIllustrationTools {
    private static final Logger LOG = LoggerFactory.getLogger(MedicalIllustrationTools.class);

    private final FirestoreService firestoreService;
    private final StorageService storageService;
    private final List<MedicalIllustration> recentlyCreatedIllustrations = Collections.synchronizedList(new ArrayList<>());

    // Injected image generator function callback if available
    private IllustrationImageGenerator imageGenerator;

    public interface IllustrationImageGenerator {
        String generateImageForPrompt(String visualPrompt, String type);
    }

    private String activeCourseId;
    private String activeCourseTitle;
    private String activeUeCode;

    public void setActiveCourse(String courseId, String courseTitle, String ueCode) {
        this.activeCourseId = courseId;
        this.activeCourseTitle = courseTitle;
        this.activeUeCode = ueCode;
    }

    public MedicalIllustrationTools(FirestoreService firestoreService, StorageService storageService) {
        this.firestoreService = firestoreService;
        this.storageService = storageService;
    }

    public void setImageGenerator(IllustrationImageGenerator generator) {
        this.imageGenerator = generator;
    }

    /**
     * LangChain4j Tool enabling Gemini to create and persist official medical diagrams, anatomical sketches,
     * or printable fill-in-the-blank worksheets (dessins à trous).
     */
    @Tool("Génère et enregistre un schéma médical, croquis anatomique ou dessin à trous légendable (avec numéros 1, 2, 3... et corrigé) pour illustrer le cours de l'étudiant. Tous les textes et libellés du schéma doivent être strictement en français.")
    public String createAndSaveMedicalIllustration(
        @P("Titre explicite du schéma médical en français (ex: 'Coupe transversale de la moelle spinale', 'Schéma des cavités et valves cardiaques')") String title,
        @P("Identifiant ou code du cours ou de l'UE (ex: 'ue5', 'UE5', 'course-ue5-membre-sup', 'Anatomie')") String courseOrUe,
        @P("Type d'illustration : 'DESSIN_A_TROUS' (à numéroter/légender pour s'entraîner), 'SCHEMA_ANATOMIQUE', 'SCHEMA_FONCTIONNEL' ou 'CROQUIS_SYNTHETIQUE'") String illustrationType,
        @P("Description visuelle précise, scientifique et détaillée en français ou anglais, avec consigne stricte que tous les libellés écrits sur l'image doivent être en français (nomenclature officielle Terminologia Anatomica)") String visualPrompt,
        @P("Liste des légendes / réponses aux numéros 1..N sous forme de liste de chaînes en français séparées par des points-virgules (ex: '1. Oreillette droite; 2. Valve tricuspide; 3. Ventricule droit')") String legendItemsText
    ) {
        LOG.info("LangChain4j @Tool createAndSaveMedicalIllustration invoked: title='{}', type='{}'", title, illustrationType);

        // Resolve course and subject
        String resolvedCourseId = (activeCourseId != null && !activeCourseId.isBlank()) ? activeCourseId : "course-general";
        String resolvedCourseTitle = (activeCourseTitle != null && !activeCourseTitle.isBlank()) ? activeCourseTitle : "Cours PASS Médecine";
        String resolvedUeCode = (activeUeCode != null && !activeUeCode.isBlank()) ? activeUeCode : "UE";

        if (courseOrUe != null && !courseOrUe.isBlank()) {
            String target = courseOrUe.trim().toLowerCase();
            
            // 1. Direct match with active course
            if (activeCourseId != null && (activeCourseId.equalsIgnoreCase(target) || (activeCourseTitle != null && (activeCourseTitle.toLowerCase().contains(target) || target.contains(activeCourseTitle.toLowerCase()))))) {
                resolvedCourseId = activeCourseId;
                resolvedCourseTitle = activeCourseTitle;
                if (activeUeCode != null) resolvedUeCode = activeUeCode;
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
                } else if (activeCourseId != null && !activeCourseId.isBlank()) {
                    resolvedCourseId = activeCourseId;
                    resolvedCourseTitle = activeCourseTitle != null ? activeCourseTitle : resolvedCourseTitle;
                    if (activeUeCode != null) resolvedUeCode = activeUeCode;
                } else {
                    Optional<SubjectUE> ueOpt = firestoreService.getAllSubjects().stream()
                        .filter(u -> u.id().equalsIgnoreCase(target) || u.code().equalsIgnoreCase(target))
                        .findFirst();
                    if (ueOpt.isPresent()) {
                        resolvedUeCode = ueOpt.get().code();
                        resolvedCourseTitle = ueOpt.get().name();
                    }
                }
            }
        }

        // Parse legend items with parenthesis-aware robust parser
        List<String> legendItems = parseLegendItems(legendItemsText);

        String type = (illustrationType != null && !illustrationType.isBlank())
            ? illustrationType.toUpperCase().trim()
            : "SCHEMA_ANATOMIQUE";

        String illustrationId = "illus-" + UUID.randomUUID();
        String imageUrl = null;

        if (imageGenerator != null) {
            try {
                imageUrl = imageGenerator.generateImageForPrompt(visualPrompt, type);
            } catch (Exception e) {
                LOG.error("Image generation via generator failed: {}", e.getMessage(), e);
            }
        }

        if (imageUrl == null || imageUrl.isBlank()) {
            imageUrl = "/api/storage/illustrations/" + illustrationId + ".png";
        }

        MedicalIllustration illustration = new MedicalIllustration(
            illustrationId,
            resolvedCourseId,
            resolvedCourseTitle,
            resolvedUeCode,
            title != null && !title.isBlank() ? title : "Schéma Médical PASS",
            imageUrl,
            type,
            title,
            visualPrompt,
            legendItems,
            List.of(),
            LocalDateTime.now()
        );

        firestoreService.saveIllustration(illustration);
        recentlyCreatedIllustrations.add(illustration);

        LOG.info("Illustration successfully saved with ID: '{}' for course: '{}'", illustrationId, resolvedCourseTitle);

        return "SUCCESS: L'illustration médicale '" + title + "' (Type: " + type + ") a été générée et enregistrée avec succès sous l'identifiant "
            + illustrationId + " pour le cours '" + resolvedCourseTitle + "'. Elle contient " + legendItems.size() + " éléments de légende.";
    }

    public static List<String> parseLegendItems(String text) {
        if (text == null || text.isBlank()) return new ArrayList<>();

        List<String> rawParts = new ArrayList<>();
        if (text.contains("\n")) {
            for (String line : text.split("\r?\n")) {
                if (!line.isBlank()) rawParts.add(line.trim());
            }
        } else if (text.contains(";")) {
            for (String part : text.split(";")) {
                if (!part.isBlank()) rawParts.add(part.trim());
            }
        } else {
            String[] numParts = text.split("(?<=\\S)\\s+(?=(?:\\d+|[A-Z])[\\.\\)]\\s+)");
            if (numParts.length > 1) {
                for (String p : numParts) {
                    if (!p.isBlank()) rawParts.add(p.trim());
                }
            } else {
                String[] commaParts = text.split(",\\s*(?![^()]*\\))");
                for (String p : commaParts) {
                    if (!p.isBlank()) rawParts.add(p.trim());
                }
            }
        }

        return healSplitLegends(rawParts);
    }

    public static List<String> healSplitLegends(List<String> rawParts) {
        if (rawParts == null || rawParts.isEmpty()) return new ArrayList<>();

        List<String> merged = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int openParenCount = 0;

        for (String p : rawParts) {
            if (p.isBlank()) continue;

            if (current.length() > 0) {
                current.append(", ").append(p);
            } else {
                current.append(p);
            }

            for (char c : p.toCharArray()) {
                if (c == '(') openParenCount++;
                else if (c == ')') openParenCount--;
            }

            if (openParenCount <= 0) {
                merged.add(current.toString().trim());
                current.setLength(0);
                openParenCount = 0;
            }
        }
        if (current.length() > 0) {
            merged.add(current.toString().trim());
        }

        List<String> result = new ArrayList<>();
        for (String it : merged) {
            String clean = it.replaceAll("^[\\-\\•\\*\\s]+", "").trim();
            if (!clean.isBlank()) {
                result.add(clean);
            }
        }
        return result;
    }

    public List<MedicalIllustration> pollRecentlyCreatedIllustrations() {
        synchronized (recentlyCreatedIllustrations) {
            List<MedicalIllustration> copy = new ArrayList<>(recentlyCreatedIllustrations);
            recentlyCreatedIllustrations.clear();
            return copy;
        }
    }
}
