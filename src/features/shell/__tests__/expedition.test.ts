import { describe, expect, it } from '@jest/globals';
import { CONTENT } from '@/data';
import { createRun } from '@/engine/run';
import { dailyExpedition, expeditionCode, parseExpeditionCode } from '../expedition';

describe('expedition codes', () => {
  it.each([0, 1, 42, 0x80000000, 0xffffffff])('round-trips the full uint32 seed %s without losing precision', (seed) => {
    expect(parseExpeditionCode(expeditionCode(seed))).toBe(seed);
    expect(createRun(CONTENT, parseExpeditionCode(expeditionCode(seed))!)).toEqual(createRun(CONTENT, seed));
  });
  it('accepts pasted whitespace and lowercase', () => expect(parseExpeditionCode('  ff-abcdef01\n')).toBe(0xabcdef01));
  it.each(['', 'FF-123', 'FF-000000001', 'FF-G0000000', '1e9', '-1', '1234', 'FF-0000002A other'])('rejects malformed input %s instead of silently starting another expedition', (input) => expect(parseExpeditionCode(input)).toBeNull());
});

describe('daily expeditions', () => {
  it('uses the same UTC day across time zones and times of day', () => {
    const a = dailyExpedition(new Date('2026-10-23T00:00:00Z'));
    const b = dailyExpedition(new Date('2026-10-24T01:59:59+02:00'));
    expect(a).toEqual(b);
    expect(a.day).toBe('2026-10-23');
    expect(a.dateLabel).toContain('23.');
  });
  it('changes at UTC midnight and produces a playable reproducible seed', () => {
    const a = dailyExpedition(new Date('2026-10-23T23:59:59Z'));
    const b = dailyExpedition(new Date('2026-10-24T00:00:00Z'));
    expect(a.seed).not.toBe(b.seed);
    expect(createRun(CONTENT, parseExpeditionCode(a.code)!)).toEqual(createRun(CONTENT, a.seed));
  });
  it('rejects an invalid date', () => expect(() => dailyExpedition(new Date('invalid'))).toThrow(RangeError));
});
