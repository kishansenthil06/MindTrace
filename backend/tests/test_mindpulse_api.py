"""Regression tests for the MINDPULSE AI backend (Objective 1: real sensor-feature classifier)."""
import os
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
CLASSES = {'Healthy', 'Mild Stress', 'Moderate Stress', 'Severe Stress'}

STRESSED = {
    'depression_score': 30, 'anxiety_score': 20, 'stress_score': 34,
    'sleep_quality': 2, 'social_engagement': 2, 'daily_app_usage_min': 380,
    'typing_speed_wpm': 32, 'session_frequency': 15, 'idle_time_min': 140,
    'facial_emotion_variance': 0.85, 'eye_blink_rate': 28, 'smile_intensity': 15,
    'head_motion_index': 7.2, 'mfcc_mean': -8.0, 'mfcc_variance': 22.0,
    'pitch_mean': 205.0, 'speech_rate': 240, 'heart_rate_bpm': 102, 'hrv_index': 28,
    'skin_temperature': 33.2, 'gsr_level': 8.4,
}

HEALTHY = {
    'depression_score': 4, 'anxiety_score': 3, 'stress_score': 5,
    'sleep_quality': 5, 'social_engagement': 5, 'daily_app_usage_min': 90,
    'typing_speed_wpm': 65, 'session_frequency': 4, 'idle_time_min': 25,
    'facial_emotion_variance': 0.25, 'eye_blink_rate': 15, 'smile_intensity': 85,
    'head_motion_index': 3.0, 'mfcc_mean': 0.0, 'mfcc_variance': 6.0,
    'pitch_mean': 150.0, 'speech_rate': 150, 'heart_rate_bpm': 65, 'hrv_index': 85,
    'skin_temperature': 36.4, 'gsr_level': 2.0,
}


def _validate_response(data):
    for key in ('id', 'timestamp', 'mental_health_status', 'confidence', 'probabilities',
                'scores', 'modalities', 'feature_attributions', 'insights',
                'assessment_summary', 'model_version'):
        assert key in data, f'missing key: {key}'
    assert data['model_version'].startswith('3.')
    assert 0 <= data['confidence'] <= 100
    probs = data['probabilities']
    assert set(probs.keys()) == CLASSES
    assert abs(sum(probs.values()) - 100) < 1.0
    assert data['mental_health_status'] in CLASSES
    assert max(probs, key=probs.get) == data['mental_health_status']
    s = data['scores']
    assert 0 <= s['depression'] <= 34 and 0 <= s['anxiety'] <= 24 and 0 <= s['stress'] <= 39
    assert isinstance(data['feature_attributions'], list) and len(data['feature_attributions']) == 8
    assert set(data['modalities']) == {'facial', 'speech', 'behavior', 'physiology', 'self_report'}


def test_root():
    r = requests.get(f'{BASE_URL}/api/', timeout=20)
    assert r.status_code == 200


def test_health():
    body = requests.get(f'{BASE_URL}/api/health', timeout=20).json()
    assert body['status'] == 'ok'
    assert body['model_loaded'] is True
    assert body['serving_model'] in ('full:neural_network', 'full:random_forest')


def test_analyze_matches_self_report_severity():
    high = requests.post(f'{BASE_URL}/api/assessments/analyze', json=STRESSED, timeout=30).json()
    low = requests.post(f'{BASE_URL}/api/assessments/analyze', json=HEALTHY, timeout=30).json()
    _validate_response(high)
    _validate_response(low)
    assert high['mental_health_status'] in ('Moderate Stress', 'Severe Stress'), high['mental_health_status']
    assert high['confidence'] > 60
    assert low['mental_health_status'] == 'Healthy', low['mental_health_status']
    assert low['confidence'] > 60
    assert high['scores'] == {'depression': 30.0, 'anxiety': 20.0, 'stress': 34.0}
    assert 'self-report' in high['score_source']
    assert high['baseline_comparison']['prediction'] in CLASSES
    assert high['modalities']['self_report']['contribution'] > 50


