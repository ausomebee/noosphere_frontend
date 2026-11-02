import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * When the auto-billing invoice settings reach the server.
 *
 * InvoiceManagement.test.jsx swaps lodash's debounce for the identity function;
 * this file keeps the real one. Every control used to share a single 500ms
 * debounce, so changing two sections inside that window saved only the second.
 * Switches now save at once, and typed values are debounced per section.
 */

const mocks = vi.hoisted(() => ({
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
}));

vi.mock('../hooks/useAuth', () => ({
  default: () => ({ accessToken: 'tok', refreshToken: 'ref' }),
}));
vi.mock('../hooks/usePermission', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../api/AutoBillingInvoiceAPIs', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock('../Components/Invoice/SubscriptionInvoice', () => ({ default: () => null }));

import InvoiceManagement from '../Pages/BillingsAndPayment/BillingReport/AutoBilling/InvoiceManagement';

const settings = {
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
    unpaidReminderTimesBefore: 1,
    attachInvoiceToReminder: true,
    reminderEmail: [{ sendOn: 3, header: 'First reminder', body: 'First body' }],
  },
};

const switches = () =>
  Array.from(document.body.querySelectorAll('.input-switch-group input[type="checkbox"]'));
const selects = () => Array.from(document.body.querySelectorAll('select'));

const renderPage = async () => {
  mocks.api.GetInvoiceManagementAllField.mockResolvedValue(settings);
  render(<InvoiceManagement />);
  await waitFor(() => expect(screen.getAllByText(/^Reminder Email \d+$/).length).toBe(1));
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasPermission.mockReturnValue(true);
  Object.values(mocks.api).forEach((fn) => fn.mockResolvedValue({}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saving the invoice settings', () => {
  it('saves both of two switches flipped inside 500ms, straight away', async () => {
    await renderPage();
    const [auto, , due] = switches();
    await act(async () => {
      fireEvent.click(auto);
      fireEvent.click(due);
    });
    // No debounce wait: both requests are already out.
    expect(mocks.api.UpdatePlanPurchaseToggle).toHaveBeenCalledWith(
      expect.objectContaining({ onPlanPurchase: false })
    );
    expect(mocks.api.UpdateOnDueDateToggle).toHaveBeenCalledWith(
      expect.objectContaining({ onDueDate: false })
    );
  });

  it('debounces a typed value, separately for each section', async () => {
    await renderPage();
    const [daysBefore, overdueDays] = selects();
    fireEvent.change(daysBefore, { target: { value: '5' } });
    fireEvent.change(overdueDays, { target: { value: '12' } });
    expect(mocks.api.UpdateDayBeforeDueNumber).not.toHaveBeenCalled();
    expect(mocks.api.MarkOverDueCount).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledTimes(1);
      expect(mocks.api.MarkOverDueCount).toHaveBeenCalledTimes(1);
    });
    expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledWith(
      expect.objectContaining({ daysBeforeDueDate: 5 })
    );
    expect(mocks.api.MarkOverDueCount).toHaveBeenCalledWith(
      expect.objectContaining({ markOverDue: 12 })
    );
  });

  it('does not let a pending typed save undo a switch on the same endpoint', async () => {
    // The day count and the upcoming-invoices switch share one endpoint.
    await renderPage();
    const [daysBefore] = selects();
    const upcoming = switches()[1];
    fireEvent.change(daysBefore, { target: { value: '5' } });
    await act(async () => {
      fireEvent.click(upcoming);
    });
    expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledTimes(1);
    expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledWith(
      expect.objectContaining({ daysBeforeDueDate: 5, isDaysBeforeDueDate: false })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 650));
    });
    // The typed save was folded into the switch's save, not sent again later.
    expect(mocks.api.UpdateDayBeforeDueNumber).toHaveBeenCalledTimes(1);
  });
});
