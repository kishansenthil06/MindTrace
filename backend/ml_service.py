"""Inference service for Objective 1 (mental-health status classification).

Loads the artifacts produced by train_objective1.py: train-fitted preprocessor,
Random Forest baseline, PyTorch neural classifier and the severity regressor.
No heuristic or hardcoded prediction logic is used anywhere in this module.
"""
import json
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import pandas as pd
import torch

from train_objective1 import TabularClassifier

ARTIFACTS = Path(__file__).parent / "models" / "obj1"
META: Dict[str, Any] = json.loads((ARTIFACTS / "meta.json").read_text())

FEATURES: List[str] = META["features"]
LABEL_ORDER: List[str] = META["label_order"]
DISPLAY = {label: label.replace("_", " ") for label in LABEL_ORDER}
GROUPS: Dict[str, List[str]] = META["feature_groups"]
MEDIANS = META["feature_medians"]
SCORE_COLS = ["Depression_Score", "Anxiety_Score", "Stress_Score"]

_pre = joblib.load(ARTIFACTS / "preprocessor.joblib")
SCALER = _pre["scaler"]
LOWER = _pre["lower"]
UPPER = _pre["upper"]
RANDOM_FOREST = joblib.load(ARTIFACTS / "random_forest.joblib")
REGRESSOR = joblib.load(ARTIFACTS / "severity_regressor.joblib")

NET = TabularClassifier(len(FEATURES))
NET.load_state_dict(torch.load(ARTIFACTS / "neural_net.pt", map_location="cpu"))
NET.eval()

SERVING = META["serving_model"]

FRIENDLY = {
    "Sleep_Quality": "Sleep Quality", "Social_Engagement": "Social Engagement",
    "Daily_App_Usage_Min": "App Usage", "Typing_Speed_WPM": "Typing Speed",
    "Session_Frequency": "Session Frequency", "Idle_Time_Min": "Idle Time",
    "Facial_Emotion_Variance": "Facial Emotion Variance", "Eye_Blink_Rate": "Eye Blink Rate",
    "Smile_Intensity": "Smile Intensity", "Head_Motion_Index": "Head Motion",
    "MFCC_Mean": "Vocal Timbre (MFCC)", "MFCC_Variance": "Vocal Instability",
    "Pitch_Mean": "Voice Pitch", "Speech_Rate": "Speech Rate",
    "Heart_Rate_BPM": "Heart Rate", "HRV_Index": "Heart Rate Variability",
    "Skin_Temperature": "Skin Temperature", "GSR_Level": "Skin Conductance (GSR)",
}

# UI field name -> (dataset column, converter). Unit conversion only, no scoring.
UI_MAP = {
    "sleep_quality": ("Sleep_Quality", lambda v: v),
    "social_engagement": ("Social_Engagement", lambda v: v),
    "daily_app_usage_min": ("Daily_App_Usage_Min", lambda v: v),
    "typing_speed_wpm": ("Typing_Speed_WPM", lambda v: v),
    "session_frequency": ("Session_Frequency", lambda v: v),
    "idle_time_min": ("Idle_Time_Min", lambda v: v),
    "facial_emotion_variance": ("Facial_Emotion_Variance", lambda v: v),
    "eye_blink_rate": ("Eye_Blink_Rate", lambda v: v),
    "smile_intensity": ("Smile_Intensity", lambda v: v / 100.0),
    "head_motion_index": ("Head_Motion_Index", lambda v: v / 10.0),
    "mfcc_mean": ("MFCC_Mean", lambda v: v),
    "mfcc_variance": ("MFCC_Variance", lambda v: v),
    "pitch_mean": ("Pitch_Mean", lambda v: v),
    "speech_rate": ("Speech_Rate", lambda v: 2.0 + min(max(v, 0.0), 300.0) / 300.0 * 4.0),
    "heart_rate_bpm": ("Heart_Rate_BPM", lambda v: v),
    "hrv_index": ("HRV_Index", lambda v: v),
    "skin_temperature": ("Skin_Temperature", lambda v: v),
    "gsr_level": ("GSR_Level", lambda v: min(max(v, 0.0), 20.0) / 20.0 * 4.9 + 0.1),
}


def to_feature_frame(values: Dict[str, Any]) -> pd.DataFrame:
    """Accepts either dataset column names or UI field names; missing values use the train median."""
    row = {}
    for feature in FEATURES:
        if feature in values and values[feature] is not None:
            row[feature] = float(values[feature])
        else:
            row[feature] = None
    for ui_name, (column, convert) in UI_MAP.items():
        if row[column] is None and values.get(ui_name) is not None:
            row[column] = float(convert(float(values[ui_name])))
    for feature in FEATURES:
        if row[feature] is None:
            row[feature] = float(MEDIANS[feature])
    return pd.DataFrame([row], columns=FEATURES)


