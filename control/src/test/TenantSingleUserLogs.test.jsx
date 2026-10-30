import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The tenant activity log: one tab per feature key in the grouped response,
 * plus an "All" tab, over a single table.
 *
 * The tab row is horizontally scrollable and decides for itself whether to
 * render its two arrows, from `scrollWidth`, `clientWidth` and `scrollLeft`.
 * jsdom reports all three as zero, so the tests that care about the arrows
 * define them on the row element and then fire a scroll event to re-run the
 * measurement -- that is the only way either arrow can appear.
 *
 * `usePersistedTab` is real and backed by sessionStorage, cleared between
 * tests. The tenant name is fetched separately and failing to get it is
 * deliberately silent, which leaves the breadcrumb on its "..." placeholder.
 */

const mocks = vi.hoisted(() => ({
  params: { tenantId: 'tenant-1' },
  state: {},
  navigate: vi.fn(),
  tenantApi: {
    GetSingleTenant: vi.fn(),
    GetTenantFeatureActivityLogs: vi.fn(),
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

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="logs-table">
      <span data-testid="table-rows">{props.data.length}</span>
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

import TenantSingleUserLogs from '../Pages/Tenant/TenantSingle/TenantSingleUserLogs';

// One entry per branch of `mapLog`'s user resolution, in order: a named admin,
// an admin with only an email, a tenant contact, a tenant company, a tenant
// with neither, and a log with no actor at all.
const GROUPED = {
  billing: [
    {
      logId: 'l1',
      action: 'CREATE',
      details: 'Created plan',
      admin: { firstName: 'Ada', lastName: 'Lovelace' },
      feature: 'BILLING',
      createdAt: '2026-01-10T12:00:00Z',
    },
  ],
  tenant_settings: [
    { logId: 'l2', reason: 'Locked out', admin: { firstName: '', lastName: '', email: 'ops@acme.test' } },
    { logId: 'l3', tenant: { contactPerson: 'Alan T' } },
    { logId: 'l4', tenant: { companyName: 'Acme Health' } },
    { logId: 'l5', tenant: {} },
    { logId: 'l6' },
  ],
  // Not a list: the counter and the tab both have to cope with it.
  broken: null,
};

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

const renderLogs = async () => {
  mocks.state = buildState();
  const view = render(<TenantSingleUserLogs />);
  await act(async () => {});
  return view;
};

const cell = (row, key) => screen.getByTestId(`cell-${row}-${key}`).textContent;
const tabsRow = () => document.body.querySelector('.tenants-tabs--scroll');
const tab = (label) =>
  Array.from(document.body.querySelectorAll('.tenants-tab')).find((b) =>
    b.textContent.startsWith(label)
  );

// jsdom has no layout, so the row's scroll metrics are planted directly and a
// scroll event is fired to make the component re-measure.
const setTabMetrics = async ({ scrollLeft, clientWidth = 400, scrollWidth = 1200 }) => {
  const el = tabsRow();
  for (const [prop, value] of Object.entries({ scrollLeft, clientWidth, scrollWidth })) {
    Object.defineProperty(el, prop, { value, configurable: true });
  }
  await act(async () => {
    fireEvent.scroll(el);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.params = { tenantId: 'tenant-1' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollBy = vi.fn();
  mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { companyName: 'Acme Health' } });
  mocks.tenantApi.GetTenantFeatureActivityLogs.mockResolvedValue({ data: { data: GROUPED } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading', () => {
  it('shows a section loader until the logs arrive', async () => {
    mocks.state = buildState();
    render(<TenantSingleUserLogs />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(screen.getByTestId('logs-table')).toBeInTheDocument();
  });

  it('requests a single page of logs', async () => {
    await renderLogs();
    expect(mocks.tenantApi.GetTenantFeatureActivityLogs).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', page: 1, limit: 20 })
    );
  });

  it('accepts a response whose groups are not nested twice', async () => {
    mocks.tenantApi.GetTenantFeatureActivityLogs.mockResolvedValue({ data: GROUPED });
    await renderLogs();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('6');
  });

  it('falls back to no groups at all for an empty response', async () => {
    mocks.tenantApi.GetTenantFeatureActivityLogs.mockResolvedValue({});
    await renderLogs();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
    expect(document.body.querySelectorAll('.tenants-tab')).toHaveLength(1);
    expect(document.body.querySelector('.tab-count')).toBeNull();
  });

  it('surfaces a failed log load', async () => {
    mocks.tenantApi.GetTenantFeatureActivityLogs.mockRejectedValue(new Error('x'));
    await renderLogs();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ACTIVITY_LOGS');
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });
});

describe('the breadcrumb', () => {
  it('names the tenant by its company', async () => {
    await renderLogs();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Acme Health');
  });

  it('falls back to the contact person', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { contactPerson: 'Alan T' } });
    await renderLogs();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Alan T');
  });

  it('reads a tenant response that is not wrapped in data', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ contactPerson: 'Alan T' });
    await renderLogs();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Alan T');
  });

  it('falls back to the generic label for an unnamed tenant', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: {} });
    await renderLogs();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Tenant');
  });

  it('leaves the placeholder in place when the tenant cannot be fetched', async () => {
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('x'));
    await renderLogs();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('...');
  });

  it('navigates back a step', async () => {
    await renderLogs();
    fireEvent.click(screen.getByText('Back'));
    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });
});

