import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

import Button from '../Components/Button/Button';
import StatusChangeModal from '../Components/ReusableModal/StatusChangeModal';
import ChangePlanModal from '../Components/ReusableModal/ChangePlanModal';
import DeletePlanModal from '../Components/ReusableModal/DeletePlanModal';
import reducer, { logout, setTokens } from '../ReduxStore/features/authentication';
import draftReducer, { setFormDraft, clearFormDraft } from '../ReduxStore/features/formDraftsSlice';

/**
 * Branch coverage for the remaining control components and slices: the
 * button's async busy guard, the two password-gated plan modals, and the
 * reducers' non-default paths.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Button async guard', () => {
  it('does nothing when disabled', () => {
    const onClick = vi.fn();
    render(<Button label="Go" disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does nothing while the loading prop is set', () => {
    const onClick = vi.fn();
    render(<Button label="Go" loading onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('runs a plain handler without entering the busy state', () => {
    const onClick = vi.fn();
    render(<Button label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('blocks a second click while a promise handler is in flight', async () => {
    let resolve;
    const onClick = vi.fn(() => new Promise((r) => { resolve = r; }));
    render(<Button label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });

  it('clears the busy state when the promise rejects', async () => {
    const onClick = vi.fn(() => Promise.reject(new Error('nope')));
    render(<Button label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });

  it('tolerates no handler at all', () => {
    render(<Button label="Go" />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});

describe('StatusChangeModal', () => {
  const base = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    plan: { id: '1', name: 'Growth' },
    action: 'activate',
  };

  const confirm = () => {
    const btn = document.body.querySelector('.primary-button');
    fireEvent.click(btn);
  };

  it('titles and words itself for activation', () => {
    render(<StatusChangeModal {...base} />);
    expect(screen.getByText('Activate Plan')).toBeInTheDocument();
    expect(screen.getByText(/activate the Growth plan/)).toBeInTheDocument();
  });

  it('titles and words itself for deactivation', () => {
    render(<StatusChangeModal {...base} action="deactivate" />);
    expect(screen.getByText('Deactivate Plan')).toBeInTheDocument();
    expect(screen.getByText(/deactivate the Growth plan/)).toBeInTheDocument();
  });

  it('names an unnamed plan rather than showing a blank', () => {
    render(<StatusChangeModal {...base} plan={{ id: '1' }} />);
    expect(screen.getByText(/Unnamed Plan/)).toBeInTheDocument();
  });

  it('handles a missing plan object', () => {
    render(<StatusChangeModal {...base} plan={undefined} />);
    expect(screen.getByText(/Unnamed Plan/)).toBeInTheDocument();
  });

  it('refuses an empty password', () => {
    const onConfirm = vi.fn();
    render(<StatusChangeModal {...base} onConfirm={onConfirm} />);
    confirm();
    expect(showToast).toHaveBeenCalledWith(
      'Administrative password is required.',
      'error'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('refuses a whitespace-only password', () => {
    const onConfirm = vi.fn();
    render(<StatusChangeModal {...base} onConfirm={onConfirm} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: '   ' },
    });
    confirm();
    expect(showToast).toHaveBeenCalledWith(
      'Administrative password is required.',
      'error'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('refuses a password under six characters', () => {
    const onConfirm = vi.fn();
    render(<StatusChangeModal {...base} onConfirm={onConfirm} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: 'abc' },
    });
    confirm();
    expect(showToast).toHaveBeenCalledWith(
      'Password must be at least 6 characters long.',
      'error'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms and closes with a valid password', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<StatusChangeModal {...base} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: 'secret123' },
    });
    confirm();
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ administratorPassword: 'secret123', action: 'activate' })
      )
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('surfaces a backend failure and stays open', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('wrong password'));
    const onClose = vi.fn();
    render(<StatusChangeModal {...base} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: 'secret123' },
    });
    confirm();
    await waitFor(() =>
      expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'VERIFY_ADMIN_PASSWORD')
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ChangePlanModal', () => {
  const plans = [
    { id: 'p1', name: 'Starter' },
    { id: 'p2', name: 'Growth' },
  ];
  const base = { isOpen: true, onClose: vi.fn(), onSave: vi.fn().mockResolvedValue(undefined), currentPlanId: 'p1', plans };

  it('labels the current plan', () => {
    render(<ChangePlanModal {...base} />);
    // "Starter" appears in both selects, so scope to the disabled
    // "Change from" one, whose single option carries the resolved plan name.
    const from = document.body.querySelector('select[disabled]');
    expect(from).toBeInTheDocument();
    // SelectInput always prepends its own placeholder, so the real option is [1].
    expect(from.options[1].textContent).toBe('Starter');
  });

  it('falls back to Unknown Plan when the current id matches nothing', () => {
    render(<ChangePlanModal {...base} currentPlanId="missing" />);
    expect(screen.getByText('Unknown Plan')).toBeInTheDocument();
  });

  it('falls back when no plans are supplied at all', () => {
    render(<ChangePlanModal isOpen onClose={vi.fn()} onSave={vi.fn()} currentPlanId="p1" />);
    expect(screen.getByText('Unknown Plan')).toBeInTheDocument();
  });

  it('does nothing when no target plan is chosen', () => {
    const onSave = vi.fn();
    render(<ChangePlanModal {...base} onSave={onSave} />);
    fireEvent.click(document.body.querySelector('.primary-button'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the chosen target plan and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<ChangePlanModal {...base} onSave={onSave} onClose={onClose} />);
    const selects = document.body.querySelectorAll('select');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'p2' } });
    fireEvent.click(document.body.querySelector('.primary-button'));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ fromPlanId: 'p1', toPlanId: 'p2' })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('nope'));
    const onClose = vi.fn();
    render(<ChangePlanModal {...base} onSave={onSave} onClose={onClose} />);
    const selects = document.body.querySelectorAll('select');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'p2' } });
    fireEvent.click(document.body.querySelector('.primary-button'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets the selection each time it reopens', () => {
    const { rerender } = render(<ChangePlanModal {...base} />);
    const selects = document.body.querySelectorAll('select');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'p2' } });
    rerender(<ChangePlanModal {...base} isOpen={false} />);
    rerender(<ChangePlanModal {...base} isOpen />);
    const reopened = document.body.querySelectorAll('select');
    expect(reopened[reopened.length - 1].value).toBe('');
  });
});

describe('DeletePlanModal', () => {
  const base = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    plan: { id: '1', name: 'Growth' },
  };

  it('refuses an empty password', () => {
    const onConfirm = vi.fn();
    render(<DeletePlanModal {...base} onConfirm={onConfirm} />);
    fireEvent.click(document.body.querySelector('.primary-button'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });

  it('refuses a short password', () => {
    const onConfirm = vi.fn();
    render(<DeletePlanModal {...base} onConfirm={onConfirm} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: 'abc' },
    });
    fireEvent.click(document.body.querySelector('.primary-button'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('deletes with a valid password', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeletePlanModal {...base} onConfirm={onConfirm} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(document.body.querySelector('.primary-button'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('surfaces a failure and stays open', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('nope'));
    const onClose = vi.fn();
    render(<DeletePlanModal {...base} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.change(document.body.querySelector('input[type="password"]'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(document.body.querySelector('.primary-button'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('authentication slice', () => {
  it('clears state on logout', () => {
    const next = reducer(
      { isAuthenticated: true, user: { id: 1 }, accessToken: 'a', refreshToken: 'r' },
      logout()
    );
    expect(next.isAuthenticated).toBe(false);
    expect(next.user).toBeNull();
  });

  it('stores a refreshed token pair', () => {
    const next = reducer(
      { isAuthenticated: true, accessToken: 'old', refreshToken: 'oldr' },
      setTokens({ accessToken: 'new', refreshToken: 'newr' })
    );
    expect(next.accessToken).toBe('new');
    expect(next.refreshToken).toBe('newr');
  });

  it('returns the current state for an unrelated action', () => {
    const state = { isAuthenticated: false };
    expect(reducer(state, { type: 'something/else' })).toBe(state);
  });
});

describe('formDrafts slice', () => {
  it('stamps savedAt when the caller does not supply one', () => {
    const next = draftReducer({}, setFormDraft({ key: 'add-plan', values: { a: 1 } }));
    expect(next['add-plan'].values).toEqual({ a: 1 });
    expect(typeof next['add-plan'].savedAt).toBe('number');
  });

  it('keeps a supplied savedAt', () => {
    const next = draftReducer({}, setFormDraft({ key: 'k', values: {}, savedAt: 123 }));
    expect(next.k.savedAt).toBe(123);
  });

  it('drops a draft by key', () => {
    const next = draftReducer({ k: { values: {}, savedAt: 1 } }, clearFormDraft('k'));
    expect(next.k).toBeUndefined();
  });

  it('keys drafts independently', () => {
    let state = draftReducer({}, setFormDraft({ key: 'a', values: { x: 1 } }));
    state = draftReducer(state, setFormDraft({ key: 'b', values: { y: 2 } }));
    state = draftReducer(state, clearFormDraft('a'));
    expect(state.a).toBeUndefined();
    expect(state.b.values).toEqual({ y: 2 });
  });
});
