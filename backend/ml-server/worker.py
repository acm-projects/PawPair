"""PawPair scan worker: watches Firestore for new scans and runs YOLOv8 on them.

How it works:
1. The app takes snapshots during a room scan and writes them to Firestore:
     scans/{scanId}               → { uid, pet_type, status: "uploaded", ... }
     scans/{scanId}/frames/{n}    → { index, jpeg (base64) }
2. This worker CHECKS Firestore every few seconds for scans with status "uploaded".
3. It downloads the snapshots and looks for pets already living in the home.
4. It checks for hazards for the pet being adopted AND every pet it spotted,
   merges them, and tags each hazard with which pets it affects.
5. It writes the hazards back to the scan doc with status "done". The app is
   listening and shows them. Then it deletes the snapshots to keep Firestore small.

The phone never connects to this computer directly, so no IP address,
tunnel, or same Wi-Fi network is needed. This computer just needs internet.

Run from backend/ml-server with the .venv active:
    python worker.py
"""

import base64
import io
import os
import statistics
import time

from google.cloud.firestore_v1.base_query import FieldFilter
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageStat

from detector import PET_SPECIES, clear_cache, detect, detect_pets
from firebase_client import db, firestore
from frame_scan import scan_images
import pepo

SUPPORTED_PETS = {"dog", "cat", "small_animal", "bird"}
MAX_HAZARDS_SAVED = 10
CHECK_EVERY_SECONDS = 2
SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
# A pet only counts as "spotted" if it shows up in this many snapshots,
# or once with very high confidence. Stops one blurry frame from inventing a pet.
PET_MIN_SNAPSHOTS = 2
PET_SURE_CONFIDENCE = 0.8
# A second pet type needs this share of the main pet's votes (unless both are
# seen in the same snapshot), so one misread animal doesn't become two pets.
PET_SECOND_PET_SHARE = 0.6
# Blurry snapshots (taken while turning fast) hide small objects. Skip the blurriest,
# but always keep at least this many of the sharpest ones.
BLUR_SHARE_OF_MEDIAN = 0.35
MIN_FRAMES_KEPT = 6


def sharpness(img: Image.Image) -> float:
    """Higher = sharper. Measures how much the edges in the photo stand out."""
    gray = img.convert("L")
    gray.thumbnail((480, 480))
    edges = gray.filter(ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], scale=1))
    w, h = edges.size
    edges = edges.crop((4, 4, w - 4, h - 4))  # ignore the photo's border, which always looks "sharp"
    return ImageStat.Stat(edges).var[0]


def drop_blurry(images: list[Image.Image]) -> list[Image.Image]:
    if len(images) <= MIN_FRAMES_KEPT:
        return images
    scores = [sharpness(img) for img in images]
    cutoff = statistics.median(scores) * BLUR_SHARE_OF_MEDIAN
    keep_anyway = set(sorted(range(len(images)), key=lambda i: -scores[i])[:MIN_FRAMES_KEPT])
    kept = [img for i, img in enumerate(images) if scores[i] >= cutoff or i in keep_anyway]
    if len(kept) < len(images):
        print(f"  (skipped {len(images) - len(kept)} blurry snapshot(s))", flush=True)
    return kept


def frame_to_base64(frame: Image.Image) -> str:
    """Compress a frame to a small JPEG string that fits inside a Firestore doc."""
    buf = io.BytesIO()
    frame.save(buf, format="JPEG", quality=60)
    return base64.b64encode(buf.getvalue()).decode()


def save_debug_images(scan_id: str, snapshots: dict, hazards: list[dict]) -> None:
    """If PAWPAIR_DEBUG_IMAGES=1, save each result photo with its hazard boxes drawn,
    to debug_scans/, so you can see exactly where each box landed."""
    if os.getenv("PAWPAIR_DEBUG_IMAGES") != "1":
        return
    os.makedirs("debug_scans", exist_ok=True)
    for index, img in snapshots.items():
        canvas = img.copy()
        draw = ImageDraw.Draw(canvas)
        for h in hazards:
            if h["frame_index"] != index:
                continue
            draw.rectangle(h["box"], outline="red", width=3)
            draw.text((h["box"][0] + 4, h["box"][1] + 4), f'#{h["id"]} {h["label"]} {h["confidence"]:.2f}', fill="red")
        path = f"debug_scans/{scan_id}_{index}.jpg"
        canvas.save(path, quality=85)
        print(f"  (debug image saved: {path})", flush=True)