def _prepare(frame: pd.DataFrame) -> np.ndarray:
    return SCALER.transform(frame.clip(LOWER, UPPER, axis=1))


def _proba(frame: pd.DataFrame) -> np.ndarray:
    clipped = frame.clip(LOWER, UPPER, axis=1)
    if SERVING == "random_forest":
        proba = RANDOM_FOREST.predict_proba(clipped)
        order = {label: i for i, label in enumerate(RANDOM_FOREST.classes_)}
        return np.array([[row[order[label]] for label in LABEL_ORDER] for row in proba])
    with torch.no_grad():
        logits = NET(torch.tensor(SCALER.transform(clipped), dtype=torch.float32))
        return torch.softmax(logits, dim=1).numpy()


def _attributions(frame: pd.DataFrame, class_index: int, base_prob: float):
    """Occlusion attribution: replace one feature with the training median and measure the
    real change in the predicted-class probability of the deployed model."""
    variants = pd.concat([frame] * len(FEATURES), ignore_index=True)
    for i, feature in enumerate(FEATURES):
        variants.at[i, feature] = MEDIANS[feature]
    probs = _proba(variants)[:, class_index]
    deltas = {feature: float(base_prob - probs[i]) for i, feature in enumerate(FEATURES)}
    scale = max(abs(v) for v in deltas.values()) or 1.0
    ranked = sorted(deltas.items(), key=lambda item: abs(item[1]), reverse=True)
    return ([{"feature": FRIENDLY[f], "column": f, "impact": round(abs(v) / scale * 100, 1),
              "delta": round(v * 100, 2),
              "direction": "risk" if v >= 0 else "context"} for f, v in ranked[:8]], deltas)


def summarize(status_display: str, confidence: float, top_feature: str) -> str:
    return (f"The model identified patterns most consistent with {status_display} "
            f"at {confidence}% model confidence, with {top_feature} carrying the largest "
            f"measured influence on this prediction. This is a research decision-support "
            f"output, not a medical diagnosis.")


def predict(values: Dict[str, Any]) -> Dict[str, Any]:
    frame = to_feature_frame(values)
    proba = _proba(frame)[0]
    class_index = int(np.argmax(proba))
    label = LABEL_ORDER[class_index]
    status = DISPLAY[label]
    confidence = round(float(proba[class_index]) * 100, 2)
    probabilities = {DISPLAY[l]: round(float(proba[i]) * 100, 2) for i, l in enumerate(LABEL_ORDER)}
    attributions, deltas = _attributions(frame, class_index, float(proba[class_index]))
    return {
        "frame": frame,
        "label": label,
        "status": status,
        "confidence": confidence,
        "probabilities": probabilities,
        "attributions": attributions,
        "deltas": deltas,
        "summary": summarize(status, confidence, attributions[0]["feature"]),
    }


