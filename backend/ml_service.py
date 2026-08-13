"""Inference service for Objective 1 (mental-health status classification).

Two trained variants are loaded from ./models/obj1/:
  * sensors_only : 18 numerical indicators (multimodal baseline, reported for comparison)
  * full         : those 18 indicators + the 3 self-report screening scores (deployed predictor)

Every number returned here comes from a trained artifact; there is no heuristic scoring.
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

LABEL_ORDER: List[str] = META["label_order"]
DISPLAY = {label: label.replace("_", " ") for label in LABEL_ORDER}
GROUPS: Dict[str, List[str]] = META["feature_groups"]
SCORE_COLS: List[str] = META["score_columns"]
SENSOR_FEATURES: List[str] = META["sensor_features"]
DEPLOYED_VARIANT = META["deployed"]["variant"]
DEPLOYED_MODEL = META["deployed"]["model"]
FEATURES: List[str] = META["deployed"]["features"]
MEDIANS = META["variants"][DEPLOYED_VARIANT]["feature_medians"]


def _load(variant: str):
    pre = joblib.load(ARTIFACTS / f"preprocessor_{variant}.joblib")
    net = TabularClassifier(len(pre["features"]))
    net.load_state_dict(torch.load(ARTIFACTS / f"neural_net_{variant}.pt", map_location="cpu"))
    net.eval()
    return {
        "features": pre["features"], "scaler": pre["scaler"], "lower": pre["lower"], "upper": pre["upper"],
        "random_forest": joblib.load(ARTIFACTS / f"random_forest_{variant}.joblib"),
        "neural_network": net,
        "model": META["variants"][variant]["best_model"],
    }


BUNDLES = {name: _load(name) for name in META["variants"]}
DEPLOYED = BUNDLES[DEPLOYED_VARIANT]
REGRESSOR = joblib.load(ARTIFACTS / "severity_regressor.joblib")
SENSOR_BUNDLE = BUNDLES["sensors_only"]

FRIENDLY = {
    "Depression_Score": "Depression Screening Score", "Anxiety_Score": "Anxiety Screening Score",
    "Stress_Score": "Stress Screening Score",
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

# UI field name -> (dataset column, unit converter). Unit conversion only, no scoring.
UI_MAP = {
    "depression_score": ("Depression_Score", lambda v: v),
    "anxiety_score": ("Anxiety_Score", lambda v: v),
    "stress_score": ("Stress_Score", lambda v: v),
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
COLUMN_TO_UI = {column: ui for ui, (column, _) in UI_MAP.items()}


def to_feature_frame(values: Dict[str, Any], features: List[str], medians: Dict[str, float]) -> pd.DataFrame:
    """Accepts dataset column names or UI field names; anything absent uses the training median."""
    row: Dict[str, Any] = {}
    for feature in features:
        raw = values.get(feature)
        if raw is None:
            ui_name = COLUMN_TO_UI.get(feature)
            ui_value = values.get(ui_name) if ui_name else None
            if ui_value is not None:
                raw = UI_MAP[ui_name][1](float(ui_value))
        row[feature] = float(raw) if raw is not None else float(medians[feature])
    return pd.DataFrame([row], columns=features)


def _proba(frame: pd.DataFrame, bundle: Dict[str, Any]) -> np.ndarray:
    clipped = frame.clip(bundle["lower"], bundle["upper"], axis=1)
    if bundle["model"] == "random_forest":
        rf = bundle["random_forest"]
        order = {label: i for i, label in enumerate(rf.classes_)}
        return np.array([[row[order[label]] for label in LABEL_ORDER] for row in rf.predict_proba(clipped)])
    with torch.no_grad():
        logits = bundle["neural_network"](torch.tensor(bundle["scaler"].transform(clipped), dtype=torch.float32))
        return torch.softmax(logits, dim=1).numpy()


def _attributions(frame: pd.DataFrame, class_index: int, base_prob: float):
    """Occlusion attribution: replace one feature with its training median and measure the real
    change in the deployed model's predicted-class probability."""
    features = DEPLOYED["features"]
    variants = pd.concat([frame] * len(features), ignore_index=True)
    for i, feature in enumerate(features):
        variants.at[i, feature] = MEDIANS[feature]
    probs = _proba(variants, DEPLOYED)[:, class_index]
    deltas = {feature: float(base_prob - probs[i]) for i, feature in enumerate(features)}
    scale = max(abs(v) for v in deltas.values()) or 1.0
    ranked = sorted(deltas.items(), key=lambda item: abs(item[1]), reverse=True)
    ranked_out = [{"feature": FRIENDLY[f], "column": f, "impact": round(abs(v) / scale * 100, 1),
                   "delta": round(v * 100, 2), "direction": "risk" if v >= 0 else "context"}
                  for f, v in ranked[:8]]
    return ranked_out, deltas


