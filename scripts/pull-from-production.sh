#!/usr/bin/env bash
# ==============================================================================
# MedJ — Pull Data from Production to Local
# Cleans local instance and synchronizes all data from Cloud Firestore.
# ==============================================================================

set -euo pipefail

python3 "$(dirname "$0")/pull_from_prod.py"
