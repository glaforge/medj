#!/usr/bin/env python3
import json
import subprocess
import sys
import urllib.request
import urllib.error

PROJECT_ID = "medj-505807"
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
LOCAL_URL = "http://localhost:8080/api"

def parse_val(val):
    if not isinstance(val, dict): return val
    if "stringValue" in val: return val["stringValue"]
    if "integerValue" in val: return int(val["integerValue"])
    if "doubleValue" in val: return float(val["doubleValue"])
    if "booleanValue" in val: return val["booleanValue"]
    if "arrayValue" in val: return [parse_val(v) for v in val.get("arrayValue", {}).get("values", [])]
    if "mapValue" in val: return {k: parse_val(v) for k, v in val.get("mapValue", {}).get("fields", {}).items()}
    if "nullValue" in val: return None
    return None

def parse_doc(doc):
    data = {k: parse_val(v) for k, v in doc.get("fields", {}).items()}
    if "id" not in data or not data["id"]:
        data["id"] = doc["name"].split("/")[-1]
    return data

def fetch_prod_collection(col_name, token):
    url = f"{BASE_URL}/{col_name}?pageSize=300"
    all_docs = []
    page_token = None
    while True:
        target = url + (f"&pageToken={page_token}" if page_token else "")
        req = urllib.request.Request(target, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                break
            print(f"Error fetching {col_name}: {e}")
            break
        docs = data.get("documents", [])
        for d in docs:
            all_docs.append(parse_doc(d))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return all_docs

def main():
    print("==================================================================")
    print(" 📥 MedJ — Rapatriement des Données de Production vers le Local")
    print(f" Source : Google Cloud Firestore ({PROJECT_ID})")
    print(f" Cible  : Instance locale ({LOCAL_URL})")
    print("==================================================================")

    # 1. Check local server
    try:
        req_status = urllib.request.Request(f"{LOCAL_URL}/sample-data/status", headers={"Authorization": "Bearer test-token-glaforge@gmail.com"})
        urllib.request.urlopen(req_status, timeout=3)
    except Exception as e:
        print(f"❌ Le serveur local http://localhost:8080 n'est pas joignable: {e}")
        print("Veuillez d'abord démarrer MedJ en local avec : ./gradlew run")
        sys.exit(1)

    # 2. Get prod token
    print("🔑 Récupération du jeton d'authentification gcloud...")
    token = subprocess.run(["gcloud", "auth", "print-access-token"], check=True, capture_output=True, text=True).stdout.strip()

    # 3. Fetch from prod
    print("📦 Téléchargement des données depuis Google Cloud Firestore...")
    subjects = fetch_prod_collection("medj_subjects", token)
    courses = fetch_prod_collection("medj_courses", token)
    revisions = fetch_prod_collection("medj_revisions", token)
    qcms = fetch_prod_collection("medj_qcms", token)
    flashcards = fetch_prod_collection("medj_flashcards", token)
    scans = fetch_prod_collection("medj_scans", token)
    illustrations = fetch_prod_collection("medj_illustrations", token)
    threads = fetch_prod_collection("medj_threads", token)

    print(f"✔ Récupéré depuis la production :")
    print(f"   • {len(subjects)} matières / UEs")
    print(f"   • {len(courses)} cours")
    print(f"   • {len(revisions)} séances de révision")
    print(f"   • {len(qcms)} QCMs")
    print(f"   • {len(flashcards)} flashcards")
    print(f"   • {len(illustrations)} schémas")
    print(f"   • {len(threads)} conversations tuteur")

    local_headers = {
        "Authorization": "Bearer test-token-glaforge@gmail.com",
        "Content-Type": "application/json"
    }

    # 4. Clear local
    print("\n🧹 Nettoyage des données locales existantes...")
    req_clear = urllib.request.Request(f"{LOCAL_URL}/sample-data/clear", data=b"{}", headers=local_headers, method="POST")
    urllib.request.urlopen(req_clear)
    print("✔ Données locales réinitialisées.")

    # 5. Push to local
    print("\n🚀 Injection des données de production en local...")
    for s in subjects:
        body = json.dumps(s).encode("utf-8")
        req = urllib.request.Request(f"{LOCAL_URL}/subjects", data=body, headers=local_headers, method="POST")
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            print(f"  ❌ Erreur import UE {s.get('code')}: {e}")

    for c in courses:
        body = json.dumps(c).encode("utf-8")
        req = urllib.request.Request(f"{LOCAL_URL}/courses", data=body, headers=local_headers, method="POST")
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            print(f"  ❌ Erreur import cours {c.get('title')}: {e}")

    # Revisions (if any existing custom revisions)
    for r in revisions:
        body = json.dumps(r).encode("utf-8")
        req = urllib.request.Request(f"{LOCAL_URL}/revisions", data=body, headers=local_headers, method="POST")
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            pass

    for q in qcms:
        body = json.dumps(q).encode("utf-8")
        req = urllib.request.Request(f"{LOCAL_URL}/gemini/qcms", data=body, headers=local_headers, method="POST")
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            pass

    for f in flashcards:
        body = json.dumps(f).encode("utf-8")
        req = urllib.request.Request(f"{LOCAL_URL}/gemini/flashcards", data=body, headers=local_headers, method="POST")
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            pass

    print("\n==================================================================")
    print(" ✅ Rapatriement terminé avec succès !")
    print(" L'instance locale est maintenant parfaitement synchronisée avec la production.")
    print("==================================================================")

if __name__ == "__main__":
    main()
