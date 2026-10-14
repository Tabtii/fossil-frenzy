import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_SETTINGS,
  discoverFossils,
  initialMeta,
  isFurther,
  markCardsSeen,
  recordRunFinished,
  recordRunProgress,
  recordRunStarted,
  resetMeta,
  sanitizeMeta,
  updateSettings,
} from '../meta';

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-02-02T12:00:00.000Z';

describe('initialMeta', () => {
  it('starts empty with default settings', () => {
    expect(initialMeta()).toEqual({
      fossils: {},
      cardsSeen: [],
      runsStarted: 0,
      runsWon: 0,
      best: null,
      settings: { haptics: true, reducedMotion: false },
    });
  });

  it('returns independent objects', () => {
    const a = initialMeta();
    const b = initialMeta();
    a.settings.haptics = false;
    a.cardsSeen.push('x');
    expect(b.settings.haptics).toBe(true);
    expect(b.cardsSeen).toEqual([]);
    expect(DEFAULT_SETTINGS.haptics).toBe(true);
  });
});

describe('discoverFossils', () => {
  it('records new fossils with timestamp and count 1', () => {
    const meta = discoverFossils(initialMeta(), ['trex', 'ammonit'], T1);
    expect(meta.fossils).toEqual({
      trex: { discoveredAt: T1, timesFound: 1 },
      ammonit: { discoveredAt: T1, timesFound: 1 },
    });
  });

  it('counts repeat finds but keeps the first discovery date', () => {
    const first = discoverFossils(initialMeta(), ['trex'], T1);
    const second = discoverFossils(first, ['trex'], T2);
    expect(second.fossils.trex).toEqual({ discoveredAt: T1, timesFound: 2 });
  });

  it('counts duplicate ids within one call once', () => {
    const meta = discoverFossils(initialMeta(), ['trex', 'trex', 'trex'], T1);
    expect(meta.fossils.trex?.timesFound).toBe(1);
  });

  it('does not mutate the input and returns the same object for no ids', () => {
    const before = discoverFossils(initialMeta(), ['trex'], T1);
    const snapshot = JSON.parse(JSON.stringify(before));
    discoverFossils(before, ['trex', 'ammonit'], T2);
    expect(before).toEqual(snapshot);
    expect(discoverFossils(before, [], T2)).toBe(before);
    expect(discoverFossils(before, [''], T2)).toBe(before);
  });
});

describe('markCardsSeen', () => {
  it('adds new ids in order without duplicates', () => {
    const meta = markCardsSeen(initialMeta(), ['a', 'b', 'a']);
    expect(meta.cardsSeen).toEqual(['a', 'b']);
    expect(markCardsSeen(meta, ['c', 'b']).cardsSeen).toEqual(['a', 'b', 'c']);
  });

  it('returns the same object when nothing is new', () => {
    const meta = markCardsSeen(initialMeta(), ['a']);
    expect(markCardsSeen(meta, ['a'])).toBe(meta);
    expect(markCardsSeen(meta, [])).toBe(meta);
  });
});

describe('recordRunProgress', () => {
  it('sets best on the first progress', () => {
    expect(recordRunProgress(initialMeta(), 0, 0).best).toEqual({ act: 0, floor: 0 });
  });

  it('keeps the furthest progress by act, then floor', () => {
    let meta = recordRunProgress(initialMeta(), 1, 2);
    meta = recordRunProgress(meta, 0, 5);
    expect(meta.best).toEqual({ act: 1, floor: 2 });
    meta = recordRunProgress(meta, 1, 4);
    expect(meta.best).toEqual({ act: 1, floor: 4 });
    meta = recordRunProgress(meta, 2, 0);
    expect(meta.best).toEqual({ act: 2, floor: 0 });
  });

  it('returns the same object when not further', () => {
    const meta = recordRunProgress(initialMeta(), 1, 3);
    expect(recordRunProgress(meta, 1, 3)).toBe(meta);
    expect(recordRunProgress(meta, 1, 1)).toBe(meta);
    expect(recordRunProgress(meta, Number.NaN, 9)).toBe(meta);
  });

  it('isFurther compares act first', () => {
    expect(isFurther(null, 0, 0)).toBe(true);
    expect(isFurther({ act: 1, floor: 0 }, 0, 5)).toBe(false);
    expect(isFurther({ act: 1, floor: 0 }, 1, 1)).toBe(true);
  });
});

describe('run counters', () => {
  it('counts started and won runs', () => {
    let meta = recordRunStarted(initialMeta());
    meta = recordRunStarted(meta);
    meta = recordRunFinished(meta, true);
    expect(meta.runsStarted).toBe(2);
    expect(meta.runsWon).toBe(1);
  });

  it('a lost run changes nothing', () => {
    const meta = recordRunStarted(initialMeta());
    expect(recordRunFinished(meta, false)).toBe(meta);
  });
});

describe('updateSettings', () => {
  it('applies boolean patches', () => {
    const meta = updateSettings(initialMeta(), { haptics: false });
    expect(meta.settings).toEqual({ haptics: false, reducedMotion: false });
    expect(updateSettings(meta, { reducedMotion: true }).settings).toEqual({
      haptics: false,
      reducedMotion: true,
    });
  });

  it('ignores unchanged, undefined and unknown values', () => {
    const meta = initialMeta();
    expect(updateSettings(meta, { haptics: true })).toBe(meta);
    expect(updateSettings(meta, { haptics: undefined })).toBe(meta);
    expect(updateSettings(meta, { volume: 3 } as never)).toBe(meta);
  });
});

describe('resetMeta', () => {
  it('wipes progress but keeps settings', () => {
    let meta = discoverFossils(initialMeta(), ['trex'], T1);
    meta = markCardsSeen(recordRunStarted(meta), ['a']);
    meta = updateSettings(recordRunProgress(meta, 2, 3), { haptics: false, reducedMotion: true });
    expect(resetMeta(meta)).toEqual({
      ...initialMeta(),
      settings: { haptics: false, reducedMotion: true },
    });
  });
});

describe('sanitizeMeta', () => {
  it('round-trips a valid meta state', () => {
    let meta = discoverFossils(initialMeta(), ['trex'], T1);
    meta = markCardsSeen(recordRunStarted(meta), ['a', 'b']);
    meta = recordRunFinished(recordRunProgress(meta, 3, 5), true);
    meta = updateSettings(meta, { reducedMotion: true });
    expect(sanitizeMeta(JSON.parse(JSON.stringify(meta)))).toEqual(meta);
  });

  it('falls back to defaults for garbage', () => {
    expect(sanitizeMeta(undefined)).toEqual(initialMeta());
    expect(sanitizeMeta('kaputt')).toEqual(initialMeta());
    expect(sanitizeMeta([1, 2])).toEqual(initialMeta());
  });

  it('repairs broken fields individually', () => {
    const meta = sanitizeMeta({
      fossils: { trex: { discoveredAt: T1, timesFound: 0 }, bad: { timesFound: 2 }, worse: 5 },
      cardsSeen: ['a', 7, 'a', '', 'b'],
      runsStarted: -3,
      runsWon: 2.7,
      best: { act: 'eins', floor: 2 },
      settings: { haptics: 'ja', reducedMotion: true },
    });
    expect(meta).toEqual({
      fossils: { trex: { discoveredAt: T1, timesFound: 1 } },
      cardsSeen: ['a', 'b'],
      runsStarted: 0,
      runsWon: 2,
      best: null,
      settings: { haptics: true, reducedMotion: true },
    });
  });
});
