"""Loads the YOLOv8 model once and runs object detection on images."""

from pathlib import Path

from PIL import Image
from ultralytics import YOLO

MODEL_PATH = Path(__file__).parent / "models" / "yolov8n.pt"

_model = YOLO(str(MODEL_PATH))


def detect(image: Image.Image, conf: float = 0.4) -> list[dict]:
    """Run YOLO on a PIL image and return a simple list of detections."""
    result = _model(image, conf=conf, verbose=False)[0]

    detections = []
    for box in result.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append(
            {
                "label": _model.names[int(box.cls)],
                "confidence": round(float(box.conf), 2),
                "box": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
            }
        )
    return detections