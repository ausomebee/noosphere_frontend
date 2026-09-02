import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * The auto-billing settings panel: one GET that seeds every control, and a
 * per-section PATCH that each control fires on change. Nothing here is behind a
 * form submit -- inline fields persist as soon as they are touched, which is why
 * `handleInputChange` gates on the permission itself rather than only hiding
 * the buttons.
 *
 * lodash's debounce is replaced with the identity function so a change reaches
 * its endpoint within the test rather than 500ms later; the endpoint call and
 * the refetch that follows it are still asynchronous, hence the waits.
 *
 * The reminder list is rebuilt from the response on every successful save, so
 * assertions about rows the user added locally are made on a save that fails.
 */

const mocks = vi.hoisted(() => ({
  auth: { accessToken: 'tok', refreshToken: 'ref' },
  hasPermission: vi.fn(() => true),
  api: {
    GetInvoiceManagementAllField: vi.fn(),
    UpdatePlanPurchaseToggle: vi.fn(),
    UpdateDayBeforeDueNumber: vi.fn(),
    UpcomingInvoiceEmail: vi.fn(),
    UpdateOnDueDateToggle: vi.fn(),
    DueInvoiceEmail: vi.fn(),
    MarkOverDueCount: vi.fn(),
    ReminderTimesBefore: vi.fn(),
    UpdateAttachToReminderToggle: vi.fn(),
    ReminderEmail: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ default: () => mocks.auth }));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../api/AutoBillingInvoiceAPIs', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));
vi.mock('lodash/debounce', () => ({ default: (fn) => fn }));

vi.mock('../Components/Invoice/SubscriptionInvoice', () => ({
  default: (props) => <div data-testid="invoice-template">{props.invoiceId}</div>,
}));

import InvoiceManagement from '../Pages/BillingsAndPayment/BillingReport/AutoBilling/InvoiceManagement';

// Both email sections switched on, and one stored reminder against a count of
// two, so the loader has to invent the second row.
const fullSettings = {
  data: {
    id: 'cfg-1',
    onPlanPurchase: true,
    isDaysBeforeDueDate: true,
    daysBeforeDueDate: 7,
    upcomingInvoiceHeader: 'Upcoming header',
    upcomingInvoiceBody: 'Upcoming body',
    onDueDate: true,
    dueInvoiceHeader: 'Due header',
    dueInvoiceBody: 'Due body',
    markOverDue: 10,
    unpaidReminderTimesBefore: 2,
    attachInvoiceToReminder: true,
    reminderEmail: [{ sendOn: 3, header: 'First reminder', body: 'First body' }],
  },
};

// Both email sections off, which keeps the Edit/Save buttons on screen limited
// to the reminder rows.
const remindersOnly = {
  data: {
    ...fullSettings.data,
    isDaysBeforeDueDate: false,
    onDueDate: false,
  },
};

const switches = () =>
  Array.from(document.body.querySelectorAll('.input-switch-group input[type="checkbox"]'));
const selects = () => Array.from(document.body.querySelectorAll('select'));
const textInputs = () => Array.from(document.body.querySelectorAll('.input-text'));
const textareas = () => Array.from(document.body.querySelectorAll('.input-textarea'));
const reminderRows = () => screen.getAllByText(/^Reminder Email \d+$/);
const buttons = (name) => screen.getAllByRole('button', { name });

const renderPage = async (settings = fullSettings) => {
  mocks.api.GetInvoiceManagementAllField.mockResolvedValue(settings);
  const view = render(<InvoiceManagement />);
  await waitFor(() =>
    expect(mocks.api.GetInvoiceManagementAllField).toHaveBeenCalled()
  );
  await waitFor(() => expect(reminderRows().length).toBeGreaterThan(0));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { accessToken: 'tok', refreshToken: 'ref' };
  mocks.hasPermission.mockReturnValue(true);
  Object.values(mocks.api).forEach((fn) => fn.mockResolvedValue({}));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the settings', () => {
  it('seeds every control from the response', async () => {
    await renderPage();
    const [auto, upcoming, due, attach, saveMode] = switches();
    expect(auto.checked).toBe(true);
    expect(upcoming.checked).toBe(true);
    expect(due.checked).toBe(true);
    expect(attach.checked).toBe(true);
    expect(saveMode.checked).toBe(false);

    const [daysBefore, overdueDays, reminderTimes] = selects();
    expect(daysBefore.value).toBe('7');
    expect(overdueDays.value).toBe('10');
    expect(reminderTimes.value).toBe('2');
    expect(textInputs()[0].value).toBe('Upcoming header');
    expect(textareas()[0].value).toBe('Upcoming body');
    expect(textInputs()[1].value).toBe('Due header');
    expect(textareas()[1].value).toBe('Due body');
  });

  it('invents the reminders the count asks for, copying the first row', async () => {
    await renderPage();
    expect(reminderRows()).toHaveLength(2);
    // Row two is invented: same wording as row one, sent a day later.
    expect(textInputs()[2].value).toBe('First reminder');
    expect(textInputs()[3].value).toBe('First reminder');
    expect(selects()[3].value).toBe('3');
    expect(selects()[4].value).toBe('2');
  });

  it('clamps a stored reminder to the overdue window', async () => {
    await renderPage({
      data: {
        ...fullSettings.data,
        unpaidReminderTimesBefore: 1,
        reminderEmail: [{ sendOn: 30 }],
      },
    });
    // markOverDue is 10, so a reminder stored for day 30 comes back as day 10.
    expect(selects()[3].value).toBe('10');
    // A stored reminder with no wording falls back to the placeholders.
    expect(textInputs()[2].value).toBe('Type Something');
    expect(textareas()[2].value).toBe('Enter message');
  });

  it('falls back when the flags and the reminder list are absent', async () => {
    await renderPage({
      data: {
        id: 'cfg-2',
        onPlanPurchase: false,
        daysBeforeDueDate: 5,
        markOverDue: 4,
        unpaidReminderTimesBefore: 0,
      },
    });
    const [, upcoming, due] = switches();
    expect(upcoming.checked).toBe(false);
    expect(due.checked).toBe(false);
    // A zero count still leaves one reminder row.
    expect(reminderRows()).toHaveLength(1);
    expect(textInputs()[0].value).toBe('Type Something');
    // The email sections stay collapsed while their toggles are off.
    expect(textareas()).toHaveLength(1);
  });

  it('reports a failed load and leaves the defaults in place', async () => {
    mocks.api.GetInvoiceManagementAllField.mockRejectedValue(new Error('down'));
    render(<InvoiceManagement />);
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_INVOICES')
    );
    expect(reminderRows()).toHaveLength(1);
    expect(selects()[0].value).toBe('10');
  });
});