describe('log rows', () => {
  it('maps a fully populated log', async () => {
    await renderLogs();
    expect(cell(0, 'action')).toBe('CREATE');
    expect(cell(0, 'details')).toBe('Created plan');
    expect(cell(0, 'user')).toBe('Ada Lovelace');
    expect(cell(0, 'feature')).toBe('Billing');
    expect(cell(0, 'dateTime')).toMatch(/01\/10\/2026/);
  });

  it('falls back to the reason and to the admin email', async () => {
    await renderLogs();
    expect(cell(1, 'details')).toBe('Locked out');
    expect(cell(1, 'user')).toBe('ops@acme.test');
  });

  it('credits the tenant contact, then the company, when no admin acted', async () => {
    await renderLogs();
    expect(cell(2, 'user')).toBe('Alan T');
    expect(cell(3, 'user')).toBe('Acme Health');
    expect(cell(4, 'user')).toBe('—');
  });

  it('dashes every field a bare log omits', async () => {
    await renderLogs();
    expect(cell(5, 'action')).toBe('—');
    expect(cell(5, 'details')).toBe('—');
    expect(cell(5, 'user')).toBe('—');
    expect(cell(5, 'feature')).toBe('—');
    expect(cell(5, 'dateTime')).toBe('—');
  });
});

describe('feature tabs', () => {
  it('opens on All with every group flattened together', async () => {
    await renderLogs();
    expect(tab('All')).toHaveClass('active');
    expect(screen.getByTestId('table-rows')).toHaveTextContent('6');
    expect(tab('All')).toHaveTextContent('All6');
  });

  it('renders one tab per feature key, title-cased and counted', async () => {
    await renderLogs();
    expect(tab('Billing')).toHaveTextContent('Billing1');
    expect(tab('Tenant_settings')).toHaveTextContent('Tenant_settings5');
    // The group that is not a list counts as nothing, so it gets no badge.
    expect(tab('Broken').querySelector('.tab-count')).toBeNull();
  });

  it('narrows the table to one feature', async () => {
    await renderLogs();
    fireEvent.click(tab('Billing'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
    expect(cell(0, 'user')).toBe('Ada Lovelace');
  });

  it('empties the table for a group that is not a list', async () => {
    await renderLogs();
    fireEvent.click(tab('Broken'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('returns to All', async () => {
    await renderLogs();
    fireEvent.click(tab('Billing'));
    fireEvent.click(tab('All'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('6');
  });

  it('resumes the tab left behind in session storage and scrolls it into view', async () => {
    sessionStorage.setItem('tab:control:tenantUserLogs', 'tenant_settings');
    await renderLogs();
    expect(tab('Tenant_settings')).toHaveClass('active');
    expect(screen.getByTestId('table-rows')).toHaveTextContent('5');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      inline: 'nearest',
      block: 'nearest',
    });
  });

  it('remembers the tab that was picked', async () => {
    await renderLogs();
    fireEvent.click(tab('Billing'));
    expect(sessionStorage.getItem('tab:control:tenantUserLogs')).toBe('billing');
  });
});

describe('the tab scroller', () => {
  it('hides both arrows while the row fits', async () => {
    await renderLogs();
    expect(document.body.querySelector('.tenants-tabs-arrow')).toBeNull();
  });

  it('offers a right arrow once the row overflows', async () => {
    await renderLogs();
    await setTabMetrics({ scrollLeft: 0 });
    expect(screen.getByLabelText('Scroll tabs right')).toBeInTheDocument();
    expect(screen.queryByLabelText('Scroll tabs left')).toBeNull();
    fireEvent.click(screen.getByLabelText('Scroll tabs right'));
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({ left: 280, behavior: 'smooth' });
  });

  it('offers a left arrow once the row has been scrolled', async () => {
    await renderLogs();
    // Scrolled hard against the right edge, so only the left arrow survives.
    await setTabMetrics({ scrollLeft: 800 });
    expect(screen.getByLabelText('Scroll tabs left')).toBeInTheDocument();
    expect(screen.queryByLabelText('Scroll tabs right')).toBeNull();
    fireEvent.click(screen.getByLabelText('Scroll tabs left'));
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({ left: -280, behavior: 'smooth' });
  });

  it('offers both arrows in the middle of the row', async () => {
    await renderLogs();
    await setTabMetrics({ scrollLeft: 400 });
    expect(screen.getByLabelText('Scroll tabs left')).toBeInTheDocument();
    expect(screen.getByLabelText('Scroll tabs right')).toBeInTheDocument();
  });

  it('never scrolls by less than a fixed minimum on a narrow row', async () => {
    await renderLogs();
    await setTabMetrics({ scrollLeft: 0, clientWidth: 100, scrollWidth: 1200 });
    fireEvent.click(screen.getByLabelText('Scroll tabs right'));
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({ left: 160, behavior: 'smooth' });
  });
});

describe('a feature group with no name', () => {
  it('labels a blank group key without trying to capitalise it', async () => {
    // The grouping keys come straight from the response, so an empty key
    // reaches `capitalize` with nothing to capitalise.
    mocks.tenantApi.GetTenantFeatureActivityLogs.mockResolvedValue({
      data: { data: { '': [{ logId: 'l9', action: 'Viewed' }] } },
    });
    await renderLogs();
    const labels = Array.from(document.body.querySelectorAll('.tenants-tab')).map(
      (b) => b.textContent
    );
    expect(labels[0]).toContain('All');
    expect(labels).toHaveLength(2);
  });
});
