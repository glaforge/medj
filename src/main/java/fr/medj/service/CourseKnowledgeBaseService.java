package fr.medj.service;

import fr.medj.model.Course;
import fr.medj.model.CourseKnowledgeSource;
import fr.medj.model.CourseKnowledgeSourcesResponse;
import fr.medj.model.HandwrittenScanResult;
import jakarta.inject.Singleton;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Singleton
public class CourseKnowledgeBaseService {
    private static final Logger LOG = LoggerFactory.getLogger(CourseKnowledgeBaseService.class);
    private static final int MAX_PDF_PAGES_EXTRACT = 30;
    private static final int MAX_PDF_CHARS_EXTRACT = 60_000;

    private final FirestoreService firestoreService;
    private final StorageService storageService;

    public record CourseKnowledgeBase(
        String courseId,
        String courseTitle,
        String ueCode,
        String ueId,
        String formattedContent,
        List<byte[]> rawPdfAttachments,
        List<String> sourcesUsed,
        int totalSourcesCount,
        boolean hasContent
    ) {}

    public CourseKnowledgeBaseService(FirestoreService firestoreService, StorageService storageService) {
        this.firestoreService = firestoreService;
        this.storageService = storageService;
    }

    /**
     * Inspects available sources for a course and returns the list of source descriptors.
     */
    public CourseKnowledgeSourcesResponse getKnowledgeSources(String courseId) {
        if (courseId == null || courseId.isBlank()) {
            return new CourseKnowledgeSourcesResponse("unknown", "Cours inconnu", "UE", List.of(), 0);
        }

        Optional<Course> courseOpt = firestoreService.getCourse(courseId);
        String courseTitle = courseOpt.map(Course::title).orElse("Cours");
        String ueCode = courseOpt.map(Course::ueCode).orElse("UE");

        List<CourseKnowledgeSource> sources = new ArrayList<>();

        // 1. Course Notes
        courseOpt.ifPresent(c -> {
            if (c.notes() != null && !c.notes().trim().isBlank()) {
                String clean = c.notes().trim();
                String desc = clean.length() > 140 ? clean.substring(0, 140).replaceAll("[\\r\\n]+", " ") + "..." : clean.replaceAll("[\\r\\n]+", " ");
                sources.add(new CourseKnowledgeSource(
                    "notes",
                    "NOTES",
                    "Notes rédigées du cours",
                    desc,
                    clean.length(),
                    null,
                    c.updatedAt() != null ? c.updatedAt() : c.createdAt(),
                    List.of("Notes", c.ueCode() != null ? c.ueCode() : "PASS")
                ));
            }

            // 2. Attached documents (PDFs, Images)
            if (c.documents() != null) {
                for (Course.DocumentAttachment doc : c.documents()) {
                    boolean isPdf = (doc.fileType() != null && doc.fileType().equalsIgnoreCase("PDF"))
                        || (doc.name() != null && doc.name().toLowerCase().endsWith(".pdf"));
                    String type = isPdf ? "PDF" : "ATTACHMENT";
                    String desc = isPdf ? "Polycopié / Document de cours au format PDF" : ("Fichier rattaché (" + doc.fileType() + ")");
                    sources.add(new CourseKnowledgeSource(
                        doc.id(),
                        type,
                        doc.name() != null ? doc.name() : "Document joint",
                        desc,
                        doc.sizeBytes(),
                        doc.storageUrl(),
                        doc.uploadedAt(),
                        List.of(isPdf ? "Polycopié PDF" : "Document", c.ueCode() != null ? c.ueCode() : "UE")
                    ));
                }
            }
        });

        // 3. Handwritten / Photo Scans
        List<HandwrittenScanResult> scans = firestoreService.getScansForCourse(courseId);
        for (int i = 0; i < scans.size(); i++) {
            HandwrittenScanResult s = scans.get(i);
            String title = "Fiche / Photo numérisée #" + (i + 1);
            StringBuilder desc = new StringBuilder();
            if (s.potentialExamTraps() != null && !s.potentialExamTraps().isEmpty()) {
                desc.append("Piège : ").append(s.potentialExamTraps().get(0));
            } else if (s.keyPoints() != null && !s.keyPoints().isEmpty()) {
                desc.append("Point clé : ").append(s.keyPoints().get(0));
            } else if (s.transcriptionMarkdown() != null && !s.transcriptionMarkdown().isBlank()) {
                String clean = s.transcriptionMarkdown().trim().replaceAll("[#*`]+", "").replaceAll("[\\r\\n]+", " ");
                desc.append(clean.length() > 120 ? clean.substring(0, 120) + "..." : clean);
            } else {
                desc.append("Fiche de révision avec OCR et extraction médicale");
            }

            long size = s.transcriptionMarkdown() != null ? s.transcriptionMarkdown().length() : 0;
            String preview = s.imageUrl() != null ? s.imageUrl() : (!s.imageUrls().isEmpty() ? s.imageUrls().get(0) : null);
            sources.add(new CourseKnowledgeSource(
                s.id(),
                "SCAN",
                title,
                desc.toString(),
                size,
                preview,
                s.scannedAt(),
                List.of("Scan IA", "Fiche Manuscrite")
            ));
        }

        return new CourseKnowledgeSourcesResponse(courseId, courseTitle, ueCode, sources, sources.size());
    }

