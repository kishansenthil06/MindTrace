// Real dataset features (human-readable units) accepted by POST /api/assessments/analyze.
// Ranges mirror the backend validation in server.py — nothing here is invented.

export const FIELD_GROUPS = [
  {
    id: "self_report",
    label: "Self-report screening",
    title: "Screening scores",
    description: "Standard screening totals for the participant. These are the strongest predictors in the deployed model.",
    fields: [
      { key: "depression_score", label: "Depression score", min: 0, max: 34, step: 1, unit: "/ 34", hint: "Total screening score" },
      { key: "anxiety_score", label: "Anxiety score", min: 0, max: 24, step: 1, unit: "/ 24", hint: "Total screening score" },
      { key: "stress_score", label: "Stress score", min: 0, max: 39, step: 1, unit: "/ 39", hint: "Total screening score" },
    ],
  },
  {
    id: "behavioral",
    label: "Behavioral",
    title: "Behavioral indicators",
    description: "Day-to-day interaction patterns collected from the device.",
    fields: [
      { key: "sleep_quality", label: "Sleep quality", min: 1, max: 5, step: 1, unit: "/ 5", hint: "1 poor · 5 restorative" },
      { key: "social_engagement", label: "Social engagement", min: 1, max: 5, step: 1, unit: "/ 5", hint: "1 withdrawn · 5 highly social" },
      { key: "daily_app_usage_min", label: "Daily app usage", min: 0, max: 1440, step: 5, unit: "min", slider: true },
      { key: "typing_speed_wpm", label: "Typing speed", min: 0, max: 200, step: 1, unit: "wpm" },
      { key: "session_frequency", label: "Session frequency", min: 0, max: 50, step: 1, unit: "/ day" },
      { key: "idle_time_min", label: "Idle time", min: 0, max: 1440, step: 5, unit: "min" },
    ],
  },
  {
    id: "facial",
    label: "Facial",
    title: "Facial indicators",
    description: "Numerical descriptors derived from expression tracking.",
    fields: [
      { key: "facial_emotion_variance", label: "Emotion variance", min: 0, max: 1, step: 0.01, unit: "index", slider: true },
      { key: "eye_blink_rate", label: "Eye blink rate", min: 0, max: 80, step: 1, unit: "blinks/min" },
      { key: "smile_intensity", label: "Smile intensity", min: 0, max: 100, step: 1, unit: "%", slider: true },
      { key: "head_motion_index", label: "Head motion", min: 0, max: 10, step: 0.1, unit: "index" },
    ],
  },
  {
    id: "acoustic",
    label: "Acoustic",
    title: "Acoustic indicators",
    description: "Voice descriptors extracted from a short speech sample.",
    fields: [
      { key: "mfcc_mean", label: "MFCC mean", min: -100, max: 100, step: 0.1, unit: "coeff" },
      { key: "mfcc_variance", label: "MFCC variance", min: 0, max: 100, step: 0.1, unit: "coeff" },
      { key: "pitch_mean", label: "Mean pitch", min: 40, max: 600, step: 1, unit: "Hz" },
      { key: "speech_rate", label: "Speech rate", min: 0, max: 300, step: 1, unit: "wpm" },
    ],
  },
  {
    id: "physiological",
    label: "Physiological",
    title: "Physiological indicators",
    description: "Wearable-style vitals captured alongside the session.",
    fields: [
      { key: "heart_rate_bpm", label: "Heart rate", min: 35, max: 220, step: 1, unit: "bpm" },
      { key: "hrv_index", label: "Heart rate variability", min: 0, max: 200, step: 1, unit: "ms" },
      { key: "skin_temperature", label: "Skin temperature", min: 20, max: 45, step: 0.1, unit: "°C" },
      { key: "gsr_level", label: "Skin conductance", min: 0, max: 30, step: 0.1, unit: "µS" },
    ],
  },
];

export const DEFAULT_INPUTS = {
  depression_score: 14, anxiety_score: 10, stress_score: 18,
  sleep_quality: 3, social_engagement: 3, daily_app_usage_min: 180, typing_speed_wpm: 52,
  session_frequency: 6, idle_time_min: 45,
  facial_emotion_variance: 0.42, eye_blink_rate: 18, smile_intensity: 38, head_motion_index: 3.2,
  mfcc_mean: -18, mfcc_variance: 6.4, pitch_mean: 178, speech_rate: 128,
  heart_rate_bpm: 82, hrv_index: 42, skin_temperature: 33.6, gsr_level: 4.8,
  detected_facial_emotion: "Sad", facial_confidence: 0.87,
  detected_speech_emotion: "Fearful", speech_confidence: 0.79,
};

export const DEMO_INPUTS = {
  ...DEFAULT_INPUTS,
  depression_score: 26, anxiety_score: 17, stress_score: 28,
  sleep_quality: 2, social_engagement: 2, daily_app_usage_min: 340, typing_speed_wpm: 48,
  session_frequency: 9, idle_time_min: 112,
  facial_emotion_variance: 0.31, eye_blink_rate: 24, smile_intensity: 22, head_motion_index: 5.8,
  mfcc_mean: -21, mfcc_variance: 10.5, pitch_mean: 166, speech_rate: 104,
  heart_rate_bpm: 96, hrv_index: 31, skin_temperature: 34.2, gsr_level: 8.4,
};

export const ALL_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);
export const fieldByKey = Object.fromEntries(ALL_FIELDS.map((field) => [field.key, field]));
