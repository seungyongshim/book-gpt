import { describe, it, expect, beforeEach } from 'vitest';
import { estimateTokens, setTokenCalibrationFactor, assemblePrompt, totalPromptTokens, summarizeWorld } from './promptAssembler';

describe('promptAssembler token estimation', () => {
  beforeEach(()=>{
    setTokenCalibrationFactor(1.0);
  });

  it('gives higher tokens for Korean than same-length ASCII letters (approx)', () => {
    const korean = '가'.repeat(50); // 한글 50자
    const english = 'a'.repeat(50);
    const k = estimateTokens(korean);
    const e = estimateTokens(english);
    expect(k).toBeGreaterThan(e); // 휴리스틱상 CJK 1:1 vs ASCII 1:4
  });

  it('entropy mix slightly increases mixed string vs pure', () => {
    const mixed = '가나다abc123!!가나다';
    const baselinePureSameLen = '가'.repeat(mixed.length); // 동일 길이 순수 한글
    const pureTokens = estimateTokens(baselinePureSameLen);
    const mixedTokens = estimateTokens(mixed);
    // 혼합 문자열은 동일 길이 순수 한글 대비 소폭(<= +20%) 이내 증가 혹은 비슷해야 함 (과도한 증가/감소 방지)
    expect(mixedTokens).toBeGreaterThanOrEqual(Math.floor(pureTokens * 0.8));
    expect(mixedTokens).toBeLessThanOrEqual(Math.ceil(pureTokens * 1.2));
  });

  it('long ASCII run penalty increases tokens vs segmented', () => {
    const longRun = 'supercalifragilisticexpialidocious';
    const segmented = 'super cali fragilistic expiali docious';
    const lr = estimateTokens(longRun);
    const sg = estimateTokens(segmented);
    expect(lr).toBeGreaterThanOrEqual(sg); // penalty ensures not lower
  });

  it('number+unit patterns reduce tokens compared to naive digits+letters', () => {
    const withUnits = '100km 25% 30일 12kg';
    const naive = '100 k m 25 % 30 일 12 k g';
    const a = estimateTokens(withUnits);
    const b = estimateTokens(naive);
    expect(a).toBeLessThanOrEqual(b);
  });

  it('calibration factor scales output', () => {
    const baseStr = '혼합 mix 123!!! 테스트';
    const base = estimateTokens(baseStr);
    setTokenCalibrationFactor(1.2);
    const scaled = estimateTokens(baseStr);
    expect(scaled).toBeGreaterThanOrEqual(Math.floor(base * 1.15)); // 근사 허용
  });
});

describe('summarizeWorld', () => {
  it('includes labels for provided sections only', () => {
    const summary = summarizeWorld({ premise: '세계관 전제', factions: '두 세력', styleGuide: '어둡고 서늘' });
    expect(summary).toMatch(/\[Premise]/);
    expect(summary).toMatch(/\[Factions]/);
    expect(summary).toMatch(/\[Style]/);
    expect(summary).not.toMatch(/\[Timeline]/);
  });

  it('caps length at <=1200 characters', () => {
    const longText = '서사'.repeat(2000); // 매우 긴
    const summary = summarizeWorld({ premise: longText, timeline: longText, geography: longText, factions: longText, characters: longText, magicOrTech: longText, constraints: longText, styleGuide: longText });
    expect(summary.length).toBeLessThanOrEqual(1200);
  });
  it('respects individual cap slicing without empty lines', () => {
    const premise = 'A'.repeat(800);
    const summary = summarizeWorld({ premise });
    expect(summary).toMatch(/\[Premise]/);
    expect(summary.split('\n').length).toBe(1); // single section only
  });
});
