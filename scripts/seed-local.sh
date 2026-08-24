#!/usr/bin/env bash
# ==============================================================================
# MedJ — Local Sample Data Seeder & Cleaner
# Seeds or resets the PASS Paris Cité dataset STRICTLY on local instance.
# ==============================================================================

set -euo pipefail

LOCAL_HOST="${MEDJ_LOCAL_HOST:-http://localhost:8080}"
ACTION="seed"

# Strict safety check: Never allow running against remote/production endpoints
if [[ "$LOCAL_HOST" != "http://localhost:8080" && "$LOCAL_HOST" != "http://127.0.0.1:8080" && "$LOCAL_HOST" != "http://localhost:"* ]]; then
  echo "❌ ERREUR DE SÉCURITÉ : Ce script est strictement réservé à une exécution locale ($LOCAL_HOST non autorisé)."
  echo "Il est interdit d'injecter des données d'exemple sur un environnement distant ou en production."
  exit 1
fi

function show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --seed         Charge les 186 cours, 8 QCMs, 5 flashcards et 9 UEs (par défaut)."
  echo "  --clear        Efface toutes les données de l'instance locale (remise à zéro 100% vierge)."
  echo "  --status       Affiche le nombre d'éléments actuellement chargés en local."
  echo "  --help, -h     Affiche cette aide."
  echo ""
  echo "Exemples :"
  echo "  $0             # Injecte les données de test en local"
  echo "  $0 --clear     # Réinitialise la base locale"
  echo "  $0 --status    # Vérifie l'état actuel"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed)
      ACTION="seed"
      shift
      ;;
    --clear)
      ACTION="clear"
      shift
      ;;
    --status)
      ACTION="status"
      shift
      ;;
    --help|-h)
      show_help
      ;;
    *)
      echo "Option inconnue : $1"
      show_help
      ;;
  esac
done

echo "=================================================================="
echo " 🩺 MedJ — Gestionnaire de Données de Test (Local Uniquement)"
echo " Cible : $LOCAL_HOST"
echo " Action : $ACTION"
echo "=================================================================="

# Check if local server is responsive
echo "🔍 Vérification de la disponibilité du serveur local sur $LOCAL_HOST..."
if ! curl -s -f -m 3 "$LOCAL_HOST/api/sample-data/status" > /dev/null 2>&1; then
  echo "❌ Impossible de joindre le serveur local sur $LOCAL_HOST."
  echo "Veuillez d'abord démarrer MedJ en local avec :"
  echo "   ./gradlew run"
  echo "puis relancez cette commande."
  exit 1
fi

if [[ "$ACTION" == "status" ]]; then
  echo "📊 État actuel des données locales :"
  curl -s -X GET "$LOCAL_HOST/api/sample-data/status" | grep -o '"{0,1}[^",]*"{0,1}:"{0,1}[^",]*"{0,1}' || true
  echo ""
  exit 0
fi

if [[ "$ACTION" == "clear" ]]; then
  echo "🧹 Réinitialisation de la base locale..."
  RESPONSE=$(curl -s -X POST "$LOCAL_HOST/api/sample-data/clear")
  echo "✔ Réponse du serveur : $RESPONSE"
  echo "✅ Base de données locale réinitialisée avec succès."
  exit 0
fi

if [[ "$ACTION" == "seed" ]]; then
  echo "📦 Chargement du programme officiel Paris Cité depuis le JSON..."
  RESPONSE=$(curl -s -X POST "$LOCAL_HOST/api/sample-data/seed")
  echo "✔ Réponse du serveur : $RESPONSE"
  echo "✅ 186 cours, QCMs, flashcards et UEs chargés avec succès en local !"
  exit 0
fi
