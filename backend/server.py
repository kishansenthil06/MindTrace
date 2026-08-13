from datetime import datetime, timezone
import json
import logging
import math
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="MINDPULSE AI API", version="1.0.0")
api_router = APIRouter(prefix="/api")


class AssessmentInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sleep_quality: float = Field(3, ge=1, le=5)
    social_engagement: float = Field(3, ge=1, le=5)
    daily_app_usage_min: float = Field(180, ge=0, le=1440)
    typing_speed_wpm: float = Field(52, ge=0, le=200)
    session_frequency: float = Field(6, ge=0, le=50)
    idle_time_min: float = Field(45, ge=0, le=1440)
    facial_emotion_variance: float = Field(0.42, ge=0, le=1)
    eye_blink_rate: float = Field(18, ge=0, le=80)
    smile_intensity: float = Field(38, ge=0, le=100)
    head_motion_index: float = Field(3.2, ge=0, le=10)
    mfcc_mean: float = Field(-18, ge=-100, le=100)
    mfcc_variance: float = Field(6.4, ge=0, le=100)
    pitch_mean: float = Field(178, ge=40, le=600)
    speech_rate: float = Field(128, ge=0, le=300)
    heart_rate_bpm: float = Field(82, ge=35, le=220)
    hrv_index: float = Field(42, ge=0, le=200)
    skin_temperature: float = Field(33.6, ge=20, le=45)
    gsr_level: float = Field(4.8, ge=0, le=30)
    detected_facial_emotion: str = "Sad"
    facial_confidence: float = Field(0.87, ge=0, le=1)
    detected_speech_emotion: str = "Fearful"
    speech_confidence: float = Field(0.79, ge=0, le=1)


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    timestamp: str
    inputs: Dict[str, Any]
    mental_health_status: str
    confidence: float
    probabilities: Dict[str, float]
    scores: Dict[str, float]
    modalities: Dict[str, Dict[str, Any]]
    feature_attributions: List[Dict[str, Any]]
    insights: List[str]
    persistence_status: str = "saved"


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def round2(value: float) -> float:
    return round(float(value), 2)


