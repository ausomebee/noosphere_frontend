import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

// Every endpoint the page can reach, as its own spy, so a test can name the one
// it expects and be sure none of the other fourteen fired instead.
const api = vi.hoisted(() => {
  const names = [
    'GetPaymentAccessManagementAllField',
    'UpdateChargeOnDueDateToggle',
    'UpdateChargeLastUsedFirstToggle',
    'UpdateChargeAlternativeToggle',
    'UpdateRetryBeforeCount',
    'UpdateRetryAfterCount',
    'UpdateNotifyTenantToggle',
    'UpdateCancelAfter',
    'UpdateManualCancel',
    'UpdateEmailAfterAttempts',
    'SendOnSubCancel',
    'NotificationEmail',
    'WarningEmail',
    'CancelEmail',
    'UpdateSuspensionAction',
  ];
  return Object.fromEntries(names.map((n) => [n, vi.fn()]));
});
vi.mock('../api/AutoBillingPandAApis', () => ({ default: api }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import PaymentManagement from '../Pages/BillingsAndPayment/BillingReport/AutoBilling/PaymentManagement';

/**
 * The auto-billing payment and access settings page.
 *
 * Everything on it persists itself. Switches and dropdowns write straight
 * through a 500ms lodash debounce to one endpoint apiece, while the three email
 * blocks and the suspension action sit behind an Edit/Cancel/Save pair and
 * write as a form. Both routes funnel into the same debounced saver, so nothing
 * reaches the network until the timers are advanced past half a second, and two
 * changes made inside that window collapse into one request.
 *
 * The whole write path is gated on `configure_auto_billing` inside the change
 * handler rather than on the controls, because the dropdowns render for
 * everyone -- hiding only the switches would still leave those dropdowns
 * saving.
 *
 * The page also keeps a pristine copy of whatever it fetched and restores it
 * whenever an edit form is toggled shut, which is what makes Cancel work -- and
 * also what makes Save visibly discard the user's typing while the refetch is
 * in flight.
 */

// Numbers, not strings: the loader calls `.toString()` on four of these fields,
// which is the page's only guard against a malformed response.
const fetched = (over = {}) => ({
  data: {
    id: 'ps1',
    chargeOnDueDate: false,
    chargeLastUsedFirst: false,
    chargeAlternative: false,
    retryBefore: 2,
    retryAfter: 3,
    notifyTenant: false,
    notificationEmailHeader: 'Payment Failed Notification',
    notificationEmailBody: 'Saved body',
    cancelAfter: 5,
    manualCancel: false,
    suspensionAction: 'SUSPEND_SERVICE',
    errorMessage: 'Saved error',
    emailAfterAttempts: 0,
    warningMailHeader: 'Warning: Payment Issue Detected',
    warningMailBody: 'Saved warning',
    sendOnSubscriptionCancel: false,
    cancelMailHeader: 'Subscription Cancelled',
    cancelMailBody: 'Saved cancel',
    ...over,
  },
});

const renderPage = async (over) => {
  api.GetPaymentAccessManagementAllField.mockResolvedValue(fetched(over));
  const utils = render(<PaymentManagement />);
  await act(async () => {});
  return utils;
};

// Past the 500ms debounce, then far enough for the save and its refetch to land.
const flushSave = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
};

const switchFor = (labelText) =>
  screen.getByText(labelText).closest('.form-header').querySelector('input[type="checkbox"]');

// Each counter dropdown is identified by the wording that follows it.
const counterFor = (trailingLabel) =>
  Array.from(document.querySelectorAll('.upcoming-invoice-controls'))
    .find((el) => el.textContent.includes(trailingLabel))
    .querySelector('select');

const buttonsLabelled = (label) =>
  Array.from(document.querySelectorAll('button.custom-button')).filter(
    (b) => b.textContent.trim() === label
  );

// An admin whose role grants something other than auto-billing configuration.
const withoutConfigurePermission = () => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'BILLING', permissions: ['view_billing'] }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  delete state.authentication.user.role;
  Object.values(api).forEach((fn) => fn.mockResolvedValue({}));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('loading the saved settings', () => {
  it('asks for the settings once on mount', async () => {
    await renderPage();
    expect(api.GetPaymentAccessManagementAllField).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('shows the counters the backend returned', async () => {
    await renderPage();
    expect(counterFor('times before invoice becomes overdue').value).toBe('2');
    expect(counterFor('times after invoice becomes overdue').value).toBe('3');
    expect(counterFor('days of overdue invoice').value).toBe('5');
  });

  it('leaves the warning-email switch off when no attempt count was set', async () => {
    await renderPage({ emailAfterAttempts: 0 });
    expect(switchFor('Send warning email after').checked).toBe(false);
    expect(screen.queryByText('Warning Email Notification')).not.toBeInTheDocument();
  });

  it('turns the warning-email switch on for any attempt count above zero', async () => {
    await renderPage({ emailAfterAttempts: 3 });
    expect(switchFor('Send warning email after').checked).toBe(true);
    expect(screen.getByText('Warning Email Notification')).toBeInTheDocument();
  });

  it('reports a refused load and keeps its built-in defaults', async () => {
    api.GetPaymentAccessManagementAllField.mockRejectedValue(new Error('nope'));
    render(<PaymentManagement />);
    await act(async () => {});

    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_PAYMENTS');
    expect(counterFor('days of overdue invoice').value).toBe('5');
  });

  it('reports a response missing the fields it stringifies', async () => {
    // `retryBefore.toString()` is the first thing to touch the payload, so a
    // response without it fails inside the same try and surfaces as a load
    // error rather than a blank page.
    api.GetPaymentAccessManagementAllField.mockResolvedValue({ data: { id: 'ps1' } });
    render(<PaymentManagement />);
    await act(async () => {});

    expect(showApiError).toHaveBeenCalledWith(expect.any(TypeError), 'LOAD_PAYMENTS');
  });
});

describe('the self-saving switches', () => {
  it.each([
    [
      'Charge tenant payment method on invoice due date',
      'UpdateChargeOnDueDateToggle',
      'chargeOnDueDate',
    ],
    [
      'If tenant has multiple payment methods, charge last used method first',
      'UpdateChargeLastUsedFirstToggle',
      'chargeLastUsedFirst',
    ],
    [
      'Charge alternative payment methods if the last used method fails',
      'UpdateChargeAlternativeToggle',
      'chargeAlternative',
    ],
    ['Notify tenant of every charge attempt', 'UpdateNotifyTenantToggle', 'notifyTenant'],
    ['Allow admin to manually cancel subscriptions', 'UpdateManualCancel', 'manualCancel'],
    [
      'Send an email when subscription is cancelled',
      'SendOnSubCancel',
      'sendOnSubscriptionCancel',
    ],
  ])('sends %s through its own endpoint', async (label, endpoint, field) => {
    await renderPage();
    fireEvent.click(switchFor(label));
    await flushSave();

    expect(api[endpoint]).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      id: 'ps1',
      [field]: true,
    });
    expect(showToast).toHaveBeenCalledWith(`${field} updated successfully`, 'success');
  });

  it('sends nothing until the debounce elapses', async () => {
    await renderPage();
    fireEvent.click(switchFor('Notify tenant of every charge attempt'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(api.UpdateNotifyTenantToggle).not.toHaveBeenCalled();
  });

  it('collapses two changes made inside the debounce window into the later one', async () => {
    await renderPage();
    fireEvent.click(switchFor('Notify tenant of every charge attempt'));
    fireEvent.click(switchFor('Allow admin to manually cancel subscriptions'));
    await flushSave();

    expect(api.UpdateNotifyTenantToggle).not.toHaveBeenCalled();
    expect(api.UpdateManualCancel).toHaveBeenCalledTimes(1);
  });

  it('reloads the settings after a save lands', async () => {
    await renderPage();
    fireEvent.click(switchFor('Allow admin to manually cancel subscriptions'));
    await flushSave();
    expect(api.GetPaymentAccessManagementAllField).toHaveBeenCalledTimes(2);
  });

  it('reports a refused save', async () => {
    await renderPage();
    api.UpdateManualCancel.mockRejectedValue(new Error('server said no'));
    fireEvent.click(switchFor('Allow admin to manually cancel subscriptions'));
    await flushSave();

    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_PAYMENT');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('reveals the notification email block once tenants are being notified', async () => {
    await renderPage();
    expect(screen.queryByText('Payment Failure Notification')).not.toBeInTheDocument();
    fireEvent.click(switchFor('Notify tenant of every charge attempt'));
    expect(screen.getByText('Payment Failure Notification')).toBeInTheDocument();
  });

  it('reveals the cancellation email block once cancellation mail is on', async () => {
    await renderPage();
    expect(screen.queryByText('Cancellation Email Notification')).not.toBeInTheDocument();
    fireEvent.click(switchFor('Send an email when subscription is cancelled'));
    expect(screen.getByText('Cancellation Email Notification')).toBeInTheDocument();
  });
});

describe('the warning-email switch', () => {
  it('zeroes the attempt count when it is switched off', async () => {
    await renderPage({ emailAfterAttempts: 3 });
    fireEvent.click(switchFor('Send warning email after'));
    await flushSave();

    expect(api.UpdateEmailAfterAttempts).toHaveBeenCalledWith(
      expect.objectContaining({ emailAfterAttempts: 0 })
    );
  });

  it('sends the count chosen alongside it when it is switched on', async () => {
    // Picking a count and flipping the switch inside the debounce window is one
    // request, and it is the switch's arm of the ternary that decides what goes
    // out -- the count it reads is the one the dropdown just set.
    await renderPage({ emailAfterAttempts: 0 });
    fireEvent.change(counterFor('failed payment attempts'), { target: { value: '4' } });
    fireEvent.click(switchFor('Send warning email after'));
    await flushSave();

    expect(api.UpdateEmailAfterAttempts).toHaveBeenCalledTimes(1);
    expect(api.UpdateEmailAfterAttempts).toHaveBeenCalledWith(
      expect.objectContaining({ emailAfterAttempts: 4 })
    );
  });
});

describe('the self-saving counters', () => {
  it.each([
    ['times before invoice becomes overdue', 'UpdateRetryBeforeCount', 'retryBefore'],
    ['times after invoice becomes overdue', 'UpdateRetryAfterCount', 'retryAfter'],
    ['days of overdue invoice', 'UpdateCancelAfter', 'cancelAfter'],
  ])('sends the count read off "%s"', async (trailing, endpoint, field) => {
    await renderPage();
    fireEvent.change(counterFor(trailing), { target: { value: '7' } });
    await flushSave();

    expect(api[endpoint]).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      id: 'ps1',
      [field]: 7,
    });
  });

  it('sends the attempt count it was given', async () => {
    await renderPage({ emailAfterAttempts: 0 });
    fireEvent.change(counterFor('failed payment attempts'), { target: { value: '4' } });
    await flushSave();

    expect(api.UpdateEmailAfterAttempts).toHaveBeenCalledWith(
      expect.objectContaining({ emailAfterAttempts: 4 })
    );
  });

  it('lets the reload overwrite the warning-email switch the save just turned on', async () => {
    // Saving a positive count flips the switch on locally, and then the refetch
    // that follows every save replaces the whole settings object with whatever
    // the backend still reports.
    await renderPage({ emailAfterAttempts: 0 });
    fireEvent.change(counterFor('failed payment attempts'), { target: { value: '4' } });
    await flushSave();

    expect(switchFor('Send warning email after').checked).toBe(false);
  });

  it('sends a count of NaN when the attempt dropdown is set back to its placeholder', async () => {
    // SelectInput always renders an empty-valued placeholder option, and the
    // page parses whatever comes back without checking it.
    await renderPage({ emailAfterAttempts: 3 });
    fireEvent.change(counterFor('failed payment attempts'), { target: { value: '' } });
    await flushSave();

    expect(api.UpdateEmailAfterAttempts).toHaveBeenCalledWith(
      expect.objectContaining({ emailAfterAttempts: NaN })
    );
  });
});

