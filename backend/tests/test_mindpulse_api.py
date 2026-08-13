"""Regression tests for the MINDPULSE AI backend after the ML pipeline swap."""
import os
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

STRESSED = {
    'sleep_quality': 2, 'social_engagement': 2, 'daily_app_usage_min': 380,
    'typing_speed_wpm': 32, 'session_frequency': 15, 'idle_time_min': 140,
    'facial_emotion_variance': 0.85, 'eye_blink_rate': 28, 'smile_intensity': 15,
    'head_motion_index': 7.2, 'mfcc_mean': -8.0, 'mfcc_variance': 22.0,
    'pitch_mean': 205.0, 'speech_rate': 240, 'heart_rate_bpm': 102, 'hrv_index': 28,
    'skin_temperature': 33.2, 'gsr_level': 8.4,
}

HEALTHY = {
    'sleep_quality': 5, 'social_engagement': 5, 'daily_app_usage_min': 90,
    'typing_speed_wpm': 65, 'session_frequency': 4, 'idle_time_min': 25,
    'facial_emotion_variance': 0.25, 'eye_blink_rate': 15, 'smile_intensity': 85,
    'head_motion_index': 3.0, 'mfcc_mean': 0.0, 'mfcc_variance': 6.0,
    'pitch_mean': 150.0, 'speech_rate': 150, 'heart_rate_bpm': 65, 'hrv_index': 85,
    'skin_temperature': 36.4, 'gsr_level': 2.0,
}


def _validate_response(data):
    for key in ('id', 'timestamp', 'mental_health_status', 'confidence', 'probabilities',
                'scores', 'modalities', 'feature_attributions', 'insights', 'model_version'):
        assert key in data, f'missing key: {key}'
    assert data['model_version'] == '1.0.0'
    assert 0 <= data['confidence'] <= 100
    probs = data['probabilities']
    assert set(probs.keys()) == {'Healthy', 'Mild Stress', 'Moderate Stress', 'Severe Stress'}
    assert abs(sum(probs.values()) - 100) < 1.0
    s = data['scores']
    assert 0 <= s['depression'] <= 34 and 0 <= s['anxiety'] <= 24 and 0 <= s['stress'] <= 39
    assert isinstance(data['feature_attributions'], list) and len(data['feature_attributions']) > 0
    assert set(data['modalities']) == {'facial', 'speech', 'behavior', 'physiology'}


def test_root():
    r = requests.get(f'{BASE_URL}/api/', timeout=20)
    assert r.status_code == 200


def test_analyze_stressed_profile():
    r = requests.post(f'{BASE_URL}/api/assessments/analyze', json=STRESSED, timeout=30)
    assert r.status_code == 200
    data = r.json()
    _validate_response(data)
    assert data['mental_health_status'] in ('Moderate Stress', 'Severe Stress'), data['mental_health_status']
    assert data['confidence'] > 50


def test_analyze_healthy_profile():
    r = requests.post(f'{BASE_URL}/api/assessments/analyze', json=HEALTHY, timeout=30)
    assert r.status_code == 200
    data = r.json()
    _validate_response(data)
    assert data['mental_health_status'] == 'Healthy', data['mental_health_status']
    assert data['scores']['stress'] < 20


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


def test_performance_trained_model():
    r = requests.get(f'{BASE_URL}/api/performance', timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body['mode'] == 'Trained model v1.0.0'
    assert body['classification']['Accuracy'] == 0.9475
    assert body['classification']['ROC-AUC'] == 0.9949
    cm = body['confusion_matrix']
    assert len(cm) == 4 and all(len(row) == 4 for row in cm)
    assert all(isinstance(v, int) for row in cm for v in row)
    assert 'held-out test set' in body['notice']
    assert 'regression' in body and 'regression_per_target' in body
