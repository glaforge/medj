package fr.medj.service;

import fr.medj.model.*;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Seeder for the official PASS (Parcours Accès Santé Spécifique) curriculum
 * of Université Paris Cité (Semesters 1 & 2, UE1 to UE8).
 *
 * Courses are staggered across the two university semesters:
 * - Semestre 1 (UE1, UE2, UE3) : 74 courses scheduled 2 per weekday (Monday-Friday) starting September.
 * - Semestre 2 (UE4, UE5, UE6, UE7, UE8) : 112 courses scheduled 2 per weekday (Monday-Friday) starting January.
 */
public final class ParisCiteCurriculumSeeder {

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

        List<Course> list = new ArrayList<>(200);

        // =========================================================================
        // SEMESTRE 1 (74 cours : UE1, UE2, UE3 - 2 cours / jour ouvré du lundi au vendredi)
        // =========================================================================
        // S1 - Day 1 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-01",
            "ue1",
            "UE1",
            "Atomistique : Structure de l'atome et configuration électronique",
            "#3B82F6",
            "Pr. D. Over",
            s1Days.get(0),
            3,
            "EN_COURS",
            List.of("Atomistique", "Orbitales", "Quantique", "Schrödinger"),
            "Nombres quantiques (n, l, m, s). Règles de remplissage : Klechkowski, Hund, Pauli. Notion d'électrons de valence et d'énergie d'ionisation. Attention aux exceptions du bloc d (Cr, Cu).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(0).atTime(8, 30),
            s1Days.get(0).atTime(8, 30)
        ));

        // S1 - Day 1 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-01",
            "ue2",
            "UE2",
            "Organisation générale et évolution de la cellule eucaryote",
            "#10B981",
            "Pr. J.-P. Barbet",
            s1Days.get(0),
            2,
            "EN_COURS",
            List.of("BioCell", "Eucaryote", "Organites", "Évolution"),
            "Théorie endosymbiotique pour la mitochondrie et le chloroplaste. Compartimentation cellulaire et notion de flux membranaire.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(0).atTime(8, 30),
            s1Days.get(0).atTime(8, 30)
        ));

        // S1 - Day 2 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-01",
            "ue3",
            "UE3",
            "Statique des fluides : Pression hydrostatique et tensiométrie",
            "#F59E0B",
            "Pr. B. C. Forget",
            s1Days.get(1),
            3,
            "EN_COURS",
            List.of("StatiqueFluides", "Pression", "Hydrostatique", "Tension"),
            "Loi fondamentale de la statique des fluides : ΔP = rho * g * Δh. Pression absolue vs pression relative. Tension superficielle (loi de Jurin, capillarité).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(1).atTime(8, 30),
            s1Days.get(1).atTime(8, 30)
        ));

        // S1 - Day 2 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-02",
            "ue1",
            "UE1",
            "Liaison chimique, règle de l'octet et modèle de Lewis",
            "#3B82F6",
            "Pr. D. Over",
            s1Days.get(1),
            2,
            "EN_COURS",
            List.of("LiaisonChimique", "Lewis", "Octet", "Électronégativité"),
            "Liaison covalente, moment dipolaire, liaisons hydrogène et de Van der Waals. Hypervalence (PCl5, SF6) et radicaux libres (NO).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(1).atTime(8, 30),
            s1Days.get(1).atTime(8, 30)
        ));

        // S1 - Day 3 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-02",
            "ue2",
            "UE2",
            "Méthodes d'étude de la cellule : Microscopies, fractionnement et cytométrie",
            "#10B981",
            "Pr. C. Becker",
            s1Days.get(2),
            3,
            "EN_COURS",
            List.of("Microscopie", "Méthodes", "Cytométrie", "Centrifugation"),
            "Résolution optique (limite ~0.2 µm) vs électronique (~0.1 nm). Fractionnement par centrifugation différentielle et gradients de densité. Cytométrie en flux et tri cellulaire (FACS).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(2).atTime(8, 30),
            s1Days.get(2).atTime(8, 30)
        ));

        // S1 - Day 3 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-02",
            "ue3",
            "UE3",
            "Dynamique des fluides parfaits : Débit et théorème de Bernoulli",
            "#F59E0B",
            "Pr. B. C. Forget",
            s1Days.get(2),
            3,
            "EN_COURS",
            List.of("Bernoulli", "Débit", "FluidesParfaits", "Continuité"),
            "Équation de continuité S1*v1 = S2*v2. Théorème de Bernoulli : P + 1/2 rho v^2 + rho g z = Cste. Effet Venturi (dépression dans un rétrécissement).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(2).atTime(8, 30),
            s1Days.get(2).atTime(8, 30)
        ));

        // S1 - Day 4 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-03",
            "ue1",
            "UE1",
            "Géométrie moléculaire : Théorie VSEPR et hybridation",
            "#3B82F6",
            "Pr. P. Belmont",
            s1Days.get(3),
            3,
            "EN_COURS",
            List.of("VSEPR", "Hybridation", "Géométrie", "Gillespie"),
            "Modèle AXnEm de Gillespie. Angles de liaison (CH4 = 109.5°, NH3 = 107°, H2O = 104.5°). Hybridation sp3 (tétraédrique), sp2 (trigonale plane), sp (linéaire).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(3).atTime(8, 30),
            s1Days.get(3).atTime(8, 30)
        ));

        // S1 - Day 4 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-03",
            "ue2",
            "UE2",
            "Cytosquelette : Microtubules, centrosome et moteurs moléculaires",
            "#10B981",
            "Pr. F. Brouillard",
            s1Days.get(3),
            4,
            "EN_COURS",
            List.of("Cytosquelette", "Microtubules", "Kinésine", "Dynéine"),
            "Hétérodimères tubuline alpha/bêta, 13 protofilaments, instabilité dynamique (GTP cap). Moteurs : kinésine (vers + / périphérie) et dynéine (vers - / centrosome). Cibles des poisons du fuseau (colchicine, paclitaxel).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(3).atTime(8, 30),
            s1Days.get(3).atTime(8, 30)
        ));

        // S1 - Day 5 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-03",
            "ue3",
            "UE3",
            "Dynamique des fluides réels : Viscosité et loi de Poiseuille",
            "#F59E0B",
            "Pr. B. C. Forget",
            s1Days.get(4),
            4,
            "EN_COURS",
            List.of("Poiseuille", "Viscosité", "RésistanceHydraulique", "PertesDeCharge"),
            "Viscosité dynamique et cinématique. Loi de Poiseuille pour régime laminaire cylindrique : Q = (pi * r^4 * ΔP) / (8 * eta * L). Résistance hydraulique R = 8 eta L / (pi r^4). Sensibilité en r^4.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(4).atTime(8, 30),
            s1Days.get(4).atTime(8, 30)
        ));

        // S1 - Day 5 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-04",
            "ue1",
            "UE1",
            "Thermodynamique chimique : 1er et 2nd principes, Enthalpie et Entropie",
            "#3B82F6",
            "Pr. B. Colasson",
            s1Days.get(4),
            4,
            "EN_COURS",
            List.of("Thermodynamique", "Enthalpie", "Entropie", "Hess"),
            "Premier principe : ΔU = W + Q. Enthalpie standard de réaction ΔrH° (loi de Hess). Deuxième principe : création d'entropie ΔS_univers >= 0. Processus réversibles vs irréversibles.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(4).atTime(8, 30),
            s1Days.get(4).atTime(8, 30)
        ));

        // S1 - Day 6 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-04",
            "ue2",
            "UE2",
            "Cytosquelette : Microfilaments d'actine et motilité cellulaire",
            "#10B981",
            "Pr. F. Brouillard",
            s1Days.get(5),
            3,
            "EN_COURS",
            List.of("Actine", "Myosine", "Motilité", "Lamellipode"),
            "Polymérisation de l'actine G en actine F (dépendante de l'ATP). Protéines associées : profiline, cofiline, complexe Arp2/3. Structures : lamellipodes, filopodes, anneau contractile de cytokinèse.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(5).atTime(8, 30),
            s1Days.get(5).atTime(8, 30)
        ));

        // S1 - Day 6 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-04",
            "ue3",
            "UE3",
            "Transport passif de particules neutres : Marche au hasard et loi de Fick",
            "#F59E0B",
            "Pr. S. Pasquali",
            s1Days.get(5),
            4,
            "EN_COURS",
            List.of("Diffusion", "LoiDeFick", "MouvementBrownien", "Einstein"),
            "Mouvement brownien et marche au hasard. 1ère loi de Fick : J_diff = -D * dC/dx. Relation de Stokes-Einstein : D = kB * T / (6 pi eta r). Temps caractéristique de diffusion t ~ x^2 / (2D).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(5).atTime(8, 30),
            s1Days.get(5).atTime(8, 30)
        ));

        // S1 - Day 7 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-05",
            "ue1",
            "UE1",
            "Enthalpie libre de Gibbs (ΔG) et équilibres chimiques",
            "#3B82F6",
            "Pr. B. Colasson",
            s1Days.get(6),
            4,
            "EN_COURS",
            List.of("Gibbs", "Équilibre", "ΔG", "Affinité"),
            "Relation fondamentale : ΔG = ΔH - TΔS. Critère de spontanéité : ΔG < 0 (exergonique). À l'équilibre ΔrG° = -RT ln(K). Loi de Le Chatelier (déplacement d'équilibre par T, P, concentration).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(6).atTime(8, 30),
            s1Days.get(6).atTime(8, 30)
        ));

        // S1 - Day 7 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-05",
            "ue2",
            "UE2",
            "Noyau cellulaire : Enveloppe nucléaire, pores et transport nucléo-cytoplasmique",
            "#10B981",
            "Pr. C. Chanoine",
            s1Days.get(6),
            3,
            "EN_COURS",
            List.of("Noyau", "PoresNucléaires", "Importines", "Nucléole"),
            "Double membrane nucléaire, lamina nucléaire (lamines A, B, C). Complexe du pore nucléaire (NPC). Signaux NLS (import) et NES (export), système Ran-GTP/Ran-GDP.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(6).atTime(8, 30),
            s1Days.get(6).atTime(8, 30)
        ));

        // S1 - Day 8 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-05",
            "ue3",
            "UE3",
            "Perméabilité membranaire, diffusion libre et flux de solvant",
            "#F59E0B",
            "Pr. S. Pasquali",
            s1Days.get(7),
            3,
            "EN_COURS",
            List.of("Perméabilité", "Filtration", "Solvant", "Membrane"),
            "Coefficient de perméabilité P = D * K / delta_x. Flux de filtration hydraulique (loi de Starling transmembranaire) et flux d'entraînement du soluté par solvant (solvent drag).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(7).atTime(8, 30),
            s1Days.get(7).atTime(8, 30)
        ));

        // S1 - Day 8 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-06",
            "ue1",
            "UE1",
            "Cinétique chimique : Ordres de réaction et loi d'Arrhenius",
            "#3B82F6",
            "Pr. H. Galons",
            s1Days.get(7),
            3,
            "EN_COURS",
            List.of("Cinétique", "OrdreRéaction", "Arrhenius", "Activation"),
            "Vitesse volumique de réaction v = -1/a * d[A]/dt = k[A]^alpha [B]^beta. Ordre 0 (linéaire), ordre 1 (t1/2 indépendant de [A]0), ordre 2. Loi d'Arrhenius : k = A exp(-Ea/RT).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(7).atTime(8, 30),
            s1Days.get(7).atTime(8, 30)
        ));

        // S1 - Day 9 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-06",
            "ue2",
            "UE2",
            "Structure de la membrane plasmique, radeaux lipidiques et perméabilité",
            "#10B981",
            "Pr. F. Charbonnier",
            s1Days.get(8),
            3,
            "EN_COURS",
            List.of("Membrane", "Lipides", "Radeaux", "Perméabilité"),
            "Bicouche asymétrique : phosphatidylcholine et sphingomyéline externes, phosphatidylsérine et phosphatidyléthanolamine internes. Radeaux lipidiques riches en cholestérol et sphingolipides.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(8).atTime(8, 30),
            s1Days.get(8).atTime(8, 30)
        ));

        // S1 - Day 9 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-06",
            "ue3",
            "UE3",
            "Bases d'électrostatique et transport transmembranaire des ions",
            "#F59E0B",
            "Pr. S. Pasquali",
            s1Days.get(8),
            4,
            "EN_COURS",
            List.of("Électrostatique", "NernstPlanck", "Ions", "GradientÉlectrochimique"),
            "Loi de Coulomb, potentiel électrique. Équation de Nernst-Planck : flux total = flux diffusif + flux électrique. Équation d'équilibre de Nernst : E_ion = (RT / zF) ln([ion]_ext / [ion]_int).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(8).atTime(8, 30),
            s1Days.get(8).atTime(8, 30)
        ));

        // S1 - Day 10 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-07",
            "ue1",
            "UE1",
            "Stéréochimie : Conformation, chiralité et énantiomérie (R/S, D/L)",
            "#3B82F6",
            "Pr. P. Belmont",
            s1Days.get(9),
            4,
            "EN_COURS",
            List.of("Stéréochimie", "Chiralité", "Énantiomérie", "CahnIngoldPrelog"),
            "Carbone asymétrique (C*), règles de priorité Cahn-Ingold-Prelog (CIP). Pouvoir rotatoire et loi de Biot (dextrogyre / lévogyre). Mélange racémique inactif optiquement.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(9).atTime(8, 30),
            s1Days.get(9).atTime(8, 30)
        ));

        // S1 - Day 10 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-07",
            "ue2",
            "UE2",
            "Réticulum endoplasmique : Synthèse, translocation et contrôle qualité",
            "#10B981",
            "Pr. M. Jafarian-Tehrani",
            s1Days.get(9),
            4,
            "EN_COURS",
            List.of("Réticulum", "Translocation", "SignalPeptide", "Chaperonnes"),
            "REG : synthèse des protéines sécrétées/membranaires via la particule SRP et le translocon Sec61. Chaperonnes du RE (BiP, calnexine, calréticuline) et réponse UPR au stress du RE.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(9).atTime(8, 30),
            s1Days.get(9).atTime(8, 30)
        ));

        // S1 - Day 11 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-07",
            "ue3",
            "UE3",
            "Équilibre de Gibbs-Donnan et pression oncotique",
            "#F59E0B",
            "Pr. S. Pasquali",
            s1Days.get(10),
            4,
            "EN_COURS",
            List.of("GibbsDonnan", "PressionOncotique", "Macromolécules", "Équilibre"),
            "Présence d'anions protéiques non diffusibles d'un côté de la membrane. Produit des ions diffusibles égal des deux côtés ([K+]1 [Cl-]1 = [K+]2 [Cl-]2). Surpression osmotique de Donnan.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(10).atTime(8, 30),
            s1Days.get(10).atTime(8, 30)
        ));

        // S1 - Day 11 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-08",
            "ue1",
            "UE1",
            "Stéréoisomérie géométrique (Z/E) et diastéréoisomérie",
            "#3B82F6",
            "Pr. P. Belmont",
            s1Days.get(10),
            3,
            "EN_COURS",
            List.of("Diastéréoisomères", "IsomérieZE", "Stéréochimie", "Méso"),
            "Liaison double C=C sans rotation libre : isomères Z (zusammen) et E (entgegen). Diastéréoisomères : stéréoisomères non énantiomères. Composés méso achiraux avec plan de symétrie interne.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(10).atTime(8, 30),
            s1Days.get(10).atTime(8, 30)
        ));

        // S1 - Day 12 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-08",
            "ue2",
            "UE2",
            "Appareil de Golgi : Maturation, N/O-glycosylation et tri vésiculaire",
            "#10B981",
            "Pr. J.-L. Laplanche",
            s1Days.get(11),
            3,
            "EN_COURS",
            List.of("Golgi", "Glycosylation", "Vésicules", "COP"),
            "Polarité cis/médian/trans et réseau trans-Golgien (TGN). Manosylation, N-acétylglucosaminylation, O-glycosylation. Manteaux protéiques : COPII (antérograde RE->Golgi), COPI (rétrograde), Clathrine.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(11).atTime(8, 30),
            s1Days.get(11).atTime(8, 30)
        ));

        // S1 - Day 12 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-08",
            "ue3",
            "UE3",
            "Modèle électrique membranaire : Équation de Goldman-Hodgkin-Katz",
            "#F59E0B",
            "Pr. B. C. Forget",
            s1Days.get(11),
            4,
            "EN_COURS",
            List.of("GHK", "PotentielMembrane", "Perméabilités", "CircuitÉquivalent"),
            "Calcul du potentiel de repos membranaire Em tenant compte des perméabilités relatives PK, PNa, PCl. Rôle primordial de la pompe Na+/K+ ATPase électrogène (3 Na+ sortis / 2 K+ entrés).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(11).atTime(8, 30),
            s1Days.get(11).atTime(8, 30)
        ));

        // S1 - Day 13 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-09",
            "ue1",
            "UE1",
            "Effets électroniques : Inductif, mésomère et aromaticité",
            "#3B82F6",
            "Pr. K. Le Barch",
            s1Days.get(12),
            4,
            "EN_COURS",
            List.of("Mésomérie", "EffetInductif", "Aromaticité", "Hückel"),
            "Effets inductifs (+I, -I) et mésomères (+M, -M). Règle de Hückel pour l'aromaticité : cycle plan, conjugué, 4n+2 électrons pi. Stabilité relative des carbocations (3° > 2° > 1° > méthyle).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(12).atTime(8, 30),
            s1Days.get(12).atTime(8, 30)
        ));

        // S1 - Day 13 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-09",
            "ue2",
            "UE2",
            "Lysosomes, autophagie et endocytose (clathrine, cavéoles)",
            "#10B981",
            "Pr. J.-M. Launay",
            s1Days.get(12),
            3,
            "EN_COURS",
            List.of("Endocytose", "Lysosomes", "Autophagie", "Hydrolases"),
            "Pompe V-ATPase maintenant un pH intra-lysosomal acide (~4.5-5.0). Hydrolases acides adressées par le signal mannose-6-phosphate (M6P). Voies de l'autophagie (LC3).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(12).atTime(8, 30),
            s1Days.get(12).atTime(8, 30)
        ));

        // S1 - Day 14 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-09",
            "ue3",
            "UE3",
            "Potentiel d'action : Genèse et propagation axonale",
            "#F59E0B",
            "Pr. B. C. Forget",
            s1Days.get(13),
            4,
            "EN_COURS",
            List.of("PotentielAction", "CanauxSodiques", "ConductionSaltatoire", "Axone"),
            "Dépolarisation seuil, ouverture des canaux Nav, repolarisation par canaux Kv, période réfractaire. Conduction continue vs conduction saltatoire au niveau des nœuds de Ranvier.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(13).atTime(8, 30),
            s1Days.get(13).atTime(8, 30)
        ));

        // S1 - Day 14 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-10",
            "ue1",
            "UE1",
            "Réactivité des hydrocarbures, alcènes et alcynes",
            "#3B82F6",
            "Pr. C. Mangeney",
            s1Days.get(13),
            3,
            "EN_COURS",
            List.of("Alcènes", "AdditionÉlectrophile", "Markovnikov", "Hydrocarbures"),
            "Addition électrophile sur les alcènes : règle de Markovnikov (passage par le carbocation le plus stable). Hydrogénation catalytique (syn-addition), halogénation (anti-addition avec pont halonium).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(13).atTime(8, 30),
            s1Days.get(13).atTime(8, 30)
        ));

        // S1 - Day 15 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-10",
            "ue2",
            "UE2",
            "Mitochondrie : Architecture, génome propre et apoptose intrinsèque",
            "#10B981",
            "Pr. I. Margaill",
            s1Days.get(14),
            4,
            "EN_COURS",
            List.of("Mitochondrie", "Apoptose", "CytochromeC", "Caspases"),
            "Double membrane, crêtes mitochondriales, ADN circulaire maternel. Voie mitochondriale de l'apoptose : perméabilisation membranaire (Bax/Bak), libération de cytochrome c, apoptosome et activation de la caspase-9/caspase-3.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(14).atTime(8, 30),
            s1Days.get(14).atTime(8, 30)
        ));

        // S1 - Day 15 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-10",
            "ue3",
            "UE3",
            "Structure nucléaire, isotopes et lois de décroissance radioactive",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(14),
            3,
            "EN_COURS",
            List.of("Radioactivité", "Isotopes", "PériodeRadioactive", "Activité"),
            "Force nucléaire forte, vallée de stabilité. Loi de décroissance exponentielle : N(t) = N0 exp(-lambda * t). Période radioactive T1/2 = ln(2) / lambda. Activité A(t) en Becquerels (1 Bq = 1 désintégration/s).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(14).atTime(8, 30),
            s1Days.get(14).atTime(8, 30)
        ));

        // S1 - Day 16 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-11",
            "ue1",
            "UE1",
            "Fonctions alcools, éthers et dérivés halogénés",
            "#3B82F6",
            "Pr. M. Ethève-Quelquejeu",
            s1Days.get(15),
            3,
            "EN_COURS",
            List.of("Alcools", "Éthers", "Halogénés", "Nucléophilie"),
            "Caractère nucléophile et acide faible des alcools. Oxydation ménagée : alcool 1° -> aldéhyde -> acide carboxylique ; alcool 2° -> cétone ; alcool 3° non oxydable.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(15).atTime(8, 30),
            s1Days.get(15).atTime(8, 30)
        ));

        // S1 - Day 16 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-11",
            "ue2",
            "UE2",
            "Voies de signalisation cellulaire : Récepteurs membranaires et seconds messagers",
            "#10B981",
            "Pr. L. Telvi",
            s1Days.get(15),
            4,
            "EN_COURS",
            List.of("Signalisation", "RCPG", "AMPc", "IP3_DAG"),
            "RCPG trimériques (Gs -> adénylate cyclase -> AMPc -> PKA ; Gq -> phospholipase C -> IP3 + DAG -> Ca2+ et PKC). Récepteurs à activité tyrosine kinase (RTK -> Ras-Raf-MEK-ERK).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(15).atTime(8, 30),
            s1Days.get(15).atTime(8, 30)
        ));

        // S1 - Day 17 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-11",
            "ue3",
            "UE3",
            "Modes de désintégration nucléaire (Alpha, Bêta+, Bêta-, Gamma)",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(16),
            4,
            "EN_COURS",
            List.of("Alpha", "BêtaMoins", "BêtaPlus", "RayonnementGamma"),
            "Radioactivité alpha (émission d'un noyau d'He 4/2), bêta- (n -> p + e- + antineutrino), bêta+ (p -> n + e+ + neutrino), capture électronique et désexcitation gamma isométrique.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(16).atTime(8, 30),
            s1Days.get(16).atTime(8, 30)
        ));

        // S1 - Day 17 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-12",
            "ue1",
            "UE1",
            "Mécanismes réactionnels : Substitutions nucléophiles (SN1 / SN2)",
            "#3B82F6",
            "Pr. P. Belmont",
            s1Days.get(16),
            5,
            "EN_COURS",
            List.of("SN1", "SN2", "Mécanismes", "InversionWalden"),
            "SN2 : mécanisme concerté en 1 étape, cinétique d'ordre 2, stéréospécifique avec inversion de Walden, favorisé sur substrats peu encombrés (1°). SN1 : 2 étapes avec carbocation plan, racémisation, favorisé sur 3°.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(16).atTime(8, 30),
            s1Days.get(16).atTime(8, 30)
        ));

        // S1 - Day 18 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-12",
            "ue2",
            "UE2",
            "Cycle cellulaire et mitose : Régulation par les complexes Cyclines/CDK",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(17),
            4,
            "EN_COURS",
            List.of("CycleCellulaire", "CDK", "Cyclines", "Checkpoints"),
            "Phases G1, S, G2, M. Complexes clés : Cycline D/CDK4-6 (point de restriction R, phosphorylation de pRb), Cycline B/CDK1 (complexe MPF pour l'entrée en mitose). Checkpoint du fuseau mitotique (SAC).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(17).atTime(8, 30),
            s1Days.get(17).atTime(8, 30)
        ));

        // S1 - Day 18 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-12",
            "ue3",
            "UE3",
            "Interactions photons-matière : Effets photoélectrique, Compton et paires",
            "#F59E0B",
            "Pr. J. Clerc",
            s1Days.get(17),
            4,
            "EN_COURS",
            List.of("Photons", "Photoélectrique", "Compton", "CréationPaires"),
            "Loi d'atténuation exponentielle I = I0 exp(-mu * x) et Couche de Demi-Atténuation (CDA). Effet photoélectrique (dominant aux basses énergies/Z élevé), Compton (médium), Création de paires (E > 1.022 MeV).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(17).atTime(8, 30),
            s1Days.get(17).atTime(8, 30)
        ));

        // S1 - Day 19 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-13",
            "ue1",
            "UE1",
            "Mécanismes réactionnels : Éliminations (E1 / E2)",
            "#3B82F6",
            "Pr. P. Belmont",
            s1Days.get(18),
            4,
            "EN_COURS",
            List.of("E1", "E2", "Zaïtsev", "Élimination"),
            "Compétition substitution/élimination. Règle de Zaïtsev : formation préférentielle de l'alcène le plus substitué et thermodynamiquement stable. E2 nécessite une conformation anti-périplanaire.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(18).atTime(8, 30),
            s1Days.get(18).atTime(8, 30)
        ));

        // S1 - Day 19 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-13",
            "ue2",
            "UE2",
            "Méiose, recombinaisons génétiques et gamétogenèse",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(18),
            3,
            "EN_COURS",
            List.of("Méiose", "Recombinaison", "CrossingOver", "Gamètes"),
            "Division réductionnelle (Méiose I : appariement des chromosomes homologues, complexe synaptonémal, crossing-over/chiasmas) et équationnelle (Méiose II).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(18).atTime(8, 30),
            s1Days.get(18).atTime(8, 30)
        ));

        // S1 - Day 20 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-13",
            "ue3",
            "UE3",
            "Interactions des particules chargées avec la matière et freinage",
            "#F59E0B",
            "Pr. J. Clerc",
            s1Days.get(19),
            3,
            "EN_COURS",
            List.of("Électrons", "Freinage", "Bremsstrahlung", "TEL"),
            "Collisions inélastiques avec les électrons atomiques (ionisation/excitation) et rayonnement de freinage (Bremsstrahlung). Transfert Linéique d'Énergie (TEL) et pic de Bragg.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(19).atTime(8, 30),
            s1Days.get(19).atTime(8, 30)
        ));

        // S1 - Day 20 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-14",
            "ue1",
            "UE1",
            "Fonctions carbonyles : Aldéhydes, cétones et additions nucléophiles",
            "#3B82F6",
            "Pr. M. Ethève-Quelquejeu",
            s1Days.get(19),
            4,
            "EN_COURS",
            List.of("Carbonyles", "Nucléophile", "Aldéhyde", "Cétone"),
            "Polarisation du groupe C=O (carbone électrophile). Addition de nucléophiles : hémiacétals/acétals avec les alcools, imines avec les amines primaires. Réactivité aldéhydes > cétones.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(19).atTime(8, 30),
            s1Days.get(19).atTime(8, 30)
        ));

        // S1 - Day 21 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-14",
            "ue2",
            "UE2",
            "Tissus épithéliaux de revêtement : Polarité, jonctions et classification",
            "#10B981",
            "Pr. J.-P. Barbet",
            s1Days.get(20),
            2,
            "EN_COURS",
            List.of("Histologie", "Épithélium", "JonctionsSerrées", "LameBasale"),
            "Épithéliums simples, stratifiés, pseudostratifiés ; pavimenteux, cubiques, prismatiques. Jonctions étanches (zonula occludens), d'adhérence (zonula adherens), desmosomes, hémidesmosomes.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(20).atTime(8, 30),
            s1Days.get(20).atTime(8, 30)
        ));

        // S1 - Day 21 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-14",
            "ue3",
            "UE3",
            "Dosimétrie radiologique et principes de radioprotection",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(20),
            3,
            "EN_COURS",
            List.of("Dosimétrie", "Gray", "Sievert", "Radioprotection"),
            "Dose absorbée D (en Gray : 1 Gy = 1 J/kg), Dose équivalente H (en Sievert, facteur de pondération radiologique wR), Dose efficace E (facteur tissulaire wT). Principes ALARA : Justification, Optimisation, Limitation.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(20).atTime(8, 30),
            s1Days.get(20).atTime(8, 30)
        ));

        // S1 - Day 22 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-15",
            "ue1",
            "UE1",
            "Acides carboxyliques et dérivés : Estérification et saponification",
            "#3B82F6",
            "Pr. O. Reinaud",
            s1Days.get(21),
            3,
            "EN_COURS",
            List.of("Carboxyliques", "Esters", "Saponification", "Amides"),
            "Réactivité relative : chlorures d'acyle > anhydrides > esters > amides. Estérification de Fischer réversible. Saponification (hydrolyse basique) totale et irréversible.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(21).atTime(8, 30),
            s1Days.get(21).atTime(8, 30)
        ));

        // S1 - Day 22 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-15",
            "ue2",
            "UE2",
            "Tissus épithéliaux glandulaires : Sécrétion exocrine et endocrine",
            "#10B981",
            "Pr. J.-P. Barbet",
            s1Days.get(21),
            2,
            "EN_COURS",
            List.of("Glandes", "Sécrétion", "Exocrine", "Endocrine"),
            "Modalités d'extrusion : mérocrine (exocytose), apocrine (décapitation apicale), holocrine (lyse cellulaire totale). Glandes séreuses vs muqueuses.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(21).atTime(8, 30),
            s1Days.get(21).atTime(8, 30)
        ));

        // S1 - Day 23 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-15",
            "ue3",
            "UE3",
            "Imagerie isotopique médicale : Scintigraphie gamma et TEP-Scan",
            "#F59E0B",
            "Pr. B. Tavitian",
            s1Days.get(22),
            4,
            "EN_COURS",
            List.of("Scintigraphie", "TEP", "Fluor18", "GammaCaméra"),
            "Scintigraphie par caméra gamma (Technétium-99m, collimateur). TEP par émetteurs de positons (18F-FDG) : détection en coïncidence des 2 photons gamma de 511 keV issus de l'annihilation.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(22).atTime(8, 30),
            s1Days.get(22).atTime(8, 30)
        ));

        // S1 - Day 23 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-16",
            "ue1",
            "UE1",
            "Équilibres acido-basiques en solution aqueuse et systèmes tampons",
            "#3B82F6",
            "Pr. D. Over",
            s1Days.get(22),
            3,
            "EN_COURS",
            List.of("AcidoBasique", "pH", "Tampons", "HendersonHasselbalch"),
            "Définition de Brönsted. Constante d'acidité Ka et pKa. Équation de Henderson-Hasselbalch : pH = pKa + log([A-]/[AH]). Tampons physiologiques majeurs : bicarbonate/acide carbonique (plasma) et phosphate.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(22).atTime(8, 30),
            s1Days.get(22).atTime(8, 30)
        ));

        // S1 - Day 24 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-16",
            "ue2",
            "UE2",
            "Tissu conjonctif non spécialisé et matrice extracellulaire",
            "#10B981",
            "Pr. C. Becker",
            s1Days.get(23),
            3,
            "EN_COURS",
            List.of("Conjonctif", "Collagène", "Élastine", "Fibroblastes"),
            "Substance fondamentale (glycosaminoglycanes, protéoglycanes, acide hyaluronique). Fibres de collagène (type I, II, III/réticuline, IV dans la lame basale) et fibres élastiques.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(23).atTime(8, 30),
            s1Days.get(23).atTime(8, 30)
        ));

        // S1 - Day 24 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-16",
            "ue3",
            "UE3",
            "Production des rayons X : Tube de Coolidge et radiologie",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(23),
            3,
            "EN_COURS",
            List.of("RayonsX", "Coolidge", "Anode", "Radiologie"),
            "Cathode à filament de tungstène émetteur d'électrons, anode cible (production de rayons X par Bremsstrahlung et raies caractéristiques). Notion de filtration et de foyer.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(23).atTime(8, 30),
            s1Days.get(23).atTime(8, 30)
        ));

        // S1 - Day 25 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-17",
            "ue1",
            "UE1",
            "Équilibres d'oxydo-réduction et équation de Nernst",
            "#3B82F6",
            "Pr. D. Over",
            s1Days.get(24),
            4,
            "EN_COURS",
            List.of("OxydoRéduction", "Nernst", "Potentiel", "Redox"),
            "Couples redox Ox/Red. Équation de Nernst : E = E° + (0.059/n) log([Ox]/[Red]) à 25°C. Relation avec l'enthalpie libre : ΔrG° = -n F ΔE°. Piles électrochimiques et potentiels biologiques.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(24).atTime(8, 30),
            s1Days.get(24).atTime(8, 30)
        ));

        // S1 - Day 25 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-17",
            "ue2",
            "UE2",
            "Tissus cartilagineux : Hyalin, élastique, fibreux et chondrogenèse",
            "#10B981",
            "Pr. C. Becker",
            s1Days.get(24),
            3,
            "EN_COURS",
            List.of("Cartilage", "Chondrocytes", "Périchondre", "Histologie"),
            "Cartilage hyalin (collagène II, articulations/voies respiratoires), élastique (pavillon de l'oreille/épiglotte), fibrocartilage (collagène I, disques intervertébraux/ménisques). Tissu non vascularisé.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(24).atTime(8, 30),
            s1Days.get(24).atTime(8, 30)
        ));

        // S1 - Day 26 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-17",
            "ue3",
            "UE3",
            "Tomodensitométrie (Scanner TDM) : Échelle de Hounsfield",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(25),
            4,
            "EN_COURS",
            List.of("Scanner", "TDM", "Hounsfield", "Atténuation"),
            "Rotation du couple tube-détecteurs. Reconstruction tomographique. Unités Hounsfield (UH) : Eau = 0 UH, Air = -1000 UH, Os compact = +1000 UH.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(25).atTime(8, 30),
            s1Days.get(25).atTime(8, 30)
        ));

        // S1 - Day 26 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-18",
            "ue1",
            "UE1",
            "Structure macromoléculaire des acides aminés et liaison peptidique",
            "#3B82F6",
            "Pr. B. Hainque",
            s1Days.get(25),
            3,
            "EN_COURS",
            List.of("AcidesAminés", "Peptides", "pHi", "Zwitterion"),
            "Les 20 acides aminés protéinogènes (tous de série L sauf glycine). Caractère amphotère et point isoélectrique (pHi). Liaison peptidique plane et rigide (caractère partiel de double liaison C-N).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(25).atTime(8, 30),
            s1Days.get(25).atTime(8, 30)
        ));

        // S1 - Day 27 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-18",
            "ue2",
            "UE2",
            "Tissu osseux : Ostéoblastes, ostéoclastes et remodelage osseux",
            "#10B981",
            "Pr. C. Becker",
            s1Days.get(26),
            4,
            "EN_COURS",
            List.of("Os", "Ostéoclastes", "Remodelage", "Ostéone"),
            "Matrice osseuse minéralisée (cristaux d'hydroxyapatite) et ostéoïde (collagène I). Ostéoblastes formateurs, ostéocytes mécanosensibles, ostéoclastes résorbants (système RANK/RANKL/OPG).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(26).atTime(8, 30),
            s1Days.get(26).atTime(8, 30)
        ));

        // S1 - Day 27 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-18",
            "ue3",
            "UE3",
            "Résonance Magnétique Nucléaire (RMN) : Aimantation et relaxation",
            "#F59E0B",
            "Pr. B. Tavitian",
            s1Days.get(26),
            5,
            "EN_COURS",
            List.of("RMN", "IRM", "Larmor", "RelaxationT1_T2"),
            "Spin du proton 1H dans un champ magnétique statique B0. Fréquence de Larmor omega0 = gamma * B0. Bascule par onde radiofréquence B1. Relaxation longitudinale T1 (repousse Mz) et transversale T2 (déphasage Mxy).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(26).atTime(8, 30),
            s1Days.get(26).atTime(8, 30)
        ));

        // S1 - Day 28 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-19",
            "ue1",
            "UE1",
            "Structure tertiaire/quaternaire des protéines et repliement",
            "#3B82F6",
            "Pr. R. Barouki",
            s1Days.get(27),
            3,
            "EN_COURS",
            List.of("Protéines", "Repliement", "Chaperonnes", "PontsDisulfure"),
            "Structures secondaires (hélices alpha, feuillets bêta). Stabilisation tertiaire par liaisons faibles et ponts disulfures (cystines). Rôle des protéines chaperonnes (Hsp70, chaperonines).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(27).atTime(8, 30),
            s1Days.get(27).atTime(8, 30)
        ));

        // S1 - Day 28 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-19",
            "ue2",
            "UE2",
            "Tissu musculaire strié squelettique : Sarcomère et contraction",
            "#10B981",
            "Pr. C. Chanoine",
            s1Days.get(27),
            3,
            "EN_COURS",
            List.of("Muscle", "Sarcomère", "ActineMyosine", "RéticulumSarcoplasmique"),
            "Organisation en myofibrilles. Sarcomère délimité par 2 stries Z. Triade (tubule T + 2 citernes terminales). Rôle du Ca2+, troponine C et tropomyosine dans la contraction.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(27).atTime(8, 30),
            s1Days.get(27).atTime(8, 30)
        ));

        // S1 - Day 29 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-19",
            "ue3",
            "UE3",
            "Biophysique des ultrasons et échographie Doppler",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(28),
            4,
            "EN_COURS",
            List.of("Ultrasons", "Échographie", "Doppler", "ImpédanceAcoustique"),
            "Ondes mécaniques longitudinales, effet piézoélectrique. Impédance acoustique Z = rho * c. Réflexion aux interfaces. Effet Doppler pour la mesure de vitesses circulatoires : Δf = 2 f0 v cos(theta) / c.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(28).atTime(8, 30),
            s1Days.get(28).atTime(8, 30)
        ));

        // S1 - Day 29 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-20",
            "ue1",
            "UE1",
            "Structure et propriétés des acides nucléiques (ADN/ARN)",
            "#3B82F6",
            "Pr. B. Hainque",
            s1Days.get(28),
            3,
            "EN_COURS",
            List.of("ADN", "ARN", "Nucléotides", "DoubleHélice"),
            "Nucléosides, nucléotides (ATP, dATP). Structure en double hélice antiparallèle de l'ADN B (Watson-Crick), complémentarité A-T (2 liaisons H) et G-C (3 liaisons H). Effet hyperchrome à la dénaturation thermique (Tm).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(28).atTime(8, 30),
            s1Days.get(28).atTime(8, 30)
        ));

        // S1 - Day 30 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-20",
            "ue2",
            "UE2",
            "Tissu nerveux : Neurones, synapses et cellules gliales",
            "#10B981",
            "Pr. M. Jafarian-Tehrani",
            s1Days.get(29),
            3,
            "EN_COURS",
            List.of("Neurones", "Synapses", "Myéline", "Astrocytes"),
            "Structure du neurone (corps cellulaire, dendrites, axone). Synapse chimique et neurotransmetteurs. Myélinisation : oligodendrocytes dans le SNC, cellules de Schwann dans le SNP.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(29).atTime(8, 30),
            s1Days.get(29).atTime(8, 30)
        ));

        // S1 - Day 30 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-20",
            "ue3",
            "UE3",
            "Solubilité des gaz, loi de Henry et décompression du plongeur",
            "#F59E0B",
            "Pr. J. Clerc",
            s1Days.get(29),
            3,
            "EN_COURS",
            List.of("Henry", "Plongée", "Décompression", "Azote"),
            "Loi de Henry : C = s * P. En plongée sous-marine, dissolution accrue de l'azote dans les tissus selon la pression ambiante. Remontée trop rapide = formation de bulles gazeuses emboliques.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(29).atTime(8, 30),
            s1Days.get(29).atTime(8, 30)
        ));

        // S1 - Day 31 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-21",
            "ue1",
            "UE1",
            "Mécanismes de la réplication et de la réparation de l'ADN",
            "#3B82F6",
            "Pr. P. Beaune",
            s1Days.get(30),
            4,
            "EN_COURS",
            List.of("Réplication", "ADNPolymérase", "Okazaki", "Réparation"),
            "Réplication semi-conservative, bidirectionnelle. ADN polymérases et activité proofreading 3'->5'. Brin précoce continu et brin retardé discontinu (fragments d'Okazaki). Réparation par excision de bases (BER) et nucléotides (NER).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(30).atTime(8, 30),
            s1Days.get(30).atTime(8, 30)
        ));

        // S1 - Day 31 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-21",
            "ue2",
            "UE2",
            "Fécondation : Réaction acrosomique et amphimixie",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(30),
            3,
            "EN_COURS",
            List.of("Embryologie", "Fécondation", "Acrosome", "ZonePellucide"),
            "Capacitation des spermatozoïdes, liaison à ZP3, réaction acrosomique, fusion membranaire, blocage de la polyspermie (réaction corticale) et rétablissement de la diploïdie.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(30).atTime(8, 30),
            s1Days.get(30).atTime(8, 30)
        ));

        // S1 - Day 32 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-21",
            "ue3",
            "UE3",
            "Échanges transcapillaires, filtration et équilibre de Starling",
            "#F59E0B",
            "Pr. J. Clerc",
            s1Days.get(31),
            4,
            "EN_COURS",
            List.of("Starling", "FiltrationCapillaire", "PressionOncotique", "Œdème"),
            "Pression hydrostatique capillaire Pc vs interstitielle Pi ; pression oncotique capillaire pic vs interstitielle pii. Flux de filtration Jv = Lp * S * [(Pc - Pi) - sigma*(pic - pii)]. Physiopathologie des œdèmes.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(31).atTime(8, 30),
            s1Days.get(31).atTime(8, 30)
        ));

        // S1 - Day 32 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-22",
            "ue1",
            "UE1",
            "Transcription, maturation des ARN et code génétique",
            "#3B82F6",
            "Pr. P. Beaune",
            s1Days.get(31),
            3,
            "EN_COURS",
            List.of("Transcription", "Épissage", "CodeGénétique", "Traduction"),
            "ARN polymérase II, promoteur (boîte TATA), facteurs de transcription généraux. Maturation de l'ARNm : coiffe 5', polyadénylation 3' et épissage des introns (spliceosome). Code génétique dégénéré et universel.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(31).atTime(8, 30),
            s1Days.get(31).atTime(8, 30)
        ));

        // S1 - Day 33 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-22",
            "ue2",
            "UE2",
            "Première semaine de développement : Segmentation et blastocyste",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(32),
            3,
            "EN_COURS",
            List.of("Segmentation", "Morula", "Blastocyste", "Trophoblaste"),
            "Divisions mitotiques sans augmentation de volume global. Stade morula (compaction), formation du blastocèle, masse cellulaire interne (embryoblaste) et trophoblaste.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(32).atTime(8, 30),
            s1Days.get(32).atTime(8, 30)
        ));

        // S1 - Day 33 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-22",
            "ue3",
            "UE3",
            "Biophysique cardiovasculaire : Régimes et nombre de Reynolds",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(32),
            3,
            "EN_COURS",
            List.of("Reynolds", "Hémodynamique", "Turbulence", "Cardiovasculaire"),
            "Écoulement laminaire parabolique (vitesse max au centre) vs turbulent. Nombre de Reynolds Re = (rho * v * d) / eta. Transition vers la turbulence si Re > 2000-2400.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(32).atTime(8, 30),
            s1Days.get(32).atTime(8, 30)
        ));

        // S1 - Day 34 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-23",
            "ue1",
            "UE1",
            "Cinétique enzymatique michaélienne (Km, Vmax, Lineweaver-Burk)",
            "#3B82F6",
            "Pr. J.-L. Pérignon",
            s1Days.get(33),
            4,
            "EN_COURS",
            List.of("Enzymologie", "Michaelis", "Km", "LineweaverBurk"),
            "Équation de Michaelis-Menten : v = (Vmax * [S]) / (Km + [S]). Km = constante d'affinité inverse (concentration en substrat pour v = Vmax/2). Représentation en double inverse 1/v = f(1/[S]).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(33).atTime(8, 30),
            s1Days.get(33).atTime(8, 30)
        ));

        // S1 - Day 34 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-23",
            "ue2",
            "UE2",
            "Deuxième semaine : Implantation et disque didermique",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(33),
            3,
            "EN_COURS",
            List.of("Nidation", "Didermique", "Épiblaste", "Hypoblaste"),
            "Invasion de l'endomètre par le syncytiotrophoblaste et cytotrophoblaste. Différenciation en épiblaste et hypoblaste. Formation de la cavité amniotique et de la vésicule vitelline primaire.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(33).atTime(8, 30),
            s1Days.get(33).atTime(8, 30)
        ));

        // S1 - Day 35 (Course 1/2) : UE3
        list.add(new Course(
            "course-ue3-23",
            "ue3",
            "UE3",
            "Élasticité de la paroi vasculaire et loi de Laplace",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(34),
            4,
            "EN_COURS",
            List.of("Laplace", "ÉlasticitéVasculaire", "Anévrisme", "TensionPariétale"),
            "Loi de Laplace pour un cylindre : Tension pariétale T = P * r. Pour une sphère : T = P * r / 2. Conséquence pour les anévrismes : quand le rayon r augmente, la tension T augmente à pression égale (risque de rupture accru).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(34).atTime(8, 30),
            s1Days.get(34).atTime(8, 30)
        ));

        // S1 - Day 35 (Course 2/2) : UE1
        list.add(new Course(
            "course-ue1-24",
            "ue1",
            "UE1",
            "Inhibition enzymatique et allostérie",
            "#3B82F6",
            "Pr. J.-L. Pérignon",
            s1Days.get(34),
            4,
            "EN_COURS",
            List.of("Inhibition", "Allostérie", "Compétitif", "Coopérativité"),
            "Inhibition compétitive : Km augmente, Vmax inchangée. Inhibition non-compétitive : Km inchangé, Vmax diminue. Enzymes allostériques : cinétique sigmoïde, coopérativité (équation de Hill).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(34).atTime(8, 30),
            s1Days.get(34).atTime(8, 30)
        ));

        // S1 - Day 36 (Course 1/2) : UE2
        list.add(new Course(
            "course-ue2-24",
            "ue2",
            "UE2",
            "Troisième semaine : Gastrulation et mise en place des 3 feuillets",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(35),
            4,
            "EN_COURS",
            List.of("Gastrulation", "Chorde", "Tridermique", "LignePrimitive"),
            "Apparition de la ligne primitive et du nœud de Hensen. Invagination des cellules épiblastiques formant l'ectoblaste, le mésoblaste et l'entoblaste. Induction de la plaque neurale par la chorde.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(35).atTime(8, 30),
            s1Days.get(35).atTime(8, 30)
        ));

        // S1 - Day 36 (Course 2/2) : UE3
        list.add(new Course(
            "course-ue3-24",
            "ue3",
            "UE3",
            "Hémodynamique des sténoses artérielles et souffles cardiaques",
            "#F59E0B",
            "Pr. P. Weinmann",
            s1Days.get(35),
            4,
            "EN_COURS",
            List.of("Sténose", "SouffleCardiaque", "Bernoulli", "RétrécissementAortique"),
            "Au niveau d'une sténose : diminution de la section -> accélération majeure de la vitesse (Bernoulli) -> chute de la pression latérale et apparition de turbulences (genèse du souffle audible). Perte de charge en aval.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(35).atTime(8, 30),
            s1Days.get(35).atTime(8, 30)
        ));

        // S1 - Day 37 (Course 1/2) : UE1
        list.add(new Course(
            "course-ue1-25",
            "ue1",
            "UE1",
            "Bioénergétique mitochondriale et chaîne respiratoire oxydative",
            "#3B82F6",
            "Pr. D. Ricquier",
            s1Days.get(36),
            4,
            "EN_COURS",
            List.of("Mitochondrie", "Krebs", "ChaîneRespiratoire", "ATPSynthase"),
            "Complexes I, II, III, IV de la membrane mitochondriale interne. Gradient électrochimique de protons (force proton-motrice). Couplage avec l'ATP synthase (complexe V). Découpleurs (UCP1, thermogénine).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(36).atTime(8, 30),
            s1Days.get(36).atTime(8, 30)
        ));

        // S1 - Day 37 (Course 2/2) : UE2
        list.add(new Course(
            "course-ue2-25",
            "ue2",
            "UE2",
            "Quatrième semaine : Délimitation embryonnaire et neurulation",
            "#10B981",
            "Pr. J.-P. Wolf",
            s1Days.get(36),
            4,
            "EN_COURS",
            List.of("Neurulation", "Somites", "TubeNeural", "Délimitation"),
            "Fermeture du tube neural (neuropores antérieur et postérieur), crêtes neurales. Plicatures transversale et longitudinale délimitant l'embryon tubulaire. Métamérisation du mésoblaste para-axial en somites.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s1Days.get(36).atTime(8, 30),
            s1Days.get(36).atTime(8, 30)
        ));

        // =========================================================================
        // SEMESTRE 2 (112 cours : UE4, UE5, UE6, UE7, UE8 - 2 cours / jour ouvré du lundi au vendredi)
        // =========================================================================
        // S2 - Day 1 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-01",
            "ue4",
            "UE4",
            "Biomathématiques : Fonctions usuelles et relations réciproques",
            "#8B5CF6",
            "Pr. C. Guihenneuc-Jouyaux",
            s2Days.get(0),
            2,
            "EN_COURS",
            List.of("Biomath", "Logarithme", "Exponentielle", "Fonctions"),
            "Propriétés analytiques des logarithmes (ln, log10) et exponentielles. Bijections et fonctions réciproques. Applications aux cinétiques biologiques et échelles pH/décibels.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(0).atTime(8, 30),
            s2Days.get(0).atTime(8, 30)
        ));

        // S2 - Day 1 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-01",
            "ue5",
            "UE5",
            "Introduction à l'anatomie générale, terminologie et orientation spatiale",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(0),
            2,
            "EN_COURS",
            List.of("AnatomieGénérale", "Terminologie", "AxesPlans", "PositionAnatomique"),
            "Position anatomique de référence (sujet debout, paumes vers l'avant). Plans anatomiques : sagittal (médian/paramédian), frontal (coronal), transversal (horizontal). Termes de relation : proximal/distal, médial/latéral, crânial/caudal.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(0).atTime(8, 30),
            s2Days.get(0).atTime(8, 30)
        ));

        // S2 - Day 2 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-01",
            "ue6",
            "UE6",
            "Histoire du médicament et découvertes thérapeutiques marquantes",
            "#06B6D4",
            "Pr. P. Boutouyrie",
            s2Days.get(1),
            2,
            "EN_COURS",
            List.of("HistoireMédicament", "GrandesDécouvertes", "Antiquité", "Biotechnologies"),
            "Des remèdes naturels (quinine, saule/aspirine, digitale) à la synthèse chimique et aux thérapies ciblées/anticorps monoclonaux. Découverte fortuite (pénicilline de Fleming) vs criblage rationnel.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(1).atTime(8, 30),
            s2Days.get(1).atTime(8, 30)
        ));

        // S2 - Day 2 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-01",
            "ue7",
            "UE7",
            "Histoire de la pensée médicale : De la médecine hippocratique à la clinique",
            "#F97316",
            "Pr. M. Jeanpierre",
            s2Days.get(1),
            2,
            "EN_COURS",
            List.of("HistoireMédecine", "Hippocrate", "Clinique", "Galien"),
            "Médecine rationnelle hippocratique (théorie des quatre humeurs), dogme galénique, révolution anatomique de Vésale, naissance de la méthode anatomo-clinique (Bichat, Laennec).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(1).atTime(8, 30),
            s2Days.get(1).atTime(8, 30)
        ));

        // S2 - Day 3 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-01",
            "ue8",
            "UE8",
            "Modèles génétiques des pathologies humaines et hérédité",
            "#6366F1",
            "Pr. B. Hainque",
            s2Days.get(2),
            4,
            "EN_COURS",
            List.of("GénétiqueMédicale", "Hérédité", "Mutations", "Physiopathologie"),
            "Transmission autosomique dominante (ex: maladie de Huntington, pénétrance incomplète, expressivité variable), récessive (mucoviscidose), liée à l'X (hémophilie, myopathie de Duchenne), et mitochondriale.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(2).atTime(8, 30),
            s2Days.get(2).atTime(8, 30)
        ));

        // S2 - Day 3 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-02",
            "ue4",
            "UE4",
            "Calcul différentiel, dérivées partielles et différentielle totale",
            "#8B5CF6",
            "Pr. C. Guihenneuc-Jouyaux",
            s2Days.get(2),
            3,
            "EN_COURS",
            List.of("Différentiel", "DérivéesPartielles", "Incertitudes", "Taylor"),
            "Dérivées usuelles, dérivées partielles d'une fonction à plusieurs variables. Différentielle totale exacte df = (df/dx)dx + (df/dy)dy. Propagation des incertitudes absolues et relatives.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(2).atTime(8, 30),
            s2Days.get(2).atTime(8, 30)
        ));

        // S2 - Day 4 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-02",
            "ue5",
            "UE5",
            "Ostéologie générale : Classification et structure osseuse",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(3),
            2,
            "EN_COURS",
            List.of("Ostéologie", "OsLongs", "Périoste", "MoelleOsseuse"),
            "Os longs (épiphyse, métaphyse, diaphyse), os courts, os plats, os sésamoïdes. Os compact (système de Havers) vs os spongieux trabéculaire. Vascularisation artérielle nourricière et rôle ostéogène du périoste.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(3).atTime(8, 30),
            s2Days.get(3).atTime(8, 30)
        ));

        // S2 - Day 4 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-02",
            "ue6",
            "UE6",
            "Définition, statut réglementaire et classifications des médicaments",
            "#06B6D4",
            "Pr. J.-L. Elghozi",
            s2Days.get(3),
            2,
            "EN_COURS",
            List.of("StatutMédicament", "Génériques", "Biosimilaires", "DispositifsMédicaux"),
            "Définition légale du médicament par présentation ou par fonction (art. L.5111-1 CSP). Spécialités pharmaceutiques, médicaments princeps, génériques (même composition qualitative/quantitative et bioéquivalence), biosimilaires, préparations magistrales.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(3).atTime(8, 30),
            s2Days.get(3).atTime(8, 30)
        ));

        // S2 - Day 5 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-02",
            "ue7",
            "UE7",
            "Concepts fondamentaux : Santé, maladie, le normal et le pathologique",
            "#F97316",
            "Pr. M. Jeanpierre",
            s2Days.get(4),
            3,
            "EN_COURS",
            List.of("Canguilhem", "NormalPathologique", "Épistémologie", "Santé"),
            "Thèse de Georges Canguilhem : la maladie n'est pas une simple variation quantitative de la norme, mais l'instauration de nouvelles normes de vie. Concept de santé selon l'OMS (bien-être biopsychosocial).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(4).atTime(8, 30),
            s2Days.get(4).atTime(8, 30)
        ));

        // S2 - Day 5 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-02",
            "ue8",
            "UE8",
            "Stratégies diagnostiques des mutations et remaniements géniques",
            "#6366F1",
            "Pr. C. Beldjord",
            s2Days.get(4),
            4,
            "EN_COURS",
            List.of("DiagnosticGénétique", "PCR", "SéquençageNGS", "SouthernBlot"),
            "PCR spécifique d'allèle, RT-PCR, séquençage de Sanger vs séquençage à haut débit (NGS). Analyse des remaniements de grande taille par MLPA, CGH-array et cytogénétique moléculaire (FISH).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(4).atTime(8, 30),
            s2Days.get(4).atTime(8, 30)
        ));

        // S2 - Day 6 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-03",
            "ue4",
            "UE4",
            "Calcul intégral et équations différentielles en biologie",
            "#8B5CF6",
            "Pr. C. Guihenneuc-Jouyaux",
            s2Days.get(5),
            4,
            "EN_COURS",
            List.of("Intégrales", "ÉquationsDifférentielles", "Cinétique", "Modélisation"),
            "Primitives, intégration par parties. Équations différentielles linéaires d'ordre 1 (y' + ay = b) et d'ordre 2 à coefficients constants appliquées aux transferts compartimentaux et éliminations médicamenteuses.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(5).atTime(8, 30),
            s2Days.get(5).atTime(8, 30)
        ));

        // S2 - Day 6 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-03",
            "ue5",
            "UE5",
            "Arthrologie générale : Typologie articulaire et degrés de liberté",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(5),
            3,
            "EN_COURS",
            List.of("Arthrologie", "Synoviale", "Diarthrose", "DegrésLiberté"),
            "Synarthroses (fibreuses), amphiarthroses (cartilagineuses), diarthroses/synoviales (cavité articulaire, cartilage hyalin, membrane synoviale, liquide synovial). Classification selon les surfaces (énarthrose 3 ddl, condylienne 2 ddl, trochléenne 1 ddl).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(5).atTime(8, 30),
            s2Days.get(5).atTime(8, 30)
        ));

        // S2 - Day 7 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-03",
            "ue6",
            "UE6",
            "Conception du médicament : Cibles, criblage et hits-to-leads",
            "#06B6D4",
            "Pr. S. Laurent",
            s2Days.get(6),
            3,
            "EN_COURS",
            List.of("ConceptionMédicament", "CriblageHautDébit", "HitToLead", "ChimieThérapeutique"),
            "Identification et validation de la cible biologique. Criblage à haut débit (HTS) et docking moléculaire in silico. Optimisation du touché (\"hit\") en molécule tête de série (\"lead\") par pharmacomodulation.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(6).atTime(8, 30),
            s2Days.get(6).atTime(8, 30)
        ));

        // S2 - Day 7 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-03",
            "ue7",
            "UE7",
            "Claude Bernard et la méthode expérimentale en médecine",
            "#F97316",
            "Pr. J.-C. Coffin",
            s2Days.get(6),
            3,
            "EN_COURS",
            List.of("ClaudeBernard", "MéthodeExpérimentale", "Physiologie", "OHERIC"),
            "Démarche expérimentale (Observation, Hypothèse, Expérience, Résultat, Interprétation, Conclusion). Primauté de la physiologie et du déterminisme biologique. Concept de milieu intérieur et homéostasie.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(6).atTime(8, 30),
            s2Days.get(6).atTime(8, 30)
        ));

        // S2 - Day 8 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-03",
            "ue8",
            "UE8",
            "Repliement, contrôle qualité des protéines et stress du RE",
            "#6366F1",
            "Pr. F. Dardel",
            s2Days.get(7),
            4,
            "EN_COURS",
            List.of("ContrôleQualité", "StressRE", "Chaperonnes", "UPR"),
            "Système de contrôle qualité du réticulum endoplasmique (calnexine, ERAD). Dégradation des protéines mal conformées par le protéasome. Réponse UPR (Unfolded Protein Response, capteurs IRE1, PERK, ATF6).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(7).atTime(8, 30),
            s2Days.get(7).atTime(8, 30)
        ));

        // S2 - Day 8 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-04",
            "ue4",
            "UE4",
            "Théorie des probabilités : Événements, combinatoire et Kolmogorov",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(7),
            3,
            "EN_COURS",
            List.of("Probabilités", "Combinatoire", "Kolmogorov", "Ensembles"),
            "Espace probabilisable (Omega, T). Axiomes de Kolmogorov. Événements disjoints/incompatibles, événements contraires. Dénombrement : arrangements, permutations, combinaisons C(n,k).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(7).atTime(8, 30),
            s2Days.get(7).atTime(8, 30)
        ));

        // S2 - Day 9 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-04",
            "ue5",
            "UE5",
            "Myologie générale : Architecture des muscles squelettiques",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(8),
            2,
            "EN_COURS",
            List.of("Myologie", "MusclesSquelettiques", "Fascias", "Tendons"),
            "Muscles fusiformes, penniformes, plats, annulaires/sphincters. Épimysium, périmysium, endomysium. Rôle des tendons, des bourses séreuses et des gaines synoviales d'amortissement.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(8).atTime(8, 30),
            s2Days.get(8).atTime(8, 30)
        ));

        // S2 - Day 9 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-04",
            "ue6",
            "UE6",
            "Cibles médicamenteuses : Récepteurs couplés aux protéines G (RCPG)",
            "#06B6D4",
            "Pr. G. Pons",
            s2Days.get(8),
            4,
            "EN_COURS",
            List.of("RCPG", "CiblesMédicamenteuses", "Signalisation", "ProtéinesG"),
            "Famille majoritaire des cibles (~30% des médicaments). Structure à 7 hélices transmembranaires. Protéines G hétérotrimériques (Gs, Gi, Gq). Seconds messagers (AMPc, IP3/DAG, Ca2+).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(8).atTime(8, 30),
            s2Days.get(8).atTime(8, 30)
        ));

        // S2 - Day 10 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-04",
            "ue7",
            "UE7",
            "Histoire des institutions hospitalières et évolution des soignants",
            "#F97316",
            "Pr. F. Chast",
            s2Days.get(9),
            2,
            "EN_COURS",
            List.of("Hôpital", "InstitutionsSoins", "HôtelDieu", "CHU"),
            "De l'Hôtel-Dieu médiéval (lieu d'accueil et d'hospice pour indigents) à l'hôpital thérapeutique du XIXe siècle, puis à la création des CHU en 1958 (ordonnances Debré : soins, enseignement, recherche).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(9).atTime(8, 30),
            s2Days.get(9).atTime(8, 30)
        ));

        // S2 - Day 10 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-04",
            "ue8",
            "UE8",
            "Structure, repliement et rôles des ARN non codants et microARN",
            "#6366F1",
            "Pr. R. Barouki",
            s2Days.get(9),
            4,
            "EN_COURS",
            List.of("ARN_NonCodants", "MicroARN", "Épigénétique", "Silencing"),
            "Biogenèse des miARN (Drosha, Dicer, complexe RISC). Répression traductionnelle et dégradation des ARNm cibles. Longs ARN non codants (lncRNA) et régulation de la structure chromatinienne.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(9).atTime(8, 30),
            s2Days.get(9).atTime(8, 30)
        ));

        // S2 - Day 11 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-05",
            "ue4",
            "UE4",
            "Probabilités conditionnelles, indépendance et probabilités composées",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(10),
            3,
            "EN_COURS",
            List.of("Conditionnelles", "Indépendance", "Intersection", "Arbres"),
            "Définition P(A|B) = P(A inter B) / P(B). Indépendance de 2 événements ssi P(A inter B) = P(A) * P(B). Formule des probabilités composées.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(10).atTime(8, 30),
            s2Days.get(10).atTime(8, 30)
        ));

        // S2 - Day 11 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-05",
            "ue5",
            "UE5",
            "Membre supérieur : Ceinture scapulaire, épaule et creux axillaire",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(10),
            4,
            "EN_COURS",
            List.of("MembreSupérieur", "Épaule", "Scapula", "CreuxAxillaire"),
            "Clavicule, scapula, extrémité supérieure de l'humérus. Articulation gléno-humérale (bourrelet glénoïdien). Coiffe des rotateurs (supra-épineux, infra-épineux, petit rond, subscapulaire). Creux axillaire et son contenu vasculo-nerveux.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(10).atTime(8, 30),
            s2Days.get(10).atTime(8, 30)
        ));

        // S2 - Day 12 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-05",
            "ue6",
            "UE6",
            "Cibles médicamenteuses : Canaux ioniques, enzymes et récepteurs nucléaires",
            "#06B6D4",
            "Pr. C. Marchand",
            s2Days.get(11),
            4,
            "EN_COURS",
            List.of("CanauxIoniques", "Enzymes", "RécepteursNucléaires", "Cibles"),
            "Canaux voltage-dépendants et récepteurs-canaux ionotropes (ex: GABAA, récepteur nicotinique). Cibles enzymatiques (ex: COX inhibée par AINS, IEC). Récepteurs nucléaires agissant comme facteurs de transcription (ex: récepteurs des corticoïdes).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(11).atTime(8, 30),
            s2Days.get(11).atTime(8, 30)
        ));

        // S2 - Day 12 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-05",
            "ue7",
            "UE7",
            "Secret médical, serment d'Hippocrate et déontologie",
            "#F97316",
            "Pr. M.-F. Mamzer",
            s2Days.get(11),
            3,
            "EN_COURS",
            List.of("SecretMédical", "Déontologie", "SermentHippocrate", "Confiance"),
            "Secret professionnel d'ordre public (art. 226-13 du Code Pénal). Exceptions légales obligatoires (maltraitance sur mineur/personne vulnérable, déclaration des MDO, certificats de décès). Secret partagé au sein de l'équipe de soins.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(11).atTime(8, 30),
            s2Days.get(11).atTime(8, 30)
        ));

        // S2 - Day 13 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-05",
            "ue8",
            "UE8",
            "Hémoglobines normales et pathologiques : Drépanocytose et thalassémies",
            "#6366F1",
            "Pr. C. Beldjord",
            s2Days.get(12),
            5,
            "EN_COURS",
            List.of("Hémoglobine", "Drépanocytose", "Thalassémie", "Globines"),
            "Structure tétramérique de l'HbA (alpha2 bêta2). Drépanocytose : mutation ponctuelle Glu6Val sur le gène bêta, polymérisation de l'HbS désoxygénée et falciformation érythrocytaire. Alpha et bêta-thalassémies.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(12).atTime(8, 30),
            s2Days.get(12).atTime(8, 30)
        ));

        // S2 - Day 13 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-06",
            "ue4",
            "UE4",
            "Théorème des probabilités totales et formule de Bayes",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(12),
            4,
            "EN_COURS",
            List.of("Bayes", "ProbabilitésTotales", "DiagnosticMédical", "Inversion"),
            "Système complet d'événements. Théorème des probabilités totales : P(A) = sum P(A|Bi)*P(Bi). Formule de Bayes pour le calcul de la probabilité a posteriori P(M|T+) en fonction de la prévalence.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(12).atTime(8, 30),
            s2Days.get(12).atTime(8, 30)
        ));

        // S2 - Day 14 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-06",
            "ue5",
            "UE5",
            "Membre supérieur : Bras, avant-bras, main et loges musculaires",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(13),
            4,
            "EN_COURS",
            List.of("MembreSupérieur", "LogesMusculaires", "CanalCarpien", "AvantBras"),
            "Bras : loge antérieure (biceps, brachial, coracobrachial) et loge postérieure (triceps). Avant-bras : loges antérieure (fléchisseurs/pronateurs), postérieure et latérale (extenseurs/supinateurs). Canal carpien et nerf médian.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(13).atTime(8, 30),
            s2Days.get(13).atTime(8, 30)
        ));

        // S2 - Day 14 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-06",
            "ue6",
            "UE6",
            "Pharmacodynamie quantitative : Agonistes, antagonistes, CE50 et Emax",
            "#06B6D4",
            "Pr. G. Pons",
            s2Days.get(13),
            4,
            "EN_COURS",
            List.of("Pharmacodynamie", "Agonistes", "Antagonistes", "CE50_Emax"),
            "Courbe concentration-effet sigmoïde. Puissance (CE50) vs efficacité (Emax). Agoniste entier, agoniste partiel, agoniste inverse. Antagoniste compétitif (déplace la courbe vers la droite sans modifier Emax) vs non-compétitif (diminue Emax).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(13).atTime(8, 30),
            s2Days.get(13).atTime(8, 30)
        ));

        // S2 - Day 15 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-06",
            "ue7",
            "UE7",
            "Les quatre principes de l'éthique biomédicale (Beauchamp & Childress)",
            "#F97316",
            "Pr. M.-F. Mamzer",
            s2Days.get(14),
            3,
            "EN_COURS",
            List.of("ÉthiqueBiomédicale", "Autonomie", "Bienfaisance", "Justice"),
            "Principe d'autonomie (respect du consentement éclairé), principe de non-malfaisance (primum non nocere), principe de bienfaisance, principe de justice (équité d'accès aux ressources).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(14).atTime(8, 30),
            s2Days.get(14).atTime(8, 30)
        ));

        // S2 - Day 15 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-06",
            "ue8",
            "UE8",
            "La protéine suppresseur de tumeur p53 : Gardien du génome",
            "#6366F1",
            "Pr. P. Beaune",
            s2Days.get(14),
            5,
            "EN_COURS",
            List.of("P53", "GardienGénome", "Oncogènes", "Apoptose"),
            "Structure du facteur de transcription p53 et régulation négative par MDM2 (ubiquitine ligase). Activation par dommages à l'ADN (ATM/ATR). Induction de p21 (arrêt G1/S) ou de gènes pro-apoptotiques (Bax, Puma). Mutations dans > 50% des cancers humains.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(14).atTime(8, 30),
            s2Days.get(14).atTime(8, 30)
        ));

        // S2 - Day 16 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-07",
            "ue4",
            "UE4",
            "Variables aléatoires discrètes : Uniforme, Binomiale et Poisson",
            "#8B5CF6",
            "Pr. G. Chatellier",
            s2Days.get(15),
            3,
            "EN_COURS",
            List.of("VariablesDiscrètes", "LoiBinomiale", "LoiPoisson", "Espérance"),
            "Fonction de probabilité, fonction de répartition. Espérance E(X), variance Var(X). Loi binomiale B(n,p) : E=np, Var=np(1-p). Loi de Poisson P(lambda) : modélisation des événements rares, E=lambda, Var=lambda.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(15).atTime(8, 30),
            s2Days.get(15).atTime(8, 30)
        ));

        // S2 - Day 16 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-07",
            "ue5",
            "UE5",
            "Membre supérieur : Plexus brachial et territoires d'innervation",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(15),
            5,
            "EN_COURS",
            List.of("PlexusBrachial", "NerfMédian", "NerfRadial", "NerfUlnaire"),
            "Origine : racines ventrales C5, C6, C7, C8, T1. Troncs primaires (supérieur, moyen, inférieur) et faisceaux/troncs secondaires (postérieur, antéro-latéral, antéro-médial). Branches terminales : nerfs radial, axillaire, médian, ulnaire, musculocutané.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(15).atTime(8, 30),
            s2Days.get(15).atTime(8, 30)
        ));

        // S2 - Day 17 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-07",
            "ue6",
            "UE6",
            "Pharmacocinétique : Voies d'administration et absorption",
            "#06B6D4",
            "Pr. E. Billaud",
            s2Days.get(16),
            3,
            "EN_COURS",
            List.of("Pharmacocinétique", "Absorption", "Biodisponibilité", "EffetPremierPassage"),
            "Voies entérales (orale, sublinguale, rectale) vs parentérales (IV, IM, SC). Biodisponibilité absolue F = (ASC_orale / ASC_IV) * (Dose_IV / Dose_orale). Effet de premier passage hépatique.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(16).atTime(8, 30),
            s2Days.get(16).atTime(8, 30)
        ));

        // S2 - Day 17 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-07",
            "ue7",
            "UE7",
            "Histoire de l'éthique de la recherche : De Nuremberg aux lois de bioéthique",
            "#F97316",
            "Pr. G. Moutel",
            s2Days.get(16),
            4,
            "EN_COURS",
            List.of("CodeNuremberg", "Helsinki", "Bioéthique", "CPP"),
            "Code de Nuremberg (1947) posant l'obligation absolue du consentement libre et éclairé. Déclaration d'Helsinki (1964). Loi Huriet-Sérusclat (1988) et rôle des Comités de Protection des Personnes (CPP).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(16).atTime(8, 30),
            s2Days.get(16).atTime(8, 30)
        ));

        // S2 - Day 18 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-07",
            "ue8",
            "UE8",
            "Prions et mécanismes conformationnels des maladies neurodégénératives",
            "#6366F1",
            "Pr. R. Barouki",
            s2Days.get(17),
            4,
            "EN_COURS",
            List.of("Prions", "MaladieCreutzfeldtJakob", "Protéinopathie", "Amyloïde"),
            "Conversion conformationnelle de la protéine prion cellulaire normale (PrPc riche en hélices alpha) en isoforme pathologique résistante aux protéases (PrPsc riche en feuillets bêta). Agrégation amyloïde et transmissibilité non conventionnelle.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(17).atTime(8, 30),
            s2Days.get(17).atTime(8, 30)
        ));

        // S2 - Day 18 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-08",
            "ue4",
            "UE4",
            "Variables aléatoires continues : Lois Uniforme, Exponentielle et Normale",
            "#8B5CF6",
            "Pr. G. Chatellier",
            s2Days.get(17),
            4,
            "EN_COURS",
            List.of("VariablesContinues", "LoiNormale", "Gauss", "DensitéProbabilité"),
            "Densité de probabilité f(x). Loi normale standardisée N(0,1). Propriétés de symétrie de la loi normale : P(mu - 1.96 sigma < X < mu + 1.96 sigma) = 0.95. Utilisation des tables statistiques.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(17).atTime(8, 30),
            s2Days.get(17).atTime(8, 30)
        ));

        // S2 - Day 19 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-08",
            "ue5",
            "UE5",
            "Membre inférieur : Ceinture pelvienne, hanche et région glutéale",
            "#EC4899",
            "Pr. P. Corlieu",
            s2Days.get(18),
            4,
            "EN_COURS",
            List.of("MembreInférieur", "OsCoxal", "Hanche", "ArticCoxofémorale"),
            "Os coxal (ilion, ischion, pubis), fémur proximal. Articulation coxo-fémorale (cotyle/acétabulum, bourrelet cotyloïdien, ligament rond). Muscles fessiers/glutéaux (grand, moyen, petit) et rotateurs pelvi-trochantériens.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(18).atTime(8, 30),
            s2Days.get(18).atTime(8, 30)
        ));

        // S2 - Day 19 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-08",
            "ue6",
            "UE6",
            "Pharmacocinétique : Distribution tissulaire, liaison protéique et Vd",
            "#06B6D4",
            "Pr. J.-M. Scherrmann",
            s2Days.get(18),
            4,
            "EN_COURS",
            List.of("Distribution", "VolumeDistribution", "Albumine", "FractionLibre"),
            "Liaison aux protéines plasmatiques (albumine pour médicaments acides, alpha1-glycoprotéine pour médicaments basiques). Seule la fraction libre diffuse et est active. Volume apparent de distribution Vd = Dose / C0.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(18).atTime(8, 30),
            s2Days.get(18).atTime(8, 30)
        ));

        // S2 - Day 20 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-08",
            "ue7",
            "UE7",
            "Éthique de la fin de vie : Soins palliatifs et Loi Claeys-Leonetti",
            "#F97316",
            "Pr. M.-F. Mamzer",
            s2Days.get(19),
            4,
            "EN_COURS",
            List.of("FinDeVie", "SoinsPalliatifs", "ClaeysLeonetti", "DirectivesAnticipées"),
            "Refus de l'obstination déraisonnable (acharnement thérapeutique). Droit à la sédation profonde et continue jusqu'au décès. Directives anticipées et désignation d'une personne de confiance.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(19).atTime(8, 30),
            s2Days.get(19).atTime(8, 30)
        ));

        // S2 - Day 20 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-08",
            "ue8",
            "UE8",
            "Anatomie topographique et biomécanique du bassin obstétrical",
            "#6366F1",
            "Pr. S. Duquenois",
            s2Days.get(19),
            4,
            "EN_COURS",
            List.of("Obstétrique", "BassinObstétrical", "Maïeutique", "DétroitSupérieur"),
            "Détroit supérieur (promontoire, lignes arquées, bord supérieur de la symphyse pubienne), détroit moyen (épines sciatiques) et détroit inférieur. Diamètres obstétricaux utiles (diamètre promonto-rétro-pubien utile >= 10.5 cm).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(19).atTime(8, 30),
            s2Days.get(19).atTime(8, 30)
        ));

        // S2 - Day 21 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-09",
            "ue4",
            "UE4",
            "Théorème Central Limite et approximations asymptotiques",
            "#8B5CF6",
            "Pr. G. Chatellier",
            s2Days.get(20),
            4,
            "EN_COURS",
            List.of("TCL", "ThéorèmeCentralLimite", "LoiDesGrandsNombres", "Approximation"),
            "Pour n grand (n >= 30), la moyenne d'échantillon X_barre converge en loi vers une loi normale N(mu, sigma/sqrt(n)) quelle que soit la loi mère. Approximation de la loi binomiale par la loi normale si np>=5 et n(1-p)>=5.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(20).atTime(8, 30),
            s2Days.get(20).atTime(8, 30)
        ));

        // S2 - Day 21 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-09",
            "ue5",
            "UE5",
            "Membre inférieur : Cuisse, genou, jambe, pied et plexus lombo-sacré",
            "#EC4899",
            "Pr. P. Corlieu",
            s2Days.get(20),
            4,
            "EN_COURS",
            List.of("MembreInférieur", "Genou", "LigamentsCroisés", "PlexusLombaire"),
            "Cuisse : loge antérieure (quadriceps, nerf fémoral), médiale (adducteurs, nerf obturateur), postérieure (ischio-jambiers, nerf sciatique). Articulation du genou (ménisques, ligaments croisés antérieur et postérieur). Nerf sciatique et branches (tibial, fibulaire).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(20).atTime(8, 30),
            s2Days.get(20).atTime(8, 30)
        ));

        // S2 - Day 22 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-09",
            "ue6",
            "UE6",
            "Pharmacocinétique : Métabolisme hépatique et Cytochromes P450",
            "#06B6D4",
            "Pr. X. Declèves",
            s2Days.get(21),
            4,
            "EN_COURS",
            List.of("Métabolisme", "CYP450", "Phase1_Phase2", "Prodrogues"),
            "Réactions de fonctionnalisation de phase I (oxydation par les CYP 3A4, 2D6, 2C9) et de conjugaison de phase II (glucurono-, sulfoconjugaison). Prodrogues activées par le métabolisme. Phénomènes d'induction et d'inhibition enzymatique.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(21).atTime(8, 30),
            s2Days.get(21).atTime(8, 30)
        ));

        // S2 - Day 22 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-09",
            "ue7",
            "UE7",
            "Éthique du don d'organes : Mort encéphalique et consentement présumé",
            "#F97316",
            "Pr. G. Moutel",
            s2Days.get(21),
            3,
            "EN_COURS",
            List.of("DonOrganes", "MortEncéphalique", "ConsentementPrésumé", "Bioéthique"),
            "Critères cliniques et paracliniques de mort encéphalique. Principe légal français du consentement présumé (chacun est donneur sauf inscription sur le Registre National des Refus). Gratuité, anonymat et finalité thérapeutique.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(21).atTime(8, 30),
            s2Days.get(21).atTime(8, 30)
        ));

        // S2 - Day 23 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-09",
            "ue8",
            "UE8",
            "Filière pelvi-génitale et dynamique de l'accouchement",
            "#6366F1",
            "Pr. S. Duquenois",
            s2Days.get(22),
            4,
            "EN_COURS",
            List.of("Accouchement", "FilièreGénitale", "Périnée", "MécaniqueObstétricale"),
            "Traversée des détroits : engagement, descente, rotation intrapelvienne et dégagement de la présentation céphalique. Muscles du plancher pelvien et prévention des déchirures périnéales.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(22).atTime(8, 30),
            s2Days.get(22).atTime(8, 30)
        ));

        // S2 - Day 23 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-10",
            "ue4",
            "UE4",
            "Statistique descriptive univariée : Position et dispersion",
            "#8B5CF6",
            "Pr. N. Beau",
            s2Days.get(22),
            2,
            "EN_COURS",
            List.of("StatDescriptive", "Moyenne", "Médiane", "ÉcartType"),
            "Indicateurs de position : moyenne arithmétique, médiane, mode, quartiles. Indicateurs de dispersion : variance, écart-type, étendue, intervalle interquartile (IQR). Boîtes à moustaches (boxplots).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(22).atTime(8, 30),
            s2Days.get(22).atTime(8, 30)
        ));

        // S2 - Day 24 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-10",
            "ue5",
            "UE5",
            "Colonne vertébrale : Morphologie et cinématique des rachis",
            "#EC4899",
            "Pr. V. Delmas",
            s2Days.get(23),
            4,
            "EN_COURS",
            List.of("Rachis", "Vertèbres", "DisqueIntervertébral", "MoelleÉpinière"),
            "Courbures physiologiques : lordoses cervicale et lombaire, cyphoses thoracique et sacrée. Structure d'une vertèbre type. Disque intervertébral (annulus fibrosus, nucleus pulposus). Canal vertébral et moelle spinale.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(23).atTime(8, 30),
            s2Days.get(23).atTime(8, 30)
        ));

        // S2 - Day 24 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-10",
            "ue6",
            "UE6",
            "Pharmacocinétique : Élimination, clairance et demi-vie plasmatique",
            "#06B6D4",
            "Pr. E. Billaud",
            s2Days.get(23),
            5,
            "EN_COURS",
            List.of("Clairance", "DemiVie", "ÉliminationRénale", "CinétiqueOrdre1"),
            "Clairance corporelle totale Cl = Vd * kel = Dose / ASC. Demi-vie d'élimination t1/2 = ln(2) / kel = 0.693 * Vd / Cl. Notion d'état d'équilibre atteint après 4 à 5 demi-vies.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(23).atTime(8, 30),
            s2Days.get(23).atTime(8, 30)
        ));

        // S2 - Day 25 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-10",
            "ue7",
            "UE7",
            "Éthique du début de la vie : IVG (Loi Veil), IMG et diagnostic prénatal",
            "#F97316",
            "Pr. G. Moutel",
            s2Days.get(24),
            4,
            "EN_COURS",
            List.of("LoiVeil", "IVG", "IMG", "DiagnosticPrénatal"),
            "Loi Veil de 1975 dépénalisant l'IVG. Distinction entre IVG (demande de la femme) et IMG (sans limite de terme, motivée médicalement par péril grave pour la mère ou affection incurable pour l'enfant). Dépistage et diagnostic prénatal.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(24).atTime(8, 30),
            s2Days.get(24).atTime(8, 30)
        ));

        // S2 - Day 25 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-10",
            "ue8",
            "UE8",
            "Anatomie crânio-faciale appliquée et région ptérygo-maxillaire",
            "#6366F1",
            "Pr. H. Chardin",
            s2Days.get(24),
            4,
            "EN_COURS",
            List.of("Odontologie", "FossePtérygoMaxillaire", "NerfTrijumeau", "Maxillaire"),
            "Fosse ptérygo-palatine, articulation temporo-mandibulaire (ATM, ménisque, mouvements de propulsion/diduction). Innervation sensitive par les branches du nerf trijumeau (V2 maxillaire, V3 mandibulaire).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(24).atTime(8, 30),
            s2Days.get(24).atTime(8, 30)
        ));

        // S2 - Day 26 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-11",
            "ue4",
            "UE4",
            "Statistique descriptive bivariée : Corrélation et régression linéaire",
            "#8B5CF6",
            "Pr. N. Beau",
            s2Days.get(25),
            3,
            "EN_COURS",
            List.of("Corrélation", "RégressionLinéaire", "Pearson", "MoindresCarrés"),
            "Covariance cov(X,Y). Coefficient de corrélation linéaire de Pearson r (-1 <= r <= 1). Droite de régression des moindres carrés y = ax + b. Attention : corrélation n'implique pas causalité !",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(25).atTime(8, 30),
            s2Days.get(25).atTime(8, 30)
        ));

        // S2 - Day 26 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-11",
            "ue5",
            "UE5",
            "Cage thoracique : Côtes, sternum, muscles intercostaux et diaphragme",
            "#EC4899",
            "Pr. C. Latrémouille",
            s2Days.get(25),
            3,
            "EN_COURS",
            List.of("Thorax", "Côtes", "Sternum", "Diaphragme"),
            "Sternum (manubrium, corps, appendice xiphoïde), 12 paires de côtes (7 vraies, 3 fausses, 2 flottantes). Diaphragme : coupoles droite et gauche, orifices (aortique T12, œsophagien T10, cave inférieur T8).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(25).atTime(8, 30),
            s2Days.get(25).atTime(8, 30)
        ));

        // S2 - Day 27 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-11",
            "ue6",
            "UE6",
            "Développement préclinique : Pharmacologie expérimentale et toxicologie",
            "#06B6D4",
            "Pr. J.-M. Tréluyer",
            s2Days.get(26),
            3,
            "EN_COURS",
            List.of("Préclinique", "Toxicologie", "DoseLétale", "Tératogenèse"),
            "Études de pharmacodynamie et pharmacocinétique in vivo chez l'animal. Toxicologie aiguë (DL50) et chronique. Recherche de mutagénicité (test d'Ames), cancérogénicité et tératogénicité.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(26).atTime(8, 30),
            s2Days.get(26).atTime(8, 30)
        ));

        // S2 - Day 27 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-11",
            "ue7",
            "UE7",
            "Épistémologie de la génétique : Déterminisme, inné vs acquis",
            "#F97316",
            "Pr. M. Jeanpierre",
            s2Days.get(26),
            3,
            "EN_COURS",
            List.of("Génétique", "InnéAcquis", "Épigénétique", "Déterminisme"),
            "Limites du réductionnisme génétique. Rôle de l'environnement, de l'épigénétique et du hasard dans l'expression phénotypique. Dangers éthiques de l'eugénisme.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(26).atTime(8, 30),
            s2Days.get(26).atTime(8, 30)
        ));

        // S2 - Day 28 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-11",
            "ue8",
            "UE8",
            "Morphogenèse et histologie bucco-dentaire",
            "#6366F1",
            "Pr. H. Chardin",
            s2Days.get(27),
            4,
            "EN_COURS",
            List.of("HistologieDentaire", "Émail", "Dentine", "Améloblastes"),
            "Organe de l'émail (améloblastes sécréteurs d'émail acellulaire hyperminéralisé). Papille dentaire (odontoblastes sécréteurs de dentine). Pulpe dentaire vascularisée et innervée. Parodonte de soutien.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(27).atTime(8, 30),
            s2Days.get(27).atTime(8, 30)
        ));

        // S2 - Day 28 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-12",
            "ue4",
            "UE4",
            "Métrologie biomédicale : Justesse, fidélité et répétabilité",
            "#8B5CF6",
            "Pr. M. Chiadmi",
            s2Days.get(27),
            3,
            "EN_COURS",
            List.of("Métrologie", "Justesse", "Fidélité", "ErreursMesure"),
            "Erreurs systématiques (biais) affectant la justesse. Erreurs aléatoires affectant la fidélité (répétabilité dans les mêmes conditions, reproductibilité dans des conditions variées).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(27).atTime(8, 30),
            s2Days.get(27).atTime(8, 30)
        ));

        // S2 - Day 29 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-12",
            "ue5",
            "UE5",
            "Appareil circulatoire : Morphologie cardiaque, cavités, valves et péricarde",
            "#EC4899",
            "Pr. C. Latrémouille",
            s2Days.get(28),
            4,
            "EN_COURS",
            List.of("Cœur", "ValvesCardiaques", "Péricarde", "CavitésCardiaques"),
            "Atriums droit/gauche et ventricules droit/gauche. Squelette fibreux et valves : tricuspide, mitrale, pulmonaire, aortique. Péricarde séreux (feuillet viscéral/épicarde, feuillet pariétal) et péricarde fibreux. Tissu cardionecteur.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(28).atTime(8, 30),
            s2Days.get(28).atTime(8, 30)
        ));

        // S2 - Day 29 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-12",
            "ue6",
            "UE6",
            "Développement clinique : Phases I, II, III et IV des essais humains",
            "#06B6D4",
            "Pr. J.-M. Tréluyer",
            s2Days.get(28),
            4,
            "EN_COURS",
            List.of("EssaisCliniques", "PhasesI_IV", "VolontairesSains", "Efficacité"),
            "Phase I : première administration chez le volontaire sain (tolérance, pharmacocinétique). Phase II : dose-ranging chez un petit groupe de patients. Phase III : étude pivot comparative d'efficacité sur large cohorte. Phase IV : post-AMM en vie réelle.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(28).atTime(8, 30),
            s2Days.get(28).atTime(8, 30)
        ));

        // S2 - Day 30 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-12",
            "ue7",
            "UE7",
            "Sociologie et anthropologie de la maladie et de la douleur",
            "#F97316",
            "Pr. F. Nguyen",
            s2Days.get(29),
            3,
            "EN_COURS",
            List.of("SociologieSanté", "Anthropologie", "ExpérienceMaladie", "Douleur"),
            "Distinction anthropologique anglophone : Disease (la pathologie biologique), Illness (l'expérience vécue par le patient), Sickness (le statut social du malade). Représentations culturelles de la maladie.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(29).atTime(8, 30),
            s2Days.get(29).atTime(8, 30)
        ));

        // S2 - Day 30 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-12",
            "ue8",
            "UE8",
            "Pharmacochimie : Synthèse et relations structure-activité (RSA)",
            "#6366F1",
            "Pr. J. Ardisson",
            s2Days.get(29),
            4,
            "EN_COURS",
            List.of("Pharmacie", "RelationsStructureActivité", "Pharmacophores", "Synthèse"),
            "Identification des groupements pharmacophores essentiels à l'affinité pour la cible. Isostérie et bio-isostérie (remplacement de groupements chimiques pour optimiser l'activité et la pharmacocinétique).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(29).atTime(8, 30),
            s2Days.get(29).atTime(8, 30)
        ));

        // S2 - Day 31 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-13",
            "ue4",
            "UE4",
            "Performances des tests diagnostiques : Sensibilité, Spécificité, ROC",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(30),
            4,
            "EN_COURS",
            List.of("Sensibilité", "Spécificité", "VPP_VPN", "CourbeROC"),
            "Tableau de contingence 2x2. Sensibilité Se = VP / (VP + FN), Spécificité Sp = VN / (VN + FP). Valeurs prédictives VPP et VPN (dépendantes de la prévalence !). Courbe ROC (Se en fonction de 1 - Sp) et aire sous la courbe AUC.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(30).atTime(8, 30),
            s2Days.get(30).atTime(8, 30)
        ));

        // S2 - Day 31 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-13",
            "ue5",
            "UE5",
            "Appareil circulatoire : Vascularisation coronaire et arbre artériel",
            "#EC4899",
            "Pr. C. Latrémouille",
            s2Days.get(30),
            4,
            "EN_COURS",
            List.of("Coronaires", "Aorte", "ArbreArtériel", "SystèmeVeineux"),
            "Artères coronaires droite et gauche (origine dans les sinus de Valsalva). Crosse de l'aorte et ses 3 branches (tronc brachio-céphalique, carotide commune gauche, subclavière gauche). Système des veines caves et système porte.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(30).atTime(8, 30),
            s2Days.get(30).atTime(8, 30)
        ));

        // S2 - Day 32 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-13",
            "ue6",
            "UE6",
            "Évaluation médico-administrative : AMM, rôle de l'EMA et de l'ANSM",
            "#06B6D4",
            "Pr. C. Le Jeunne",
            s2Days.get(31),
            3,
            "EN_COURS",
            List.of("AMM", "EMA", "ANSM", "Réglementation"),
            "Procédure centralisée européenne (EMA) vs procédures nationales (ANSM). Dossier d'AMM (qualité pharmaceutique, sécurité, efficacité). Résumé des Caractéristiques du Produit (RCP) et notice patient.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(31).atTime(8, 30),
            s2Days.get(31).atTime(8, 30)
        ));

        // S2 - Day 32 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-13",
            "ue7",
            "UE7",
            "La personne juridique face à la personne biologique",
            "#F97316",
            "Pr. G. Moutel",
            s2Days.get(31),
            3,
            "EN_COURS",
            List.of("PersonneJuridique", "DroitSanté", "StatutEmbryon", "CapacitéJuridique"),
            "La personnalité juridique s'acquiert à la naissance pour l'enfant né vivant et viable et s'éteint à la mort. Statut juridique singulier de l'embryon (\"personne humaine potentielle\" protégée).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(31).atTime(8, 30),
            s2Days.get(31).atTime(8, 30)
        ));

        // S2 - Day 33 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-13",
            "ue8",
            "UE8",
            "Formes galéniques innovantes, vectorisation et nanomédicaments",
            "#6366F1",
            "Pr. P. Arnaud",
            s2Days.get(32),
            4,
            "EN_COURS",
            List.of("Galénique", "Nanomédicaments", "Vectorisation", "Liposomes"),
            "Vectorisation de 1ère génération (liposomes passifs), 2ème génération (nanoparticules furtives pégylées échappant aux macrophages), 3ème génération (ciblage actif par anticorps de surface). Systèmes à libération contrôlée.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(32).atTime(8, 30),
            s2Days.get(32).atTime(8, 30)
        ));

        // S2 - Day 33 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-14",
            "ue4",
            "UE4",
            "Échantillonnage et représentativité des échantillons",
            "#8B5CF6",
            "Pr. C. Guihenneuc-Jouyaux",
            s2Days.get(32),
            3,
            "EN_COURS",
            List.of("Échantillonnage", "TirageAléatoire", "BiaisSélection", "Représentativité"),
            "Population cible vs population source. Échantillonnage aléatoire simple, stratifié, en grappes. Biais de sélection (biais de Berkson, volontariat). Notion de fluctuation d'échantillonnage.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(32).atTime(8, 30),
            s2Days.get(32).atTime(8, 30)
        ));

        // S2 - Day 34 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-14",
            "ue5",
            "UE5",
            "Appareil respiratoire : Trachée, arbre bronchique, poumons et plèvres",
            "#EC4899",
            "Pr. C. Latrémouille",
            s2Days.get(33),
            4,
            "EN_COURS",
            List.of("Poumons", "Plèvres", "Trachée", "Bronches"),
            "Trachée (anneaux cartilagineux en fer à cheval), bronches principales droite et gauche. Poumon droit (3 lobes, 2 scissures) vs poumon gauche (2 lobes, 1 scissure). Hile pulmonaire. Cavité pleurale et récessus pleuraux.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(33).atTime(8, 30),
            s2Days.get(33).atTime(8, 30)
        ));

        // S2 - Day 34 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-14",
            "ue6",
            "UE6",
            "Commission de la Transparence : SMR et ASMR de la HAS",
            "#06B6D4",
            "Pr. J.-H. Trouvin",
            s2Days.get(33),
            4,
            "EN_COURS",
            List.of("HAS", "SMR", "ASMR", "CommissionTransparence"),
            "Service Médical Rendu (SMR : majeur, important, modéré, faible, insuffisant) conditionnant le taux de remboursement. Amélioration du SMR (ASMR de I majeure à V absence d'amélioration) conditionnant la négociation du prix.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(33).atTime(8, 30),
            s2Days.get(33).atTime(8, 30)
        ));

        // S2 - Day 35 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-14",
            "ue7",
            "UE7",
            "Responsabilité médicale : Civile, pénale, ordinale et hospitalière",
            "#F97316",
            "Pr. G. Moutel",
            s2Days.get(34),
            4,
            "EN_COURS",
            List.of("ResponsabilitéMédicale", "FauteMédicale", "ONIAM", "Indemnisation"),
            "Obligation de moyens et non de résultat. Responsabilité civile (réparation du préjudice), pénale (sanction d'une infraction), disciplinaire/ordinale (Conseil de l'Ordre), administrative (hôpital public). Aléa thérapeutique et indemnisation par l'ONIAM (loi Kouchner de 2002).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(34).atTime(8, 30),
            s2Days.get(34).atTime(8, 30)
        ));

        // S2 - Day 35 (Course 2/2) : UE8
        list.add(new Course(
            "course-ue8-14",
            "ue8",
            "UE8",
            "Physiologie neuromusculaire appliquée à la kinésithérapie",
            "#6366F1",
            "Pr. A.T. Dinh-Xuan",
            s2Days.get(34),
            4,
            "EN_COURS",
            List.of("Kinésithérapie", "PhysiologieMusculaire", "FuseauNeuromusculaire", "Proprioception"),
            "Unité motrice et principe de Henneman (recrutement ordonné des fibres de type I lentes puis de type II rapides). Propriocepteurs : fuseaux neuromusculaires (réflexe myotatique) et organes tendineux de Golgi (réflexe myotatique inverse).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(34).atTime(8, 30),
            s2Days.get(34).atTime(8, 30)
        ));

        // S2 - Day 36 (Course 1/2) : UE4
        list.add(new Course(
            "course-ue4-15",
            "ue4",
            "UE4",
            "Estimation ponctuelle et qualités d'un bon estimateur",
            "#8B5CF6",
            "Pr. C. Guihenneuc-Jouyaux",
            s2Days.get(35),
            3,
            "EN_COURS",
            List.of("EstimationPonctuelle", "EstimateurSansBiais", "Convergence", "Efficacité"),
            "Définition d'un estimateur. Propriétés : sans biais E(theta_chapeau) = theta, convergent (varie vers 0 quand n -> infini), efficace (variance minimale). Estimateur de la variance s^2 avec n-1 degrés de liberté.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(35).atTime(8, 30),
            s2Days.get(35).atTime(8, 30)
        ));

        // S2 - Day 36 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-15",
            "ue5",
            "UE5",
            "Appareil digestif : Tube digestif (œsophage à rectum) et péritoine",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(35),
            4,
            "EN_COURS",
            List.of("Digestif", "Estomac", "IntestinGrêle", "Péritoine"),
            "Œsophage cervical/thoracique/abdominal. Estomac (cardia, fundus, corps, antre, pylore). Duodénum (cadre duodénal), jéjunum, iléon. Côlon (caecum, appendice, côlon ascendant/transverse/descendant/sigmoïde), rectum. Grand omentum.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(35).atTime(8, 30),
            s2Days.get(35).atTime(8, 30)
        ));

        // S2 - Day 37 (Course 1/2) : UE6
        list.add(new Course(
            "course-ue6-15",
            "ue6",
            "UE6",
            "Économie de la santé : Fixation du prix et remboursement",
            "#06B6D4",
            "Pr. J. Blacher",
            s2Days.get(36),
            3,
            "EN_COURS",
            List.of("PrixMédicament", "CEPS", "Remboursement", "AssuranceMaladie"),
            "Comité Économique des Produits de Santé (CEPS). Négociation du prix selon l'ASMR, les volumes prévisionnels et les prix européens. Taux de prise en charge par la Sécurité Sociale (100%, 65%, 30%, 15%).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(36).atTime(8, 30),
            s2Days.get(36).atTime(8, 30)
        ));

        // S2 - Day 37 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-15",
            "ue7",
            "UE7",
            "Éthique du soin : Vulnérabilité, sollicitude et alliance thérapeutique",
            "#F97316",
            "Pr. S. Beloucif",
            s2Days.get(36),
            3,
            "EN_COURS",
            List.of("ÉthiqueCare", "Sollicitude", "Vulnérabilité", "RelationSoin"),
            "Éthique du \"care\" (prendre soin). Prise en compte de la vulnérabilité intrinsèque du patient et développement d'une posture soignante empathique et respectueuse de la dignité humaine.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(36).atTime(8, 30),
            s2Days.get(36).atTime(8, 30)
        ));

        // S2 - Day 38 (Course 1/2) : UE8
        list.add(new Course(
            "course-ue8-15",
            "ue8",
            "UE8",
            "Explorations fonctionnelles respiratoires et cardiovasculaires",
            "#6366F1",
            "Pr. A.T. Dinh-Xuan",
            s2Days.get(37),
            4,
            "EN_COURS",
            List.of("EFR", "Spirométrie", "VEMS_CVF", "Physiopathologie"),
            "Spirométrie (Capacité Vitale CV, VEMS). Syndrome obstructif (rapport de Tiffeneau VEMS/CV < 70%) vs syndrome restrictif (Capacité Pulmonaire Totale CPT < 80%). Mesure de la diffusion du CO (DLCO) et épreuve d'effort cardio-respiratoire (VO2 max).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(37).atTime(8, 30),
            s2Days.get(37).atTime(8, 30)
        ));

        // S2 - Day 38 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-16",
            "ue4",
            "UE4",
            "Estimation par intervalle de confiance d'une moyenne et d'une proportion",
            "#8B5CF6",
            "Pr. C. Guihenneuc-Jouyaux",
            s2Days.get(37),
            4,
            "EN_COURS",
            List.of("IntervalleConfiance", "IC95", "MargeErreur", "Précision"),
            "IC à 95% d'une moyenne : [m - 1.96 * s / sqrt(n) ; m + 1.96 * s / sqrt(n)]. IC à 95% d'une proportion : [p - 1.96 * sqrt(p(1-p)/n) ; p + 1.96 * sqrt(p(1-p)/n)]. Interprétation rigoureuse de l'IC.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(37).atTime(8, 30),
            s2Days.get(37).atTime(8, 30)
        ));

        // S2 - Day 39 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-16",
            "ue5",
            "UE5",
            "Appareil digestif : Glandes annexes (foie, voies biliaires, pancréas)",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(38),
            4,
            "EN_COURS",
            List.of("Foie", "Pancréas", "VoiesBiliaires", "Rate"),
            "Segmentation hépatique de Couinaud (8 segments). Voies biliaires : canal hépatique commun + canal cystique = canal cholédoque. Pancréas (tête, isthme, corps, queue, canal de Wirsung). Rate dans l'hypochondre gauche.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(38).atTime(8, 30),
            s2Days.get(38).atTime(8, 30)
        ));

        // S2 - Day 39 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-16",
            "ue6",
            "UE6",
            "Aspects sociétaux, observance thérapeutique et effet placebo",
            "#06B6D4",
            "Pr. F. Chast",
            s2Days.get(38),
            2,
            "EN_COURS",
            List.of("Observance", "Placebo", "Société", "Nocebo"),
            "Facteurs influençant l'observance (complexité du schéma posologique, effets indésirables). Mécanismes psychobiologiques de l'effet placebo et nocebo.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(38).atTime(8, 30),
            s2Days.get(38).atTime(8, 30)
        ));

        // S2 - Day 40 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-16",
            "ue7",
            "UE7",
            "Démographie sanitaire en France : Indicateurs et pyramide des âges",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(39),
            2,
            "EN_COURS",
            List.of("Démographie", "PyramideDesÂges", "EspéranceDeVie", "Vieillissement"),
            "Espérance de vie à la naissance et à 65 ans, espérance de vie sans incapacité. Taux brut de natalité, fécondité (~1.8 enfant/femme). Vieillissement démographique et transition épidémiologique.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(39).atTime(8, 30),
            s2Days.get(39).atTime(8, 30)
        ));

        // S2 - Day 40 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-17",
            "ue4",
            "UE4",
            "Théorie des tests d'hypothèses : H0/H1, risques alpha et bêta",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(39),
            4,
            "EN_COURS",
            List.of("TestsHypothèses", "RisqueAlpha", "RisqueBêta", "Puissance"),
            "Hypothèse nulle H0 vs alternative H1. Erreur de 1ère espèce alpha (rejeter H0 à tort). Erreur de 2nde espèce bêta (conserver H0 à tort). Puissance statistique 1 - bêta. Notion de p-value et seuil de significativité.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(39).atTime(8, 30),
            s2Days.get(39).atTime(8, 30)
        ));

        // S2 - Day 41 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-17",
            "ue5",
            "UE5",
            "Appareil urinaire : Reins, uretères, vessie et urètre",
            "#EC4899",
            "Pr. V. Delmas",
            s2Days.get(40),
            3,
            "EN_COURS",
            List.of("Reins", "Uretères", "Vessie", "LogeRénale"),
            "Reins droit et gauche (le droit plus bas), loge rénale et fascia de Gerota. Cortex rénal, médullaire (pyramides de Malpighi), calices et bassinet. Trajet rétro-péritonéal des uretères. Trigone vésical.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(40).atTime(8, 30),
            s2Days.get(40).atTime(8, 30)
        ));

        // S2 - Day 41 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-17",
            "ue6",
            "UE6",
            "Règles de prescription : Rédaction et ordonnances sécurisées",
            "#06B6D4",
            "Pr. A. Cariou",
            s2Days.get(40),
            3,
            "EN_COURS",
            List.of("Prescription", "Ordonnance", "SubstancesVénéneuses", "Législation"),
            "Prescription en Dénomination Commune Internationale (DCI). Listes I, II et stupéfiants (durée maximale 28 jours, ordonnance sécurisée infalsifiable, prescription en toutes lettres). Mention \"non substituable\" réglementée.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(40).atTime(8, 30),
            s2Days.get(40).atTime(8, 30)
        ));

        // S2 - Day 42 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-17",
            "ue7",
            "UE7",
            "Épidémiologie descriptive : Mesure de la morbidité (incidence, prévalence)",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(41),
            3,
            "EN_COURS",
            List.of("ÉpidémiologieDescriptive", "Incidence", "Prévalence", "TauxAttaque"),
            "Incidence (nouveaux cas par unité de temps, notion de flux) vs Prévalence (nombre total de cas à un instant donné, notion de stock). Relation prévalence = incidence * durée moyenne de la maladie.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(41).atTime(8, 30),
            s2Days.get(41).atTime(8, 30)
        ));

        // S2 - Day 42 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-18",
            "ue4",
            "UE4",
            "Test de comparaison d'une moyenne à une valeur théorique",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(41),
            4,
            "EN_COURS",
            List.of("TestMoyenne", "ZTest", "Student", "DegrésDeLiberté"),
            "Test Z si variance connue ou grand échantillon (z_obs = (m - mu0) / (sigma / sqrt(n))). Test t de Student si variance inconnue (t_obs = (m - mu0) / (s / sqrt(n))) avec n-1 ddl. Conditions de validité (normalité).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(41).atTime(8, 30),
            s2Days.get(41).atTime(8, 30)
        ));

        // S2 - Day 43 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-18",
            "ue5",
            "UE5",
            "Appareil génital masculin et féminin, petit bassin",
            "#EC4899",
            "Pr. V. Delmas",
            s2Days.get(42),
            4,
            "EN_COURS",
            List.of("AppareilGénital", "PetitBassin", "Pelvis", "Périnée"),
            "Appareil masculin : testicules, épididyme, canaux déférents, prostate, vésicules séminales, verge. Appareil féminin : ovaires, trompes de Fallope, utérus (corps, col, antéversion/antéflexion), vagin. Cul-de-sac de Douglas.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(42).atTime(8, 30),
            s2Days.get(42).atTime(8, 30)
        ));

        // S2 - Day 43 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-18",
            "ue6",
            "UE6",
            "Évaluation clinique du rapport bénéfice / risque thérapeutique",
            "#06B6D4",
            "Pr. O. Bourdon",
            s2Days.get(42),
            4,
            "EN_COURS",
            List.of("BénéficeRisque", "Prescription", "Indication", "ContreIndication"),
            "Balance bénéfice/risque dynamique. Indications formelles, contre-indications absolues et relatives, précautions d'emploi. Adaptation posologique chez les sujets fragiles.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(42).atTime(8, 30),
            s2Days.get(42).atTime(8, 30)
        ));

        // S2 - Day 44 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-18",
            "ue7",
            "UE7",
            "Indicateurs de mortalité : Prématurée, évitable et APVP",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(43),
            3,
            "EN_COURS",
            List.of("Mortalité", "MortalitéPrématurée", "MortalitéÉvitable", "APVP"),
            "Mortalité prématurée (décès avant 65 ans). Mortalité évitable liée aux comportements (alcool, tabac, accidents) vs évitable liée au système de soins. Années Potentielles de Vie Perdues (APVP).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(43).atTime(8, 30),
            s2Days.get(43).atTime(8, 30)
        ));

        // S2 - Day 44 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-19",
            "ue4",
            "UE4",
            "Test de comparaison de deux moyennes indépendantes (Student)",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(43),
            4,
            "EN_COURS",
            List.of("DeuxMoyennes", "TestStudent", "Homoscédasticité", "ÉchantillonsIndépendants"),
            "Comparaison de deux échantillons indépendants. Hypothèse d'homogénéité des variances (homoscédasticité, test de Fisher). Degrés de liberté n1 + n2 - 2.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(43).atTime(8, 30),
            s2Days.get(43).atTime(8, 30)
        ));

        // S2 - Day 45 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-19",
            "ue5",
            "UE5",
            "Tête et cou : Squelette crânio-facial et loges cervicales",
            "#EC4899",
            "Pr. P. Corlieu",
            s2Days.get(44),
            4,
            "EN_COURS",
            List.of("Crâne", "MassifFacial", "Cou", "LogeThyroïdienne"),
            "Neurocrâne (frontal, pariétaux, temporaux, occipital, sphénoïde, ethmoïde) et viscérocrâne/massif facial. Loge viscérale du cou, glande thyroïde, larynx, pharynx. Gaine vasculaire du cou (carotide, jugulaire interne, nerf vague X).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(44).atTime(8, 30),
            s2Days.get(44).atTime(8, 30)
        ));

        // S2 - Day 45 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-19",
            "ue6",
            "UE6",
            "Typologie et mécanismes des effets indésirables médicamenteux",
            "#06B6D4",
            "Pr. L. Moachon",
            s2Days.get(44),
            3,
            "EN_COURS",
            List.of("EffetsIndésirables", "Pharmacovigilance", "TypeA_TypeB", "Toxicité"),
            "Effets indésirables de type A (attendus, dose-dépendants, liés au mécanisme pharmacologique) vs de type B (inattendus, bizarres, non dose-dépendants, immuno-allergiques ou idiosyncrasiques).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(44).atTime(8, 30),
            s2Days.get(44).atTime(8, 30)
        ));

        // S2 - Day 46 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-19",
            "ue7",
            "UE7",
            "Systèmes d'information sanitaire : Registres, PMSI et CépiDc",
            "#F97316",
            "Pr. Ph. Ravaud",
            s2Days.get(45),
            3,
            "EN_COURS",
            List.of("SystèmesInformation", "PMSI", "CépiDc", "RegistresMorbidité"),
            "Certificats de décès analysés par le CépiDc (cause initiale et causes associées). Programme de Médicalisation des Systèmes d'Information (PMSI, codage CIM-10). Registres nationaux (cancers, malformations).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(45).atTime(8, 30),
            s2Days.get(45).atTime(8, 30)
        ));

        // S2 - Day 46 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-20",
            "ue4",
            "UE4",
            "Test de Student sur séries appariées et tests non paramétriques",
            "#8B5CF6",
            "Pr. J.-P. Jaïs",
            s2Days.get(45),
            4,
            "EN_COURS",
            List.of("SériesAppariées", "Wilcoxon", "MannWhitney", "NonParamétrique"),
            "Séries appariées (avant/après sur le même sujet) : test de la moyenne des différences D. Tests non paramétriques quand conditions de normalité non remplies (Wilcoxon apparié, Mann-Whitney indépendant).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(45).atTime(8, 30),
            s2Days.get(45).atTime(8, 30)
        ));

        // S2 - Day 47 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-20",
            "ue5",
            "UE5",
            "Système nerveux central : Encéphale, tronc cérébral, cervelet et méninges",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(46),
            5,
            "EN_COURS",
            List.of("SNC", "Encéphale", "Cervelet", "Méninges"),
            "Hémisphères cérébraux (lobes frontal, pariétal, temporal, occipital, insula), cortex cérébral. Tronc cérébral (mésencéphale, pont, bulbe/moelle allongée). Cervelet. Système ventriculaire et LCR. Méninges (dure-mère, arachnoïde, pie-mère).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(46).atTime(8, 30),
            s2Days.get(46).atTime(8, 30)
        ));

        // S2 - Day 47 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-20",
            "ue6",
            "UE6",
            "Organisation de la Pharmacovigilance et modalités de notification",
            "#06B6D4",
            "Pr. O. Laprévote",
            s2Days.get(46),
            3,
            "EN_COURS",
            List.of("Pharmacovigilance", "CRPV", "NotificationSpontanée", "SignalSanitaire"),
            "Centres Régionaux de Pharmacovigilance (CRPV) et ANSM. Obligation de signalement sans délai par tout professionnel de santé (médecin, pharmacien, sage-femme, infirmier) de tout effet indésirable grave ou inattendu.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(46).atTime(8, 30),
            s2Days.get(46).atTime(8, 30)
        ));

        // S2 - Day 48 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-20",
            "ue7",
            "UE7",
            "Surveillance épidémiologique : MDO et réseaux Sentinelles",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(47),
            3,
            "EN_COURS",
            List.of("SurveillanceÉpidémiologique", "MDO", "Sentinelles", "AlerteSanitaire"),
            "Maladies à Déclaration Obligatoire (MDO, ~36 pathologies infectieuses et non infectieuses). Réseau Sentinelles de médecins libéraux (grippe, gastro-entérites, varicelle). Centres Nationaux de Référence (CNR).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(47).atTime(8, 30),
            s2Days.get(47).atTime(8, 30)
        ));

        // S2 - Day 48 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-21",
            "ue4",
            "UE4",
            "Test de comparaison de proportions (norme et deux échantillons)",
            "#8B5CF6",
            "Pr. G. Chatellier",
            s2Days.get(47),
            4,
            "EN_COURS",
            List.of("TestProportions", "ZTestProportions", "Échantillons", "Validité"),
            "Comparaison d'une proportion observée p0 à une valeur théorique P. Comparaison de deux proportions p1 et p2 avec proportion commune pondérée. Conditions np >= 5 et n(1-p) >= 5.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(47).atTime(8, 30),
            s2Days.get(47).atTime(8, 30)
        ));

        // S2 - Day 49 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-21",
            "ue5",
            "UE5",
            "Système nerveux périphérique et autonome : Nerfs crâniens et plexus",
            "#EC4899",
            "Pr. J.-M. Chevallier",
            s2Days.get(48),
            5,
            "EN_COURS",
            List.of("NerfsCrâniens", "SNP", "SystèmeAutonome", "Sympathique"),
            "Les 12 paires de nerfs crâniens (I à XII) et leurs émergences. Nerfs spinaux (31 paires). Système nerveux autonome : contingent sympathique (chaîne para-vertébrale, adrénergique) et parasympathique (nerfs III, VII, IX, X, cholinergique).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(48).atTime(8, 30),
            s2Days.get(48).atTime(8, 30)
        ));

        // S2 - Day 49 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-21",
            "ue6",
            "UE6",
            "Pharmaco-épidémiologie : Surveillance post-commercialisation",
            "#06B6D4",
            "Pr. L. Moachon",
            s2Days.get(48),
            3,
            "EN_COURS",
            List.of("PharmacoÉpidémiologie", "SNDS", "VieRéelle", "PostAMM"),
            "Bases de données de santé (Système National des Données de Santé - SNDS). Études d'utilisation, évaluation de l'impact en santé publique et détection de signaux faibles.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(48).atTime(8, 30),
            s2Days.get(48).atTime(8, 30)
        ));

        // S2 - Day 50 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-21",
            "ue7",
            "UE7",
            "Causalité en épidémiologie : Critères de Bradford-Hill et mesures d'effet",
            "#F97316",
            "Pr. Ph. Ravaud",
            s2Days.get(49),
            4,
            "EN_COURS",
            List.of("Causalité", "BradfordHill", "RisqueRelatif", "FractionAttribuable"),
            "Critères de Hill : force d'association (RR élevé), séquence temporelle, gradient dose-réponse, plausibilité biologique, cohérence. Risque Relatif RR = Ie / Ino et Risque Attribuable RA = Ie - Ino.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(49).atTime(8, 30),
            s2Days.get(49).atTime(8, 30)
        ));

        // S2 - Day 50 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-22",
            "ue4",
            "UE4",
            "Test du Chi-deux (χ²) d'indépendance et d'adéquation",
            "#8B5CF6",
            "Pr. G. Chatellier",
            s2Days.get(49),
            4,
            "EN_COURS",
            List.of("ChiDeux", "TableauContingence", "EffectifsThéoriques", "Indépendance"),
            "Calcul des effectifs théoriques E_ij = (Total_Ligne * Total_Colonne) / Total_Général. Statistique Chi2_obs = sum (O - E)^2 / E. Degrés de liberté (L-1)*(C-1). Règle de validité de Cochran (tous les effectifs théoriques >= 5).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(49).atTime(8, 30),
            s2Days.get(49).atTime(8, 30)
        ));

        // S2 - Day 51 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-22",
            "ue5",
            "UE5",
            "Organes des sens : Anatomie de l'œil et de l'appareil auditif",
            "#EC4899",
            "Pr. P. Corlieu",
            s2Days.get(50),
            3,
            "EN_COURS",
            List.of("Vision", "Audition", "Œil", "Oreille"),
            "Globe oculaire (cornée, sclérotique, choroïde, rétine, cristallin, corps vitré). Oreille externe, oreille moyenne (cavité tympanique, chaîne des osselets : marteau, enclume, étrier) et oreille interne (cochlée et labyrinthe vestibulaire).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(50).atTime(8, 30),
            s2Days.get(50).atTime(8, 30)
        ));

        // S2 - Day 51 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-22",
            "ue6",
            "UE6",
            "Bon usage du médicament et prévention de l'iatrogénie",
            "#06B6D4",
            "Pr. S. Perrot",
            s2Days.get(50),
            4,
            "EN_COURS",
            List.of("BonUsage", "Iatrogénie", "Polymédication", "PersonneÂgée"),
            "Iatrogénie évitable liée aux erreurs de prescription, dispensation ou administration. Facteurs de risque : âge avancé, polymédication (>= 5 molécules), insuffisance rénale ou hépatique.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(50).atTime(8, 30),
            s2Days.get(50).atTime(8, 30)
        ));

        // S2 - Day 52 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-22",
            "ue7",
            "UE7",
            "Facteurs de risque comportementaux : Alcool, tabac, nutrition et sédentarité",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(51),
            3,
            "EN_COURS",
            List.of("Comportements", "Tabagisme", "Alcoolisme", "PréventionPrimaire"),
            "Tabagisme (première cause de mortalité évitable en France, ~75 000 décès/an) et alcoolisme (~41 000 décès/an). Politiques de prévention, fiscalité dissuasive et paquet neutre.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(51).atTime(8, 30),
            s2Days.get(51).atTime(8, 30)
        ));

        // S2 - Day 52 (Course 2/2) : UE4
        list.add(new Course(
            "course-ue4-23",
            "ue4",
            "UE4",
            "Méthodologie des essais cliniques randomisés et études épidémiologiques",
            "#8B5CF6",
            "Pr. G. Chatellier",
            s2Days.get(51),
            4,
            "EN_COURS",
            List.of("EssaisCliniques", "Randomisation", "DoubleAveugle", "Cohortes"),
            "Essais contrôlés randomisés en double insu (gold standard de preuve). Biais de confusion et contrôle par la randomisation. Études de cohorte (suivi prospectif, calcul de l'incidence et du RR) vs études cas-témoins (Odds Ratio).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(51).atTime(8, 30),
            s2Days.get(51).atTime(8, 30)
        ));

        // S2 - Day 53 (Course 1/2) : UE5
        list.add(new Course(
            "course-ue5-23",
            "ue5",
            "UE5",
            "Phylogenèse humaine et évolution morphologique des structures",
            "#EC4899",
            "Pr. F. Bargy",
            s2Days.get(52),
            3,
            "EN_COURS",
            List.of("Phylogenèse", "Évolution", "Morphologie", "Hominisation"),
            "Évolution phylogénétique des vertébrés, passage à la bipédie, encéphalisation et modification de l'architecture du bassin et du crâne.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(52).atTime(8, 30),
            s2Days.get(52).atTime(8, 30)
        ));

        // S2 - Day 53 (Course 2/2) : UE6
        list.add(new Course(
            "course-ue6-23",
            "ue6",
            "UE6",
            "Interactions médicamenteuses pharmacocinétiques et dynamiques",
            "#06B6D4",
            "Pr. F. Brion",
            s2Days.get(52),
            4,
            "EN_COURS",
            List.of("InteractionsMédicamenteuses", "CYP3A4", "Synergie", "Antagonisme"),
            "Interactions cinétiques : absorption (chélation, pansements digestifs), métabolisme (inducteurs comme rifampicine/millepertuis, inhibiteurs comme kétoconazole/jus de pamplemousse). Interactions dynamiques : synergies additives/supra-additives ou antagonismes.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(52).atTime(8, 30),
            s2Days.get(52).atTime(8, 30)
        ));

        // S2 - Day 54 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-23",
            "ue7",
            "UE7",
            "Santé environnementale : Pollution atmosphérique, eau et risques physiques",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(53),
            3,
            "EN_COURS",
            List.of("SantéEnvironnementale", "PollutionAir", "QualitéEau", "PerturbateursEndocriniens"),
            "Particules fines (PM2.5, PM10), oxydes d'azote, ozone. Polluants de l'eau (nitrates, pesticides, résidus médicamenteux). Bruit, rayonnements et perturbateurs endocriniens.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(53).atTime(8, 30),
            s2Days.get(53).atTime(8, 30)
        ));

        // S2 - Day 54 (Course 2/2) : UE5
        list.add(new Course(
            "course-ue5-24",
            "ue5",
            "UE5",
            "Anatomie radiologique : Neuro-imagerie et ostéo-articulaire",
            "#EC4899",
            "Pr. J.-F. Meder",
            s2Days.get(53),
            4,
            "EN_COURS",
            List.of("RadioAnatomie", "Scanner", "IRM", "CoupesAnatomiques"),
            "Lecture de radiographies standard, reconstructions TDM et séquences IRM (T1, T2, FLAIR). Repères anatomiques en coupes axiales, coronales et sagittales.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(53).atTime(8, 30),
            s2Days.get(53).atTime(8, 30)
        ));

        // S2 - Day 55 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-24",
            "ue7",
            "UE7",
            "Infections associées aux soins (nosocomiales) et sécurité des soins",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(54),
            3,
            "EN_COURS",
            List.of("InfectionsNosocomiales", "HygièneHospitalière", "SécuritéSoins", "RésistanceBactérienne"),
            "Définition d'une infection nosocomiale (contractée en établissement de santé, apparaissant après >= 48h d'hospitalisation). Sites fréquents : urinaire, pulmonaire, site chirurgical, bactériémies sur cathéter. Hygiène des mains (solutés hydro-alcooliques).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(54).atTime(8, 30),
            s2Days.get(54).atTime(8, 30)
        ));

        // S2 - Day 55 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-25",
            "ue7",
            "UE7",
            "Politiques de santé publique : Loi de santé publique et plans nationaux",
            "#F97316",
            "Pr. I. Momas",
            s2Days.get(54),
            3,
            "EN_COURS",
            List.of("PolitiqueSantéPublique", "PlansNationaux", "Prévention", "LoiSanté"),
            "Loi du 9 août 2004 et loi de modernisation du système de santé de 2016. Stratégie Nationale de Santé (SNS). Plans thématiques nationaux (Plan Cancer, Plan National Nutrition Santé - PNNS).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(54).atTime(8, 30),
            s2Days.get(54).atTime(8, 30)
        ));

        // S2 - Day 56 (Course 1/2) : UE7
        list.add(new Course(
            "course-ue7-26",
            "ue7",
            "UE7",
            "Organisation et régulation du système de santé : ARS et offre de soins",
            "#F97316",
            "Pr. Ph. Ravaud",
            s2Days.get(55),
            3,
            "EN_COURS",
            List.of("SystèmeDeSanté", "ARS", "OffreDeSoins", "Hôpitaux"),
            "Agences Régionales de Santé (ARS, pilotage régional de la santé et régulation médico-sociale). Démographie des professionnels de santé et problématique des déserts médicaux.",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(55).atTime(8, 30),
            s2Days.get(55).atTime(8, 30)
        ));

        // S2 - Day 56 (Course 2/2) : UE7
        list.add(new Course(
            "course-ue7-27",
            "ue7",
            "UE7",
            "Financement de la santé : Sécurité Sociale et régulation par l'ONDAM",
            "#F97316",
            "Pr. Megerlin",
            s2Days.get(55),
            4,
            "EN_COURS",
            List.of("FinancementSanté", "SécuritéSociale", "ONDAM", "CSG"),
            "Création de la Sécurité Sociale en 1945 (ordonnances Laroque). Branches Maladie, Vieillesse, Famille, Accidents du travail. Financement par cotisations sociales et CSG. Objectif National des Dépenses d'Assurance Maladie (ONDAM).",
            List.of(),
            List.of(0, 1, 3, 7, 14, 30, 60),
            s2Days.get(55).atTime(8, 30),
            s2Days.get(55).atTime(8, 30)
        ));

        return list;
    }

    public static List<QcmQuestion> createSampleQcms() {
        List<QcmQuestion> qcms = new ArrayList<>();

        // QCM 1 - UE1
        qcms.add(new QcmQuestion(
            "qcm-ue1-001",
            "course-ue1-12",
            "Mécanismes réactionnels : Substitutions nucléophiles (SN1 / SN2)",
            "UE1",
            "Concernant les mécanismes de substitution nucléophile (SN1 et SN2) en chimie organique, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "La réaction SN2 est un processus concerté se déroulant en une seule étape sans intermédiaire réactionnel.", true, "VRAI : L'attaque du nucléophile et le départ du groupe partant sont simultanés.", false, ""),
                new QcmItem("B", "La cinétique d'une réaction SN2 est d'ordre global 2 : v = k [Substrat] [Nucléophile].", true, "VRAI : Les deux espèces interviennent dans l'étape déterminante.", false, ""),
                new QcmItem("C", "La réaction SN1 entraîne une inversion complète de configuration absolue de Walden.", false, "FAUX : C'est la SN2 qui produit l'inversion de Walden. La SN1 passe par un carbocation plan et donne une racémisation.", true, "Confusion classique entre SN1 et SN2"),
                new QcmItem("D", "La réaction SN1 est favorisée par des solvants protiques polaires et des dérivés halogénés tertiaires.", true, "VRAI : Ils stabilisent le carbocation intermédiaire.", false, ""),
                new QcmItem("E", "Un substrat encombré tertiaire réagit plus rapidement en SN2 qu'un substrat primaire.", false, "FAUX : L'encombrement stérique bloque l'attaque dorsale du nucléophile en SN2.", true, "Piège réactivité 1° vs 3°")
            ),
            4,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("ChimieOrganique", "SN1_SN2", "Mécanismes"),
            List.of("Moyen mnémotechnique : SN2 = 2 réactifs dans la vitesse, 1 seule étape, inversion de Walden"),
            LocalDateTime.now()
        ));

        // QCM 2 - UE2
        qcms.add(new QcmQuestion(
            "qcm-ue2-001",
            "course-ue2-03",
            "Cytosquelette : Microtubules, centrosome et moteurs moléculaires",
            "UE2",
            "Concernant les microtubules et leurs moteurs moléculaires, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "Les microtubules sont formés par la polymérisation d'hétérodimères de tubuline alpha et bêta.", true, "VRAI : Les protofilaments s'associent pour former un cylindre creux de 25 nm.", false, ""),
                new QcmItem("B", "L'extrémité (+) des microtubules est ancrée dans le matériel péricentriolaire du centrosome.", false, "FAUX : C'est l'extrémité (-) qui est ancrée au centrosome (gamma-TuRC) ; l'extrémité (+) est distale.", true, "Inversion extrémité (+) et (-)"),
                new QcmItem("C", "La kinésine est un moteur moléculaire se déplaçant préférentiellement vers l'extrémité (+) des microtubules.", true, "VRAI : Transport antérograde vers la périphérie cellulaire.", false, ""),
                new QcmItem("D", "La dynéine cytoplasmique assure le transport rétrograde vers l'extrémité (-) des microtubules.", true, "VRAI : Transport vers le centre cellulaire (centrosome).", false, ""),
                new QcmItem("E", "Le paclitaxel (Taxol) inhibe la polymérisation des microtubules en déstabilisant le fuseau mitotique.", false, "FAUX : Le Taxol STABILISE les microtubules et empêche leur dépolymérisation (la colchicine inhibe la polymérisation).", true, "Piège classique Taxol vs Colchicine")
            ),
            4,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("BioCell", "Cytosquelette", "Microtubules"),
            List.of("Mnémo : Kinésine va vers le Kangourou (dehors/+), Dynéine va vers le Domicile (centre/-)"),
            LocalDateTime.now()
        ));

        // QCM 3 - UE3
        qcms.add(new QcmQuestion(
            "qcm-ue3-001",
            "course-ue3-03",
            "Dynamique des fluides réels : Viscosité et loi de Poiseuille",
            "UE3",
            "Concernant l'hémodynamique et la loi de Poiseuille dans un vaisseau sanguin, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "La loi de Poiseuille s'applique strictement à un fluide newtonien en régime laminaire dans un tube cylindrique rigide.", true, "VRAI : Ce sont les conditions d'application théoriques.", false, ""),
                new QcmItem("B", "La résistance hydraulique d'un vaisseau cylindrique est inversement proportionnelle à la puissance 4 de son rayon (r^4).", true, "VRAI : R = (8 * eta * L) / (pi * r^4).", false, ""),
                new QcmItem("C", "Si le rayon d'une artériole est divisé par 2, sa résistance hydraulique est multipliée par 16.", true, "VRAI : 2^4 = 16. Les artérioles jouent ainsi un rôle clé de résistances ajustables.", false, ""),
                new QcmItem("D", "Le débit volumique dans un vaisseau est directement proportionnel à la viscosité dynamique du sang.", false, "FAUX : Le débit est INVERSEMENT proportionnel à la viscosité (Q = ΔP / R).", true, "Inversion proportionnel / inversement"),
                new QcmItem("E", "En régime laminaire, le profil des vitesses d'écoulement est parabolique avec une vitesse maximale au centre du vaisseau.", true, "VRAI : Vitesse nulle à la paroi et maximale au centre.", false, "")
            ),
            4,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("Biophysique", "Poiseuille", "Hémodynamique"),
            List.of("Loi de Poiseuille : Résistance = 8 eta L / (pi r^4)"),
            LocalDateTime.now()
        ));

        // QCM 4 - UE4
        qcms.add(new QcmQuestion(
            "qcm-ue4-001",
            "course-ue4-13",
            "Performances des tests diagnostiques : Sensibilité, Spécificité, ROC",
            "UE4",
            "Concernant l'évaluation des performances d'un test diagnostique, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "La sensibilité d'un test correspond à la probabilité que le test soit positif sachant que le sujet est malade P(T+ | M+).", true, "VRAI : Se = VP / (VP + FN).", false, ""),
                new QcmItem("B", "La spécificité d'un test est intrinsèque au test et ne dépend pas de la prévalence de la maladie dans la population.", true, "VRAI : Se et Sp sont des caractéristiques intrinsèques.", false, ""),
                new QcmItem("C", "La valeur prédictive positive (VPP) augmente lorsque la prévalence de la maladie augmente dans la population testée.", true, "VRAI : Formule de Bayes démontre la dépendance directe de la VPP à la prévalence.", false, ""),
                new QcmItem("D", "Un test ayant une sensibilité de 100% ne produit aucun résultat faux positif.", false, "FAUX : Un test de Se 100% ne produit aucun FAUX NÉGATIF (FN = 0). C'est la spécificité qui contrôle les faux positifs.", true, "Confusion classique Se/FN et Sp/FP"),
                new QcmItem("E", "L'aire sous la courbe ROC (AUC) d'un test diagnostique non informatif (équivalent au hasard) est égale à 0,5.", true, "VRAI : Correspond à la diagonale y = x.", false, "")
            ),
            4,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("Biostatistiques", "Sensibilité", "Spécificité", "Bayes"),
            List.of("Mnémo : Se = Malades bien détectés ; Sp = Sains bien reconnus"),
            LocalDateTime.now()
        ));

        // QCM 5 - UE5
        qcms.add(new QcmQuestion(
            "qcm-ue5-001",
            "course-ue5-07",
            "Membre supérieur : Plexus brachial et territoires d'innervation",
            "UE5",
            "Concernant l'anatomie et l'innervation du membre supérieur par le plexus brachial, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "Le plexus brachial est formé par l'anastomose des branches ventrales des nerfs spinaux de C5 à T1.", true, "VRAI : C5, C6, C7, C8 et T1.", false, ""),
                new QcmItem("B", "Le tronc secondaire postérieur (faisceau postérieur) donne naissance aux nerfs radial et axillaire.", true, "VRAI : Les nerfs radial et axillaire naissent de la réunion des divisions postérieures.", false, ""),
                new QcmItem("C", "Le nerf musculocutané innerve la loge antérieure du bras et traverse le muscle coracobrachial.", true, "VRAI : Nerf perforateur de Casserius (biceps, brachial, coracobrachial).", false, ""),
                new QcmItem("D", "Le nerf ulnaire innerve les muscles de l'éminence thénar du pouce à l'exception de l'adducteur du pouce.", false, "FAUX : L'éminence thénar est innervée par le nerf MÉDIAN (sauf le faisceau profond du court fléchisseur et l'adducteur du pouce qui dépendent de l'ulnaire).", true, "Piège classique Éminence Thénar / Médian"),
                new QcmItem("E", "Une fracture de la diaphyse humérale peut léser le nerf radial dans son sillon à la face postérieure de l'humérus.", true, "VRAI : Entraîne une paralysie de l'extension du poignet et des doigts en main tombante.", false, "")
            ),
            5,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("Anatomie", "PlexusBrachial", "MembreSupérieur"),
            List.of("Faisceau postérieur = R.A. (Radial, Axillaire)"),
            LocalDateTime.now()
        ));

        // QCM 6 - UE6
        qcms.add(new QcmQuestion(
            "qcm-ue6-001",
            "course-ue6-10",
            "Pharmacocinétique : Élimination, clairance et demi-vie plasmatique",
            "UE6",
            "Concernant les paramètres pharmacocinétiques d'élimination d'un médicament, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "La clairance corporelle totale représente le volume virtuel de plasma totalement épuré du médicament par unité de temps.", true, "VRAI : S'exprime typiquement en L/h ou mL/min.", false, ""),
                new QcmItem("B", "Pour une cinétique d'ordre 1, la vitesse d'élimination est constante et indépendante de la concentration plasmatique.", false, "FAUX : C'est la cinétique d'ordre 0 qui a une vitesse constante (ex: éthanol). En ordre 1, la vitesse est proportionnelle à la concentration.", true, "Confusion classique Ordre 1 vs Ordre 0"),
                new QcmItem("C", "La demi-vie plasmatique d'élimination est proportionnelle au volume de distribution et inversement proportionnelle à la clairance : t1/2 = 0.693 * Vd / Cl.", true, "VRAI : Relation mathématique fondamentale.", false, ""),
                new QcmItem("D", "À l'arrêt d'un traitement administré de façon répétée, le principe actif est éliminé à plus de 95% au bout de 5 demi-vies.", true, "VRAI : Règle des 5 demi-vies (96.875% éliminé).", false, ""),
                new QcmItem("E", "Une insuffisance rénale sévère diminue la clairance rénale et augmente la demi-vie d'un médicament à élimination rénale prédominante.", true, "VRAI : Nécessite une adaptation posologique par espacement des prises ou réduction des doses.", false, "")
            ),
            4,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("Pharmacocinétique", "Clairance", "DemiVie"),
            List.of("Formule : Cl = Vd * kel ; t1/2 = ln(2) / kel"),
            LocalDateTime.now()
        ));

        // QCM 7 - UE7
        qcms.add(new QcmQuestion(
            "qcm-ue7-001",
            "course-ue7-06",
            "Les quatre principes de l'éthique biomédicale (Beauchamp & Childress)",
            "UE7",
            "Concernant les principes éthiques et la relation médecin-malade, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "Le principe d'autonomie impose au médecin de recueillir le consentement libre et éclairé du patient avant tout acte médical.", true, "VRAI : Consacré par la loi Kouchner du 4 mars 2002.", false, ""),
                new QcmItem("B", "Le principe de non-malfaisance découle de l'adage hippocratique 'Primum non nocere'.", true, "VRAI : Devoir de ne pas nuire délibérément au patient.", false, ""),
                new QcmItem("C", "Le secret médical est aboli si les héritiers du patient décédé en font la demande écrite sans motif.", false, "FAUX : Le secret médical perdure après la mort. Les ayants droit n'ont d'accès que pour connaître les causes de la mort, défendre la mémoire ou faire valoir un droit.", true, "Secret médical post-mortem"),
                new QcmItem("D", "La désignation d'une personne de confiance doit se faire obligatoirement par écrit et est révocable à tout moment.", true, "VRAI : Prévue par le Code de la santé publique.", false, ""),
                new QcmItem("E", "Les directives anticipées s'imposent au médecin pour toute décision d'investigation ou d'arrêt de traitement, sauf urgence vitale.", true, "VRAI : Renforcées par la loi Claeys-Leonetti de 2016.", false, "")
            ),
            3,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("ÉthiqueMédicale", "Bioéthique", "SecretMédical"),
            List.of("Les 4 principes de Beauchamp & Childress : Autonomie, Bienfaisance, Non-malfaisance, Justice"),
            LocalDateTime.now()
        ));

        // QCM 8 - UE8
        qcms.add(new QcmQuestion(
            "qcm-ue8-001",
            "course-ue8-05",
            "Hémoglobines normales et pathologiques : Drépanocytose et thalassémies",
            "UE8",
            "Concernant la physiopathologie moléculaire des hémoglobinopathies, quelles sont les propositions exactes ?",
            List.of(
                new QcmItem("A", "La drépanocytose est due à une mutation ponctuelle GAG -> GTG sur le codon 6 du gène de la bêta-globine, substituant l'acide glutamique par une valine.", true, "VRAI : Mutation Glu6Val créant l'allèle HbS.", false, ""),
                new QcmItem("B", "La désoxy-hémoglobine S polymérise sous forme de fibres rigides déformant le globule rouge en faucille (drépanocyte).", true, "VRAI : Provoque des crises vaso-occlusives douloureuses et une hémolyse chronique.", false, ""),
                new QcmItem("C", "La transmission génétique de la drépanocytose se fait sur un mode autosomique récessif.", true, "VRAI : Seuls les homozygotes HbS/HbS expriment la maladie complète.", false, ""),
                new QcmItem("D", "Les bêta-thalassémies sont caractérisées par une anomalie qualitative de structure de la chaîne de globine sans réduction de sa synthèse.", false, "FAUX : Les thalassémies sont des anomalies QUANTITATIVES (déficit de synthèse de chaînes normales), contrairement à la drépanocytose qui est qualitative.", true, "Piège classique Qualitatif vs Quantitatif"),
                new QcmItem("E", "L'hémoglobine fœtale (HbF) est composée de 2 chaînes alpha et 2 chaînes gamma (alpha2 gamma2).", true, "VRAI : Sa persistance héréditaire atténue la sévérité de la drépanocytose.", false, "")
            ),
            5,
            "PARIS_CITE_CONCOURS",
            "2024",
            List.of("Physiopathologie", "Drépanocytose", "GénétiqueMoléculaire"),
            List.of("Drépanocytose = Mutation Qualitative (Glu6Val) ; Thalassémie = Anomalie Quantitative"),
            LocalDateTime.now()
        ));

        return qcms;
    }
}
