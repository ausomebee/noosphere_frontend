import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// TableUtils pulls jsPDF and jspdf-autotable in transitively; left real, the
// PDF export writes an actual file into the repo.
const exportTableData = vi.fn();
const exportTableToPDF = vi.fn();
const printTableData = vi.fn();
vi.mock('../utils/TableUtils', () => ({
  exportTableData: (...a) => exportTableData(...a),
  exportTableToPDF: (...a) => exportTableToPDF(...a),
  printTableData: (...a) => printTableData(...a),
}));

import TenantListViewPayment from '../Pages/Tenant/TenantList/TenantListViewPayment';

/**
 * A read-only receipt panel for one tenant payment.
 *
 * Everything it shows comes from props that all carry defaults, so the component
 * renders a complete fake receipt with no props at all — which means the default
 * arm of every parameter has to be tested by omission rather than by passing
 * something. The interesting logic is the renderer for one `paymentInfo` entry:
 * it special-cases the `Payment Method` and `Invoice` keys when their value is a
 * non-null object, falls back to `JSON.stringify` for any other object, and to
 * the literal string `N/A` for anything falsy. Because those keys are matched by
 * label AND by shape, a `Payment Method` holding a plain string, or holding
 * `null`, drops through to the scalar arm — both are exercised below.
 *
 * The breadcrumb is split on ' / ' so the last segment can be highlighted; a
 * breadcrumb with no separator at all takes a different arm and is covered too.
 */

