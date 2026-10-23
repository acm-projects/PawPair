"""Runs hazard detection on the snapshots taken during a room scan.

Detects objects in each snapshot, keeps only hazards for this pet, and
merges duplicates so the same plant seen in five snapshots counts once.
Each hazard remembers which snapshot it was found in (frame_index), so the
app can show several hazards on the same photo.
"""

import time

from PIL import Image

from detector import detect
from hazard_rules import SEVERITY_ORDER, filter_hazards

MAX_FRAME_SIDE = 480

MIN_SIGHTINGS = 2
VERY_SURE = 0.8
MIN_SNAPSHOTS_FOR_CHECK = 3


def scan_images(images: list[Image.Image], pet_type: str) -> dict:
    """Returns hazards (each with a frame_index) and the shrunk snapshots they appear in."""
    start = time.time()
    best = {}
    sightings = {}

    for index, img in enumerate(images):
        labels_in_this_snapshot = set()
        for h in filter_hazards(detect(img), pet_type):
            labels_in_this_snapshot.add(h["label"])
            current = best.get(h["label"])
            if current is None or h["confidence"] > current["hazard"]["confidence"]:
                best[h["label"]] = {"hazard": h, "frame_index": index}
        for label in labels_in_this_snapshot:
            sightings[label] = sightings.get(label, 0) + 1

    if len(images) >= MIN_SNAPSHOTS_FOR_CHECK:
        for label in list(best):
            seen = sightings.get(label, 0)
            very_sure = best[label]["hazard"]["confidence"] >= VERY_SURE
            if seen < MIN_SIGHTINGS and not very_sure:
                print(f"  (ignored {label}: seen in only {seen} snapshot)", flush=True)
                del best[label]

    snapshots, scales = {}, {}
    for index in sorted({e["frame_index"] for e in best.values()}):
        img = images[index].copy()
        scales[index] = min(MAX_FRAME_SIDE / img.width, MAX_FRAME_SIDE / img.height, 1)
        img.thumbnail((MAX_FRAME_SIDE, MAX_FRAME_SIDE))
        snapshots[index] = img

    hazards = []
    for entry in best.values():
        h, index = entry["hazard"], entry["frame_index"]
        scale = scales[index]
        hazards.append(
            {
                **h,
                "box": [round(v * scale, 1) for v in h["box"]],
                "frame_index": index,
            }
        )

    hazards.sort(key=lambda h: (SEVERITY_ORDER[h["severity"]], -h["confidence"]))
    for i, h in enumerate(hazards, start=1):
        h["id"] = i

    print(
        f"[scan] {len(images)} snapshots checked, {len(hazards)} hazards, "
        f"{time.time() - start:.1f}s",
        flush=True,
    )
    return {"frames_checked": len(images), "hazards": hazards, "snapshots": snapshots}