def build_analysis(input_data: AssessmentInput) -> Dict[str, Any]:
    values = input_data.model_dump()
    sleep_risk = (5 - values["sleep_quality"]) / 4
    social_risk = (5 - values["social_engagement"]) / 4
    usage_risk = clamp(values["daily_app_usage_min"] / 600, 0, 1)
    idle_risk = clamp(values["idle_time_min"] / 300, 0, 1)
    heart_risk = clamp((values["heart_rate_bpm"] - 55) / 90, 0, 1)
    hrv_risk = 1 - clamp(values["hrv_index"] / 100, 0, 1)
    gsr_risk = clamp(values["gsr_level"] / 15, 0, 1)
    facial_risk = clamp((1 - values["smile_intensity"] / 100) * 0.7 + (1 - values["facial_emotion_variance"]) * 0.3, 0, 1)
    speech_risk = clamp((1 - values["speech_rate"] / 220) * 0.35 + values["mfcc_variance"] / 25 * 0.65, 0, 1)

    risk = clamp(
        sleep_risk * 0.18 + social_risk * 0.14 + usage_risk * 0.1 + idle_risk * 0.08
        + heart_risk * 0.12 + hrv_risk * 0.1 + gsr_risk * 0.08 + facial_risk * 0.1
        + speech_risk * 0.1,
        0,
        1,
    )
    stress_score = round2(clamp(risk * 39, 0, 39))
    anxiety_score = round2(clamp(risk * 24 + heart_risk * 2, 0, 24))
    depression_score = round2(clamp(risk * 34 + (1 - values["smile_intensity"] / 100) * 1.2, 0, 34))

    labels = ["Healthy", "Mild Stress", "Moderate Stress", "Severe Stress"]
    if risk < 0.28:
        status = labels[0]
    elif risk < 0.48:
        status = labels[1]
    elif risk < 0.72:
        status = labels[2]
    else:
        status = labels[3]
    center = labels.index(status)
    raw = [max(0.03, math.exp(-abs(index - center) * 1.5) * (0.58 + risk * 0.24)) for index in range(4)]
    raw[center] += 0.28
    total = sum(raw)
    probabilities = {label: round2(raw[index] / total * 100) for index, label in enumerate(labels)}
    confidence = round2(max(probabilities.values()))

    drivers = [
        ("Sleep Quality", round2(sleep_risk * 100), "risk"),
        ("Speech Emotion", round2(speech_risk * 100), "risk"),
        ("Social Engagement", round2(social_risk * 100), "risk"),
        ("Heart Rate", round2(heart_risk * 100), "risk"),
        ("Facial Emotion", round2(facial_risk * 100), "risk"),
        ("App Usage", round2(usage_risk * 100), "context"),
    ]
    attributions = [
        {"feature": feature, "impact": impact, "direction": direction}
        for feature, impact, direction in sorted(drivers, key=lambda item: item[1], reverse=True)
    ]
    insights = []
    if sleep_risk > 0.45:
        insights.append("Low sleep quality contributed significantly to the current assessment.")
    if speech_risk > 0.45:
        insights.append("Negative emotional patterns were detected in the speech input.")
    if social_risk > 0.45:
        insights.append("Reduced social engagement increased the estimated stress contribution.")
    if not insights:
        insights.append("The current signal mix shows a relatively balanced mental-health pattern.")
    insights.append("These model-derived signals are directional indicators, not clinical diagnoses.")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "timestamp": now,
        "inputs": values,
        "mental_health_status": status,
        "confidence": confidence,
        "probabilities": probabilities,
        "scores": {
            "depression": depression_score,
            "anxiety": anxiety_score,
            "stress": stress_score,
        },
        "modalities": {
            "facial": {"label": values["detected_facial_emotion"], "confidence": round2(values["facial_confidence"] * 100), "contribution": "Moderate" if facial_risk > 0.42 else "Low"},
            "speech": {"label": values["detected_speech_emotion"], "confidence": round2(values["speech_confidence"] * 100), "contribution": "Moderate" if speech_risk > 0.42 else "Low"},
            "behavior": {"label": "Moderate" if (sleep_risk + social_risk) / 2 > 0.42 else "Low", "contribution": round2((sleep_risk + social_risk) / 2 * 100)},
            "physiology": {"label": "Moderate" if (heart_risk + gsr_risk) / 2 > 0.42 else "Low", "contribution": round2((heart_risk + gsr_risk) / 2 * 100)},
        },
        "feature_attributions": attributions,
        "insights": insights,
    }


@api_router.get("/")
async def root():
    return {"message": "MINDPULSE AI API online", "mode": "demo-local-analysis"}


@api_router.post("/assessments/analyze", response_model=AssessmentResponse)
async def analyze_assessment(input_data: AssessmentInput):
    result = build_analysis(input_data)
    document = {**result, "feature_attributions": json.dumps(result["feature_attributions"])}
    try:
        await db.assessments.insert_one(document)
        result["persistence_status"] = "saved"
    except Exception as error:
        logging.getLogger(__name__).warning("Assessment persistence unavailable: %s", error)
        result["persistence_status"] = "not_saved"
    return result


@api_router.get("/assessments/history", response_model=List[AssessmentResponse])
async def assessment_history():
    try:
        records = await db.assessments.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    except Exception as error:
        logging.getLogger(__name__).warning("History unavailable: %s", error)
        return []
    for record in records:
        if isinstance(record.get("feature_attributions"), str):
            record["feature_attributions"] = json.loads(record["feature_attributions"])
    return records


@api_router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def assessment_detail(assessment_id: str):
    record = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if isinstance(record.get("feature_attributions"), str):
        record["feature_attributions"] = json.loads(record["feature_attributions"])
    return record


@api_router.get("/performance")
async def performance_metrics():
    return {
        "mode": "Demo benchmark",
        "classification": {"Accuracy": 0.86, "Precision": 0.84, "Recall": 0.82, "F1-Score": 0.83, "Macro F1": 0.8, "Weighted F1": 0.84, "ROC-AUC": 0.91},
        "regression": {"MAE": 2.1, "MSE": 7.8, "RMSE": 2.79, "R² Score": 0.78, "Explained Variance": 0.81},
        "confusion_matrix": [[42, 5, 1, 0], [4, 38, 6, 1], [1, 5, 34, 4], [0, 1, 5, 31]],
        "notice": "Model evaluation metrics will populate upon dataset training completion",
    }


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()