def predict(values: Dict[str, Any]) -> Dict[str, Any]:
    frame = to_feature_frame(values, DEPLOYED["features"], MEDIANS)
    proba = _proba(frame, DEPLOYED)[0]
    class_index = int(np.argmax(proba))
    status = DISPLAY[LABEL_ORDER[class_index]]
    confidence = round(float(proba[class_index]) * 100, 2)
    attributions, deltas = _attributions(frame, class_index, float(proba[class_index]))
    summary = (f"The model identified patterns most consistent with {status} at {confidence}% model "
               f"confidence, with {attributions[0]['feature']} carrying the largest measured influence "
               f"on this prediction. This is a research decision-support output, not a medical diagnosis.")
    return {
        "frame": frame,
        "status": status,
        "confidence": confidence,
        "probabilities": {DISPLAY[l]: round(float(proba[i]) * 100, 2) for i, l in enumerate(LABEL_ORDER)},
        "attributions": attributions,
        "deltas": deltas,
        "summary": summary,
    }


def baseline_prediction(values: Dict[str, Any]) -> Dict[str, Any]:
    """Sensors-only comparison model (same request, no self-report scores)."""
    medians = META["variants"]["sensors_only"]["feature_medians"]
    frame = to_feature_frame(values, SENSOR_BUNDLE["features"], medians)
    proba = _proba(frame, SENSOR_BUNDLE)[0]
    index = int(np.argmax(proba))
    return {
        "model": f"sensors-only {SENSOR_BUNDLE['model'].replace('_', ' ')}",
        "prediction": DISPLAY[LABEL_ORDER[index]],
        "confidence": round(float(proba[index]) * 100, 2),
        "probabilities": {DISPLAY[l]: round(float(proba[i]) * 100, 2) for i, l in enumerate(LABEL_ORDER)},
        "test_macro_f1": META["variants"]["sensors_only"][SENSOR_BUNDLE["model"]]["test"]["Macro F1"],
    }


def _severity_scores(values: Dict[str, Any], frame: pd.DataFrame) -> Dict[str, Any]:
    ranges = META["severity_regressor"]["score_ranges"]
    supplied = {}
    for column, key in zip(SCORE_COLS, ("depression", "anxiety", "stress")):
        raw = values.get(column, values.get(COLUMN_TO_UI[column]))
        if raw is not None:
            supplied[key] = round(float(np.clip(float(raw), *ranges[column])), 2)
    if len(supplied) == len(SCORE_COLS):
        return {"scores": supplied, "source": "self-report screening scores entered by the participant"}
    sensor_frame = to_feature_frame(values, SENSOR_FEATURES,
                                   META["variants"]["sensors_only"]["feature_medians"])
    predicted = REGRESSOR.predict(sensor_frame.clip(SENSOR_BUNDLE["lower"], SENSOR_BUNDLE["upper"], axis=1))[0]
    scores = {key: round(float(np.clip(predicted[i], *ranges[column])), 2)
              for i, (column, key) in enumerate(zip(SCORE_COLS, ("depression", "anxiety", "stress")))}
    return {"scores": scores, "source": "estimated by the sensors-only severity regressor (weak signal)"}


