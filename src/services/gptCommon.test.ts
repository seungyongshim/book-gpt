import { describe, it, expect } from 'vitest';
import { getGPTConfig, getModelInfos, clearModelInfosCache } from './gptCommon';

describe('gptCommon', () => {
  it('returns default config with expected keys', () => {
    const cfg = getGPTConfig();
    expect(cfg).toHaveProperty('baseUrl');
    expect(cfg).toHaveProperty('defaultModel');
    expect(cfg).toHaveProperty('defaultTemperature');
  });

  it('provides model infos including local hints', async () => {
    clearModelInfosCache();
    const infos = await getModelInfos({ force: true });
    // Should contain at least one known local model
    expect(infos.some(i=>i.id==='gpt-4o-mini')).toBe(true);
    const mini = infos.find(i=>i.id==='gpt-4o-mini');
    expect(mini?.contextWindow).toBeGreaterThan(1000);
  });
});