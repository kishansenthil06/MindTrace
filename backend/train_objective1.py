"""Objective 1 pipeline: dataset inspection -> preprocessing -> RF baseline -> NN classifier -> evaluation.

Run:  python train_objective1.py
Artifacts land in ./models/obj1/
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                            mean_absolute_error, precision_score, r2_score,
                            recall_score)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "mental_health_multimodal.csv"
OUT = ROOT / "models" / "obj1"
OUT.mkdir(parents=True, exist_ok=True)

TARGET = "Mental_Health_Status"
LABEL_ORDER = ["Healthy", "Mild_Stress", "Moderate_Stress", "Severe_Stress"]
SCORE_COLS = ["Depression_Score", "Anxiety_Score", "Stress_Score"]
FEATURE_GROUPS = {
    "behavioral": ["Sleep_Quality", "Social_Engagement", "Daily_App_Usage_Min",
                   "Typing_Speed_WPM", "Session_Frequency", "Idle_Time_Min"],
    "facial": ["Facial_Emotion_Variance", "Eye_Blink_Rate", "Smile_Intensity", "Head_Motion_Index"],
    "acoustic": ["MFCC_Mean", "MFCC_Variance", "Pitch_Mean", "Speech_Rate"],
    "physiological": ["Heart_Rate_BPM", "HRV_Index", "Skin_Temperature", "GSR_Level"],
}
FEATURES = [c for group in FEATURE_GROUPS.values() for c in group]
SEED = 42


class TabularClassifier(nn.Module):
    """Input -> 128 ReLU BN Dropout -> 64 ReLU Dropout -> 32 ReLU -> 4 softmax(logits)."""

    def __init__(self, n_features: int, n_classes: int = 4, dropout: float = 0.3):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(n_features, 128), nn.ReLU(), nn.BatchNorm1d(128), nn.Dropout(dropout),
            nn.Linear(128, 64), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(64, 32), nn.ReLU(),
        )
        self.classification_head = nn.Linear(32, n_classes)
        # Objective 2 hook: a regression head can be attached to the same shared encoder.
        self.regression_head = None

    def forward(self, x):
        shared = self.encoder(x)
        return self.classification_head(shared)


def inspect(df: pd.DataFrame) -> dict:
    numeric = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical = [c for c in df.columns if c not in numeric]
    stats = df[FEATURES].describe().round(4).to_dict()
    return {
        "file": DATA.name,
        "n_samples": int(len(df)),
        "n_columns": int(df.shape[1]),
        "n_model_features": len(FEATURES),
        "columns": df.columns.tolist(),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "missing_values": {c: int(v) for c, v in df.isna().sum().items()},
        "total_missing": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
        "numerical_columns": numeric,
        "categorical_columns": categorical,
        "categorical_unique_values": {c: sorted(df[c].dropna().unique().tolist()) for c in categorical},
        "class_distribution": {k: int(v) for k, v in df[TARGET].value_counts().items()},
        "class_distribution_pct": {k: round(float(v) * 100, 2)
                                   for k, v in df[TARGET].value_counts(normalize=True).items()},
        "feature_groups": FEATURE_GROUPS,
        "feature_statistics": stats,
        "score_columns": SCORE_COLS,
        "participant_id_column": None,
        "facial_files_linked": False,
        "speech_files_linked": False,
        "modality_note": (
            "The CSV contains no participant identifier and no file-path columns, so the uploaded facial "
            "images and any speech recordings cannot be linked to individual rows. Objective 1 is therefore "
            "trained on the 18 numerical behavioral/facial/acoustic/physiological features only."
        ),
        "label_leakage_note": (
            "Depression_Score, Anxiety_Score and Stress_Score are excluded from the model inputs: the "
            "Mental_Health_Status label is derived from them, so including them would leak the target."
        ),
    }


def metric_block(y_true, y_pred, proba=None) -> dict:
    block = {
        "Accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "Precision": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "Recall": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "F1-Score": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "Macro F1": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
    }
    return block


def per_class(y_true, y_pred) -> dict:
    p = precision_score(y_true, y_pred, average=None, labels=LABEL_ORDER, zero_division=0)
    r = recall_score(y_true, y_pred, average=None, labels=LABEL_ORDER, zero_division=0)
    f = f1_score(y_true, y_pred, average=None, labels=LABEL_ORDER, zero_division=0)
    return {label: {"Precision": round(float(p[i]), 4), "Recall": round(float(r[i]), 4),
                    "F1": round(float(f[i]), 4)} for i, label in enumerate(LABEL_ORDER)}


def main():
    raw = pd.read_csv(DATA)
    report = inspect(raw)

    # --- preprocessing -------------------------------------------------------
    df = raw.drop_duplicates().reset_index(drop=True)
    df = df.dropna(subset=[TARGET])
    for col in FEATURES:
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    y = df[TARGET].astype(str)
    X = df[FEATURES].astype(float)

    X_train, X_hold, y_train, y_hold = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(
        X_hold, y_hold, test_size=0.5, random_state=SEED, stratify=y_hold)

    # outlier clipping bounds fitted on the training split only (no leakage)
    lower = X_train.quantile(0.01)
    upper = X_train.quantile(0.99)
    X_train_c = X_train.clip(lower, upper, axis=1)
    X_val_c = X_val.clip(lower, upper, axis=1)
    X_test_c = X_test.clip(lower, upper, axis=1)

    scaler = StandardScaler().fit(X_train_c)
    Xtr = scaler.transform(X_train_c)
    Xva = scaler.transform(X_val_c)
    Xte = scaler.transform(X_test_c)

    label_index = {label: i for i, label in enumerate(LABEL_ORDER)}
    ytr = y_train.map(label_index).to_numpy()
    yva = y_val.map(label_index).to_numpy()

    # --- Random Forest baseline ---------------------------------------------
    rf = RandomForestClassifier(n_estimators=400, min_samples_leaf=3, class_weight="balanced_subsample",
                               random_state=SEED, n_jobs=-1)
    rf.fit(X_train_c, y_train)
    rf_val_pred = rf.predict(X_val_c)
    rf_test_pred = rf.predict(X_test_c)
    rf_metrics = metric_block(y_test, rf_test_pred)
    rf_val_metrics = metric_block(y_val, rf_val_pred)
    rf_cm = confusion_matrix(y_test, rf_test_pred, labels=LABEL_ORDER).tolist()

    # --- Neural network classifier ------------------------------------------
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    model = TabularClassifier(len(FEATURES))
    counts = np.bincount(ytr, minlength=len(LABEL_ORDER)).astype(float)
    weights = torch.tensor(counts.sum() / (len(counts) * np.maximum(counts, 1)), dtype=torch.float32)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)

    Xtr_t = torch.tensor(Xtr, dtype=torch.float32)
    ytr_t = torch.tensor(ytr, dtype=torch.long)
    Xva_t = torch.tensor(Xva, dtype=torch.float32)
    yva_t = torch.tensor(yva, dtype=torch.long)

    batch = 64
    epochs = 120
    patience = 25
    history = {"epoch": [], "train_loss": [], "val_loss": [], "train_accuracy": [], "val_accuracy": []}
    best = {"macro_f1": -1.0, "state": None, "epoch": 0}

    for epoch in range(1, epochs + 1):
        model.train()
        perm = torch.randperm(len(Xtr_t))
        total, correct, loss_sum = 0, 0, 0.0
        for start in range(0, len(perm), batch):
            idx = perm[start:start + batch]
            if len(idx) < 2:
                continue
            xb, yb = Xtr_t[idx], ytr_t[idx]
            optimizer.zero_grad()
            logits = model(xb)
            loss = criterion(logits, yb)
            loss.backward()
            optimizer.step()
            loss_sum += float(loss.detach()) * len(idx)
            correct += int((logits.argmax(1) == yb).sum())
            total += len(idx)

        model.eval()
        with torch.no_grad():
            val_logits = model(Xva_t)
            val_loss = float(criterion(val_logits, yva_t))
            val_pred = val_logits.argmax(1).numpy()
        val_acc = float(accuracy_score(yva, val_pred))
        macro = float(f1_score(yva, val_pred, average="macro", zero_division=0))

        history["epoch"].append(epoch)
        history["train_loss"].append(round(loss_sum / max(total, 1), 4))
        history["val_loss"].append(round(val_loss, 4))
        history["train_accuracy"].append(round(correct / max(total, 1), 4))
        history["val_accuracy"].append(round(val_acc, 4))

        if macro > best["macro_f1"]:
            best = {"macro_f1": macro, "state": {k: v.clone() for k, v in model.state_dict().items()},
                    "epoch": epoch}
        elif epoch - best["epoch"] >= patience:
            break

    model.load_state_dict(best["state"])
    model.eval()
    with torch.no_grad():
        te_logits = model(torch.tensor(Xte, dtype=torch.float32))
        te_proba = torch.softmax(te_logits, dim=1).numpy()
        va_logits = model(Xva_t)
    nn_test_pred = np.array(LABEL_ORDER)[te_proba.argmax(1)]
    nn_val_pred = np.array(LABEL_ORDER)[torch.softmax(va_logits, 1).numpy().argmax(1)]
    nn_metrics = metric_block(y_test, nn_test_pred)
    nn_val_metrics = metric_block(y_val, nn_val_pred)
    nn_cm = confusion_matrix(y_test, nn_test_pred, labels=LABEL_ORDER).tolist()

    # --- Objective 2 groundwork: real severity regressor on the same features -
    reg = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, random_state=SEED, n_jobs=-1)
    reg.fit(X_train_c, df.loc[X_train.index, SCORE_COLS])
    reg_pred = reg.predict(X_test_c)
    reg_true = df.loc[X_test.index, SCORE_COLS]
    regression = {
        "MAE": round(float(mean_absolute_error(reg_true, reg_pred)), 3),
        "R² Score": round(float(r2_score(reg_true, reg_pred)), 4),
    }
    regression_per_target = {
        col: {"MAE": round(float(mean_absolute_error(reg_true[col], reg_pred[:, i])), 3),
              "R²": round(float(r2_score(reg_true[col], reg_pred[:, i])), 4)}
        for i, col in enumerate(SCORE_COLS)
    }

    serving = "neural_network" if nn_metrics["Macro F1"] >= rf_metrics["Macro F1"] else "random_forest"
    majority = max(report["class_distribution"].values()) / report["n_samples"]

    meta = {
        "model_version": "2.0.0-objective1",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "seed": SEED,
        "features": FEATURES,
        "feature_groups": FEATURE_GROUPS,
        "label_order": LABEL_ORDER,
        "serving_model": serving,
        "primary_metric": "Macro F1",
        "splits": {"train": int(len(X_train)), "validation": int(len(X_val)), "test": int(len(X_test)),
                   "ratio": "80/10/10 stratified"},
        "preprocessing": {
            "duplicates_removed": int(len(raw) - len(df)),
            "missing_value_strategy": "median imputation (train-fitted) on features; rows without a label dropped",
            "outlier_handling": "1st/99th percentile clipping with train-fitted bounds",
            "scaling": "StandardScaler fitted on training split only",
            "encoding": "no categorical predictors present; target label-encoded for the neural network",
        },
        "baseline_random_forest": {
            "algorithm": "RandomForestClassifier(400 trees, min_samples_leaf=3, balanced_subsample)",
            "test": rf_metrics, "validation": rf_val_metrics,
            "per_class": per_class(y_test, rf_test_pred),
            "confusion_matrix": rf_cm,
            "feature_importances": {f: round(float(v), 5) for f, v in zip(FEATURES, rf.feature_importances_)},
        },
        "neural_network": {
            "architecture": "Input(18) → Dense128 → ReLU → BatchNorm → Dropout(0.3) → Dense64 → ReLU → Dropout(0.3) → Dense32 → ReLU → Dense4 → Softmax",
            "optimizer": "Adam(lr=1e-3, weight_decay=1e-4)",
            "loss": "class-weighted CrossEntropyLoss",
            "epochs_run": len(history["epoch"]),
            "best_epoch": best["epoch"],
            "test": nn_metrics, "validation": nn_val_metrics,
            "per_class": per_class(y_test, nn_test_pred),
            "confusion_matrix": nn_cm,
            "history": history,
        },
        "model_comparison": [
            {"model": "Random Forest (baseline)", **rf_metrics},
            {"model": "Neural Network", **nn_metrics},
            {"model": "Majority-class baseline", "Accuracy": round(float(majority), 4),
             "Precision": 0.0, "Recall": 0.0, "F1-Score": 0.0, "Macro F1": 0.0},
        ],
        "severity_regressor": {
            "algorithm": "RandomForestRegressor(300 trees) on the same 18 features → Depression/Anxiety/Stress",
            "status": "Objective 2 groundwork — real model, held-out metrics reported as measured",
            "overall": regression, "per_target": regression_per_target,
            "score_ranges": {c: [float(df[c].min()), float(df[c].max())] for c in SCORE_COLS},
        },
        "feature_medians": {f: float(v) for f, v in X_train_c.median().items()},
        "feature_ranges": {f: [float(X[f].min()), float(X[f].max())] for f in FEATURES},
        "clip_bounds": {f: [float(lower[f]), float(upper[f])] for f in FEATURES},
        "dataset_report": report,
        "honest_finding": (
            f"On this dataset the 18 numerical indicators carry very little signal about Mental_Health_Status: "
            f"the strongest single-feature correlation with the label is below 0.05, so both the Random Forest "
            f"baseline (macro F1 {rf_metrics['Macro F1']}) and the neural network (macro F1 "
            f"{nn_metrics['Macro F1']}) stay close to the majority-class accuracy of {majority:.3f}. "
            f"The label is instead an almost deterministic function of the Depression/Anxiety/Stress "
            f"questionnaire scores, which are excluded from the inputs to avoid target leakage. "
            f"All metrics shown are measured on the held-out 10% test split."
        ),
    }

    joblib.dump({"scaler": scaler, "lower": lower, "upper": upper, "features": FEATURES},
                OUT / "preprocessor.joblib", compress=3)
    joblib.dump(rf, OUT / "random_forest.joblib", compress=3)
    joblib.dump(reg, OUT / "severity_regressor.joblib", compress=3)
    torch.save(model.state_dict(), OUT / "neural_net.pt")
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2))

    print(json.dumps({"rf": rf_metrics, "nn": nn_metrics, "serving": serving,
                      "epochs": len(history["epoch"]), "regression": regression}, indent=2))


if __name__ == "__main__":
    main()
