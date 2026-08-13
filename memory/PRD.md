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
- Classification/regression are REAL trained models (RandomForest v1.0.0) on the user's dataset; stage-1 sensor→score encoding is a calibrated heuristic because the dataset's sensor columns carry no label signal.
- Camera/audio capture remain browser-local visual aids (no server-side extraction).
- No user authentication, external AI provider, or diagnostic workflow is implemented by design.
