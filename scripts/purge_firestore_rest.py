#!/usr/bin/env python3
import json
import subprocess
import sys
import urllib.request
import urllib.error

PROJECT_ID = "medj-505807"
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

COLLECTIONS = [
    "medj_subjects",
    "medj_courses",
    "medj_revisions",
    "medj_qcms",
    "medj_attempts",
    "medj_scans",
    "medj_illustrations",
    "medj_flashcards",
    "medj_threads",
    "medj_config"
]

def get_access_token():
    try:
        res = subprocess.run(["gcloud", "auth", "print-access-token"], check=True, capture_output=True, text=True)
        return res.stdout.strip()
    except Exception as e:
        print(f"❌ Failed to obtain token from gcloud: {e}")
        sys.exit(1)

def delete_document(doc_name, token):
    url = f"https://firestore.googleapis.com/v1/{doc_name}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 204)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return True
        print(f"  ❌ Error deleting {doc_name}: {e}")
        return False

def purge_collection(collection_name, token):
    url = f"{BASE_URL}/{collection_name}?pageSize=300"
    total_deleted = 0
    page_token = None

    while True:
        target_url = url
        if page_token:
            target_url += f"&pageToken={page_token}"
        
        req = urllib.request.Request(target_url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                break
            print(f"❌ Error fetching {collection_name}: {e}")
            break

        documents = data.get("documents", [])
        if not documents:
            break

        for doc in documents:
            doc_name = doc["name"]
            if delete_document(doc_name, token):
                total_deleted += 1

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return total_deleted

def main():
    print("==================================================================")
    print(" 🧹 Purging Cloud Firestore via Google REST API")
    print(f" Project: {PROJECT_ID}")
    print("==================================================================")
    
    token = get_access_token()
    grand_total = 0

    for col in COLLECTIONS:
        print(f"🔍 Purging '{col}'...", end="", flush=True)
        deleted = purge_collection(col, token)
        grand_total += deleted
        print(f" ✔ {deleted} documents supprimés.")

    print("==================================================================")
    print(f" ✅ Total documents supprimés dans Firestore : {grand_total}")
    print("==================================================================")

if __name__ == "__main__":
    main()
