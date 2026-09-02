import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as yup from 'yup';

vi.mock('react-toastify', () => ({
  toast: Object.assign(vi.fn(), {
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));
vi.mock('react-toastify/dist/ReactToastify.css', () => ({}));

import { toast } from 'react-toastify';
import { showToast, showApiError } from '../Helper/ShowToast';
import ERROR_MESSAGES from '../Helper/errorMessages';
import {
  SPECIAL_CHAR_REGEX,
  DEFAULT_PASSWORD_MIN_LENGTH,
  buildPasswordRules,
} from '../Helper/passwordPolicy';
import {
  passwordSchema,
  confirmPasswordSchema,
  firstUnmetPasswordRule,
} from '../Helper/passwordValidation';

/**
 * Branch coverage for the shared helpers: the password policy that the
 * strength checklist and the yup schemas both read, and the toast helper's
 * error-key fallback.
 */

describe('passwordPolicy: buildPasswordRules', () => {
  it('defaults to the shared 8-character minimum', () => {
    expect(DEFAULT_PASSWORD_MIN_LENGTH).toBe(8);
    expect(buildPasswordRules()[0].label).toBe('At least 8 characters');
  });

  it('builds the length rule and its label from a raised minimum', () => {
    const rules = buildPasswordRules(12);
    expect(rules[0].label).toBe('At least 12 characters');
    expect(rules[0].test('Abcdefg1!aa')).toBe(false); // 11 chars
    expect(rules[0].test('Abcdefg1!aaa')).toBe(true); // 12 chars
  });

  it('treats a missing value as empty rather than throwing', () => {
    for (const rule of buildPasswordRules()) {
      expect(rule.test(undefined)).toBe(false);
      expect(rule.test(null)).toBe(false);
      expect(rule.test('')).toBe(false);
    }
  });

  it('checks each character class independently', () => {
    const [len, upper, lower, digit, special] = buildPasswordRules();
    expect(len.test('abcdefgh')).toBe(true);
    expect(len.test('abcdefg')).toBe(false);

    expect(upper.test('A')).toBe(true);
    expect(upper.test('a')).toBe(false);

    expect(lower.test('a')).toBe(true);
    expect(lower.test('A')).toBe(false);

    expect(digit.test('1')).toBe(true);
    expect(digit.test('a')).toBe(false);

    expect(special.test('!')).toBe(true);
    expect(special.test('a1')).toBe(false);
  });

  it('treats any non-alphanumeric as special', () => {
    expect(SPECIAL_CHAR_REGEX.test('_')).toBe(true);
    expect(SPECIAL_CHAR_REGEX.test(' ')).toBe(true);
    expect(SPECIAL_CHAR_REGEX.test('é')).toBe(true);
    expect(SPECIAL_CHAR_REGEX.test('abc123')).toBe(false);
  });
});

describe('passwordValidation schemas', () => {
  const valid = 'Abcdefg1!';

  it('accepts a password meeting every rule', async () => {
    await expect(passwordSchema().validate(valid)).resolves.toBe(valid);
  });

  it('requires a value, naming the field', async () => {
    await expect(passwordSchema('New password').validate(undefined)).rejects.toThrow(
      'New password is required'
    );
  });

  it('uses the default field label when none is given', async () => {
    await expect(passwordSchema().validate(undefined)).rejects.toThrow('Password is required');
  });

  it('enforces the default minimum length', async () => {
    await expect(passwordSchema().validate('Ab1!')).rejects.toThrow('At least 8 characters');
  });

  it('enforces a raised minimum length', async () => {
    await expect(passwordSchema('New password', 12).validate(valid)).rejects.toThrow(
      'At least 12 characters'
    );
    await expect(passwordSchema('New password', 12).validate('Abcdefg1!aaa')).resolves.toBeTruthy();
  });

  it('rejects each missing character class in turn', async () => {
    await expect(passwordSchema().validate('abcdefg1!')).rejects.toThrow('One uppercase letter');
    await expect(passwordSchema().validate('ABCDEFG1!')).rejects.toThrow('One lowercase letter');
    await expect(passwordSchema().validate('Abcdefgh!')).rejects.toThrow('One number');
    await expect(passwordSchema().validate('Abcdefg12')).rejects.toThrow('One special character');
  });

  // The confirm schema carries a `yup.ref`, so it only resolves inside an
  // object schema -- which is how every screen actually uses it.
  const confirmForm = (min) =>
    yup.object().shape({
      pw: passwordSchema('Password', min),
      confirm: confirmPasswordSchema('pw', min),
    });

  it('holds the confirm field to the same strength rules, not just a match', async () => {
    await expect(
      confirmForm().validate({ pw: 'weak', confirm: 'weak' })
    ).rejects.toThrow('At least 8 characters');
  });

  it('requires the confirm field to match', async () => {
    await expect(
      confirmForm().validate({ pw: valid, confirm: 'Different1!' })
    ).rejects.toThrow('Passwords must match');
  });

  it('accepts a matching pair that satisfies the policy', async () => {
    await expect(
      confirmForm().validate({ pw: valid, confirm: valid })
    ).resolves.toBeTruthy();
  });

  it('applies a raised minimum to the confirm field too', async () => {
    // Give the pair matching values so `oneOf` passes and the length rule is
    // what fails -- yup short-circuits the field at the mismatch otherwise.
    await expect(
      confirmForm(12).validate({ pw: valid, confirm: valid }, { abortEarly: false })
    ).rejects.toMatchObject({
      errors: expect.arrayContaining(['At least 12 characters']),
    });
  });
});

describe('firstUnmetPasswordRule', () => {
  it('returns null when every rule passes', () => {
    expect(firstUnmetPasswordRule('Abcdefg1!')).toBeNull();
  });

  it('names the first unmet rule', () => {
    expect(firstUnmetPasswordRule('abc')).toBe('At least 8 characters');
    expect(firstUnmetPasswordRule('abcdefgh')).toBe('One uppercase letter');
  });

  it('honours a raised minimum', () => {
    expect(firstUnmetPasswordRule('Abcdefg1!', 12)).toBe('At least 12 characters');
  });

  it('reports the length rule for an empty password', () => {
    expect(firstUnmetPasswordRule('')).toBe('At least 8 characters');
  });
});

describe('showToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dismisses any standing toast before showing a new one', () => {
    showToast('saved', 'success');
    expect(toast.dismiss).toHaveBeenCalled();
  });

  it('routes success and error to their own styles', () => {
    showToast('saved', 'success');
    expect(toast.success).toHaveBeenCalledWith('saved', expect.any(Object));
    showToast('nope', 'error');
    expect(toast.error).toHaveBeenCalledWith('nope', expect.any(Object));
  });

  it('falls back to a plain toast for an unrecognised type', () => {
    showToast('note', 'info');
    expect(toast).toHaveBeenCalledWith('note', expect.any(Object));
  });

  it('falls back to a plain toast when no type is given', () => {
    showToast('note');
    expect(toast).toHaveBeenCalledWith('note', expect.any(Object));
  });
});

describe('showApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the mapped message for a known key', () => {
    const key = Object.keys(ERROR_MESSAGES).find((k) => k !== 'DEFAULT');
    showApiError(new Error('raw'), key);
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES[key], expect.any(Object));
  });

  it('falls back to the default message for an unknown key', () => {
    showApiError(new Error('raw'), 'NO_SUCH_KEY');
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });

  it('uses the default key when none is supplied', () => {
    showApiError(new Error('raw'));
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });
});