describe('permissions', () => {
  it('hides every switch and every edit control', async () => {
    mocks.hasPermission.mockReturnValue(false);
    await renderPage();
    expect(switches()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save All Reminders' })
    ).not.toBeInTheDocument();
    // The template preview is not a write, so it stays.
    expect(
      screen.getByRole('button', { name: 'View Invoice Template' })
    ).toBeInTheDocument();
  });

  it('refuses a change made through a control it cannot hide', async () => {
    mocks.hasPermission.mockReturnValue(false);
    await renderPage();
    // The overdue-days picker is never permission-gated in the markup, so the
    // handler has to refuse the write itself.
    fireEvent.change(selects()[1], { target: { value: '20' } });
    expect(mocks.api.MarkOverDueCount).not.toHaveBeenCalled();
    expect(selects()[1].value).toBe('10');
  });
});

describe('the toggles and pickers that persist themselves', () => {
  it('saves the auto-generate toggle', async () => {
    await renderPage();
    fireEvent.click(switches()[0]);
    await waitFor(() => expect(mocks.api.UpdatePlanPurchaseToggle).toHaveBeenCalled());
    expect(mocks.api.UpdatePlanPurchaseToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cfg-1', onPlanPurchase: false })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'autoGenerateInvoice settings updated successfully',
      'success'
    );
    // A successful save reloads the settings.
    expect(mocks.api.GetInvoiceManagementAllField).toHaveBeenCalledTimes(2);
  });

  it('saves the days-before figure as a number', async () => {
    await renderPage();
    fireEvent.change(selects()[0], { target: { value: '12' } });
    await waitFor(() => expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalled());
    expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledWith(
      expect.objectContaining({ daysBeforeDueDate: 12, isDaysBeforeDueDate: true })
    );
  });

  it('routes the upcoming-invoices toggle through the same endpoint', async () => {
    await renderPage();
    fireEvent.click(switches()[1]);
    await waitFor(() => expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalled());
    expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledWith(
      expect.objectContaining({ isDaysBeforeDueDate: false })
    );
  });

  it('saves the due-invoices toggle', async () => {
    await renderPage();
    fireEvent.click(switches()[2]);
    await waitFor(() => expect(mocks.api.UpdateOnDueDateToggle).toHaveBeenCalled());
    expect(mocks.api.UpdateOnDueDateToggle).toHaveBeenCalledWith(
      expect.objectContaining({ onDueDate: false })
    );
  });

  it('saves the overdue window', async () => {
    await renderPage();
    fireEvent.change(selects()[1], { target: { value: '20' } });
    await waitFor(() => expect(mocks.api.MarkOverDueCount).toHaveBeenCalled());
    expect(mocks.api.MarkOverDueCount).toHaveBeenCalledWith(
      expect.objectContaining({ markOverDue: 20 })
    );
  });

  it('saves the attach-invoice toggle', async () => {
    await renderPage();
    fireEvent.click(switches()[3]);
    await waitFor(() =>
      expect(mocks.api.UpdateAttachToReminderToggle).toHaveBeenCalled()
    );
    expect(mocks.api.UpdateAttachToReminderToggle).toHaveBeenCalledWith(
      expect.objectContaining({ attachInvoiceToReminder: false })
    );
  });

  it('reports a failed save', async () => {
    await renderPage();
    mocks.api.UpdatePlanPurchaseToggle.mockRejectedValue(new Error('nope'));
    fireEvent.click(switches()[0]);
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_INVOICE')
    );
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it('does not persist the save-mode switch, which is local only', async () => {
    await renderPage();
    fireEvent.click(switches()[4]);
    expect(switches()[4].checked).toBe(true);
    expect(mocks.showToast).not.toHaveBeenCalled();
  });
});

describe('the two email sections', () => {
  it('edits and saves the upcoming email', async () => {
    await renderPage();
    expect(textInputs()[0]).toBeDisabled();

    fireEvent.click(buttons('Edit')[0]);
    expect(textInputs()[0]).not.toBeDisabled();
    fireEvent.change(textInputs()[0], { target: { value: 'New header' } });
    fireEvent.change(textareas()[0], { target: { value: 'New body' } });
    fireEvent.click(buttons('Save')[0]);

    await waitFor(() => expect(mocks.api.UpcomingInvoiceEmail).toHaveBeenCalled());
    expect(mocks.api.UpcomingInvoiceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        upcomingInvoiceHeader: 'New header',
        upcomingInvoiceBody: 'New body',
      })
    );
    // Saving also leaves edit mode.
    expect(textInputs()[0]).toBeDisabled();
  });

  it('abandons an edit of the upcoming email', async () => {
    await renderPage();
    fireEvent.click(buttons('Edit')[0]);
    fireEvent.click(buttons('Cancel')[0]);
    expect(textInputs()[0]).toBeDisabled();
    expect(mocks.api.UpcomingInvoiceEmail).not.toHaveBeenCalled();
  });

  it('edits and saves the due email', async () => {
    await renderPage();
    fireEvent.click(buttons('Edit')[1]);
    fireEvent.change(textInputs()[1], { target: { value: 'Due header 2' } });
    fireEvent.change(textareas()[1], { target: { value: 'Due body 2' } });
    fireEvent.click(buttons('Save')[0]);

    await waitFor(() => expect(mocks.api.DueInvoiceEmail).toHaveBeenCalled());
    expect(mocks.api.DueInvoiceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        dueInvoiceHeader: 'Due header 2',
        dueInvoiceBody: 'Due body 2',
      })
    );
  });

  it('abandons an edit of the due email', async () => {
    await renderPage();
    fireEvent.click(buttons('Edit')[1]);
    fireEvent.click(buttons('Cancel')[0]);
    expect(textInputs()[1]).toBeDisabled();
    expect(mocks.api.DueInvoiceEmail).not.toHaveBeenCalled();
  });
});

