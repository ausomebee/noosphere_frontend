import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The tenant usage-statistics page: three summary cards, one chart area that
 * switches between sessions, server requests and a twelve-row data table, and
 * a paginated server-request log underneath.
 *
 * Both graphs are normalised into a fixed twelve-month frame, but from two
 * different payload shapes -- sessions arrive as `{ period, session_count }`
 * rows, server requests as parallel `labels`/`values` arrays -- so the chart
 * probe prints its series and the tests read the month buckets back out of it.
 *
 * The chart-data table is built from the twelve month names, so its "No data
 * available" row can never render; the assertions here pin the twelve rows
 * instead.
 */

const mocks = vi.hoisted(() => ({
  params: { tenantId: 'tenant-1' },
  state: {},
  navigate: vi.fn(),
  tenantApi: {
    GetTenantUsageStatistics: vi.fn(),
    GetTenantServerRequest: vi.fn(),
  },
  showApiError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => mocks.params, useNavigate: () => mocks.navigate };
});

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('react-apexcharts', () => ({
  default: (props) => (
    <div
      data-testid="usage-chart"
      data-id={props.options.chart.id}
      data-name={props.series[0].name}
      data-values={props.series[0].data.join('|')}
      data-categories={props.options.xaxis.categories.join('|')}
    />
  ),
}));

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="server-table">
      <span data-testid="table-rows">{props.data.length}</span>
      <button
        data-testid="change-known-filter"
        onClick={() => props.onFilterChange('filter_type', 'date_created')}
      >
        set filter
      </button>
      <button
        data-testid="change-unknown-filter"
        onClick={() => props.onFilterChange('nothing', 'x')}
      >
        set unknown filter
      </button>
      <span data-testid="filter-value">{props.filters[0].value}</span>
      {props.data.map((row, i) => (
        <div key={row.id ?? i} data-testid={`row-${i}`}>
          {props.columns.map((col) => (
            <span key={col.key} data-testid={`cell-${i}-${col.key}`}>
              {row[col.key]}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../Components/Table/Pagination', () => ({
  default: (props) => (
    <div data-testid="pagination">
      <span data-testid="page-current">{props.currentPage}</span>
      <span data-testid="page-total">{props.totalPages}</span>
      <button data-testid="page-next" onClick={() => props.onPageChange(props.currentPage + 1)}>
        next
      </button>
      <button data-testid="page-first" onClick={() => props.onPageChange(1)}>
        first
      </button>
    </div>
  ),
}));

import TenantListUsageStatistics from '../Pages/Tenant/TenantList/TenantListUsageStatistics';

const STATS = {
  tenantClientsCount: 1234,
  tenantSessionCount: 5678,
  serverRequestsCount: 91011,
  // Two rows land in the same bucket on purpose: the month map sums them.
  tenantSessionGraph: [
    { period: 'Jan 2026', session_count: 4 },
    { period: 'Jan 2025', session_count: 6 },
    { period: 'Mar 2026', session_count: 2 },
    { session_count: 99 },
  ],
  getTenantServerRequestGraphLastYear: {
    labels: ['Feb 2026', 'Feb 2025', null, 'Dec 2025'],
    values: [7, 3, 100],
  },
};

const REQUESTS = [
  {
    id: 'r1',
    method: 'GET',
    statusCode: 200,
    durationMs: 42,
    ipAddress: '10.0.0.1',
    errorMessage: null,
    createdAt: '2026-01-10T12:00:00Z',
  },
  { id: 'r2', statusCode: 0, durationMs: 0 },
];

const buildState = () => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    user: { id: 'u1', role: { roleModuleAccesses: [{ module: 'TENANT', permissions: [] }] } },
  },
});

const renderPage = async () => {
  mocks.state = buildState();
  const view = render(<TenantListUsageStatistics />);
  await act(async () => {});
  return view;
};

