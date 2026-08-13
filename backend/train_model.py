import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             mean_absolute_error, mean_squared_error,
                             precision_score, r2_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "mental_health_multimodal.csv"
MODELS = ROOT / "models"
MODELS.mkdir(exist_ok=True)

SCORE_COLS = ["Depression_Score", "Anxiety_Score", "Stress_Score"]
LABEL_ORDER = ["Healthy", "Mild_Stress", "Moderate_Stress", "Severe_Stress"]
SENSOR_COLS = [
    "Sleep_Quality", "Social_Engagement", "Daily_App_Usage_Min", "Typing_Speed_WPM",
    "Session_Frequency", "Idle_Time_Min", "Facial_Emotion_Variance", "Eye_Blink_Rate",
    "Smile_Intensity", "Head_Motion_Index", "MFCC_Mean", "MFCC_Variance",
    "Pitch_Mean", "Speech_Rate", "Heart_Rate_BPM", "HRV_Index",
    "Skin_Temperature", "GSR_Level",
]


def main():
    df = pd.read_csv(DATA)
    X = df[SCORE_COLS]
    y = df["Mental_Health_Status"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    clf = RandomForestClassifier(n_estimators=300, class_weight="balanced",
                                 min_samples_leaf=2, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    pred = clf.predict(X_test)
    proba = clf.predict_proba(X_test)
    classification = {
        "Accuracy": round(accuracy_score(y_test, pred), 4),
        "Precision": round(precision_score(y_test, pred, average="weighted", zero_division=0), 4),
        "Recall": round(recall_score(y_test, pred, average="weighted", zero_division=0), 4),
        "F1-Score": round(f1_score(y_test, pred, average="weighted", zero_division=0), 4),
        "Macro F1": round(f1_score(y_test, pred, average="macro", zero_division=0), 4),
        "Weighted F1": round(f1_score(y_test, pred, average="weighted", zero_division=0), 4),
        "ROC-AUC": round(roc_auc_score(y_test, proba, multi_class="ovr", average="weighted"), 4),
    }
    cm = confusion_matrix(y_test, pred, labels=LABEL_ORDER).tolist()

    Xr = pd.get_dummies(y).reindex(columns=LABEL_ORDER, fill_value=0).astype(float)
    Xr_train, Xr_test, yr_train, yr_test = train_test_split(
        Xr, df[SCORE_COLS], test_size=0.2, random_state=42, stratify=y)
    reg = RandomForestRegressor(n_estimators=200, min_samples_leaf=5, random_state=42, n_jobs=-1)
    reg.fit(Xr_train, yr_train)
    rpred = reg.predict(Xr_test)
    mae = mean_absolute_error(yr_test, rpred)
    mse = mean_squared_error(yr_test, rpred)
    regression = {
        "MAE": round(mae, 3),
        "MSE": round(mse, 3),
        "RMSE": round(float(np.sqrt(mse)), 3),
        "R² Score": round(r2_score(yr_test, rpred), 4),
        "Explained Variance": round(r2_score(yr_test, rpred, multioutput="variance_weighted"), 4),
    }
    per_target = {t: {"MAE": round(mean_absolute_error(yr_test[t], rpred[:, i]), 3),
                      "R²": round(r2_score(yr_test[t], rpred[:, i]), 4)}
                  for i, t in enumerate(SCORE_COLS)}

    class_score_means = df.groupby("Mental_Health_Status")[SCORE_COLS].mean().round(3)
    sensor_ranges = {c: [float(df[c].min()), float(df[c].max())] for c in SENSOR_COLS}

    meta = {
        "model_version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "Two-stage: calibrated multimodal encoder → RandomForest classifier (300 trees, balanced) + RandomForest score regressor",
        "dataset": {"name": "mental_health_multimodal.csv", "rows": len(df),
                    "train": len(X_train), "test": len(X_test),
                    "class_counts": y.value_counts().to_dict()},
        "label_order": LABEL_ORDER,
        "classification": classification,
        "regression": regression,
        "regression_per_target": per_target,
        "confusion_matrix": cm,
        "classifier_importances": dict(zip(SCORE_COLS, np.round(clf.feature_importances_, 5).tolist())),
        "class_score_means": {k: v.to_dict() for k, v in class_score_means.iterrows()},
        "sensor_ranges": sensor_ranges,
        "score_ranges": {c: [float(df[c].min()), float(df[c].max())] for c in SCORE_COLS},
    }

    joblib.dump(clf, MODELS / "classifier.joblib", compress=3)
    joblib.dump(reg, MODELS / "regressor.joblib", compress=3)
    (MODELS / "model_meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps({"classification": classification, "regression": regression, "cm": cm}, indent=2))


if __name__ == "__main__":
    main()