def test_analyze_profiles_are_deterministic_and_distinct():
    a = requests.post(f'{BASE_URL}/api/assessments/analyze', json=STRESSED, timeout=30)
    b = requests.post(f'{BASE_URL}/api/assessments/analyze', json=HEALTHY, timeout=30)
    assert a.status_code == 200 and b.status_code == 200
    _validate_response(a.json())
    _validate_response(b.json())
    # same model, different inputs -> different probability vectors
    assert a.json()['probabilities'] != b.json()['probabilities']
    repeat = requests.post(f'{BASE_URL}/api/assessments/analyze', json=STRESSED, timeout=30).json()
    assert repeat['probabilities'] == a.json()['probabilities']


def test_predict_endpoint_accepts_dataset_columns():
    payload = {'Sleep_Quality': 2, 'Heart_Rate_BPM': 110, 'HRV_Index': 22, 'GSR_Level': 4.2}
    body = requests.post(f'{BASE_URL}/api/predict', json=payload, timeout=30).json()
    assert body['prediction'] in CLASSES
    assert 0 <= body['confidence'] <= 1
    assert set(body['probabilities']) == CLASSES
    assert abs(sum(body['probabilities'].values()) - 1) < 0.01
    assert len(body['features_used']) == 21
    assert body['baseline_comparison']['prediction'] in CLASSES
    assert 'not a medical diagnosis' in body['disclaimer'].lower()


def test_dataset_info_matches_real_csv():
    body = requests.get(f'{BASE_URL}/api/dataset-info', timeout=20).json()
    assert body['n_samples'] == 4000
    assert body['duplicate_rows'] == 0
    assert body['total_missing'] == 0
    assert set(body['class_distribution']) == {'Healthy', 'Mild_Stress', 'Moderate_Stress', 'Severe_Stress'}
    assert body['n_model_features'] == 21
    assert len(body['feature_statistics']) == 21
    assert max(v for k, v in body['label_correlation'].items() if not k.endswith('_Score')) < 0.05


def test_model_info_reports_both_models():
    body = requests.get(f'{BASE_URL}/api/model-info', timeout=20).json()
    assert body['primary_metric'] == 'Macro F1'
    assert body['splits'] == {'train': 3200, 'validation': 400, 'test': 400, 'ratio': '80/10/10 stratified'}
    for variant in ('sensors_only', 'full'):
        for block in ('random_forest', 'neural_network'):
            assert 'Macro F1' in body['variants'][variant][block]['test']
            assert len(body['variants'][variant][block]['confusion_matrix']) == 4
        hist = body['variants'][variant]['neural_network']['history']
        assert len(hist['epoch']) == len(hist['train_loss']) == len(hist['val_accuracy']) > 5
    assert len(body['model_comparison']) == 5
    assert body['deployed']['variant'] == 'full'
    assert body['deployed']['test']['Accuracy'] > 0.8
    sensors = body['variants']['sensors_only']
    assert sensors[sensors['best_model']]['test']['Accuracy'] < 0.5


def test_history_and_detail_persistence():
    r = requests.post(f'{BASE_URL}/api/assessments/analyze', json=STRESSED, timeout=30)
    assert r.status_code == 200
    created = r.json()
    history = requests.get(f'{BASE_URL}/api/assessments/history', timeout=20).json()
    match = next((x for x in history if x['id'] == created['id']), None)
    assert match is not None
    assert isinstance(match['feature_attributions'], list) and len(match['feature_attributions']) > 0
    detail = requests.get(f"{BASE_URL}/api/assessments/{created['id']}", timeout=20).json()
    assert detail['id'] == created['id']


def test_validation_error():
    bad = requests.post(f'{BASE_URL}/api/assessments/analyze', json={'sleep_quality': 99}, timeout=20)
    assert bad.status_code == 422


def test_performance_serves_real_metrics():
    r = requests.get(f'{BASE_URL}/api/performance', timeout=20)
    assert r.status_code == 200
    body = r.json()
    metrics = body['classification']
    assert set(metrics) == {'Accuracy', 'Precision', 'Recall', 'F1-Score', 'Macro F1'}
    assert all(0 <= v <= 1 for v in metrics.values())
    cm = body['confusion_matrix']
    assert len(cm) == 4 and all(len(row) == 4 for row in cm)
    assert sum(v for row in cm for v in row) == 400
    assert 'held-out' in body['notice'] or 'test split' in body['notice']
    assert 'regression' in body and 'regression_per_target' in body
    assert len(body['model_comparison']) == 5
    assert body['classification']['Accuracy'] > 0.8
    assert body['baseline_sensors_only']['test']['Accuracy'] < 0.5