describe('the reminder count', () => {
  it('saves the new count', async () => {
    await renderPage(remindersOnly);
    fireEvent.change(selects()[2], { target: { value: '4' } });
    await waitFor(() => expect(mocks.api.ReminderTimesBefore).toHaveBeenCalled());
    expect(mocks.api.ReminderTimesBefore).toHaveBeenCalledWith(
      expect.objectContaining({ unpaidReminderTimesBefore: 4 })
    );
  });

  it('appends rows that copy the first reminder', async () => {
    await renderPage(remindersOnly);
    // A failing save keeps the refetch from rebuilding the list underneath us.
    mocks.api.ReminderTimesBefore.mockRejectedValue(new Error('nope'));
    fireEvent.change(selects()[2], { target: { value: '4' } });
    await waitFor(() => expect(reminderRows()).toHaveLength(4));
    expect(textInputs()[3].value).toBe('First reminder');
    // The invented rows continue the run of days.
    expect(selects()[5].value).toBe('3');
    expect(selects()[6].value).toBe('4');
  });

  it('drops rows when the count is lowered', async () => {
    await renderPage(remindersOnly);
    mocks.api.ReminderTimesBefore.mockRejectedValue(new Error('nope'));
    fireEvent.change(selects()[2], { target: { value: '1' } });
    await waitFor(() => expect(reminderRows()).toHaveLength(1));
  });

  it('leaves the rows alone when the count does not move', async () => {
    await renderPage(remindersOnly);
    mocks.api.ReminderTimesBefore.mockRejectedValue(new Error('nope'));
    fireEvent.change(selects()[2], { target: { value: '2' } });
    await waitFor(() => expect(mocks.showApiError).toHaveBeenCalled());
    expect(reminderRows()).toHaveLength(2);
  });
});

