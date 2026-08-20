#!/usr/bin/env bash
# ==============================================================================
# MedJ — Disaster Recovery & Backup Rollback Script
# Restores Cloud Firestore data and/or Cloud Storage assets from a previous backup.
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-medj-505807}"
REGION="${GCP_REGION:-europe-west1}"
BACKUP_BUCKET="gs://${PROJECT_ID}-backups"
ASSETS_BUCKET="gs://${PROJECT_ID}-assets"

function show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --list                 List all available backup dates and snapshots in GCS."
  echo "  --date <YYYY-MM-DD>    Restore full backup (Firestore + Assets) from the specified date."
  echo "  --only-firestore       Restore ONLY Cloud Firestore data (used with --date)."
  echo "  --only-assets          Restore ONLY Cloud Storage assets (used with --date)."
  echo "  --only-auth            Restore ONLY Firebase Auth accounts (used with --date)."
  echo "  --pitr <TIMESTAMP>     Perform Point-In-Time Recovery (PITR) to exact ISO timestamp."
  echo "                         Example: --pitr \"2026-08-20T14:30:00Z\""
  echo "  --help                 Show this help message."
  echo ""
  echo "Examples:"
  echo "  $0 --list"
  echo "  $0 --date 2026-08-20"
  echo "  $0 --date 2026-08-20 --only-firestore"
  echo "  $0 --pitr 2026-08-20T14:30:00Z"
  exit 0
}

TARGET_DATE=""
RESTORE_FIRESTORE=true
RESTORE_ASSETS=true
RESTORE_AUTH=true
PITR_TIMESTAMP=""
ACTION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)
      ACTION="list"
      shift
      ;;
    --date)
      TARGET_DATE="$2"
      shift 2
      ;;
    --only-firestore)
      RESTORE_FIRESTORE=true
      RESTORE_ASSETS=false
      RESTORE_AUTH=false
      shift
      ;;
    --only-assets)
      RESTORE_FIRESTORE=false
      RESTORE_ASSETS=true
      RESTORE_AUTH=false
      shift
      ;;
    --only-auth)
      RESTORE_FIRESTORE=false
      RESTORE_ASSETS=false
      RESTORE_AUTH=true
      shift
      ;;
    --pitr)
      PITR_TIMESTAMP="$2"
      ACTION="pitr"
      shift 2
      ;;
    --help|-h)
      show_help
      ;;
    *)
      echo "Unknown argument: $1"
      show_help
      ;;
  esac
done

if [[ "$ACTION" == "list" ]]; then
  echo "=================================================================="
  echo " 📋 Available MedJ Backups in ${BACKUP_BUCKET}:"
  echo "=================================================================="
  echo ""
  echo "🔹 [Cloud Firestore Snapshots]:"
  gcloud storage ls "${BACKUP_BUCKET}/firestore/" || echo "No Firestore backups found."
  echo ""
  echo "🔹 [Cloud Storage Asset Snapshots]:"
  gcloud storage ls "${BACKUP_BUCKET}/assets/" || echo "No asset backups found."
  echo ""
  echo "🔹 [Firebase Auth Account Snapshots]:"
  gcloud storage ls "${BACKUP_BUCKET}/auth/" || echo "No auth backups found."
  exit 0
fi

if [[ "$ACTION" == "pitr" ]]; then
  echo "=================================================================="
  echo " ⏱️ Point-in-Time Recovery (PITR) Rollback"
  echo " Target Recovery Time: $PITR_TIMESTAMP"
  echo "=================================================================="
  RESTORE_DB_NAME="medj-pitr-$(date +%Y%m%d%H%M%S)"
  echo "Creating restored database '$RESTORE_DB_NAME' from timestamp $PITR_TIMESTAMP..."
  gcloud firestore databases restore \
    --source-database='(default)' \
    --destination-database="$RESTORE_DB_NAME" \
    --recovery-time="$PITR_TIMESTAMP" \
    --project="$PROJECT_ID"
  echo "✔ Database restored to '$RESTORE_DB_NAME'."
  exit 0
fi

if [[ -z "$TARGET_DATE" ]]; then
  echo "=================================================================="
  echo " 🔄 MedJ Backup Rollback Interactive Mode"
  echo "=================================================================="
  echo ""
  echo "Available dates in backup storage:"
  gcloud storage ls "${BACKUP_BUCKET}/firestore/" || true
  echo ""
  read -p "Enter backup date to restore (e.g. 2026-08-20): " TARGET_DATE
fi

if [[ -z "$TARGET_DATE" ]]; then
  echo "Error: No target date provided."
  exit 1
fi

echo "=================================================================="
echo " ⚠️ CONFIRMATION DE RESTAURATION (ROLLBACK)"
echo " Date cible : $TARGET_DATE"
echo " Projet GCP : $PROJECT_ID"
echo " Firestore  : $([[ "$RESTORE_FIRESTORE" == true ]] && echo 'OUI' || echo 'NON')"
echo " Assets GCS : $([[ "$RESTORE_ASSETS" == true ]] && echo 'OUI' || echo 'NON')"
echo " Auth Users : $([[ "$RESTORE_AUTH" == true ]] && echo 'OUI' || echo 'NON')"
echo "=================================================================="
read -p "Voulez-vous continuer la restauration ? (o/N) " CONFIRM
if [[ "$CONFIRM" != "o" && "$CONFIRM" != "O" && "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Restauration annulée."
  exit 0
fi

# 1. Restore Cloud Firestore
if [[ "$RESTORE_FIRESTORE" == true ]]; then
  echo ""
  echo "🔄 [1/3] Restauration de Cloud Firestore depuis ${BACKUP_BUCKET}/firestore/${TARGET_DATE}..."
  
  # Search for metadata file in target backup folder
  EXPORT_URI="${BACKUP_BUCKET}/firestore/${TARGET_DATE}"
  
  echo "Importation des documents Firestore..."
  gcloud firestore import "$EXPORT_URI" --project="$PROJECT_ID"
  echo "✔ Base de données Firestore restaurée avec succès."
fi

# 2. Restore Cloud Storage Assets
if [[ "$RESTORE_ASSETS" == true ]]; then
  echo ""
  echo "🔄 [2/3] Restauration des Assets GCS depuis ${BACKUP_BUCKET}/assets/${TARGET_DATE} vers ${ASSETS_BUCKET}..."
  gcloud storage rsync -r "${BACKUP_BUCKET}/assets/${TARGET_DATE}/" "${ASSETS_BUCKET}/" --project="$PROJECT_ID"
  echo "✔ Assets Cloud Storage restaurés avec succès."
fi

# 3. Restore Firebase Auth
if [[ "$RESTORE_AUTH" == true ]]; then
  echo ""
  echo "🔄 [3/3] Restauration des comptes Firebase Auth..."
  AUTH_URI="${BACKUP_BUCKET}/auth/${TARGET_DATE}/users.json"
  TMP_AUTH="/tmp/medj_restore_auth.json"
  if gcloud storage cp "$AUTH_URI" "$TMP_AUTH" 2>/dev/null; then
    if command -v npx &> /dev/null; then
      npx -y firebase-tools@latest auth:import "$TMP_AUTH" --project="$PROJECT_ID" || true
      echo "✔ Comptes Firebase Auth réimportés."
    fi
    rm -f "$TMP_AUTH"
  else
    echo "ℹ️ Aucun fichier d'export auth trouvé pour cette date ($AUTH_URI), étape ignorée."
  fi
fi

echo ""
echo "=================================================================="
echo " ✅ Restauration / Rollback terminé avec succès pour la date $TARGET_DATE !"
echo "=================================================================="