const chart = () => screen.getByTestId('usage-chart');
const cell = (row, key) => screen.getByTestId(`cell-${row}-${key}`).textContent;
const cardValue = (heading) =>
  Array.from(document.body.querySelectorAll('.usage-card'))
    .find((c) => c.querySelector('h3')?.textContent === heading)
    .querySelector('.usage-value').textContent;
const viewGraphButton = (heading) =>
  Array.from(document.body.querySelectorAll('.usage-card'))
    .find((c) => c.querySelector('h3')?.textContent === heading)
    .querySelector('.view-graph-button');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = { tenantId: 'tenant-1' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.tenantApi.GetTenantUsageStatistics.mockResolvedValue({ data: STATS });
  mocks.tenantApi.GetTenantServerRequest.mockResolvedValue({
    data: { data: REQUESTS, meta: { total: 2, page: 1, totalPages: 1 } },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading', () => {
  it('shows a section loader until the statistics arrive', async () => {
    mocks.state = buildState();
    render(<TenantListUsageStatistics />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(screen.getByTestId('usage-chart')).toBeInTheDocument();
  });

  it('reads statistics that are not wrapped in data', async () => {
    mocks.tenantApi.GetTenantUsageStatistics.mockResolvedValue({ ...STATS, data: undefined });
    await renderPage();
    expect(cardValue('Total Clients')).toBe('1,234');
  });

  it('surfaces a failed statistics load and dashes every card', async () => {
    mocks.tenantApi.GetTenantUsageStatistics.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_USAGE_STATISTICS');
    expect(cardValue('Total Clients')).toBe('—');
    expect(cardValue('Total Sessions')).toBe('—');
    expect(cardValue('Number of Server Requests')).toBe('—');
  });

  it('dashes the cards the statistics leave out', async () => {
    mocks.tenantApi.GetTenantUsageStatistics.mockResolvedValue({ data: {} });
    await renderPage();
    expect(cardValue('Total Clients')).toBe('—');
  });

  it('navigates back a step', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Back'));
    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });

  it('marks the last breadcrumb part as the active one', async () => {
    await renderPage();
    expect(document.body.querySelector('.breadcrumb-active')).toHaveTextContent('Usage Statistics');
    expect(document.body.querySelector('.breadcrumb-separator-bold')).toBeInTheDocument();
  });
});

describe('summary cards', () => {
  it('formats each count with thousands separators', async () => {
    await renderPage();
    expect(cardValue('Total Clients')).toBe('1,234');
    expect(cardValue('Total Sessions')).toBe('5,678');
    expect(cardValue('Number of Server Requests')).toBe('91,011');
  });

  it('keeps a zero count rather than dashing it', async () => {
    mocks.tenantApi.GetTenantUsageStatistics.mockResolvedValue({
      data: { tenantClientsCount: 0, tenantSessionCount: 0, serverRequestsCount: 0 },
    });
    await renderPage();
    expect(cardValue('Total Clients')).toBe('0');
    expect(cardValue('Total Sessions')).toBe('0');
    expect(cardValue('Number of Server Requests')).toBe('0');
  });
});

describe('the chart area', () => {
  it('opens on the sessions chart, bucketed by month name', async () => {
    await renderPage();
    expect(chart()).toHaveAttribute('data-id', 'sessions-chart');
    expect(chart()).toHaveAttribute('data-name', 'Sessions');
    // Jan sums the two January rows; the row with no period is dropped.
    expect(chart()).toHaveAttribute('data-values', '10|0|2|0|0|0|0|0|0|0|0|0');
    expect(chart()).toHaveAttribute(
      'data-categories',
      'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
    );
    expect(screen.getByText('Sessions over time')).toBeInTheDocument();
  });

  it('switches to the active-sessions chart', async () => {
    await renderPage();
    fireEvent.click(viewGraphButton('Total Sessions'));
    expect(chart()).toHaveAttribute('data-id', 'active-sessions-chart');
    expect(screen.getByText('Sessions over time')).toBeInTheDocument();
  });

  it('switches back to the default chart on a second click', async () => {
    await renderPage();
    fireEvent.click(viewGraphButton('Total Sessions'));
    fireEvent.click(viewGraphButton('Total Sessions'));
    expect(chart()).toHaveAttribute('data-id', 'sessions-chart');
  });

  it('switches to the server-requests chart, summing the labels into months', async () => {
    await renderPage();
    fireEvent.click(viewGraphButton('Number of Server Requests'));
    expect(chart()).toHaveAttribute('data-id', 'server-requests-chart');
    expect(chart()).toHaveAttribute('data-name', 'Server Requests');
    // The unlabelled point is skipped and December has no matching value, so
    // it contributes nothing.
    expect(chart()).toHaveAttribute('data-values', '0|10|0|0|0|0|0|0|0|0|0|0');
    expect(screen.getByText('Server Requests over time')).toBeInTheDocument();
  });

  it('lets one card graph replace the other', async () => {
    await renderPage();
    fireEvent.click(viewGraphButton('Total Sessions'));
    fireEvent.click(viewGraphButton('Number of Server Requests'));
    expect(chart()).toHaveAttribute('data-id', 'server-requests-chart');
    fireEvent.click(viewGraphButton('Total Sessions'));
    expect(chart()).toHaveAttribute('data-id', 'active-sessions-chart');
  });

  it('draws twelve empty months when no graph data came back', async () => {
    mocks.tenantApi.GetTenantUsageStatistics.mockResolvedValue({ data: {} });
    await renderPage();
    expect(chart()).toHaveAttribute('data-values', '0|0|0|0|0|0|0|0|0|0|0|0');
    fireEvent.click(viewGraphButton('Number of Server Requests'));
    expect(chart()).toHaveAttribute('data-values', '0|0|0|0|0|0|0|0|0|0|0|0');
  });
});

describe('the chart data table', () => {
  it('lists a row per month for the sessions graph', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('View data table'));
    const rows = Array.from(document.body.querySelectorAll('.graph-data-table tbody tr')).map(
      (tr) => tr.textContent
    );
    expect(rows).toHaveLength(12);
    expect(rows[0]).toBe('Jan10');
    expect(rows[2]).toBe('Mar2');
    expect(screen.queryByTestId('usage-chart')).toBeNull();
  });

  it('lists the server-request months when that graph is showing', async () => {
    await renderPage();
    fireEvent.click(viewGraphButton('Number of Server Requests'));
    fireEvent.click(screen.getByText('View data table'));
    const rows = Array.from(document.body.querySelectorAll('.graph-data-table tbody tr')).map(
      (tr) => tr.textContent
    );
    expect(rows[1]).toBe('Feb10');
  });

  it('goes back to the chart', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('View data table'));
    // The card buttons carry the same wording, so the toggle is taken from the
    // graph header instead.
    fireEvent.click(document.body.querySelector('.graph-controls button'));
    expect(screen.getByTestId('usage-chart')).toBeInTheDocument();
  });

  it('is dismissed when a card graph is picked', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('View data table'));
    fireEvent.click(viewGraphButton('Total Sessions'));
    expect(screen.getByTestId('usage-chart')).toBeInTheDocument();
  });
});