describe('editing a reminder', () => {
  it('enables its fields and lets the edit be abandoned', async () => {
    await renderPage(remindersOnly);
    expect(textInputs()[0]).toBeDisabled();
    fireEvent.click(buttons('Edit')[0]);
    expect(textInputs()[0]).not.toBeDisabled();
    // The other reminder is untouched.
    expect(textInputs()[1]).toBeDisabled();

    fireEvent.click(buttons('Cancel')[0]);
    expect(textInputs()[0]).toBeDisabled();
  });

  it('edits the day, the header and the body', async () => {
    await renderPage(remindersOnly);
    fireEvent.click(buttons('Edit')[0]);
    fireEvent.change(selects()[3], { target: { value: '6' } });
    fireEvent.change(textInputs()[0], { target: { value: 'Nudge' } });
    fireEvent.change(textareas()[0], { target: { value: 'Please pay' } });

    expect(selects()[3].value).toBe('6');
    expect(textInputs()[0].value).toBe('Nudge');
    expect(textareas()[0].value).toBe('Please pay');
    // Field edits are local; nothing is sent until the row is saved.
    expect(mocks.api.ReminderEmail).not.toHaveBeenCalled();
  });

  it('holds a batch back until every reminder has been saved', async () => {
    await renderPage(remindersOnly);
    fireEvent.click(buttons('Edit')[0]);
    fireEvent.click(buttons('Save')[0]);
    expect(mocks.api.ReminderEmail).not.toHaveBeenCalled();

    // The second row is the one that completes the batch.
    fireEvent.click(buttons('Edit')[1]);
    fireEvent.click(buttons('Save')[0]);
    await waitFor(() => expect(mocks.api.ReminderEmail).toHaveBeenCalled());
    expect(mocks.api.ReminderEmail.mock.calls[0][0].reminderEmail).toHaveLength(2);
  });

  it('sends every reminder immediately in individual mode', async () => {
    await renderPage(remindersOnly);
    fireEvent.click(switches()[4]);
    fireEvent.click(buttons('Edit')[0]);
    fireEvent.change(textInputs()[0], { target: { value: 'Nudge' } });
    fireEvent.click(buttons('Save')[0]);

    await waitFor(() => expect(mocks.api.ReminderEmail).toHaveBeenCalled());
    const [payload] = mocks.api.ReminderEmail.mock.calls[0];
    expect(payload.reminderEmail).toEqual([
      { header: 'Nudge', body: 'First body', sendOn: 3 },
      { header: 'First reminder', body: 'First body', sendOn: 2 },
    ]);
  });

  it('sends a lone reminder as soon as it is saved', async () => {
    await renderPage({
      data: { ...remindersOnly.data, unpaidReminderTimesBefore: 1 },
    });
    fireEvent.click(buttons('Edit')[0]);
    fireEvent.click(buttons('Save')[0]);
    await waitFor(() => expect(mocks.api.ReminderEmail).toHaveBeenCalled());
    expect(mocks.api.ReminderEmail.mock.calls[0][0].reminderEmail).toHaveLength(1);
  });

  it('sends the whole set from Save All Reminders', async () => {
    await renderPage(remindersOnly);
    fireEvent.click(screen.getByRole('button', { name: 'Save All Reminders' }));
    await waitFor(() => expect(mocks.api.ReminderEmail).toHaveBeenCalled());
    expect(mocks.api.ReminderEmail.mock.calls[0][0].reminderEmail).toHaveLength(2);
    expect(mocks.showToast).toHaveBeenCalledWith(
      'reminder settings updated successfully',
      'success'
    );
  });

  it('hides Save All Reminders outside batch mode and for a lone reminder', async () => {
    await renderPage(remindersOnly);
    fireEvent.click(switches()[4]);
    expect(
      screen.queryByRole('button', { name: 'Save All Reminders' })
    ).not.toBeInTheDocument();

    fireEvent.click(switches()[4]);
    expect(
      screen.getByRole('button', { name: 'Save All Reminders' })
    ).toBeInTheDocument();
  });

  it('keeps Save All Reminders away when there is only one row', async () => {
    await renderPage({
      data: { ...remindersOnly.data, unpaidReminderTimesBefore: 1 },
    });
    expect(
      screen.queryByRole('button', { name: 'Save All Reminders' })
    ).not.toBeInTheDocument();
  });
});

