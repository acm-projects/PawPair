"""PawPair scan worker: watches Firestore for new scans and runs YOLOv8 on them.

How it works:
1. The app takes snapshots during a room scan and writes them to Firestore:
     scans/{scanId}               → { uid, pet_type, status: "uploaded", ... }
     scans/{scanId}/frames/{n}    → { index, jpeg (base64) }
2. This worker CHECKS Firestore every few seconds for scans with status "uploaded".
3. It downloads the snapshots, runs object detection, and writes the hazards
   back to the scan doc with status "done". The app is listening and shows them.
4. It deletes the snapshots afterwards to keep Firestore small.

The phone never connects to this computer directly, so no IP address,
tunnel, or same Wi-Fi network is needed. This computer just needs internet.

Run from backend/ml-server with the .venv active:
    python worker.py
"""

import base64
import io
import time

from google.cloud.firestore_v1.base_query import FieldFilter
from PIL import Image

from firebase_client import db, firestore
from frame_scan import scan_images

SUPPORTED_PETS = {"dog", "cat", "small_animal", "bird"}
MAX_HAZARDS_SAVED = 10
CHECK_EVERY_SECONDS = 3


def frame_to_base64(frame: Image.Image) -> str:
    """Compress a frame to a small JPEG string that fits inside a Firestore doc."""
    buf = io.BytesIO()
    frame.save(buf, format="JPEG", quality=60)
    return base64.b64encode(buf.getvalue()).decode()


def process_scan(scan_id: str) -> None:
    scan_ref = db.collection("scans").document(scan_id)
    snapshot = scan_ref.get()
    scan = snapshot.to_dict() if snapshot.exists else None
    if not scan or scan.get("status") != "uploaded":
        return

    print(f"\n[new scan] {scan_id}", flush=True)
    scan_ref.update({"status": "processing"})

    try:
        pet = str(scan.get("pet_type", "dog")).lower().strip()
        if pet not in SUPPORTED_PETS:
            pet = "dog"

        frame_docs = list(scan_ref.collection("frames").order_by("index").stream())
        images = [
            Image.open(io.BytesIO(base64.b64decode(d.get("jpeg")))).convert("RGB")
            for d in frame_docs
        ]
        print(f"[1/3] Downloaded {len(images)} snapshots, pet = {pet}", flush=True)
        if not images:
            raise ValueError("No snapshots were saved for this scan.")

        result = scan_images(images, pet)

        hazards = result["hazards"][:MAX_HAZARDS_SAVED]
        used = {h["frame_index"] for h in hazards}
        snapshots = [
            {
                "index": index,
                "jpeg": frame_to_base64(img),
                "width": img.width,
                "height": img.height,
            }
            for index, img in sorted(result["snapshots"].items())
            if index in used
        ]

        scan_ref.update(
            {
                "status": "done",
                "frames_checked": result["frames_checked"],
                "hazard_count": len(hazards),
                "hazards": hazards,
                "snapshots": snapshots,
                "completed_at": firestore.SERVER_TIMESTAMP,
            }
        )
        print(f"[2/3] Results saved ({len(hazards)} hazards)", flush=True)

        batch = db.batch()
        for d in frame_docs:
            batch.delete(d.reference)
        batch.commit()
        print("[3/3] Snapshots cleaned up", flush=True)

    except Exception as e:
        print(f"[ERROR] {e}", flush=True)
        scan_ref.update({"status": "error", "error": str(e)})


def main():
    query = db.collection("scans").where(filter=FieldFilter("status", "==", "uploaded"))
    print(
        f"PawPair scan worker is running. Checking for scans every {CHECK_EVERY_SECONDS}s... "
        "(Ctrl+C to stop)",
        flush=True,
    )

    try:
        while True:
            try:
                for doc in query.stream():
                    process_scan(doc.id)
            except Exception as e:
                print(f"[ERROR] Couldn't check for scans: {e}", flush=True)
            time.sleep(CHECK_EVERY_SECONDS)
    except KeyboardInterrupt:
        print("\nStopping worker.")


if __name__ == "__main__":
    main()