def print_everything_seen(images: list[Image.Image]) -> None:
    """Debug helper: list every object YOLO saw, even ones that aren't hazards."""
    best: dict[str, float] = {}
    count: dict[str, int] = {}
    for img in images:
        labels_here = set()
        for d in detect(img, conf=0.25):
            best[d["label"]] = max(best.get(d["label"], 0.0), d["confidence"])
            labels_here.add(d["label"])
        for label in labels_here:
            count[label] = count.get(label, 0) + 1
    if not best:
        print("  YOLO saw: nothing", flush=True)
        return
    print("  YOLO saw:", flush=True)
    for label in sorted(best, key=lambda l: -best[l]):
        print(f"    {label:14s} best {best[label]:.0%}, in {count[label]} snapshot(s)", flush=True)


def spot_pets(images: list[Image.Image]) -> dict[str, float]:
    """Which pets show up in the scan? Returns {label: best confidence}.

    The same animal appears in many snapshots, and the model can call it a dog in
    some and a cat in others. So we look at the whole scan:
    - each label gets "votes" (its confidences added up across snapshots),
    - the label with the most votes is the main pet,
    - another label only counts as a SECOND pet if both were seen at the same time
      in one snapshot, or if it has lots of votes of its own.
    Otherwise it was most likely the same animal, misread.
    """
    best: dict[str, float] = {}
    votes: dict[str, float] = {}
    frames: dict[str, int] = {}
    seen_together: set[frozenset] = set()

    for img in images:
        labels_here = set()
        for d in detect_pets(img):
            label = d["label"]
            best[label] = max(best.get(label, 0.0), d["confidence"])
            votes[label] = votes.get(label, 0.0) + d["confidence"]
            labels_here.add(label)
        for label in labels_here:
            frames[label] = frames.get(label, 0) + 1
        for a in labels_here:
            for b in labels_here:
                if a != b:
                    seen_together.add(frozenset((a, b)))

    candidates = []
    for label in best:
        if frames[label] >= PET_MIN_SNAPSHOTS or best[label] >= PET_SURE_CONFIDENCE:
            candidates.append(label)
        else:
            print(f"  (ignored pet {label}: seen in only {frames[label]} snapshot, {best[label]:.0%} sure)", flush=True)

    candidates.sort(key=lambda l: -votes[l])
    kept: list[str] = []
    for label in candidates:
        if not kept:
            kept.append(label)
            continue
        together = any(frozenset((label, k)) in seen_together for k in kept)
        strong = votes[label] >= PET_SECOND_PET_SHARE * votes[kept[0]]
        if together or strong:
            kept.append(label)
        else:
            print(
                f"  (ignored pet {label}: probably the same animal as the {kept[0]} "
                f"[{votes[label]:.1f} vs {votes[kept[0]]:.1f} votes])",
                flush=True,
            )
    return {label: best[label] for label in kept}


def decode_frames(frame_docs) -> list[Image.Image]:
    """Turn the uploaded snapshots back into images, skipping any that are damaged."""
    images = []
    for d in frame_docs:
        try:
            data = d.get("jpeg") or ""
            if "," in data[:100]:  # strip a "data:image/jpeg;base64," prefix if present
                data = data.split(",", 1)[1]
            img = Image.open(io.BytesIO(base64.b64decode(data)))
            # Phone photos are often stored sideways with a "rotate me" tag (EXIF).
            # Turn them upright so YOLO sees the room the right way up, and the
            # boxes line up with the photo shown in the app.
            img = ImageOps.exif_transpose(img)
            images.append(img.convert("RGB"))
        except Exception as e:
            print(f"  (skipped damaged snapshot {d.id}: {e})", flush=True)
    return images


