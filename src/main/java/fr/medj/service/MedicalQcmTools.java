package fr.medj.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import fr.medj.model.Course;
import fr.medj.model.QcmItem;
import fr.medj.model.QcmQuestion;
import fr.medj.model.SubjectUE;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.*;

@Singleton
public class MedicalQcmTools {
    private static final Logger LOG = LoggerFactory.getLogger(MedicalQcmTools.class);

    private final FirestoreService firestoreService;
    private final List<QcmQuestion> recentlyCreatedQcms = Collections.synchronizedList(new ArrayList<>());

    public MedicalQcmTools(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }

    /**
     * LangChain4j Tool enabling Gemini to create and persist official PASS medical QCMs.
     */
    @Tool("Génère et enregistre un QCM d'entraînement médical officiel PASS/LAS dans la base de données avec 5 items A-E indépendamment VRAI ou FAUX, explications détaillées et détection de pièges.")
    public String createAndSaveQcm(
        @P("Énoncé précis du QCM (la question médicale)") String questionStem,
        @P("Identifiant ou code du cours ou de l'UE (ex: 'ue5', 'UE5', 'Pharmacocinétique', 'course-ue5-membre-sup')") String courseOrUe,
        @P("Niveau de difficulté de 1 (facile) à 5 (difficile / pièges de concours)") int difficulty,
        @P("Moyen mnémotechnique utile pour mémoriser la notion") String mnemonic,
        @P("Mots-clés / tags du QCM séparés par des virgules") String tagsCsv,
        @P("Proposition Item A") String itemAText,
        @P("L'item A est-il VRAI (true) ou FAUX (false)") boolean itemAIsTrue,
        @P("Justification et explication de l'item A") String itemAExplanation,
        @P("L'item A contient-il un piège classique de concours (true/false)") boolean itemAIsTrap,
        @P("Proposition Item B") String itemBText,
        @P("L'item B est-il VRAI (true) ou FAUX (false)") boolean itemBIsTrue,
        @P("Justification et explication de l'item B") String itemBExplanation,
        @P("L'item B contient-il un piège classique de concours (true/false)") boolean itemBIsTrap,
        @P("Proposition Item C") String itemCText,
        @P("L'item C est-il VRAI (true) ou FAUX (false)") boolean itemCIsTrue,
        @P("Justification et explication de l'item C") String itemCExplanation,
        @P("L'item C contient-il un piège classique de concours (true/false)") boolean itemCIsTrap,
        @P("Proposition Item D") String itemDText,
        @P("L'item D est-il VRAI (true) ou FAUX (false)") boolean itemDIsTrue,
        @P("Justification et explication de l'item D") String itemDExplanation,
        @P("L'item D contient-il un piège classique de concours (true/false)") boolean itemDIsTrap,
        @P("Proposition Item E") String itemEText,
        @P("L'item E est-il VRAI (true) ou FAUX (false)") boolean itemEIsTrue,
        @P("Justification et explication de l'item E") String itemEExplanation,
        @P("L'item E contient-il un piège classique de concours (true/false)") boolean itemEIsTrap
    ) {
        LOG.info("LangChain4j @Tool createAndSaveQcm invoked for topic: '{}'", questionStem);

        // Find associated course or subject
        String resolvedCourseId = "course-general";
        String resolvedCourseTitle = "Cours PASS Médecine";
        String resolvedUeCode = "UE";

        if (courseOrUe != null && !courseOrUe.isBlank()) {
            String target = courseOrUe.trim().toLowerCase();
            Optional<Course> courseOpt = firestoreService.getAllCourses().stream()
                .filter(c -> c.id().equalsIgnoreCase(target) ||
                             c.title().toLowerCase().contains(target) ||
                             c.ueCode().equalsIgnoreCase(target) ||
                             c.ueId().equalsIgnoreCase(target))
                .findFirst();

            if (courseOpt.isPresent()) {
                Course c = courseOpt.get();
                resolvedCourseId = c.id();
                resolvedCourseTitle = c.title();
                resolvedUeCode = c.ueCode();
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

        List<QcmItem> items = List.of(
            new QcmItem("A", itemAText != null ? itemAText : "Proposition A", itemAIsTrue, itemAExplanation != null ? itemAExplanation : (itemAIsTrue ? "VRAI" : "FAUX"), itemAIsTrap, itemAIsTrap ? "Piège classique PASS" : ""),
            new QcmItem("B", itemBText != null ? itemBText : "Proposition B", itemBIsTrue, itemBExplanation != null ? itemBExplanation : (itemBIsTrue ? "VRAI" : "FAUX"), itemBIsTrap, itemBIsTrap ? "Piège classique PASS" : ""),
            new QcmItem("C", itemCText != null ? itemCText : "Proposition C", itemCIsTrue, itemCExplanation != null ? itemCExplanation : (itemCIsTrue ? "VRAI" : "FAUX"), itemCIsTrap, itemCIsTrap ? "Piège classique PASS" : ""),
            new QcmItem("D", itemDText != null ? itemDText : "Proposition D", itemDIsTrue, itemDExplanation != null ? itemDExplanation : (itemDIsTrue ? "VRAI" : "FAUX"), itemDIsTrap, itemDIsTrap ? "Piège classique PASS" : ""),
            new QcmItem("E", itemEText != null ? itemEText : "Proposition E", itemEIsTrue, itemEExplanation != null ? itemEExplanation : (itemEIsTrue ? "VRAI" : "FAUX"), itemEIsTrap, itemEIsTrap ? "Piège classique PASS" : "")
        );

        List<String> tags = new ArrayList<>();
        if (tagsCsv != null && !tagsCsv.isBlank()) {
            for (String t : tagsCsv.split(",")) {
                if (!t.trim().isEmpty()) tags.add(t.trim());
            }
        }
        if (tags.isEmpty()) tags.add(resolvedUeCode);

        List<String> mnemonics = new ArrayList<>();
        if (mnemonic != null && !mnemonic.isBlank()) {
            mnemonics.add(mnemonic.trim());
        }

        String qcmId = "qcm-" + UUID.randomUUID();
        QcmQuestion qcm = new QcmQuestion(
            qcmId,
            resolvedCourseId,
            resolvedCourseTitle,
            resolvedUeCode,
            questionStem != null && !questionStem.isBlank() ? questionStem : "QCM d'entraînement PASS",
            items,
            difficulty > 0 ? Math.min(difficulty, 5) : 3,
            "TUTEUR_TOOL_GENERATED",
            "2025",
            tags,
            mnemonics,
            LocalDateTime.now()
        );

        firestoreService.saveQcm(qcm);
        recentlyCreatedQcms.add(qcm);

        LOG.info("QCM successfully saved to database with ID: '{}' for course: '{}'", qcmId, resolvedCourseTitle);

        return "SUCCESS: Le QCM a été créé avec succès et enregistré dans l'application sous l'identifiant " + qcmId
            + " pour le cours '" + resolvedCourseTitle + "' (" + resolvedUeCode + ").";
    }

    public List<QcmQuestion> pollRecentlyCreatedQcms() {
        synchronized (recentlyCreatedQcms) {
            List<QcmQuestion> copy = new ArrayList<>(recentlyCreatedQcms);
            recentlyCreatedQcms.clear();
            return copy;
        }
    }
}
