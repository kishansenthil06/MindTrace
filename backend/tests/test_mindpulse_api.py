import os, requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL') or 'https://stress-assessment.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')


def test_api_contract_and_persistence():
    root = requests.get(f'{BASE_URL}/api/', timeout=20)
    assert root.status_code == 200 and root.json()['mode'] == 'demo-local-analysis'
    payload = {'sleep_quality': 2, 'social_engagement': 2, 'heart_rate_bpm': 96, 'hrv_index': 31, 'gsr_level': 8.4, 'smile_intensity': 22, 'speech_rate': 104, 'mfcc_variance': 10.5}
    result = requests.post(f'{BASE_URL}/api/assessments/analyze', json=payload, timeout=20)
    assert result.status_code == 200
    data = result.json()
    for key in ('id','timestamp','mental_health_status','confidence','probabilities','scores','modalities','feature_attributions','insights'):
        assert key in data
    assert 0 <= data['confidence'] <= 100
    assert set(data['modalities']) == {'facial','speech','behavior','physiology'}
    history = requests.get(f'{BASE_URL}/api/assessments/history', timeout=20)
    assert history.status_code == 200 and any(x['id'] == data['id'] for x in history.json())
    detail = requests.get(f"{BASE_URL}/api/assessments/{data['id']}", timeout=20)
    assert detail.status_code == 200 and detail.json()['id'] == data['id']


def test_validation_and_performance():
    bad = requests.post(f'{BASE_URL}/api/assessments/analyze', json={'sleep_quality': 99}, timeout=20)
    assert bad.status_code == 422
    performance = requests.get(f'{BASE_URL}/api/performance', timeout=20)
    body = performance.json()
    assert performance.status_code == 200 and len(body['confusion_matrix']) == 4 and 'Accuracy' in body['classification']
