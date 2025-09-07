import { get, put } from '../db/database';
import { TOKEN_CALIBRATION_SETTING_KEY, applyCalibrationSample, setTokenCalibrationFactor, getCalibrationFactor } from './promptAssembler';
export async function loadCalibration() {
    try {
        const rec = await get('settings', TOKEN_CALIBRATION_SETTING_KEY);
        if (rec && typeof rec.factor === 'number') {
            setTokenCalibrationFactor(rec.factor);
            return rec.factor;
        }
    }
    catch { /* ignore */ }
    return getCalibrationFactor();
}
export async function saveCalibration(samplesIncrement = 1) {
    const factor = getCalibrationFactor();
    try {
        const existing = await get('settings', TOKEN_CALIBRATION_SETTING_KEY);
        const rec = {
            factor,
            samples: (existing?.samples || 0) + samplesIncrement,
            updatedAt: Date.now()
        };
        await put('settings', { key: TOKEN_CALIBRATION_SETTING_KEY, ...rec });
    }
    catch { /* ignore */ }
}
export function updateCalibrationWithSample(ratio) {
    const newFactor = applyCalibrationSample(ratio);
    return newFactor;
}
