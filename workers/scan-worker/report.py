import json
import sys


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))


def risk(risk_type, label, content, confidence, **extra):
    return {
        "riskType": risk_type,
        "label": label,
        "contentRedacted": content,
        "confidence": confidence,
        "suggestedAction": "review",
        "status": "pending",
        **extra,
    }