def analyze(values: Dict[str, Any]) -> Dict[str, Any]:
    result = predict(values)
    severity = _severity_scores(values, result["frame"])

    deltas = result["deltas"]
    total = sum(abs(v) for v in deltas.values()) or 1.0
    share = {group: round(sum(abs(deltas[f]) for f in cols if f in deltas) / total * 100, 2)
             for group, cols in GROUPS.items()}

    deployed_test = META["deployed"]["test"]
    baseline = baseline_prediction(values)

    modalities = {
        "facial": {"label": values.get("detected_facial_emotion", "Neutral"),
                   "confidence": round(float(values.get("facial_confidence", 0.85)) * 100, 2),
                   "contribution": share["facial"]},
        "speech": {"label": values.get("detected_speech_emotion", "Neutral"),
                   "confidence": round(float(values.get("speech_confidence", 0.8)) * 100, 2),
                   "contribution": share["acoustic"]},
        "behavior": {"label": f"{share['behavioral']}% of influence", "contribution": share["behavioral"]},
        "physiology": {"label": f"{share['physiological']}% of influence", "contribution": share["physiological"]},
        "self_report": {"label": f"{share['self_report']}% of influence", "contribution": share["self_report"]},
    }

    insights = [
        f"{result['attributions'][0]['feature']} produced the largest measured change in the predicted "
        f"probability for {result['status']} when replaced with its training-set median.",
        f"Influence split: self-report {share['self_report']}%, behavioral {share['behavioral']}%, "
        f"facial {share['facial']}%, acoustic {share['acoustic']}%, physiological {share['physiological']}%.",
        f"Deployed predictor: {DEPLOYED_MODEL.replace('_', ' ')} on {len(FEATURES)} features "
        f"(held-out accuracy {deployed_test['Accuracy']}, macro F1 {deployed_test['Macro F1']}).",
        f"The sensors-only comparison model would have predicted {baseline['prediction']} at "
        f"{baseline['confidence']}% confidence (held-out macro F1 {baseline['test_macro_f1']}) — the dataset's "
        f"sensor columns carry almost no label signal on their own.",
        f"Severity scores shown are {severity['source']}.",
        "These outputs are directional research signals and are not a clinical diagnosis.",
    ]

    return {
        "mental_health_status": result["status"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "assessment_summary": result["summary"],
        "scores": severity["scores"],
        "score_source": severity["source"],
        "modalities": modalities,
        "feature_attributions": [{k: v for k, v in item.items() if k != "column"}
                                 for item in result["attributions"]],
        "insights": insights,
        "baseline_comparison": baseline,
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
        "model": f"{DEPLOYED_VARIANT}:{DEPLOYED_MODEL}",
        "model_version": META["model_version"],
        "features_used": FEATURES,
        "baseline_comparison": baseline_prediction(values),
        "disclaimer": ("Research and decision-support output only. Not a medical diagnosis and not a "
                       "substitute for evaluation by a qualified mental-health professional."),
    }


def model_info() -> Dict[str, Any]:
    return {
        "model_version": META["model_version"],
        "trained_at": META["trained_at"],
        "deployed": {"variant": DEPLOYED_VARIANT, "model": DEPLOYED_MODEL,
                     "features": FEATURES, "test": META["deployed"]["test"]},
        "primary_metric": META["primary_metric"],
        "feature_groups": GROUPS,
        "label_order": [DISPLAY[l] for l in LABEL_ORDER],
        "splits": META["variants"][DEPLOYED_VARIANT]["splits"],
        "preprocessing": META["preprocessing"],
        "variants": {name: {k: v for k, v in variant.items() if k not in ("feature_medians", "clip_bounds")}
                     for name, variant in META["variants"].items()},
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
                "ui_field": COLUMN_TO_UI[feature],
                "label": FRIENDLY[feature],
                "group": group,
                "type": "integer" if report["dtypes"][feature].startswith("int") else "number",
                "min": low, "max": high,
                "median": META["variants"]["full"]["feature_medians"][feature],
                "step": 1 if report["dtypes"][feature].startswith("int") else 0.01,
            })
    return schema


def performance() -> Dict[str, Any]:
    variant = META["variants"][DEPLOYED_VARIANT]
    served = variant[DEPLOYED_MODEL]
    sensors = META["variants"]["sensors_only"]
    splits = variant["splits"]
    return {
        "mode": (f"{'Neural Network' if DEPLOYED_MODEL == 'neural_network' else 'Random Forest'} "
                 f"v{META['model_version']}"),
        "algorithm": served.get("architecture") or served.get("algorithm"),
        "classification": served["test"],
        "per_class": served["per_class"],
        "confusion_matrix": served["confusion_matrix"],
        "regression": META["severity_regressor"]["overall"],
        "regression_per_target": META["severity_regressor"]["per_target"],
        "model_comparison": META["model_comparison"],
        "training_history": variant["neural_network"]["history"],
        "baseline_sensors_only": {
            "best_model": sensors["best_model"],
            "test": sensors[sensors["best_model"]]["test"],
            "confusion_matrix": sensors[sensors["best_model"]]["confusion_matrix"],
            "training_history": sensors["neural_network"]["history"],
        },
        "class_distribution": META["dataset_report"]["class_distribution"],
        "label_correlation": META["dataset_report"]["label_correlation"],
        "splits": splits,
        "deployed": {"variant": DEPLOYED_VARIANT, "model": DEPLOYED_MODEL, "n_features": len(FEATURES)},
        "notice": (
            f"Trained on the real dataset ({META['dataset_report']['n_samples']} samples, {splits['ratio']}: "
            f"{splits['train']} train / {splits['validation']} validation / {splits['test']} test). "
            f"{META['honest_finding']}"
        ),
    }