const onBack = vi.fn();
const onViewInvoice = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('default props', () => {
  it('renders the built-in tenant receipt when given nothing at all', () => {
    const { container } = render(<TenantListViewPayment />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tenants');
    expect(screen.getByText('PAYMENT INFO')).toBeInTheDocument();
    // The default paymentInfo covers all four value shapes at once.
    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('Aug - Sep')).toBeInTheDocument();
    expect(screen.getByText('IDCabAS3029bdtfr')).toBeInTheDocument();
    expect(container.querySelector('img.card-icon')).toHaveAttribute(
      'src',
      '/amex-icon.png'
    );
    expect(screen.getByText(/XXXX-XXXX-XXXX-2345/)).toBeInTheDocument();
    expect(screen.getByText(/invoice_Inv32b87456/)).toBeInTheDocument();
  });

  it('prefers an explicit title over the default', () => {
    render(<TenantListViewPayment title="ACME Corp" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ACME Corp');
    expect(screen.queryByRole('heading', { name: 'Tenants' })).not.toBeInTheDocument();
  });
});

describe('breadcrumb', () => {
  it('highlights the last segment and keeps the separator before it', () => {
    const { container } = render(
      <TenantListViewPayment breadcrumb="Tenants / ACME / Payment Info" />
    );

    const crumb = container.querySelector('.breadcrumb');
    expect(crumb).toHaveTextContent('Tenants / ACME / Payment Info');
    expect(container.querySelector('.breadcrumb-active')).toHaveTextContent(
      'Payment Info'
    );
  });

  it('renders a separator-free breadcrumb as nothing but the active segment', () => {
    const { container } = render(<TenantListViewPayment breadcrumb="Tenants" />);

    const crumb = container.querySelector('.breadcrumb');
    // No leading part and no ' / ' — the whole string is the active segment.
    expect(crumb.textContent).toBe('Tenants');
    expect(container.querySelector('.breadcrumb-active')).toHaveTextContent('Tenants');
  });

  it('highlights the trailing segment of a two-part breadcrumb', () => {
    const { container } = render(<TenantListViewPayment breadcrumb="Tenants / Billing" />);

    expect(container.querySelector('.breadcrumb').textContent).toBe('Tenants / Billing');
    expect(container.querySelector('.breadcrumb-active')).toHaveTextContent('Billing');
  });
});

describe('back button', () => {
  it('calls onBack when pressed', () => {
    render(<TenantListViewPayment onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('stays mounted when pressed with no onBack wired up', () => {
    render(<TenantListViewPayment />);

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText('PAYMENT INFO')).toBeInTheDocument();
  });
});

describe('payment method row', () => {
  it('renders a string icon as an image beside the card number', () => {
    const { container } = render(
      <TenantListViewPayment
        paymentInfo={{
          'Payment Method': { icon: '/visa.png', number: '4242' },
        }}
      />
    );

    const img = container.querySelector('img.card-icon');
    expect(img).toHaveAttribute('src', '/visa.png');
    expect(img).toHaveAttribute('alt', 'Card');
    expect(screen.getByText(/4242/)).toBeInTheDocument();
  });

  it('renders a non-string icon inline instead of building an image', () => {
    const { container } = render(
      <TenantListViewPayment
        // A number is a valid React child, so the else arm is observable
        // without React throwing on an unrenderable value.
        paymentInfo={{ 'Payment Method': { icon: 7, number: '9999' } }}
      />
    );

    expect(container.querySelector('img.card-icon')).toBeNull();
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/9999/)).toBeInTheDocument();
  });

  it('falls back to N/A when the card number is missing', () => {
    render(
      <TenantListViewPayment
        paymentInfo={{ 'Payment Method': { icon: '/visa.png' } }}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('treats a null payment method as a plain empty value', () => {
    const { container } = render(
      <TenantListViewPayment paymentInfo={{ 'Payment Method': null }} />
    );

    // typeof null is 'object', so only the explicit null check keeps this out
    // of the card-icon arm.
    expect(container.querySelector('img.card-icon')).toBeNull();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders a payment method given as a bare string as that string', () => {
    const { container } = render(
      <TenantListViewPayment paymentInfo={{ 'Payment Method': 'Cash' }} />
    );

    expect(container.querySelector('img.card-icon')).toBeNull();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });
});

describe('invoice row', () => {
  it('shows the invoice id and calls onViewInvoice with it', () => {
    render(
      <TenantListViewPayment
        paymentInfo={{ Invoice: { id: 'INV-1', link: '#' } }}
        onViewInvoice={onViewInvoice}
      />
    );

    expect(screen.getByText(/invoice_INV-1/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('View'));

    expect(onViewInvoice).toHaveBeenCalledWith('INV-1');
  });

  it('prevents the anchor from navigating', () => {
    render(
      <TenantListViewPayment
        paymentInfo={{ Invoice: { id: 'INV-2' } }}
        onViewInvoice={onViewInvoice}
      />
    );

    const clicked = fireEvent.click(screen.getByText('View'));

    // fireEvent returns false once preventDefault has run on the event.
    expect(clicked).toBe(false);
  });

  it('ignores the View link when no onViewInvoice was supplied', () => {
    render(<TenantListViewPayment paymentInfo={{ Invoice: { id: 'INV-3' } }} />);

    fireEvent.click(screen.getByText('View'));

    expect(onViewInvoice).not.toHaveBeenCalled();
  });

  it('does not call onViewInvoice for an invoice with no id', () => {
    render(
      <TenantListViewPayment
        paymentInfo={{ Invoice: { link: '#' } }}
        onViewInvoice={onViewInvoice}
      />
    );

    expect(screen.getByText(/invoice_N\/A/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('View'));

    expect(onViewInvoice).not.toHaveBeenCalled();
  });

  it('treats a null invoice as a plain empty value', () => {
    render(<TenantListViewPayment paymentInfo={{ Invoice: null }} />);

    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders an invoice given as a bare string as that string', () => {
    render(<TenantListViewPayment paymentInfo={{ Invoice: 'INV-PLAIN' }} />);

    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.getByText('INV-PLAIN')).toBeInTheDocument();
  });
});

describe('other value shapes', () => {
  it('serialises an unexpected object rather than dropping it', () => {
    render(
      <TenantListViewPayment paymentInfo={{ Metadata: { source: 'stripe' } }} />
    );

    expect(screen.getByText('{"source":"stripe"}')).toBeInTheDocument();
  });

  it('serialises an array value the same way', () => {
    render(<TenantListViewPayment paymentInfo={{ Tags: ['a', 'b'] }} />);

    expect(screen.getByText('["a","b"]')).toBeInTheDocument();
  });

  it('renders N/A for every falsy scalar', () => {
    render(
      <TenantListViewPayment
        paymentInfo={{ Plan: '', Period: null, Amount: 0, Method: undefined }}
      />
    );

    expect(screen.getAllByText('N/A')).toHaveLength(4);
  });

  it('renders a truthy scalar as itself', () => {
    render(<TenantListViewPayment paymentInfo={{ Amount: '$256' }} />);

    expect(screen.getByText('$256')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('renders one labelled row per entry', () => {
    const { container } = render(
      <TenantListViewPayment paymentInfo={{ Plan: 'Pro', Period: 'Sep' }} />
    );

    expect(container.querySelectorAll('.payment-row')).toHaveLength(2);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Period')).toBeInTheDocument();
  });

  it('renders no rows at all for an empty paymentInfo', () => {
    const { container } = render(<TenantListViewPayment paymentInfo={{}} />);

    expect(container.querySelectorAll('.payment-row')).toHaveLength(0);
    expect(screen.getByText('PAYMENT INFO')).toBeInTheDocument();
  });
});

describe('export and print actions', () => {
  const info = { Plan: 'Pro' };

  it('exports the payment info as CSV', () => {
    render(<TenantListViewPayment paymentInfo={info} />);

    fireEvent.click(screen.getByLabelText('Export data'));
    fireEvent.click(screen.getByText('Export as CSV'));

    expect(exportTableData).toHaveBeenCalledWith(info);
  });

  it('exports the payment info as PDF', () => {
    render(<TenantListViewPayment paymentInfo={info} />);

    fireEvent.click(screen.getByLabelText('Export data'));
    fireEvent.click(screen.getByText('Export as PDF'));

    expect(exportTableToPDF).toHaveBeenCalledWith(info);
  });

  it('prints the payment info', () => {
    render(<TenantListViewPayment paymentInfo={info} />);

    fireEvent.click(screen.getByLabelText('Print'));

    expect(printTableData).toHaveBeenCalledWith(info);
  });

  it('passes the default payment info through to export when none was given', () => {
    render(<TenantListViewPayment />);

    fireEvent.click(screen.getByLabelText('Export data'));
    fireEvent.click(screen.getByText('Export as CSV'));

    expect(exportTableData).toHaveBeenCalledWith(
      expect.objectContaining({ Plan: 'Basic Plan' })
    );
  });
});
