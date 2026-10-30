from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials, firestore, storage

STORAGE_BUCKET = "first-project-72603.firebasestorage.app"
KEY_PATH = Path(__file__).parent/"serviceAccountKey.json"

try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app(
        credentials.Certificate(str(KEY_PATH)),
        {"storageBucket": STORAGE_BUCKET},
    )

db = firestore.client()
bucket = storage.bucket()

__all__ = ["auth", "bucket", "db", "firestore"]
