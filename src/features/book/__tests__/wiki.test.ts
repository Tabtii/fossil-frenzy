import { describe, expect, it } from '@jest/globals';

import { CONTENT } from '@/data';

import { wikiEntries } from '../wiki';

describe('wiki reading', () => {
  it('makes every article available without discovery records', () => {
    const entries = wikiEntries(CONTENT, { era: 'all', kind: 'all', query: '' });
    expect(new Set(entries.map((entry) => entry.id))).toEqual(new Set(Object.keys(CONTENT.fossils)));
  });

  it('searches facts, diet, scientific names and locations across undiscovered articles', () => {
    const find = (query: string) => wikiEntries(CONTENT, { era: 'all', kind: 'all', query }).map((entry) => entry.id);
    expect(find('  LUNENSIS argentinien allesfresser ')).toEqual(['eoraptor']);
    expect(find('Morgenrote')).toEqual(['eoraptor']);
    expect(find('gibt es dieses Tier wirklich?')).toEqual([]);
  });

  it('distinguishes dinosaur articles from flying reptiles and ice age mammals', () => {
    const dinos = wikiEntries(CONTENT, { era: 'all', kind: 'dinosaur', query: '' });
    expect(dinos.length).toBeGreaterThan(0);
    expect(dinos.map((entry) => entry.id)).toContain('eoraptor');
    expect(dinos.map((entry) => entry.id)).not.toContain('mammuthus');
    expect(dinos.every((entry) => entry.kind === 'dinosaur')).toBe(true);
    expect(wikiEntries(CONTENT, { era: 'eiszeit', kind: 'dinosaur', query: '' })).toEqual([]);
    const flyers = wikiEntries(CONTENT, { era: 'trias', kind: 'pterosaur', query: '' });
    expect(flyers.length).toBeGreaterThan(0);
    expect(flyers.every((entry) => entry.kind === 'pterosaur' && entry.era === 'trias')).toBe(true);
  });
});
