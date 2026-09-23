import {
  cleanSequence,
  escapeRegExp,
  exactNameRegExp,
  orNull,
  splitList,
  toInt,
  toNumber,
} from './text';

describe('orNull', () => {
  it.each(['', '  ', 'NOT_AVAILABLE', 'NOT_AVAILABE', 'NOT NAMED', null])(
    'maps the sentinel %p to null',
    (value) => {
      expect(orNull(value)).toBeNull();
    },
  );

  it('trims and stringifies real values', () => {
    expect(orNull(' PTHR10010 ')).toBe('PTHR10010');
    expect(orNull(120)).toBe('120');
  });
});

describe('toNumber / toInt', () => {
  it('parses numeric strings, including fractions', () => {
    expect(toNumber('6.65')).toBe(6.65);
    expect(toNumber('0')).toBe(0);
    expect(toInt('20851')).toBe(20851);
  });

  it('accepts values already stored as numbers', () => {
    expect(toNumber(4290)).toBe(4290);
    expect(toInt(9606.0)).toBe(9606);
  });

  it('returns null for blanks, sentinels and garbage', () => {
    expect(toNumber('')).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber('NOT_AVAILABLE')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(Number.NaN)).toBeNull();
  });
});

describe('splitList', () => {
  it('splits comma-joined columns and drops sentinels', () => {
    expect(splitList('PTN002558327,PTN002558326')).toEqual([
      'PTN002558327',
      'PTN002558326',
    ]);
    expect(splitList('NOT_AVAILABLE')).toEqual([]);
    expect(splitList(' a , ,b ')).toEqual(['a', 'b']);
    expect(splitList(undefined)).toEqual([]);
  });

  it('accepts arrays too', () => {
    expect(splitList(['a', '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('cleanSequence', () => {
  it('removes alignment padding and uppercases', () => {
    expect(cleanSequence('mkv..llg--ae_')).toBe('MKVLLGAE');
  });

  it('returns null when nothing is left', () => {
    expect(cleanSequence('..--')).toBeNull();
    expect(cleanSequence(undefined)).toBeNull();
  });
});

describe('escapeRegExp', () => {
  it('neutralises metacharacters', () => {
    const pattern = new RegExp(escapeRegExp('a.*(b)'));
    expect(pattern.test('a.*(b)')).toBe(true);
    expect(pattern.test('aXXb')).toBe(false);
  });
});

describe('exactNameRegExp', () => {
  /** How MongoDB applies a regex: to the string, or to each array element. */
  const matches = (name: string, stored: string | string[]) => {
    const pattern = exactNameRegExp(name);
    return Array.isArray(stored)
      ? stored.some((element) => pattern.test(element))
      : pattern.test(stored);
  };

  it('does not match a name inside a longer name (the legacy gene-gain bug)', () => {
    expect(matches('rosids', 'eurosids,malvids')).toBe(false);
    expect(new RegExp('rosids').test('eurosids,malvids')).toBe(true);
  });

  it('does not treat hyphenated clade names as containing their parts', () => {
    expect(matches('Firmicutes', 'Firmicutes-Tenericutes,Bacteria')).toBe(
      false,
    );
    expect(matches('Eukaryota', 'Archaea-Eukaryota')).toBe(false);
  });

  it.each([',', ';', '|', ' ', ', ', '\t'])(
    'matches a whole name with the %p delimiter at any position',
    (delimiter) => {
      const stored = ['eurosids', 'rosids', 'Eukaryota'].join(delimiter);
      expect(matches('eurosids', stored)).toBe(true);
      expect(matches('rosids', stored)).toBe(true);
      expect(matches('Eukaryota', stored)).toBe(true);
    },
  );

  it('matches whole array elements only', () => {
    expect(matches('rosids', ['eurosids', 'malvids'])).toBe(false);
    expect(matches('rosids', ['eurosids', 'rosids'])).toBe(true);
  });

  it('treats slashes and underscores as part of a name', () => {
    expect(matches('SAR/HA_supergroup', 'Bikonts,SAR/HA_supergroup')).toBe(
      true,
    );
    expect(matches('HA_supergroup', 'SAR/HA_supergroup')).toBe(false);
  });

  it('escapes regex metacharacters in the name', () => {
    expect(matches('.*', 'rosids,malvids')).toBe(false);
  });
});