describe('the invoice template preview', () => {
  it('opens and closes from its own button', async () => {
    await renderPage();
    expect(screen.queryByTestId('invoice-template')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View Invoice Template' }));
    expect(screen.getByTestId('invoice-template').textContent).toBe('INV001331');

    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByTestId('invoice-template')).not.toBeInTheDocument();
  });

  it('closes from the backdrop but not from the panel', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'View Invoice Template' }));
    const panel = screen.getByTestId('invoice-template').parentElement;

    fireEvent.click(panel);
    expect(screen.getByTestId('invoice-template')).toBeInTheDocument();

    fireEvent.click(panel.parentElement);
    expect(screen.queryByTestId('invoice-template')).not.toBeInTheDocument();
  });
});

describe('inventing a reminder from a wordless first row', () => {
  it('carries the placeholder wording through to the invented row', async () => {
    await renderPage({
      data: {
        ...fullSettings.data,
        unpaidReminderTimesBefore: 2,
        // A stored row with no wording of its own: it picks up the
        // placeholders on the way in, and the invented row copies those.
        reminderEmail: [{ sendOn: 1 }],
      },
    });
    expect(reminderRows()).toHaveLength(2);
    expect(textInputs()[3].value).toBe('Type Something');
    expect(textareas()[3].value).toBe('Enter message');
  });
});
