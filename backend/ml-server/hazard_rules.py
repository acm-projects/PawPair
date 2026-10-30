"""Turns raw YOLO detections into pet-specific hazards using rules/hazard_rules.json."""

import json
from pathlib import Path

RULES_PATH = Path(__file__).parent / "rules" / "hazard_rules.json"

with open(RULES_PATH) as f:
    RULES = json.load(f)

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}

DEFAULT_MIN_CONFIDENCE = 0.5


def filter_hazards(detections: list[dict], pet_type: str) -> list[dict]:
    """Keep only detections that are hazards for this pet, with a reason and fix."""
    pet = pet_type.lower().strip()
    hazards = []

    for d in detections:
        rule = RULES.get(d["label"])
        if not rule:
            continue
        if pet not in rule["pets"] and "all" not in rule["pets"]:
            continue 
        if d["confidence"] < rule.get("min_confidence", DEFAULT_MIN_CONFIDENCE):
            continue

        hazards.append(
            {
                **d,
                "title": rule["title"],
                "severity": rule["severity"],
                "reason": rule["reasons"].get(pet, rule["reasons"]["default"]),
                "suggestion": rule["suggestion"],
                "rooms": rule.get("rooms", ["general"]),
            }
        )

    hazards.sort(key=lambda h: (SEVERITY_ORDER[h["severity"]], -h["confidence"]))
    for i, h in enumerate(hazards, start=1):
        h["id"] = i

    return hazards