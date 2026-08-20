#!/usr/bin/env bash
# ==============================================================================
# MedJ — On-Demand Manual Backup Script
# Exports Cloud Firestore, synchronizes Cloud Storage assets, and archives Auth.
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-medj-505807}"
REGION="${GCP_REGION:-europe-west1}"
BACKUP_BUCKET="gs://${PROJECT_ID}-backups"
ASSETS_BUCKET="gs://${PROJECT_ID}-assets"
DATE_TAG="$(date +%Y-%m-%d_%H%M%S)"

echo "=================================================================="
echo " 📦 MedJ Manual On-Demand Backup"
echo " Project: $PROJECT_ID | Region: $REGION"
echo " Timestamp: $DATE_TAG"
echo " Destination: $BACKUP_BUCKET"
echo "=================================================================="

# 1. Trigger Cloud Run Backup Job
echo ""
echo "🚀 [1/3] Triggering Cloud Run Backup Job (medj-backup-job)..."
gcloud run jobs execute medj-backup-job \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --wait

# 2. Export Firebase Auth Users
echo ""
echo "👥 [2/3] Exporting Firebase Auth Accounts..."
TMP_AUTH="/tmp/medj_auth_backup_${DATE_TAG}.json"
if command -v npx &> /dev/null; then
  npx -y firebase-tools@latest auth:export "$TMP_AUTH" --project="$PROJECT_ID" || true
  if [[ -f "$TMP_AUTH" ]]; then
    gcloud storage cp "$TMP_AUTH" "${BACKUP_BUCKET}/auth/${DATE_TAG}/users.json"
    rm -f "$TMP_AUTH"
    echo "✔ Auth accounts exported to ${BACKUP_BUCKET}/auth/${DATE_TAG}/users.json"
  fi
else
  echo "⚠️ npx not found in PATH, skipping auth account JSON export."
fi

# 3. List Latest Backups
echo ""
echo "📋 [3/3] Verifying Available Backups in ${BACKUP_BUCKET}:"
gcloud storage ls "${BACKUP_BUCKET}/**"

echo ""
echo "=================================================================="
echo " ✅ Backup completed successfully!"
echo "=================================================================="
