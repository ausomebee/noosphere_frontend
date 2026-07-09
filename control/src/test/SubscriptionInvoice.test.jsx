import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubscriptionInvoice from '../Components/Invoice/SubscriptionInvoice';

describe('SubscriptionInvoice', () => {
  const props = {
    invoiceId: 'INV-9999',
    dueDate: '25 Dec 2025',
    billingFrequency: 'Annual',
    customerInfo: {
      name: 'Test Corp',
      street: '100 Main St',
      city: 'Austin, TX, US',
      zip: '73301',
    },
    items: [
      {
        id: '1',
        description: 'Pro Plan',
        rate: '$50',
        quantity: 2,
        price: '$100',
      },
    ],
    total: '$100',
  };

  it('renders invoice ID', () => {
    render(<SubscriptionInvoice {...props} />);
    expect(screen.getByText(/INV-9999/)).toBeInTheDocument();
  });

  it('renders due date', () => {
    render(<SubscriptionInvoice {...props} />);
    expect(screen.getByText(/25 Dec 2025/)).toBeInTheDocument();
  });

  it('renders billing frequency', () => {
    render(<SubscriptionInvoice {...props} />);
    expect(screen.getByText(/Annual/)).toBeInTheDocument();
  });

  it('renders customer info', () => {
    render(<SubscriptionInvoice {...props} />);
    expect(screen.getByText(/Test Corp/)).toBeInTheDocument();
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    expect(screen.getByText(/Austin, TX, US/)).toBeInTheDocument();
    expect(screen.getByText(/73301/)).toBeInTheDocument();
  });

  it('renders line items in table', () => {
    render(<SubscriptionInvoice {...props} />);
    expect(screen.getByText(/Pro Plan/)).toBeInTheDocument();
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText(/\$100/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders total amount', () => {
    render(<SubscriptionInvoice {...props} />);
    expect(screen.getByText('Total:')).toBeInTheDocument();
    const totalCells = screen.getAllByText(/\$100/);
    expect(totalCells.length).toBeGreaterThanOrEqual(1);
  });

  it('uses default props when none provided', () => {
    render(<SubscriptionInvoice />);
    expect(screen.getByText(/INV001331/)).toBeInTheDocument();
    expect(screen.getByText(/12 May 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly/)).toBeInTheDocument();
    expect(screen.getByText(/ACME Org/)).toBeInTheDocument();
  });
});
