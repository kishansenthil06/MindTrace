# MINDPULSE AI — Product Requirements Document

_Last updated: 2026-08-13_

## Original Problem Statement
Build MINDPULSE AI, an explainable multimodal AI framework for mental-health assessment. The product should combine facial expressions, speech emotions, behavioral usage patterns, acoustic vocal metrics, and physiological indicators into multi-class stress classification (Healthy, Mild Stress, Moderate Stress, Severe Stress), depression/anxiety/stress score regressions, and explainable feature-attribution summaries with explicit non-diagnostic guardrails. Required product areas include an overview dashboard, six-step assessment wizard, results dashboard, explainability, model performance, assessment history, and about/disclaimer views.

## User Decisions
- Use demo-ready local deterministic analysis with realistic outputs; no external AI keys.
- Use the configured MongoDB persistence instead of the conflicting SQLite example.
- No user accounts for the first version.
- Open directly to a usable dashboard at / with navigation to all product views.

## Personas
- **Hackathon presenter:** needs a polished end-to-end demo that can be run quickly without credentials or trained models.
- **Research reviewer:** needs transparent inputs, model-derived scores, benchmark metrics, and feature attribution context.
- **Care-conscious participant:** needs clear privacy and clinical safety language, without diagnostic claims.

## Architecture Decisions
- React 19 + React Router + Recharts + lucide-react frontend stack.
- FastAPI backend with Pydantic validation and async Motor MongoDB access.
- Frontend calls only REACT_APP_BACKEND_URL; backend reads only protected MONGO_URL and DB_NAME values.
- Deterministic local scoring service in the API for demo resilience and repeatable outputs.
- Assessment summaries stored in MongoDB with _id excluded from all API responses and attribution payloads serialized safely.
- Browser-local camera/audio capture UI with graceful fallback when permissions or devices are unavailable.

## Static Core Requirements
- Overview dashboard with signal trend, latest snapshot, status, quick-start assessment, and modality pipeline.
- Six-step wizard covering facial, speech, behavioral, facial numerical, physiological, and review states.
- Demo data shortcut, validated numeric sliders/inputs, capture controls, sequenced loading overlay, and assessment submission.
- Results with classification probabilities, confidence meter, regression gauges, modality cards, and fusion diagram.
- Explainability with ranked attribution bars, natural-language insights, and non-diagnostic warning.
- Model performance with classification metrics, regression metrics, confusion matrix, and demo benchmark empty-state notice.
- History with longitudinal trend chart, assessment table, and detail modal.
- About page with academic scope and explicit clinical guardrails.
- Responsive desktop/mobile layouts and descriptive data-testid hooks for user-facing and interactive elements.

## Implemented
### 2026-08-13
- Replaced starter FastAPI status API with MINDPULSE analysis, history/detail, and performance endpoints.
- Built the complete dark signal-center UI with all requested routes and navigation.
- Added deterministic multimodal scoring for stress class, probability distribution, depression/anxiety/stress scores, modality readouts, attributions, and insights.
- Added MongoDB persistence with safe response models and explicit persistence status.
- Added six-step assessment flow, demo population, capture fallback, review matrix, loading stages, and results handoff.
- Added explainability, model benchmark, confusion matrix, history trend/table/modal, safety/about pages.
- Verified with lint, production build, live API checks, and full backend/frontend regression testing.

### 2026-06 (real ML integration)
- User uploaded dataset: `mental_health_multimodal.csv` (4000 rows, 18 sensor features + D/A/S scores + status label) and FER-style facial images (28k, training skipped per user choice).
- **Dataset finding:** status label is derived from D/A/S scores (94% predictable); the 18 sensor columns are statistically uncorrelated with labels (max corr 0.046). Pure sensors→status training capped at ~38% accuracy.
- Implemented two-stage pipeline: calibrated multimodal encoder (sensor inputs → D/A/S score estimates in dataset units) → trained RandomForest classifier (scores → status, **94.75% held-out accuracy, ROC-AUC 0.9949**) + RandomForest regressor blending class-conditional score expectations.
- Files: `/app/backend/train_model.py` (retrainable), `/app/backend/ml_service.py` (inference, XAI attributions, insights), models in `/app/backend/models/` (classifier.joblib, regressor.joblib, model_meta.json), dataset in `/app/backend/data/`.
- `/api/performance` now serves real held-out test metrics + confusion matrix; frontend badges updated to "Trained model v1.0.0".
- Tested: iteration_3 — backend 6/6 pass, frontend E2E 100%.

