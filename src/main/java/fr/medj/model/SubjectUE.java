package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record SubjectUE(
    String id,
    String code,
    String name,
    String description,
    String color,
    int coefficient,
    List<Integer> customIntervals,
    String icon
) {
    public static List<SubjectUE> getDefaultPassUEs() {
        return List.of(
            new SubjectUE("ue1", "UE1", "Atomes, Biomolécules, Génome & Métabolisme", "Chimie générale, chimie organique, biochimie structurale, biologie moléculaire et enzymologie", "#3B82F6", 10, List.of(0, 1, 3, 7, 14, 30, 60), "Atom"),
            new SubjectUE("ue2", "UE2", "La Cellule et les Tissus", "Biologie cellulaire, cytologie, épithéliums, tissus conjonctifs et embryologie précoce", "#10B981", 10, List.of(0, 1, 3, 7, 14, 30, 60), "Dna"),
            new SubjectUE("ue3", "UE3", "Organisation des Appareils et Systèmes : Bases Physiques", "Mécanique des fluides, transports membranaires, rayonnements ionisants, RMN et imagerie", "#F59E0B", 10, List.of(0, 1, 3, 7, 14, 30, 60), "Activity"),
            new SubjectUE("ue4", "UE4", "Évaluation des Méthodes d'Analyses & Biostatistiques", "Biomathématiques, probabilités, tests statistiques d'hypothèses, métrologie et essais cliniques", "#8B5CF6", 6, List.of(0, 1, 3, 7, 14, 30, 60), "BarChart3"),
            new SubjectUE("ue5", "UE5", "Organisation des Appareils et Systèmes : Anatomie", "Ostéologie, arthrologie, myologie, membres, tronc, viscères, système nerveux et radio-anatomie", "#EC4899", 10, List.of(0, 1, 3, 7, 14, 30, 60), "HeartPulse"),
            new SubjectUE("ue6", "UE6", "Initiation à la Connaissance du Médicament (ICM)", "Cibles médicamenteuses, pharmacodynamie, pharmacocinétique, développement et bon usage", "#06B6D4", 8, List.of(0, 1, 3, 7, 14, 30, 60), "Pill"),
            new SubjectUE("ue7", "UE7", "Santé, Société, Humanité (SSH) & Santé Publique", "Histoire de la médecine, éthique biomédicale, droit de la santé, démographie et épidémiologie", "#F97316", 8, List.of(0, 1, 3, 7, 14, 30, 60), "Users"),
            new SubjectUE("ue8", "UE8", "UE Spécifique (Physiopathologie Moléculaire & Spécialités)", "Génétique médicale, hémoglobines, p53, prions, anatomie appliquée et galénique", "#6366F1", 10, List.of(0, 1, 3, 7, 14, 30, 60), "Stethoscope"),
            new SubjectUE("ue-min", "Mineure", "Option Disciplinaire", "Mineure disciplinaire universitaire (Droit, Sciences fondamentales, Économie-Gestion)", "#64748B", 12, List.of(0, 1, 3, 7, 14, 30, 60), "GraduationCap")
        );
    }
}