describe('server request log', () => {
  it('maps a fully populated request', async () => {
    await renderPage();
    expect(cell(0, 'method')).toBe('GET');
    expect(cell(0, 'statusCode')).toBe('200');
    expect(cell(0, 'durationMs')).toBe('42ms');
    expect(cell(0, 'ipAddress')).toBe('10.0.0.1');
    expect(cell(0, 'errorMessage')).toBe('—');
    expect(cell(0, 'dateTime')).toMatch(/01\/10\/2026/);
  });

  it('keeps a zero status code and a zero duration', async () => {
    await renderPage();
    expect(cell(1, 'statusCode')).toBe('0');
    expect(cell(1, 'durationMs')).toBe('0ms');
  });

  it('dashes the fields a request omits', async () => {
    await renderPage();
    expect(cell(1, 'method')).toBe('—');
    expect(cell(1, 'ipAddress')).toBe('—');
    expect(cell(1, 'dateTime')).toBe('—');
  });

  it('accepts a response whose rows are not nested under data', async () => {
    mocks.tenantApi.GetTenantServerRequest.mockResolvedValue({ data: REQUESTS });
    await renderPage();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
    expect(screen.queryByTestId('pagination')).toBeNull();
  });

  it('falls back to an empty log and default paging metadata', async () => {
    mocks.tenantApi.GetTenantServerRequest.mockResolvedValue({});
    await renderPage();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
    expect(screen.queryByTestId('pagination')).toBeNull();
  });

  it('surfaces a failed request load', async () => {
    mocks.tenantApi.GetTenantServerRequest.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_SERVER_REQUESTS');
  });

  it('shows a loader in place of the table while a page is in flight', async () => {
    let release;
    mocks.tenantApi.GetTenantServerRequest.mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ data: { data: [] } }); })
    );
    mocks.state = buildState();
    render(<TenantListUsageStatistics />);
    await act(async () => {
      // Only the statistics request resolves here, so the page renders with the
      // request log still loading.
      await Promise.resolve();
    });
    expect(screen.queryByTestId('server-table')).toBeNull();
    await act(async () => {
      release();
    });
    expect(screen.getByTestId('server-table')).toBeInTheDocument();
  });

  it('pages through the log when there is more than one page', async () => {
    mocks.tenantApi.GetTenantServerRequest.mockResolvedValue({
      data: { data: REQUESTS, meta: { total: 40, page: 1, totalPages: 2 } },
    });
    await renderPage();
    expect(screen.getByTestId('page-total')).toHaveTextContent('2');
    await act(async () => {
      fireEvent.click(screen.getByTestId('page-next'));
    });
    expect(mocks.tenantApi.GetTenantServerRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 20 })
    );
    expect(screen.getByTestId('page-current')).toHaveTextContent('2');
  });

  it('does not refetch when the page is set back to the first one', async () => {
    mocks.tenantApi.GetTenantServerRequest.mockResolvedValue({
      data: { data: REQUESTS, meta: { total: 40, page: 1, totalPages: 2 } },
    });
    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByTestId('page-next'));
    });
    mocks.tenantApi.GetTenantServerRequest.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByTestId('page-first'));
    });
    expect(mocks.tenantApi.GetTenantServerRequest).not.toHaveBeenCalled();
  });
});

describe('the log filter', () => {
  it('records the value picked for a known filter key', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('change-known-filter'));
    expect(screen.getByTestId('filter-value')).toHaveTextContent('date_created');
  });

  it('leaves the filters untouched for a key it does not own', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('change-unknown-filter'));
    expect(screen.getByTestId('filter-value')).toBeEmptyDOMElement();
  });
});

describe('missing values the fixtures above always supply', () => {
  it('dashes a request that reports neither a status code nor a duration', async () => {
    // The shared fixture uses explicit zeroes, which the `??` and `!= null`
    // guards deliberately keep; only an absent key reaches their other arm.
    mocks.tenantApi.GetTenantServerRequest.mockResolvedValue({
      data: { data: [{ id: 'r9', method: 'POST' }], meta: { total: 1, page: 1, totalPages: 1 } },
    });
    await renderPage();
    expect(cell(0, 'statusCode')).toBe('—');
    expect(cell(0, 'durationMs')).toBe('—');
  });

  it('holds no statistics at all when the request resolves to nothing', async () => {
    mocks.tenantApi.GetTenantUsageStatistics.mockResolvedValue(null);
    await renderPage();
    expect(cardValue('Total Clients')).toBe('—');
  });
});