### 2026-06 (Objective 1 rebuilt honestly — no placeholder logic)
- User decision: train RF + Neural Net on the **real 18 sensor features only** and publish true metrics (option a), PyTorch CPU for the NN, real artifacts on the performance page, and add the spec endpoint names.
- New `/app/backend/train_objective1.py`: dataset inspection report → preprocessing (dedupe, median impute, train-fitted 1/99 percentile clipping, StandardScaler, stratified **80/10/10**) → RandomForest baseline (400 trees, balanced_subsample) → PyTorch `TabularClassifier` (18→128→ReLU→BN→Dropout→64→ReLU→Dropout→32→ReLU→4 softmax, class-weighted CE, Adam, early stopping on val macro-F1) → evaluation → RandomForestRegressor severity head (Objective 2 groundwork).
- **Measured held-out (400-sample) test results:** RF accuracy 0.3875 / macro-F1 0.2168; NN accuracy 0.3050 / macro-F1 0.2347 (best macro-F1 → NN is served); majority-class accuracy 0.4073. Severity regressor MAE 8.163, R² -0.013. Honest finding is surfaced verbatim in `/api/performance` and `/api/model-info`.
- Removed the old heuristic sensor→score encoder and the leaky scores→label classifier (`train_model.py`, old joblibs deleted). D/A/S scores are excluded from model inputs because the label is derived from them.
- Explainability is now real: per-prediction **occlusion attribution** on the deployed model (feature → train median, measured Δ predicted-class probability) plus modality influence shares.
- New endpoints: `GET /api/health`, `POST /api/predict`, `GET /api/model-info`, `GET /api/dataset-info`, `GET /api/feature-schema`; legacy `/api/assessments/*` and `/api/performance` kept for the UI.
- Model artifacts: `/app/backend/models/obj1/` (preprocessor.joblib, random_forest.joblib, neural_net.pt, severity_regressor.joblib, meta.json). torch (CPU) added to requirements.
- Tested: 9/9 backend pytest (`/app/backend/tests/test_mindpulse_api.py`) + browser E2E assessment → results → performance.

### 2026-06 (fix: "inaccurate results" — two-variant honest training, v3.0.0)
- User report: results were inaccurate. Verified RCA on the data: the 18 sensor columns have max |corr| 0.030 with the label (mutual info ≤0.017, identical class means, e.g. Sleep_Quality 2.96/3.05/3.04/2.95); an untuned Gradient Boosting cross-check also got 34%. The label is a function of the three self-report screening scores.
- User decision (option c): train and serve **both variants** on the same splits; collect the 3 scores via three sliders.
  - `sensors_only` (18 features): RF acc 0.3875 / macro-F1 0.2168; NN acc 0.3050 / macro-F1 0.2347 — reported as the multimodal baseline.
  - `full` (21 features = 3 self-report scores + 18 indicators): RF acc 0.8675 / macro-F1 0.8262; **NN acc 0.9500 / macro-F1 0.8927 → deployed**.
  - Majority-class baseline 0.4073 shown in the comparison for context.
- Assessment wizard is now 7 steps with a new "Self-report screening" step (depression 0-34, anxiety 0-24, stress 0-39 sliders). Score gauges show the participant's own scores with an explicit source line; the sensors-only regressor is only used when scores are absent.
- Results/Explainability now include the real AI assessment summary, a "Self-report influence" modality card, occlusion-based attributions over 21 features, and the sensors-only model's counter-prediction in the insights.
- Model Performance page gained a 5-row RF-vs-NN × sensors-vs-full comparison table with the deployed row highlighted; `/api/performance` also exposes label correlations, both training histories and the sensors-only baseline block.
- Tested (iteration_4): backend 10/10 pytest, frontend E2E 100% — HIGH scores → Severe Stress, LOW → Healthy, demo → Moderate Stress 70.5%. Testing agent fixed one missing destructuring in Performance().

## Prioritized Backlog
### P0 — Next tasks
- (DONE 2026-06) Replace deterministic demo scoring with a validated, versioned model trained on the user's dataset.
- Add real server-side media upload processing with explicit consent and retention controls.

### P1 — Next tasks
- Optional facial emotion model on the 28k uploaded images (user skipped for now; zip at /app/backend/data/images.zip).
- Add downloadable, redacted assessment reports for research review.
- Add configurable model versions and dataset evaluation uploads for benchmark refreshes.

### P2 — Future enhancements
- Add longitudinal comparison filters and cohort-level research dashboards.
- Refactor monolithic App.js into per-page components.
- Add clinician/researcher annotation workflows for reviewed assessments.

## Current Scope Notes
- Classification and severity regression are REAL models trained end-to-end on the dataset's 18 numerical features (v2.0.0-objective1). No heuristics, no leakage, metrics reported as measured (weak, because the dataset's sensor columns carry almost no label signal).
- Camera/audio capture remain browser-local visual aids (no server-side extraction).
- No user authentication, external AI provider, or diagnostic workflow is implemented by design.
