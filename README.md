# MedJ — Méthode des J & IA Gemini pour Étudiants en Médecine (PASS / LAS)

**MedJ** est une application web full-stack moderne (PWA responsive) d'apprentissage par répétition espacée personnalisée (**Méthode des J**), synchronisée avec **Google Calendar** et enrichie par l'intelligence artificielle multimodale **Google Gemini** (via `com.google.genai:google-genai` et LangChain4j).

---

## 🚀 Fonctionnalités Clés

1. **Méthode des J (Répétition Espacée)** :
   - Cycles $J_0, J_1, J_3, J_7, J_{14}, J_{30}, J_{60}$ personnalisables par matière ou globalement.
   - **Lissage de charge de travail** : détection des journées surchargées et redistribution intelligente des révisions sans casser les courbes d'apprentissage.
   - Décalage rapide des séances (+1j, +3j, +1 sem) ou par matière (UE entière).

2. **Synchronisation Google Calendar** :
   - Création et mise à jour d'un agenda dédié *"MedJ - Révisions PASS"*.
   - Export et abonnement en direct via flux iCalendar standard (`/api/calendar/feed.ics`).

3. **IA Gemini Multimodale** :
   - **Générateur de QCMs PASS** : 5 propositions indépendantes (A, B, C, D, E) avec Vrai/Faux unitaire, barème officiel du concours, explications détaillées et détection des pièges classiques.
   - **Scanner de Fiches Manuscrites** : transcription OCR des notes manuscrites, fiches synthétiques, extraction des termes anatomiques et chiffres clés.
   - **Scanner d'Annales** : numérisation de photos ou PDFs de concours blancs pour les transformer en quiz interactifs.
   - **Tuteur Médical PASS IA** : assistant interactif pour poser des questions de cours, obtenir des analogies physiologiques et des moyens mnémotechniques.

4. **Architecture PASS Référencée** :
   - Préconfiguration complète des UEs médicales : UE1 (Chimie/Biochimie), UE2 (BioCell/Histologie), UE3 (Biophysique/Physiologie), UE4 (Biostatistiques), UE5 (Anatomie), UE6 (Pharmacologie/ICM), UE7 (SSH) et Mineure.
   - Support PWA hors-ligne (Service Worker et persistance locale).

---

## 🛠️ Stack Technique

- **Backend** : GraalVM 25 (Java 25), Micronaut 5.1, Micronaut Security, Google GenAI SDK (`com.google.genai:google-genai:1.57.0`), Google Cloud Firestore & Storage, Google Calendar API.
- **Frontend** : React 19, Vite, TypeScript, Tailwind CSS, Shadcn UI / Radix primitives, Lucide Icons, Canvas Confetti.
- **Build & Packaging** : Gradle (Groovy DSL) avec le plugin `com.github.node-gradle.node` pour une gestion hermétique de Node.js/npm.

---

## 💻 Démarrage & Exécution

### 1. Prérequis
- GraalVM 25 (Java 25) (ex: via SDKMAN : `sdk use java 25.0.2-graalce`)
- Gradle (fourni via `./gradlew`)

### 2. Lancement du Serveur de Développement
```bash
# Compile le frontend React et lance le backend Micronaut sur http://localhost:8080
./gradlew run
```

### 3. Lancement du Frontend en mode Hot-Reload (Optionnel)
```bash
cd frontend
npm install
npm run dev
# Accessible sur http://localhost:5173 (avec proxy automatique vers l'API backend sur :8080)
```

### 4. Variables d'Environnement (Optionnelles)
Pour activer la génération Gemini et la persistance Firestore dans le cloud Google :
```bash
export GEMINI_API_KEY="votre_cle_api_gemini"
export GCP_PROJECT_ID="votre-projet-gcp"
export GOOGLE_APPLICATION_CREDENTIALS="/chemin/vers/credentials.json"
```
*(En l'absence de clé, MedJ fonctionne automatiquement en mode hybride local/hors-ligne avec moteur médical simulé et stockage local).*

### 5. Données d'Exemple & Initialisation
Par défaut, **MedJ se lance en mode totalement vierge** (0 matière/UE, 0 cours, 0 révision), vous permettant de configurer vos propres matières et cours personnalisés.

- Pour lancer l'application avec les données d'exemple pré-chargées au démarrage (programme officiel PASS Université Paris Cité : 8 UEs + Mineure, 186 cours, QCMs et flashcards) :
  ```bash
  MEDJ_SEED_SAMPLE_DATA=true ./gradlew run
  ```
- Vous pouvez également charger le modèle d'exemple complet (UEs + 186 cours) ou réinitialiser l'ensemble des données à tout moment en 1 clic directement depuis l'interface (bannière d'accueil du Dashboard ou dans les **Paramètres ⚙️ > Données & Programme d'exemple**).

---

## 🧪 Tests & Build de Production

```bash
# Exécution des tests unitaires
./gradlew test

# Construction du JAR optimisé de production
./gradlew build
```
