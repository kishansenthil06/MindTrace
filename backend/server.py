from datetime import datetime, timezone
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

import ml_service

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
    model_version: Optional[str] = None
    persistence_status: str = "saved"


def build_analysis(input_data: AssessmentInput) -> Dict[str, Any]:
    values = input_data.model_dump()
    result = ml_service.analyze(values)
    result["id"] = str(uuid.uuid4())
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    result["inputs"] = values
    return result


@api_router.get("/")
async def root():
    return {"message": "MINDPULSE AI API online", "mode": "trained-model-v1.0.0"}


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
    return ml_service.performance()


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