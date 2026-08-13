import json
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np

MODELS = Path(__file__).parent / "models"
CLASSIFIER = joblib.load(MODELS / "classifier.joblib")
REGRESSOR = joblib.load(MODELS / "regressor.joblib")
META = json.loads((MODELS / "model_meta.json").read_text())

LABEL_ORDER = META["label_order"]
DISPLAY = {label: label.replace("_", " ") for label in LABEL_ORDER}
SCORE_MAX = {"depression": 34.0, "anxiety": 24.0, "stress": 39.0}

RANGES = META["sensor_ranges"]

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

GROUPS = {
    "behavior": ["Sleep_Quality", "Social_Engagement", "Daily_App_Usage_Min", "Typing_Speed_WPM", "Session_Frequency", "Idle_Time_Min"],
    "facial": ["Facial_Emotion_Variance", "Eye_Blink_Rate", "Smile_Intensity", "Head_Motion_Index"],
    "speech": ["MFCC_Mean", "MFCC_Variance", "Pitch_Mean", "Speech_Rate"],
    "physiology": ["Heart_Rate_BPM", "HRV_Index", "Skin_Temperature", "GSR_Level"],
}

INVERTED = {"Sleep_Quality", "Social_Engagement", "Typing_Speed_WPM", "Smile_Intensity", "HRV_Index", "Skin_Temperature"}
U_SHAPED = {"MFCC_Mean", "Speech_Rate"}

WEIGHTS = {
    "depression": {"Sleep_Quality": 0.20, "Social_Engagement": 0.20, "Smile_Intensity": 0.16, "Idle_Time_Min": 0.10,
                   "Typing_Speed_WPM": 0.08, "Facial_Emotion_Variance": 0.06, "Speech_Rate": 0.06, "MFCC_Mean": 0.06,
                   "Head_Motion_Index": 0.04, "Daily_App_Usage_Min": 0.04},
    "anxiety": {"Heart_Rate_BPM": 0.18, "HRV_Index": 0.16, "GSR_Level": 0.16, "Eye_Blink_Rate": 0.10,
                "Pitch_Mean": 0.10, "MFCC_Variance": 0.08, "Session_Frequency": 0.08, "Skin_Temperature": 0.08,
                "Speech_Rate": 0.06},
    "stress": {"Sleep_Quality": 0.12, "Heart_Rate_BPM": 0.12, "HRV_Index": 0.10, "GSR_Level": 0.10,
               "Social_Engagement": 0.08, "Smile_Intensity": 0.08, "Daily_App_Usage_Min": 0.08, "Idle_Time_Min": 0.06,
               "MFCC_Variance": 0.06, "Pitch_Mean": 0.06, "Eye_Blink_Rate": 0.05, "Head_Motion_Index": 0.05,
               "Facial_Emotion_Variance": 0.04},
}


def _to_dataset_units(values: Dict[str, Any]) -> Dict[str, float]:
    return {
        "Sleep_Quality": values["sleep_quality"],
        "Social_Engagement": values["social_engagement"],
        "Daily_App_Usage_Min": values["daily_app_usage_min"],
        "Typing_Speed_WPM": values["typing_speed_wpm"],
        "Session_Frequency": values["session_frequency"],
        "Idle_Time_Min": values["idle_time_min"],
        "Facial_Emotion_Variance": values["facial_emotion_variance"],
        "Eye_Blink_Rate": values["eye_blink_rate"],
        "Smile_Intensity": values["smile_intensity"] / 100.0,
        "Head_Motion_Index": values["head_motion_index"] / 10.0,
        "MFCC_Mean": values["mfcc_mean"],
        "MFCC_Variance": values["mfcc_variance"],
        "Pitch_Mean": values["pitch_mean"],
        "Speech_Rate": 2.0 + min(values["speech_rate"], 300) / 300.0 * 4.0,
        "Heart_Rate_BPM": values["heart_rate_bpm"],
        "HRV_Index": values["hrv_index"],
        "Skin_Temperature": values["skin_temperature"],
        "GSR_Level": min(values["gsr_level"], 20) / 20.0 * 4.9 + 0.1,
    }


def _feature_risks(units: Dict[str, float]) -> Dict[str, float]:
    risks = {}
    for name, value in units.items():
        low, high = RANGES[name]
        t = min(max((value - low) / (high - low), 0.0), 1.0)
        if name in U_SHAPED:
            risks[name] = abs(t - 0.5) * 2.0
        elif name in INVERTED:
            risks[name] = 1.0 - t
        else:
            risks[name] = t
    return risks


def _estimate_scores(risks: Dict[str, float]) -> Dict[str, float]:
    scores = {}
    for dim, weights in WEIGHTS.items():
        risk = sum(w * risks[f] for f, w in weights.items()) / sum(weights.values())
        stretched = min(max(0.5 + (risk - 0.5) * 1.7, 0.0), 1.0)
        scores[dim] = stretched * SCORE_MAX[dim]
    return scores


