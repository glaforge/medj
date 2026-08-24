#!/usr/bin/env bash
# ==============================================================================
# MedJ — Production Data Purge Script
# Cleans all test collections in Cloud Firestore & test assets in Cloud Storage.
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-medj-505807}"
ASSETS_BUCKET="gs://${PROJECT_ID}-assets"
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)
      FORCE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--yes]"
      echo "  --yes, -y    Confirme la suppression sans invite interactive"
      exit 0
      ;;
    *)
      echo "Option inconnue : $1"
      exit 1
      ;;
  esac
done

echo "=================================================================="
echo " ⚠️  ATTENTION : NETTOYAGE COMPLET DE LA PRODUCTION MEDJ"
echo " Projet GCP     : $PROJECT_ID"
echo " Firestore DB   : (default) [Toutes les collections medj_*]"
echo " Storage Assets : $ASSETS_BUCKET"
echo "=================================================================="
echo ""
echo "Cette opération va supprimer DÉFINITIVEMENT toutes les données de test"
echo "dans Google Cloud Firestore et Cloud Storage afin de repartir sur un espace"
echo "100% vierge pour la rentrée universitaire."
echo ""

if [[ "$FORCE" != true ]]; then
  read -p "Êtes-vous certain de vouloir purger toutes les données de test ? (o/N) : " CONFIRM
  if [[ "$CONFIRM" != "o" && "$CONFIRM" != "O" && "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Opération annulée."
    exit 0
  fi
fi

# 1. Purge Cloud Firestore collections
echo ""
echo "🚀 [1/3] Suppression des documents et collections Cloud Firestore..."
python3 scripts/purge_firestore_rest.py

# 2. Purge Cloud Storage Assets
echo ""
echo "🚀 [2/3] Nettoyage des assets de test dans Cloud Storage ($ASSETS_BUCKET)..."
gcloud storage rm --recursive "${ASSETS_BUCKET}/**" 2>/dev/null || echo "Bucket déjà vide ou aucun fichier trouvé."

# 3. Clean local uploads directory (keeping .gitkeep)
echo ""
echo "🚀 [3/3] Nettoyage du dossier local 'uploads/'..."
find uploads/ -type f ! -name ".gitkeep" -delete 2>/dev/null || true

echo ""
echo "=================================================================="
echo " ✅ Production MedJ nettoyée avec succès !"
echo " L'application est maintenant 100% vierge et prête pour les cours."
echo "=================================================================="