def analyze(values: Dict[str, Any]) -> Dict[str, Any]:
    result = predict(values)
    frame = result["frame"]

    scores_raw = REGRESSOR.predict(frame.clip(LOWER, UPPER, axis=1))[0]
    ranges = META["severity_regressor"]["score_ranges"]
    scores = {
        "depression": round(float(np.clip(scores_raw[0], *ranges["Depression_Score"])), 2),
        "anxiety": round(float(np.clip(scores_raw[1], *ranges["Anxiety_Score"])), 2),
        "stress": round(float(np.clip(scores_raw[2], *ranges["Stress_Score"])), 2),
    }

    deltas = result["deltas"]
    total = sum(abs(v) for v in deltas.values()) or 1.0
    group_share = {group: round(sum(abs(deltas[f]) for f in features) / total * 100, 2)
                   for group, features in GROUPS.items()}

    nn_block = META["neural_network"] if SERVING == "neural_network" else META["baseline_random_forest"]
    macro_f1 = nn_block["test"]["Macro F1"]

    modalities = {
        "facial": {"label": values.get("detected_facial_emotion", "Neutral"),
                   "confidence": round(float(values.get("facial_confidence", 0.85)) * 100, 2),
                   "contribution": group_share["facial"]},
        "speech": {"label": values.get("detected_speech_emotion", "Neutral"),
                   "confidence": round(float(values.get("speech_confidence", 0.8)) * 100, 2),
                   "contribution": group_share["acoustic"]},
        "behavior": {"label": f"{group_share['behavioral']}% of influence",
                     "contribution": group_share["behavioral"]},
        "physiology": {"label": f"{group_share['physiological']}% of influence",
                       "contribution": group_share["physiological"]},
    }

    top = result["attributions"][:3]
    insights = [
        f"{top[0]['feature']} produced the largest measured change in the predicted probability for "
        f"{result['status']} when replaced with its training-set median.",
        "Feature influence is computed by occlusion on the deployed classifier, not by a hand-written rule.",
        f"Modality influence split: behavioral {group_share['behavioral']}%, facial {group_share['facial']}%, "
        f"acoustic {group_share['acoustic']}%, physiological {group_share['physiological']}%.",
        f"Served by the {SERVING.replace('_', ' ')} model (held-out macro F1 {macro_f1}); on this dataset the "
        f"numerical indicators carry weak label signal, so confidence values should be read with caution.",
        "These outputs are directional research signals and are not a clinical diagnosis.",
    ]

    return {
        "mental_health_status": result["status"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "assessment_summary": result["summary"],
        "scores": scores,
        "modalities": modalities,
        "feature_attributions": [{k: v for k, v in item.items() if k != "column"}
                                 for item in result["attributions"]],
        "insights": insights,
        "model_version": META["model_version"],
    }


def predict_response(values: Dict[str, Any]) -> Dict[str, Any]:
    """Spec-shaped /predict payload."""
    result = predict(values)
    return {
        "prediction": result["status"],
        "confidence": round(result["confidence"] / 100, 4),
        "probabilities": {name: round(value / 100, 4) for name, value in result["probabilities"].items()},
        "assessment_summary": result["summary"],
        "model": SERVING,
        "model_version": META["model_version"],
        "features_used": FEATURES,
        "disclaimer": ("Research and decision-support output only. Not a medical diagnosis and not a "
                       "substitute for evaluation by a qualified mental-health professional."),
    }


def model_info() -> Dict[str, Any]:
    return {
        "model_version": META["model_version"],
        "trained_at": META["trained_at"],
        "serving_model": SERVING,
        "primary_metric": META["primary_metric"],
        "features": FEATURES,
        "feature_groups": GROUPS,
        "label_order": [DISPLAY[l] for l in LABEL_ORDER],
        "splits": META["splits"],
        "preprocessing": META["preprocessing"],
        "baseline_random_forest": META["baseline_random_forest"],
        "neural_network": META["neural_network"],
        "model_comparison": META["model_comparison"],
        "severity_regressor": META["severity_regressor"],
        "honest_finding": META["honest_finding"],
    }


def dataset_info() -> Dict[str, Any]:
    return META["dataset_report"]


def feature_schema() -> List[Dict[str, Any]]:
    """Dataset-derived input schema so the client never hardcodes feature names."""
    report = META["dataset_report"]
    schema = []
    for group, features in GROUPS.items():
        for feature in features:
            low, high = META["feature_ranges"][feature]
            schema.append({
                "column": feature,
                "label": FRIENDLY[feature],
                "group": group,
                "type": "integer" if report["dtypes"][feature].startswith("int") else "number",
                "min": low,
                "max": high,
                "median": META["feature_medians"][feature],
                "step": 1 if report["dtypes"][feature].startswith("int") else 0.01,
            })
    return schema


def performance() -> Dict[str, Any]:
    served = META["neural_network"] if SERVING == "neural_network" else META["baseline_random_forest"]
    splits = META["splits"]
    return {
        "mode": f"{'Neural Network' if SERVING == 'neural_network' else 'Random Forest'} v{META['model_version']}",
        "algorithm": served.get("architecture") or served.get("algorithm"),
        "classification": served["test"],
        "per_class": served["per_class"],
        "confusion_matrix": served["confusion_matrix"],
        "regression": META["severity_regressor"]["overall"],
        "regression_per_target": META["severity_regressor"]["per_target"],
        "model_comparison": META["model_comparison"],
        "training_history": META["neural_network"]["history"],
        "baseline_random_forest": META["baseline_random_forest"],
        "neural_network": {k: v for k, v in META["neural_network"].items() if k != "history"},
        "class_distribution": META["dataset_report"]["class_distribution"],
        "splits": splits,
        "notice": (
            f"Objective 1 trained on the real dataset ({META['dataset_report']['n_samples']} samples, "
            f"{len(FEATURES)} numerical features, {splits['ratio']}: {splits['train']} train / "
            f"{splits['validation']} validation / {splits['test']} test). {META['honest_finding']}"
        ),
    }
