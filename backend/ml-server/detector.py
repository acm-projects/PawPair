"""Loads the YOLOv8 models once and runs object detection on images.

Three models:
- yolov8n.pt          the original model. Finds everyday objects (couch, knife, plant...).
- pawpair_custom.pt   our trained pet model. Finds pets: bird, cat, dog, hamster, rabbit.
- pawpair_hazards.pt  our trained hazard model. Finds hazards the original model doesn't know
                      (screwdrivers, nails, lilies, grapes, candles...).

If either trained model is missing, the scan still works without it.

Speed and accuracy settings:
- Runs on the Mac's built-in GPU (Apple chip) or an NVIDIA GPU when there is one.
- Looks at photos in more detail (HAZARD_IMGSZ) so small things like scissors are easier to see.
- Each model checks each photo ONCE per scan. Results are remembered (cached), so
  checking hazards for several pets doesn't repeat the work.
"""

from pathlib import Path

import torch
from PIL import Image
from ultralytics import YOLO

MODELS_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODELS_DIR / "yolov8n.pt"
PET_MODEL_PATH = MODELS_DIR / "pawpair_custom.pt"
HAZARD_MODEL_PATH = MODELS_DIR / "pawpair_hazards.pt"

# How much detail YOLO looks at. Bigger finds smaller objects but is slower.
# Pets are big in photos, so the pet model doesn't need extra detail.
HAZARD_IMGSZ = 1024
PET_IMGSZ = 640
# Run every model at this low confidence once, then each caller keeps what it needs.
# (The hazard rules decide the real cut-off for each hazard.)
LOWEST_CONF = 0.2

# Pet labels the custom model finds, and the PawPair pet type each one counts as.
PET_SPECIES = {
    "dog": "dog",
    "cat": "cat",
    "bird": "bird",
    "hamster": "small_animal",
    "rabbit": "small_animal",
}


def _pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"  # Apple chip (M1 or newer)
    return "cpu"


DEVICE = _pick_device()

_model = YOLO(str(MODEL_PATH))
_pet_model = YOLO(str(PET_MODEL_PATH)) if PET_MODEL_PATH.exists() else None
_hazard_model = YOLO(str(HAZARD_MODEL_PATH)) if HAZARD_MODEL_PATH.exists() else None

print(f"Running YOLO on: {DEVICE}", flush=True)
if _pet_model is not None:
    print(f"Loaded custom pet model: {list(_pet_model.names.values())}", flush=True)
else:
    print("pawpair_custom.pt not found, skipping the pet model.", flush=True)
if _hazard_model is not None:
    print(f"Loaded custom hazard model: {list(_hazard_model.names.values())}", flush=True)
else:
    print("pawpair_hazards.pt not found, skipping the hazard model.", flush=True)

# Cache: (which model, which photo) -> detections. Cleared at the start of every scan.
_cache: dict[tuple[str, int], list[dict]] = {}


def clear_cache() -> None:
    """Call at the start of each scan, so old photos' results are never reused."""
    _cache.clear()


def _run(model: YOLO, image: Image.Image, imgsz: int, one_label_per_box: bool = False) -> list[dict]:
    # one_label_per_box: if the model thinks one animal is both "cat" and "dog",
    # keep only its best guess instead of two overlapping boxes.
    result = model(
        image,
        conf=LOWEST_CONF,
        imgsz=imgsz,
        device=DEVICE,
        verbose=False,
        agnostic_nms=one_label_per_box,
    )[0]
    detections = []
    for box in result.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append(
            {
                "label": model.names[int(box.cls)],
                "confidence": round(float(box.conf), 2),
                "box": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
            }
        )
    return detections


def _cached(name: str, model: YOLO, image: Image.Image, imgsz: int, one_label_per_box: bool = False) -> list[dict]:
    key = (name, id(image))
    if key not in _cache:
        _cache[key] = _run(model, image, imgsz, one_label_per_box)
    return _cache[key]


def _base(image):
    return _cached("base", _model, image, HAZARD_IMGSZ)


def _pets(image):
    return _cached("pet", _pet_model, image, PET_IMGSZ, one_label_per_box=True) if _pet_model else []


def _hazards(image):
    return _cached("hazard", _hazard_model, image, HAZARD_IMGSZ) if _hazard_model else []


def _overlap(a: list[float], b: list[float]) -> float:
    """How much two boxes overlap, from 0 (not at all) to 1 (the same box)."""
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0.0


def detect(image: Image.Image, conf: float = 0.25) -> list[dict]:
    """Run YOLO on a PIL image and return a simple list of detections.

    - Pets come from the pet model (it's better at pets).
    - Hazards both models know (like knife or scissors) are kept if EITHER model
      finds them, and the same knife isn't reported twice.
    - Everything else comes from the original model.
    The hazard rules then apply each hazard's own minimum confidence.
    """
    detections = [d for d in _base(image) if d["confidence"] >= conf]
    if _pet_model is not None:
        detections = [d for d in detections if d["label"] not in PET_SPECIES]
        detections += [dict(d) for d in _pets(image) if d["confidence"] >= conf]
    for d in _hazards(image):
        if d["confidence"] < conf:
            continue
        same = [
            e for e in detections
            if e["label"] == d["label"] and _overlap(e["box"], d["box"]) > 0.4
        ]
        if not same:
            detections.append(dict(d))
        elif d["confidence"] > same[0]["confidence"]:
            detections[detections.index(same[0])] = dict(d)
    return [dict(d) for d in detections]


def detect_pets(image: Image.Image, conf: float = 0.5) -> list[dict]:
    """The pets in a photo, one label per animal.

    Both models vote. The original model has seen huge numbers of dogs and cats,
    so it's a good second opinion when the custom model mixes them up
    (for example, a curled-up dog seen from above can look like a cat).
    Boxes that overlap are treated as the same animal, and the label with the
    most total confidence wins.
    """
    votes = [d for d in _base(image) if d["label"] in PET_SPECIES and d["confidence"] >= conf]
    votes += [d for d in _pets(image) if d["confidence"] >= conf]

    animals: list[dict] = []
    for d in sorted(votes, key=lambda d: -d["confidence"]):
        for a in animals:
            if _overlap(a["box"], d["box"]) > 0.4:
                a["votes"][d["label"]] = a["votes"].get(d["label"], 0.0) + d["confidence"]
                a["best"][d["label"]] = max(a["best"].get(d["label"], 0.0), d["confidence"])
                break
        else:
            animals.append(
                {"box": d["box"], "votes": {d["label"]: d["confidence"]}, "best": {d["label"]: d["confidence"]}}
            )

    pets = []
    for a in animals:
        label = max(a["votes"], key=a["votes"].get)
        pets.append({"label": label, "confidence": a["best"][label], "box": a["box"]})
    return pets