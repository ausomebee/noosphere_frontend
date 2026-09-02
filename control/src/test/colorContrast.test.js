import { describe, it, expect } from 'vitest';
import getContrastTextColor, { getContrastTextColor as named } from '../Helper/colorContrast';

/**
 * Picks black or white text for a user-chosen background colour.
 *
 * Plan and status colours are entered by hand in the admin UI, so this has to
 * survive whatever ends up in the field: shorthand hex, a missing hash, stray
 * whitespace, or something that is not a colour at all. Anything it cannot
 * parse falls back to dark text, which is legible on the pale default
 * background the pickers start from.
 */

describe('unparseable input', () => {
  it.each([
    ['nothing at all', undefined],
    ['an empty string', ''],
    ['null', null],
    ['a number', 0xffffff],
    ['a colour name', 'rebeccapurple'],
    ['four digits', '#abcd'],
    ['a hex string with a stray letter', '#12345z'],
  ])('falls back to dark text for %s', (_label, input) => {
    expect(getContrastTextColor(input)).toBe('#000000');
  });
});

describe('choosing against a background', () => {
  it('puts white text on black', () => {
    expect(getContrastTextColor('#000000')).toBe('#FFFFFF');
  });

  it('puts black text on white', () => {
    expect(getContrastTextColor('#FFFFFF')).toBe('#000000');
  });

  it('puts white text on a dark brand blue', () => {
    expect(getContrastTextColor('#00215D')).toBe('#FFFFFF');
  });

  it('puts black text on a light yellow', () => {
    expect(getContrastTextColor('#FFEE58')).toBe('#000000');
  });

  it('weighs green most heavily, as the luminance formula does', () => {
    // Pure green is light enough for black text; pure blue, at the same channel
    // value, is not -- that asymmetry is the whole point of the coefficients.
    expect(getContrastTextColor('#00FF00')).toBe('#000000');
    expect(getContrastTextColor('#0000FF')).toBe('#FFFFFF');
  });
});

describe('accepted spellings', () => {
  it('expands shorthand hex', () => {
    expect(getContrastTextColor('#fff')).toBe(getContrastTextColor('#ffffff'));
    expect(getContrastTextColor('#000')).toBe('#FFFFFF');
  });

  it('takes a colour with no leading hash', () => {
    expect(getContrastTextColor('ffffff')).toBe('#000000');
  });

  it('trims surrounding whitespace', () => {
    expect(getContrastTextColor('  #000000  ')).toBe('#FFFFFF');
  });

  it('is case-insensitive', () => {
    expect(getContrastTextColor('#AABBCC')).toBe(getContrastTextColor('#aabbcc'));
  });
});

describe('overriding the pair of colours', () => {
  it('uses the caller\'s own dark and light values', () => {
    expect(getContrastTextColor('#000000', { light: '#F9FAFB' })).toBe('#F9FAFB');
    expect(getContrastTextColor('#FFFFFF', { dark: '#111827' })).toBe('#111827');
  });

  it('uses the dark override for input it cannot parse', () => {
    expect(getContrastTextColor('nope', { dark: '#111827' })).toBe('#111827');
  });
});

describe('the module\'s exports', () => {
  it('offers the same function as both a named and a default export', () => {
    expect(named).toBe(getContrastTextColor);
  });
});