    /**
     * Builds an aggregated knowledge base for the specified course, taking into account
     * granular source selections or boolean filter flags.
     */
    public CourseKnowledgeBase buildKnowledgeBase(
        String courseId,
        List<String> selectedSourceIds,
        Boolean includeNotes,
        Boolean includeScans,
        Boolean includePdfs,
        String customPrompt
    ) {
        Optional<Course> courseOpt = (courseId != null && !courseId.isBlank()) ? firestoreService.getCourse(courseId) : Optional.empty();

        String courseTitle = courseOpt.map(Course::title).orElse("Cours PASS");
        String ueCode = courseOpt.map(Course::ueCode).orElse("UE");
        String ueId = courseOpt.map(Course::ueId).orElse("ue1");

        boolean hasGranularSelection = selectedSourceIds != null && !selectedSourceIds.isEmpty();
        Set<String> selectedIds = hasGranularSelection ? new HashSet<>(selectedSourceIds) : Set.of();

        boolean allowNotes = hasGranularSelection ? selectedIds.contains("notes") : (includeNotes == null || includeNotes);
        boolean allowScans = hasGranularSelection || (includeScans == null || includeScans);
        boolean allowPdfs = hasGranularSelection || (includePdfs == null || includePdfs);

        StringBuilder knowledgeText = new StringBuilder();
        List<byte[]> rawPdfAttachments = new ArrayList<>();
        List<String> sourcesUsed = new ArrayList<>();

        knowledgeText.append("# BASE DE CONNAISSANCES DU COURS : ").append(courseTitle)
            .append(" (UE : ").append(ueCode).append(")\n\n");

        // 1. Course Notes
        if (allowNotes && courseOpt.isPresent()) {
            Course c = courseOpt.get();
            if (c.notes() != null && !c.notes().trim().isBlank()) {
                knowledgeText.append("## 📝 Notes et Synthèses Rédigées par l'Étudiant\n\n")
                    .append(c.notes().trim())
                    .append("\n\n---\n\n");
                sourcesUsed.add("Notes du cours (" + c.notes().trim().length() + " caractères)");
                LOG.info("Included course notes for knowledge base of '{}'", courseTitle);
            }
        }

        // 2. Attached PDF Documents
        if (allowPdfs && courseOpt.isPresent()) {
            Course c = courseOpt.get();
            if (c.documents() != null) {
                for (Course.DocumentAttachment doc : c.documents()) {
                    // Check if selected
                    if (hasGranularSelection && !selectedIds.contains(doc.id())) {
                        continue;
                    }

                    boolean isPdf = (doc.fileType() != null && doc.fileType().equalsIgnoreCase("PDF"))
                        || (doc.name() != null && doc.name().toLowerCase().endsWith(".pdf"));

                    if (isPdf) {
                        try {
                            byte[] pdfBytes = storageService.readFileBytes(doc.storageUrl());
                            if (pdfBytes != null && pdfBytes.length > 0) {
                                String extracted = extractTextFromPdf(pdfBytes, MAX_PDF_PAGES_EXTRACT);
                                if (extracted != null && extracted.trim().length() >= 50) {
                                    knowledgeText.append("## 📚 Polycopié / Document PDF Joint : ").append(doc.name()).append("\n\n")
                                        .append(extracted.trim())
                                        .append("\n\n---\n\n");
                                    sourcesUsed.add("PDF : " + doc.name() + " (" + extracted.trim().length() + " caractères extraits)");
                                    LOG.info("Extracted and included {} chars of text from PDF '{}'", extracted.trim().length(), doc.name());
                                } else {
                                    // Scanned image-only PDF: add bytes for multimodal Gemini call
                                    rawPdfAttachments.add(pdfBytes);
                                    knowledgeText.append("## 📚 Document PDF Numérisé (Multimodal) : ").append(doc.name()).append("\n")
                                        .append("*(Le document PDF '").append(doc.name())
                                        .append("' est transmis directement à l'analyse multimodale Gemini).*\n\n---\n\n");
                                    sourcesUsed.add("PDF Scanné (Multimodal) : " + doc.name());
                                    LOG.info("PDF '{}' has minimal selectable text, attached as multimodal Part ({} bytes)", doc.name(), pdfBytes.length);
                                }
                            }
                        } catch (Exception e) {
                            LOG.warn("Failed to load PDF bytes for document '{}' ({}) : {}", doc.name(), doc.storageUrl(), e.getMessage());
                        }
                    }
                }
            }
        }

        // 3. Handwritten / Photo Scans
        if (allowScans && courseId != null && !courseId.isBlank()) {
            List<HandwrittenScanResult> scans = firestoreService.getScansForCourse(courseId);
            for (int i = 0; i < scans.size(); i++) {
                HandwrittenScanResult scan = scans.get(i);
                // Check if selected
                if (hasGranularSelection && !selectedIds.contains(scan.id())) {
                    continue;
                }

                knowledgeText.append("## 📑 Fiche de Révision Numérisée par l'IA #").append(i + 1).append("\n\n");

                if (scan.transcriptionMarkdown() != null && !scan.transcriptionMarkdown().isBlank()) {
                    knowledgeText.append("### Transcription & Synthèse des Notes Manuscrites :\n")
                        .append(scan.transcriptionMarkdown().trim())
                        .append("\n\n");
                }

                if (scan.keyPoints() != null && !scan.keyPoints().isEmpty()) {
                    knowledgeText.append("### Points Clés Incontournables :\n");
                    for (String kp : scan.keyPoints()) {
                        knowledgeText.append("- ").append(kp).append("\n");
                    }
                    knowledgeText.append("\n");
                }

                if (scan.potentialExamTraps() != null && !scan.potentialExamTraps().isEmpty()) {
                    knowledgeText.append("### Pièges Classiques de Concours Identifiés :\n");
                    for (String trap : scan.potentialExamTraps()) {
                        knowledgeText.append("- ⚠️ ").append(trap).append("\n");
                    }
                    knowledgeText.append("\n");
                }

                if (scan.anatomicalTerms() != null && !scan.anatomicalTerms().isEmpty()) {
                    knowledgeText.append("### Termes Anatomiques & Médicaux (Nomenclature Officielle) :\n");
                    knowledgeText.append(String.join(", ", scan.anatomicalTerms())).append("\n\n");
                }

                if (scan.keyFiguresAndValues() != null && !scan.keyFiguresAndValues().isEmpty()) {
                    knowledgeText.append("### Chiffres, Constantes & Valeurs Numériques :\n");
                    for (String val : scan.keyFiguresAndValues()) {
                        knowledgeText.append("- ").append(val).append("\n");
                    }
                    knowledgeText.append("\n");
                }

                knowledgeText.append("---\n\n");
                sourcesUsed.add("Fiche numérisée #" + (i + 1));
                LOG.info("Included scan '{}' in knowledge base for '{}'", scan.id(), courseTitle);
            }
        }

        // 4. Custom prompt or focus
        if (customPrompt != null && !customPrompt.trim().isBlank()) {
            knowledgeText.append("## 🎯 Consigne / Focus Particulier de Révision Demandé par l'Étudiant\n\n")
                .append(customPrompt.trim())
                .append("\n\n");
        }

        boolean hasContent = !sourcesUsed.isEmpty() || (customPrompt != null && !customPrompt.trim().isBlank());

        return new CourseKnowledgeBase(
            courseId,
            courseTitle,
            ueCode,
            ueId,
            knowledgeText.toString(),
            rawPdfAttachments,
            sourcesUsed,
            sourcesUsed.size(),
            hasContent
        );
    }

    /**
     * Extracts plain text from PDF bytes using Apache PDFBox 3.0.
     */
    public String extractTextFromPdf(byte[] pdfBytes, int maxPages) {
        if (pdfBytes == null || pdfBytes.length == 0) return "";
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            if (maxPages > 0 && document.getNumberOfPages() > maxPages) {
                stripper.setEndPage(maxPages);
            }
            String text = stripper.getText(document);
            if (text != null && text.length() > MAX_PDF_CHARS_EXTRACT) {
                text = text.substring(0, MAX_PDF_CHARS_EXTRACT) + "\n\n... [Texte tronqué au-delà de " + MAX_PDF_CHARS_EXTRACT + " caractères]";
            }
            return text != null ? text.trim() : "";
        } catch (Exception e) {
            LOG.warn("Could not extract text from PDF using PDFBox: {}", e.getMessage());
            return "";
        }
    }
}