def analyze(values: Dict[str, Any]) -> Dict[str, Any]:
    units = _to_dataset_units(values)
    risks = _feature_risks(units)
    est = _estimate_scores(risks)

    score_vector = np.array([[est["depression"], est["anxiety"], est["stress"]]])
    proba = CLASSIFIER.predict_proba(score_vector)[0]
    class_probs = dict(zip(CLASSIFIER.classes_, proba))
    ordered = {DISPLAY[label]: round(float(class_probs[label]) * 100, 2) for label in LABEL_ORDER}
    predicted = max(class_probs, key=class_probs.get)
    status = DISPLAY[predicted]
    confidence = round(float(class_probs[predicted]) * 100, 2)

    one_hot = np.array([[1.0 if label == predicted else 0.0 for label in LABEL_ORDER]])
    expected = REGRESSOR.predict(one_hot)[0]
    final_scores = {
        "depression": round(min(max(0.65 * est["depression"] + 0.35 * expected[0], 0), SCORE_MAX["depression"]), 2),
        "anxiety": round(min(max(0.65 * est["anxiety"] + 0.35 * expected[1], 0), SCORE_MAX["anxiety"]), 2),
        "stress": round(min(max(0.65 * est["stress"] + 0.35 * expected[2], 0), SCORE_MAX["stress"]), 2),
    }

    clf_imp = META["classifier_importances"]
    dim_weight = {"depression": clf_imp["Depression_Score"], "anxiety": clf_imp["Anxiety_Score"], "stress": clf_imp["Stress_Score"]}
    raw_attr = {}
    for dim, weights in WEIGHTS.items():
        for feature, weight in weights.items():
            raw_attr[feature] = raw_attr.get(feature, 0.0) + dim_weight[dim] * weight * risks[feature]
    top = max(raw_attr.values()) or 1.0
    attributions = [
        {"feature": FRIENDLY[feature], "impact": round(value / top * 100, 1),
         "direction": "risk" if risks[feature] >= 0.5 else "context"}
        for feature, value in sorted(raw_attr.items(), key=lambda item: item[1], reverse=True)[:8]
    ]

    group_risk = {group: sum(risks[f] for f in features) / len(features) for group, features in GROUPS.items()}

    def level(risk: float) -> str:
        return "High" if risk > 0.6 else "Moderate" if risk > 0.4 else "Low"

    modalities = {
        "facial": {"label": values.get("detected_facial_emotion", "Neutral"),
                   "confidence": round(values.get("facial_confidence", 0.85) * 100, 2),
                   "contribution": level(group_risk["facial"])},
        "speech": {"label": values.get("detected_speech_emotion", "Neutral"),
                   "confidence": round(values.get("speech_confidence", 0.8) * 100, 2),
                   "contribution": level(group_risk["speech"])},
        "behavior": {"label": level(group_risk["behavior"]), "contribution": round(group_risk["behavior"] * 100, 2)},
        "physiology": {"label": level(group_risk["physiology"]), "contribution": round(group_risk["physiology"] * 100, 2)},
    }

    insights = []
    for item in attributions[:3]:
        if item["direction"] == "risk" and item["impact"] > 45:
            insights.append(f"{item['feature']} is currently the strongest model-weighted contributor to the {status.lower()} classification.")
            break
    if risks["Sleep_Quality"] > 0.55:
        insights.append("Low sleep quality contributed significantly to the current assessment.")
    if risks["HRV_Index"] > 0.55 or risks["Heart_Rate_BPM"] > 0.55:
        insights.append("Elevated physiological arousal (heart rate / HRV) raised the anxiety estimate.")
    if risks["Social_Engagement"] > 0.55:
        insights.append("Reduced social engagement increased the estimated depression contribution.")
    if risks["Smile_Intensity"] > 0.55:
        insights.append("Low positive facial affect (smile intensity) weighted the depression score upward.")
    if not insights:
        insights.append("The current signal mix shows a relatively balanced mental-health pattern.")
    insights.append(f"Classification produced by RandomForest v{META['model_version']} trained on {META['dataset']['rows']} labeled assessments.")
    insights.append("These model-derived signals are directional indicators, not clinical diagnoses.")

    return {
        "mental_health_status": status,
        "confidence": confidence,
        "probabilities": ordered,
        "scores": final_scores,
        "modalities": modalities,
        "feature_attributions": attributions,
        "insights": insights[:5],
        "model_version": META["model_version"],
    }


def performance() -> Dict[str, Any]:
    dataset = META["dataset"]
    return {
        "mode": f"Trained model v{META['model_version']}",
        "algorithm": META["algorithm"],
        "classification": META["classification"],
        "regression": META["regression"],
        "regression_per_target": META["regression_per_target"],
        "confusion_matrix": META["confusion_matrix"],
        "notice": (
            f"RandomForest v{META['model_version']} trained on {dataset['rows']} labeled assessments "
            f"({dataset['train']} train / {dataset['test']} held-out test, stratified 80/20). "
            "All metrics below are computed on the held-out test set."
        ),
    }
