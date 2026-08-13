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

## Prioritized Backlog
### P0 — Next tasks
- Replace deterministic demo scoring with a validated, versioned model trained on an approved dataset.
- Add real server-side media upload processing with explicit consent and retention controls.
- Add automated model/data drift monitoring and audit logging before any clinical research use.

### P1 — Next tasks
- Add optional participant/session accounts with consent records and access controls.
- Add downloadable, redacted assessment reports for research review.
- Add configurable model versions and dataset evaluation uploads for benchmark refreshes.

### P2 — Future enhancements
- Add longitudinal comparison filters and cohort-level research dashboards.
- Add localization and accessibility review for clinical/research contexts.
- Add clinician/researcher annotation workflows for reviewed assessments.

## Current Scope Notes
- **MOCKED:** local deterministic analysis, benchmark metrics, and browser-local camera/audio fallback are intentional hackathon behavior.
- No user authentication, external AI provider, or diagnostic workflow is implemented by design.
