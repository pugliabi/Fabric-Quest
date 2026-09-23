import { describe, it, expect } from 'vitest';
import { parse } from '../src/engine/parser';

describe('parse', () => {
  it('strips articles and filler', () => {
    expect(parse('pick up the old scroll')).toMatchObject({ verb: 'get', noun: 'old scroll' });
    expect(parse('look at the mug')).toMatchObject({ verb: 'look', noun: 'mug' });
  });
  it('maps synonyms to canonical verbs', () => {
    expect(parse('x mug').verb).toBe('look');
    expect(parse('examine mug').noun).toBe('mug');
    expect(parse('speak to the miller')).toMatchObject({ verb: 'talk', noun: 'miller' });
    expect(parse('z').verb).toBe('wait');
    expect(parse('i').verb).toBe('inventory');
  });
  it('parses two-noun forms', () => {
    expect(parse('use scroll on notebook')).toMatchObject({ verb: 'use', noun: 'scroll', noun2: 'notebook' });
    expect(parse('give credentials to ferryman')).toMatchObject({ verb: 'give', noun: 'credentials', noun2: 'ferryman' });
    expect(parse('put on hoodie')).toMatchObject({ verb: 'wear', noun: 'hoodie' });
    expect(parse('ask miller about credentials')).toMatchObject({ verb: 'talk', noun: 'miller', noun2: 'credentials' });
  });
  it('parses movement', () => {
    expect(parse('n')).toMatchObject({ verb: 'go', dir: 'n' });
    expect(parse('go north')).toMatchObject({ verb: 'go', dir: 'n' });
    expect(parse('out')).toMatchObject({ verb: 'go', dir: 'out' });
    expect(parse('walk east')).toMatchObject({ verb: 'go', dir: 'e' });
  });
  it('keeps the full phrase for say', () => {
    expect(parse('say select *')).toMatchObject({ verb: 'say', noun: 'select *' });
    expect(parse('shout STAR SCHEMA').noun).toBe('star schema');
    expect(parse('say "trial"').noun).toBe('trial');
  });
  it('returns unknown with the offending verb', () => {
    expect(parse('frobnicate the lake')).toMatchObject({ verb: 'unknown', unknownVerb: 'frobnicate' });
  });
  it('bare look has no noun', () => {
    expect(parse('look')).toMatchObject({ verb: 'look' });
    expect(parse('look').noun).toBeUndefined();
  });
  it('handles multi-word nouns', () => {
    expect(parse('get standard key')).toMatchObject({ verb: 'get', noun: 'standard key' });
    expect(parse('get ye flask')).toMatchObject({ verb: 'get', noun: 'ye flask' });
    expect(parse('use policy on big refresh')).toMatchObject({ verb: 'use', noun: 'policy', noun2: 'big refresh' });
  });
});