describe('the email and suspension forms', () => {
  it('keeps the notification fields read-only until Edit is clicked', async () => {
    await renderPage({ notifyTenant: true });
    const header = screen.getAllByText('Email Header')[0]
      .closest('.input-group')
      .querySelector('input');
    expect(header).toBeDisabled();

    // Edit buttons in document order: notification email, then suspension.
    fireEvent.click(buttonsLabelled('Edit')[0]);
    expect(header).toBeEnabled();
  });

  it('saves the notification email as a form', async () => {
    await renderPage({ notifyTenant: true });
    fireEvent.click(buttonsLabelled('Edit')[0]);
    const header = screen.getAllByText('Email Header')[0]
      .closest('.input-group')
      .querySelector('input');
    fireEvent.change(header, { target: { value: 'Card declined' } });
    fireEvent.click(buttonsLabelled('Save')[0]);
    await flushSave();

    expect(api.NotificationEmail).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      id: 'ps1',
      notificationEmailHeader: 'Card declined',
      notificationEmailBody: 'Saved body',
    });
    expect(showToast).toHaveBeenCalledWith(
      'notificationEmail form updated successfully',
      'success'
    );
  });

  it('saves the suspension action and its error message together', async () => {
    await renderPage();
    fireEvent.click(buttonsLabelled('Edit')[0]);
    fireEvent.change(document.querySelector('select.csub-select'), {
      target: { value: 'PREVENT_LOGIN' },
    });
    fireEvent.click(buttonsLabelled('Save')[0]);
    await flushSave();

    expect(api.UpdateSuspensionAction).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      id: 'ps1',
      suspensionAction: 'PREVENT_LOGIN',
      errorMessage: 'Saved error',
    });
  });

  it('saves the warning email as a form', async () => {
    // With the warning block open and the other two shut, the second Edit
    // button on the page belongs to it.
    await renderPage({ emailAfterAttempts: 3 });
    fireEvent.click(buttonsLabelled('Edit')[1]);
    const body = screen.getAllByText('Email Body')[0]
      .closest('.input-group')
      .querySelector('textarea');
    fireEvent.change(body, { target: { value: 'We could not charge you.' } });
    fireEvent.click(buttonsLabelled('Save')[0]);
    await flushSave();

    expect(api.WarningEmail).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      id: 'ps1',
      warningMailHeader: 'Warning: Payment Issue Detected',
      warningMailBody: 'We could not charge you.',
    });
  });

  it('saves the cancellation email as a form', async () => {
    await renderPage({ sendOnSubscriptionCancel: true });
    fireEvent.click(buttonsLabelled('Edit')[1]);
    const header = screen.getAllByText('Email Header')[0]
      .closest('.input-group')
      .querySelector('input');
    fireEvent.change(header, { target: { value: 'Sorry to see you go' } });
    fireEvent.click(buttonsLabelled('Save')[0]);
    await flushSave();

    expect(api.CancelEmail).toHaveBeenCalledWith({
      accessToken: 'at',
      refreshToken: 'rt',
      id: 'ps1',
      cancelMailHeader: 'Sorry to see you go',
      cancelMailBody: 'Saved cancel',
    });
  });

  it('throws away the typing when Cancel is clicked', async () => {
    await renderPage({ notifyTenant: true });
    fireEvent.click(buttonsLabelled('Edit')[0]);
    const header = screen.getAllByText('Email Header')[0]
      .closest('.input-group')
      .querySelector('input');
    fireEvent.change(header, { target: { value: 'Half-typed' } });
    fireEvent.click(buttonsLabelled('Cancel')[0]);

    expect(header.value).toBe('Payment Failed Notification');
    expect(api.NotificationEmail).not.toHaveBeenCalled();
  });

  it('does not save a field typed into a form until Save is clicked', async () => {
    await renderPage({ notifyTenant: true });
    fireEvent.click(buttonsLabelled('Edit')[0]);
    fireEvent.change(
      screen.getAllByText('Email Header')[0].closest('.input-group').querySelector('input'),
      { target: { value: 'Typed but unsaved' } }
    );
    await flushSave();
    expect(api.NotificationEmail).not.toHaveBeenCalled();
  });
});

describe('an admin without the configure permission', () => {
  beforeEach(withoutConfigurePermission);

  it('is shown no switches and no edit controls at all', async () => {
    // All three email blocks open, so every permission-gated control on the
    // page has a chance to render and none of them does.
    await renderPage({
      notifyTenant: true,
      emailAfterAttempts: 3,
      sendOnSubscriptionCancel: true,
    });
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(buttonsLabelled('Edit')).toHaveLength(0);
  });

  it('still sees the counters but cannot save through them', async () => {
    // The dropdowns are rendered for everyone, so the guard lives in the change
    // handler: the value does not even move.
    await renderPage();
    const counter = counterFor('days of overdue invoice');
    fireEvent.change(counter, { target: { value: '9' } });
    await flushSave();

    expect(api.UpdateCancelAfter).not.toHaveBeenCalled();
    expect(counter.value).toBe('5');
  });
});