def _hazard_key(h: dict) -> tuple:
    """Two hazards are the same if they're the same object in the same frame."""
    box = tuple(round(v / 20) for v in h.get("box", []))
    return (h.get("frame_index"), h.get("label", h.get("title")), box)


def is_pet_hazard(h: dict) -> bool:
    """Pets in the home aren't hazards: we check hazards FOR them instead."""
    return h.get("label") in PET_SPECIES or "(Other Pet)" in str(h.get("title", ""))


def merge_results(runs: list[tuple[str, str, str | None, dict]]) -> dict:
    """Combine scan_images() results for several pets into one list.

    runs: (who, pet_type, label, result), where who is "adopting" or "spotted".
    Each hazard gets a "for_pets" list saying which pets it affects and why.
    """
    merged: dict[tuple, dict] = {}
    snapshots: dict = {}
    frames_checked = 0

    for who, pet_type, label, result in runs:
        snapshots.update(result["snapshots"])
        frames_checked = max(frames_checked, result["frames_checked"])
        for h in result["hazards"]:
            if is_pet_hazard(h):
                continue
            key = _hazard_key(h)
            if key not in merged:
                merged[key] = {**h, "for_pets": []}
            merged[key]["for_pets"].append(
                {"who": who, "pet": pet_type, "label": label, "reason": h.get("reason", "")}
            )

    hazards = sorted(
        merged.values(),
        key=lambda h: (SEVERITY_ORDER.get(h.get("severity"), 3), -len(h["for_pets"])),
    )
    for i, h in enumerate(hazards, start=1):
        h["id"] = i
    return {"hazards": hazards, "snapshots": snapshots, "frames_checked": frames_checked}


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

        started = time.time()
        clear_cache()
        frame_docs = list(scan_ref.collection("frames").order_by("index").stream())
        images = drop_blurry(decode_frames(frame_docs))
        print(f"[1/4] Downloaded {len(images)} snapshots, adopting = {pet}", flush=True)
        if not images:
            raise ValueError("No snapshots were saved for this scan.")

        print_everything_seen(images)
        spotted = spot_pets(images)
        print(f"[2/4] Pets spotted on camera: {spotted or 'none'}", flush=True)

        # Check hazards once per pet type, then tag them with every pet they affect.
        results_by_type = {pet: scan_images(images, pet)}
        runs = [("adopting", pet, None, results_by_type[pet])]
        for label in sorted(spotted):
            pet_type = PET_SPECIES[label]
            if pet_type not in results_by_type:
                results_by_type[pet_type] = scan_images(images, pet_type)
            runs.append(("spotted", pet_type, label, results_by_type[pet_type]))
        result = merge_results(runs)

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

        save_debug_images(scan_ref.id, result["snapshots"], hazards)

        scan_ref.update(
            {
                "status": "done",
                "adopting_pet": pet,
                "pets_spotted": sorted(spotted),
                "frames_checked": result["frames_checked"],
                "hazard_count": len(hazards),
                "hazards": hazards,
                "snapshots": snapshots,
                "completed_at": firestore.SERVER_TIMESTAMP,
            }
        )
        print(f"[3/4] Results saved ({len(hazards)} hazards, {time.time() - started:.1f}s total)", flush=True)

        batch = db.batch()
        for d in frame_docs:
            batch.delete(d.reference)
        batch.commit()
        print("[4/4] Snapshots cleaned up", flush=True)
        clear_cache()

    except Exception as e:
        print(f"[ERROR] {e}", flush=True)
        scan_ref.update({"status": "error", "error": str(e)})


def main():
    query = db.collection("scans").where(filter=FieldFilter("status", "==", "uploaded"))
    print(
        f"PawPair worker is running. Checking for scans and Pepo questions every {CHECK_EVERY_SECONDS}s... "
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
            try:
                pepo.answer_pending()
            except Exception as e:
                print(f"[ERROR] Pepo couldn't check for questions: {e}", flush=True)
            time.sleep(CHECK_EVERY_SECONDS)
    except KeyboardInterrupt:
        print("\nStopping worker.")


if __name__ == "__main__":
    main()