"""Runs hazard detection on a short room-scan video.

Samples about one frame per second, detects hazards in each, and merges
duplicates so the same couch or plant seen in many frames counts once.
"""

import time

import cv2
from PIL import Image

from detector import detect
from hazard_rules import SEVERITY_ORDER, filter_hazards

MAX_FRAME_SIDE = 480
DETECT_SIDE = 640


def _shrink(frame, max_side: int):
    """Resize an OpenCV frame so its longest side is at most max_side."""
    h, w = frame.shape[:2]
    scale = max_side / max(h, w)
    if scale >= 1:
        return frame
    return cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def scan_video(path: str, pet_type: str, frames_per_second: float = 1.0) -> dict:
    """Returns hazards; each has a "frame" (PIL image) the caller can save/upload."""
    start = time.time()
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise ValueError("Could not open video")

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    step = max(int(video_fps / frames_per_second), 1)

    best = {}
    frame_index = 0
    frames_checked = 0

    while True:
        if not cap.grab():
            break
        if frame_index % step == 0:
            ok, frame = cap.retrieve()
            if not ok:
                break
            frames_checked += 1
            frame = _shrink(frame, DETECT_SIDE)
            img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            for h in filter_hazards(detect(img), pet_type):
                current = best.get(h["label"])
                if current is None or h["confidence"] > current["hazard"]["confidence"]:
                    best[h["label"]] = {"hazard": h, "frame": img}
        frame_index += 1

    cap.release()

    hazards = []
    for entry in best.values():
        h, img = entry["hazard"], entry["frame"].copy()
        scale = min(MAX_FRAME_SIDE / img.width, MAX_FRAME_SIDE / img.height, 1)
        img.thumbnail((MAX_FRAME_SIDE, MAX_FRAME_SIDE))
        hazards.append(
            {
                **h,
                "box": [round(v * scale, 1) for v in h["box"]],
                "frame_width": img.width,
                "frame_height": img.height,
                "frame": img,
            }
        )

    hazards.sort(key=lambda h: (SEVERITY_ORDER[h["severity"]], -h["confidence"]))
    for i, h in enumerate(hazards, start=1):
        h["id"] = i

    print(
        f"[scan] {frames_checked} frames checked, {len(hazards)} hazards, "
        f"{time.time() - start:.1f}s"
    )

    return {"frames_checked": frames_checked, "hazards": hazards}