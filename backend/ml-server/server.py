"""
file function:

- app records scan video --> uploads to firebase storage & creates a firestore doc with users/{uid}/
scans/{scanID} with status as "uploaded"
- app then calls /process-scan with the scanID and user login token
- server downloads video from storage --> runs YOLOv8 --> uploads 1 frame per hazard back to storage
--> writes results to Firestore doc
- app listens to the doc --> shows results when status = "done"

"""

import io
import os
import tempfile
 
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
 
from firebase_client import auth, bucket, db, firestore
from video_scan import scan_video

SUPPORTED_PETS = {"dog", "cat", "small_animal", "bird"}

app = FastAPI(title="PawPair Hazard Scanner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessScanRequest(BaseModel):
    scan_id: str

def get_uid(authorization: str | None) -> str:
    # gets user ids from Firestore
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing login token")
    try:
        return auth.verify_id_token(authorization.split(" ", 1)[1])["uid"]
    except Exception:
        raise HTTPException(401, "Invalid or expired login token")

@app.get("/")
def health():
    return {"status": "ok"}

@app.get("/process-scan")
def process_scan(body: ProcessScanRequest, authorization: str | None = Header(None)):
    uid = get_uid(authorization)
    scan_ref = scan_ref.get()
    if not snapshot.exists:
        raise HTTPException(404, "Scan not found")
    scan = snapshot.to_dict()

    pet = str(scan.get("pet_type", "dog")).lower().strip()
    if pet not in SUPPORTED_PETS:
        pet = "dog"

    scan_ref.update({"status": "processing"})
    tmp_path = None

    # Get video from firestore and run scan on it
    try: 
        suffix = os.path.splittext(scan["video_path"])[1] or ".mp4"
        with tempfile.NamedTemproaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path=tmp.name
        bucket.blob(scan["video_path"]).download_to_filename(tmp_path)

        result = scan_video(tmp_path, pet)

        hazards = []
        for h in result["hazards"]:
            frame = h.pop("frame")
            frame_path = f"scans/users/{uid}/{body.scan_id}/hazard_{h['id']}.jpg"
            buf = io.BytesIO()
            frame.save(buf, format="JPEG", quality=80)
            bucket.blob(frame_path).upload_from_string(buf.getvalue(), content_type="image/jpeg")
            hazards.append({**h, "frame_path": frame_path})

        scan_ref.update(
            {
                "status": "done",
                "frames_checked": result["frames_checked"],
                "hazard_count": len(hazards),
                "hazards": hazards,
                "completed_at": firestore.SERVER_TIMESTAMP,
            }
        )

        return {"status": "done", "hazard_count": len(hazards)}

    except Exception as e:
        scan_ref.update({"status": "error", "error": str(e)})
        raise HTTPException(500, f"Scan failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)