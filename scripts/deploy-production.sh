#!/usr/bin/env bash
# ==============================================================================
# MedJ — Full Production Deployment Script
# Builds and deploys backend to Cloud Run (Java 25) & frontend to Firebase Hosting
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-medj-505807}"
REGION="${GCP_REGION:-europe-west1}"

# Include Gradle-managed Node & npm in PATH
NODE_BIN_DIR="$(find "$PWD/.gradle/nodejs" -name "bin" -type d 2>/dev/null | head -n 1 || true)"
if [[ -n "$NODE_BIN_DIR" ]]; then
  export PATH="$NODE_BIN_DIR:$PATH"
fi

echo "=================================================================="
echo " 🚀 MedJ — Déploiement en Production"
echo " Projet GCP     : $PROJECT_ID"
echo " Région         : $REGION"
echo " Runtime Backend: GraalVM Java 25 / Cloud Run"
echo " Frontend       : React 19 / Firebase Hosting (medj.web.app)"
echo "=================================================================="

# 1. Build Backend layers & Frontend bundle
echo ""
echo "📦 [1/3] Construction des couches applicatives (prepareCloudRun & buildFrontend)..."
./gradlew prepareCloudRun buildFrontend

# 2. Deploy Backend to Google Cloud Run
echo ""
echo "🚀 [2/3] Déploiement du Backend sur Google Cloud Run..."
gcloud beta run deploy medj-backend \
  --source build/cloud-run \
  --no-build \
  --base-image="europe-west1-docker.pkg.dev/serverless-runtimes/google-24-full/runtimes/java25" \
  --command="java" \
  --args="-cp,app/*:libs/*:resources,fr.medj.Application" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="^#^GCP_PROJECT_ID=${PROJECT_ID}#GCS_BUCKET=${PROJECT_ID}-assets#MEDJ_SEED_SAMPLE_DATA=false#MEDJ_ALLOWED_EMAILS=glaforge@gmail.com,marionlaforge4@gmail.com" \
  --allow-unauthenticated

# 3. Deploy Frontend to Firebase Hosting
echo ""
echo "🌐 [3/3] Déploiement du Frontend sur Firebase Hosting..."
TMP_KEY_FILE=""
SA_EMAIL="firebase-adminsdk-fbsvc@${PROJECT_ID}.iam.gserviceaccount.com"
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  TMP_KEY_FILE=$(mktemp /tmp/fb-deploy-XXXXXX.json)
  if gcloud iam service-accounts keys create "$TMP_KEY_FILE" --iam-account="$SA_EMAIL" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
    export GOOGLE_APPLICATION_CREDENTIALS="$TMP_KEY_FILE"
  else
    rm -f "$TMP_KEY_FILE"
    TMP_KEY_FILE=""
  fi
fi

npx -y firebase-tools@latest deploy --only hosting --project="$PROJECT_ID"

if [[ -n "$TMP_KEY_FILE" && -f "$TMP_KEY_FILE" ]]; then
  KEY_ID=$(grep '"private_key_id"' "$TMP_KEY_FILE" | sed -E 's/.*"private_key_id": *"([^"]+)".*/\1/' || true)
  rm -f "$TMP_KEY_FILE"
  if [[ -n "$KEY_ID" ]]; then
    gcloud iam service-accounts keys delete "$KEY_ID" --iam-account="$SA_EMAIL" --project="$PROJECT_ID" --quiet >/dev/null 2>&1 || true
  fi
fi

echo ""
echo "=================================================================="
echo " ✅ Déploiement terminé avec succès !"
echo " Frontend live : https://medj.web.app"
echo " Backend live  : https://medj-backend-917209443133.europe-west1.run.app"
echo "=================================================================="
