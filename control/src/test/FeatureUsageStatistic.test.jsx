import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ApexCharts wants a real layout engine; the probe only has to say which of the
// three series is on screen, which the chart id already encodes.
vi.mock('react-apexcharts', () => ({
  default: (props) => (
    <div data-testid="chart" data-chart={props.options?.chart?.id || 'sessions'} />
  ),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => {
    table.props = props;
    return <div data-testid="table" />;
  },
}));

import FeatureUsageStatistic from '../Pages/FeatureManagement/FeatureSubComps/FeatureUsageStatistic';

/**
 * The per-feature usage screen.
 *
 * Everything on it is static sample data except two pieces of state: which of
 * the three charts is showing, and the filter value the table reports back. The
 * two "View graph" buttons are mutually exclusive — turning one on always turns
 * the other off — and each one also toggles itself, so a second press returns
 * to the default sessions chart. The breadcrumb is built by splitting a joined
 * string, so only its final segment is styled as the active one.
 */

const renderPage = (over = {}) => {
  const onBack = vi.fn();
  const view = render(
    <FeatureUsageStatistic
      featureName="Invoicing"
      groupTitle="Billing"
      onBack={onBack}
      {...over}
    />
  );
  return { ...view, onBack };
};

const chartId = () => screen.getByTestId('chart').dataset.chart;
const graphButtons = () => screen.getAllByText('View graph');
const heading = () =>
  document.body.querySelector('.graph-title-headers h3').textContent;

beforeEach(() => {
  table.props = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the header', () => {
  it('walks back out of the screen', () => {
    const { onBack } = renderPage();
    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('marks only the last breadcrumb segment as the active one', () => {
    renderPage();
    const active = document.body.querySelectorAll('.breadcrumb-active');
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe('Invoicing');
    expect(document.body.querySelector('.breadcrumb').textContent).toBe(
      'Billing / Invoicing'
    );
  });

  it('bolds only the separator in front of the final segment', () => {
    // A group title carrying its own slash produces a three-part trail, so the
    // plain and the bold separator both appear.
    renderPage({ groupTitle: 'Billing/Invoices' });
    expect(
      document.body.querySelectorAll('.breadcrumb-separator-bold')
    ).toHaveLength(1);
    expect(document.body.querySelectorAll('.breadcrumb-separator')).toHaveLength(2);
  });
});

describe('the charts', () => {
  it('opens on the sessions chart with its change summary', () => {
    renderPage();
    expect(chartId()).toBe('sessions');
    expect(heading()).toBe('Sessions over time');
    expect(screen.getByText('45 Sessions')).toBeInTheDocument();
  });

  it('swaps in the active-sessions chart', () => {
    renderPage();
    fireEvent.click(graphButtons()[0]);
    expect(chartId()).toBe('active-sessions-chart');
    expect(heading()).toBe('Sessions over time');
    expect(screen.queryByText('45 Sessions')).toBeNull();
  });

  it('swaps in the server-requests chart under its own heading', () => {
    renderPage();
    fireEvent.click(graphButtons()[1]);
    expect(chartId()).toBe('server-requests-chart');
    expect(heading()).toBe('Server Requests over time');
  });

  it('turns the first chart off again when the second is asked for', () => {
    renderPage();
    fireEvent.click(graphButtons()[0]);
    fireEvent.click(graphButtons()[1]);
    expect(chartId()).toBe('server-requests-chart');
  });

  it('turns the second chart off again when the first is asked for', () => {
    renderPage();
    fireEvent.click(graphButtons()[1]);
    fireEvent.click(graphButtons()[0]);
    expect(chartId()).toBe('active-sessions-chart');
  });

  it('returns to the default chart when the same button is pressed twice', () => {
    renderPage();
    fireEvent.click(graphButtons()[0]);
    fireEvent.click(graphButtons()[0]);
    expect(chartId()).toBe('sessions');
    expect(screen.getByText('45 Sessions')).toBeInTheDocument();
  });

  it('returns to the default chart from the server-requests button too', () => {
    renderPage();
    fireEvent.click(graphButtons()[1]);
    fireEvent.click(graphButtons()[1]);
    expect(chartId()).toBe('sessions');
  });
});

describe('the grouping pickers', () => {
  it('drops the placeholder-free options behind a generic placeholder', () => {
    renderPage();
    const selects = document.body.querySelectorAll('.input-select');
    expect(selects).toHaveLength(2);
    // Neither picker is given a label, so the shared component falls back to
    // its unlabelled placeholder text.
    expect(selects[0].options[0].textContent).toBe('-- Select --');
    expect([...selects[0].options].map((o) => o.value)).toEqual([
      '',
      'per Client',
      'per Session',
    ]);
    expect([...selects[1].options]).toHaveLength(5);
  });

  it('accepts a choice', () => {
    renderPage();
    const select = document.body.querySelectorAll('.input-select')[1];
    fireEvent.change(select, { target: { value: 'Weekly' } });
    expect(select.value).toBe('Weekly');
  });
});

describe('the requests table', () => {
  it('lists the sample requests under the expected columns', () => {
    renderPage();
    expect(table.props.tableName).toBe('Server Requests');
    expect(table.props.data).toHaveLength(10);
    expect(table.props.columns.map((c) => c.key)).toEqual([
      'request_id',
      'timestamp',
      'log_id',
      'client_ip',
      'user_id',
    ]);
    expect(table.props.actions.map((a) => a.label)).toEqual([
      'View Details',
      'Delete Request',
    ]);
  });

  it('runs the row actions without doing anything', () => {
    renderPage();
    // Both handlers are placeholders; the assertion is that neither throws and
    // the table is left exactly as it was.
    const before = table.props.data;
    act(() => {
      table.props.actions.forEach((a) => a.onClick({}));
    });
    expect(table.props.data).toBe(before);
  });

  it('records the value chosen for the filter it knows about', () => {
    renderPage();
    act(() => { table.props.onFilterChange('filter_type', 'due_date'); });
    expect(table.props.filters[0].value).toBe('due_date');
  });

  it('leaves the filter alone for a key it does not own', () => {
    renderPage();
    act(() => { table.props.onFilterChange('something_else', 'due_date'); });
    expect(table.props.filters[0].value).toBe('');
  });
});
