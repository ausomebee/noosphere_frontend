import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The per-tenant issue tab: five overview cards (one of them a donut of the top
 * categories), a status tab bar, and the issue log with four filter modals.
 *
 * The overview endpoint answers in two shapes -- a bare number or Prisma's
 * `{ _count: { _all: n } }` -- and every stat reads them with a `??` chain, so
 * the fixtures deliberately mix both. `usePersistedTab` is real and backed by
 * sessionStorage, which is cleared between tests so each one starts on "all";
 * the tab also decides both the column set and whether a Status filter exists.
 *
 * The chart is a probe that prints its labels and series, which is the only
 * way to tell the "no data" placeholder donut from a real one. Two of the
 * catch blocks only log under `import.meta.env.DEV`, true by default under
 * Vitest, so the production arm is reached by stubbing it false.
 */

const mocks = vi.hoisted(() => ({
  params: { tenantId: 'tenant-1' },
  state: {},
  dateRange: null,
  issueApi: {
    GetTenantManagementOverview: vi.fn(),
    GetTenantIssuesByStatus: vi.fn(),
  },
  tenantApi: { GetSingleTenant: vi.fn() },
  showApiError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => mocks.params };
});

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/IssueApi', () => ({ default: mocks.issueApi }));
vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('react-apexcharts', () => ({
  default: (props) => (
    <div
      data-testid="donut"
      data-labels={props.options.labels.join('|')}
      data-series={props.series.join('|')}
      data-colors={props.options.colors.join('|')}
    />
  ),
}));

vi.mock('../Pages/IssueManagement/ViewIssue', () => ({
  default: (props) => (
    <div data-testid="view-issue">
      <span data-testid="view-issue-id">{props.issue.id}</span>
      <button data-testid="view-issue-back" onClick={props.onBack}>
        back
      </button>
    </div>
  ),
}));

vi.mock('../Components/Table/CustomTable', () => ({
  default: (props) => (
    <div data-testid="issue-table">
      <span data-testid="table-rows">{props.data.length}</span>
      <span data-testid="table-columns">{props.columns.map((c) => c.key).join('|')}</span>
      {props.filters[0].options.map((opt) => (
        <button
          key={opt.value || 'blank'}
          data-testid={`pick-${opt.value || 'blank'}`}
          onClick={() => props.onFilterTypeSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
      {props.data.map((row, i) => (
        <div key={row.id ?? i} data-testid={`row-${i}`}>
          {props.columns.map((col) => (
            <span key={col.key} data-testid={`cell-${i}-${col.key}`}>
              {row[col.key]}
            </span>
          ))}
          {props.actions.map((action) => (
            <button
              key={action.label}
              data-testid={`act-${i}-${action.label}`}
              onClick={() => action.onClick(row)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../Components/ReusableModal/TableFilterModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="value-filter-modal">
        <span data-testid="value-filter-title">{props.title}</span>
        {props.options.map((opt) => (
          <button
            key={opt.value || 'blank'}
            data-testid={`apply-${opt.value || 'blank'}`}
            onClick={() => props.onApply(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button data-testid="value-filter-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/TableFilterDateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="date-filter-modal">
        <button data-testid="date-filter-apply" onClick={() => props.onApply(mocks.dateRange)}>
          apply
        </button>
        <button data-testid="date-filter-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

import TenantSingleIssueManagement from '../Pages/Tenant/TenantSingle/TenantSingleIssueManagement';

const ISSUES = [
  {
    id: 'i1',
    title: 'Login broken',
    createdAt: '2026-01-10T12:00:00Z',
    category: 'Bug Report',
    priority: 'High',
    status: 'In Progress',
    loggedBy: { firstName: 'Ada', lastName: 'Lovelace' },
    assignedTo: { firstName: 'Bo', lastName: 'Kim' },
  },
  {
    // No title, no admin logged it, and its assignee has no name on record --
    // each of those takes a different fallback in the row mapper.
    id: 'i2',
    createdAt: '2026-02-20T12:00:00Z',
    category: 'Billing & Payments',
    priority: 'Low',
    status: 'Resolved',
    tenant: { companyName: 'Acme Health' },
    assignedTo: { firstName: '', lastName: '' },
  },
  { id: 'i3' },
];

const OVERVIEW = {
  totalIssues: { _count: { _all: 3 } },
  activeIssues: 1,
  resolvedIssues: { _count: { _all: 2 } },
  averageResolutionTime: 6,
  countByCategory: [
    { category: 'Bug Report', _count: { category: 5 } },
    { name: 'Billing', count: 9 },
    {},
  ],
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

const renderPage = async () => {
  mocks.state = buildState();
  const view = render(
    <MemoryRouter>
      <TenantSingleIssueManagement />
    </MemoryRouter>
  );
  await act(async () => {});
  return view;
};

const cell = (row, key) => screen.getByTestId(`cell-${row}-${key}`).textContent;

const statCard = (heading) =>
  Array.from(document.body.querySelectorAll('.issue-overview-card')).find(
    (card) => card.querySelector('h4')?.textContent === heading
  );

const statValue = (heading) => statCard(heading).querySelector('.issue-overview-value').textContent;

const tab = (label) =>
  Array.from(document.body.querySelectorAll('.tenants-tab')).find((b) =>
    b.textContent.startsWith(label)
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.params = { tenantId: 'tenant-1' };
  mocks.dateRange = null;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({ data: OVERVIEW });
  mocks.issueApi.GetTenantIssuesByStatus.mockResolvedValue({ data: ISSUES });
  mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { companyName: 'Acme Health' } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('initial load', () => {
  it('shows a section loader until all three requests settle', async () => {
    mocks.state = buildState();
    render(
      <MemoryRouter>
        <TenantSingleIssueManagement />
      </MemoryRouter>
    );
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    await act(async () => {});
    expect(document.body.querySelector('.section-loader')).toBeNull();
  });

  it('requests the issues for the stored tab', async () => {
    await renderPage();
    expect(mocks.issueApi.GetTenantIssuesByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', status: 'all' })
    );
    expect(screen.getByTestId('table-rows')).toHaveTextContent('3');
  });

  it('resumes the tab left behind in session storage', async () => {
    sessionStorage.setItem('tab:control:tenantIssueManagement', 'Resolved');
    await renderPage();
    expect(tab('RESOLVED')).toHaveClass('active');
    expect(mocks.issueApi.GetTenantIssuesByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Resolved' })
    );
  });

  it('reads an overview response that is not wrapped in data', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({ ...OVERVIEW, data: undefined });
    await renderPage();
    expect(statValue('All Issues')).toBe('3');
  });

  it('warns about a failed overview in development', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(console.warn).toHaveBeenCalledWith('Overview error:', 'down');
    expect(statValue('All Issues')).toBe('0');
  });

  it('stays silent about a failed overview in production', async () => {
    vi.stubEnv('DEV', false);
    mocks.issueApi.GetTenantManagementOverview.mockRejectedValue(new Error('down'));
    await renderPage();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('surfaces a failed issue load', async () => {
    mocks.issueApi.GetTenantIssuesByStatus.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ISSUES');
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });

  it('falls back to an empty issue list when the response has no body', async () => {
    mocks.issueApi.GetTenantIssuesByStatus.mockResolvedValue({});
    await renderPage();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('0');
  });
});

describe('tenant name', () => {
  it('breadcrumbs the company name', async () => {
    await renderPage();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Acme Health');
  });

  it('falls back to the contact person', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: { contactPerson: 'Alan T' } });
    await renderPage();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Alan T');
  });

  it('reads a tenant response that is not wrapped in data', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ contactPerson: 'Alan T' });
    await renderPage();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Alan T');
  });

  it('falls back to the generic label when the tenant is unnamed', async () => {
    mocks.tenantApi.GetSingleTenant.mockResolvedValue({ data: {} });
    await renderPage();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Tenant');
  });

  it('warns about a failed tenant load in development', async () => {
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('gone'));
    await renderPage();
    expect(console.warn).toHaveBeenCalledWith('Tenant fetch error:', 'gone');
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent('Tenant');
  });

  it('stays silent about a failed tenant load in production', async () => {
    vi.stubEnv('DEV', false);
    mocks.tenantApi.GetSingleTenant.mockRejectedValue(new Error('gone'));
    await renderPage();
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('overview cards', () => {
  it('reads the counted and the flat shape of each stat', async () => {
    await renderPage();
    expect(statValue('All Issues')).toBe('3');
    expect(statValue('Active Issues')).toBe('1');
    expect(statValue('Resolved Issues')).toBe('2');
  });

  it('appends an hour unit to a numeric resolution time', async () => {
    await renderPage();
    expect(statValue('Avg Resolution Time')).toBe('6 hrs');
  });

  it('accepts a resolution time that already reads as text', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({
      data: { avgResolutionTime: '2 days' },
    });
    await renderPage();
    expect(statValue('Avg Resolution Time')).toBe('2 days');
  });

  it('dashes the resolution time when neither field is present', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({ data: {} });
    await renderPage();
    expect(statValue('Avg Resolution Time')).toBe('—');
    expect(statValue('All Issues')).toBe('0');
  });

  it('jumps to the pending tab from the active-issues card', async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(statCard('Active Issues').querySelector('.issue-view-link'));
    });
    expect(mocks.issueApi.GetTenantIssuesByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
  });

  it('jumps to the resolved tab from the resolved-issues card', async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(statCard('Resolved Issues').querySelector('.issue-view-link'));
    });
    expect(tab('RESOLVED')).toHaveClass('active');
  });
});

describe('category donut', () => {
  it('plots the categories largest first, naming each by whichever field it has', async () => {
    await renderPage();
    const donut = screen.getByTestId('donut');
    expect(donut).toHaveAttribute('data-labels', 'Billing|Bug Report|Unknown');
    expect(donut).toHaveAttribute('data-series', '9|5|0');
  });

  it('keeps only the five biggest categories', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({
      data: {
        countByCategory: Array.from({ length: 7 }, (_, i) => ({ category: `C${i}`, count: i })),
      },
    });
    await renderPage();
    expect(screen.getByTestId('donut')).toHaveAttribute('data-labels', 'C6|C5|C4|C3|C2');
  });

  it('draws a grey placeholder when no categories came back', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({ data: {} });
    await renderPage();
    const donut = screen.getByTestId('donut');
    expect(donut).toHaveAttribute('data-labels', 'No data');
    expect(donut).toHaveAttribute('data-colors', '#E5E7EB');
  });

  it('ignores a category payload that is not a list', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({
      data: { countByCategory: { a: 1 } },
    });
    await renderPage();
    expect(screen.getByTestId('donut')).toHaveAttribute('data-labels', 'No data');
  });
});

describe('breakdown modal', () => {
  it('lists every category largest first', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('SEE BREAKDOWN'));
    const rows = Array.from(document.body.querySelectorAll('.breakdown-item')).map(
      (r) => r.textContent
    );
    expect(rows).toEqual(['Billing9', 'Bug Report5', 'Unknown0']);
  });

  it('says there is nothing to break down when no categories came back', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({ data: {} });
    await renderPage();
    fireEvent.click(screen.getByText('SEE BREAKDOWN'));
    expect(screen.getByText('No category data available')).toBeInTheDocument();
  });

  it('closes again', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('SEE BREAKDOWN'));
    fireEvent.click(document.body.querySelector('.secondary-button'));
    expect(document.body.querySelector('.modal-title')).toBeNull();
  });
});

describe('issue rows', () => {
  it('maps a fully populated issue', async () => {
    await renderPage();
    expect(cell(0, 'issue_id')).toBe('ISS-001');
    expect(cell(0, 'name')).toBe('Login broken');
    expect(cell(0, 'time')).toBe('1/10/2026');
    expect(cell(0, 'category')).toBe('Bug Report');
    expect(cell(0, 'severity')).toBe('High');
    expect(cell(0, 'status')).toBe('In Progress');
  });

  it('credits the tenant when no admin logged the issue', async () => {
    sessionStorage.setItem('tab:control:tenantIssueManagement', 'Resolved');
    await renderPage();
    expect(cell(1, 'logged_by')).toBe('Acme Health');
    expect(cell(1, 'assigned_to')).toBe('—');
  });

  it('names the logger and the assignee from an admin record', async () => {
    sessionStorage.setItem('tab:control:tenantIssueManagement', 'Resolved');
    await renderPage();
    expect(cell(0, 'logged_by')).toBe('Ada Lovelace');
    expect(cell(0, 'assigned_to')).toBe('Bo Kim');
  });

  it('dashes every field a bare issue omits', async () => {
    sessionStorage.setItem('tab:control:tenantIssueManagement', 'Resolved');
    await renderPage();
    expect(cell(2, 'name')).toBe('—');
    expect(cell(2, 'time')).toBe('—');
    expect(cell(2, 'category')).toBe('—');
    expect(cell(2, 'severity')).toBe('—');
    expect(cell(2, 'logged_by')).toBe('—');
    expect(cell(2, 'assigned_to')).toBe('—');
  });

  it('numbers the rows in sequence', async () => {
    await renderPage();
    expect(cell(2, 'issue_id')).toBe('ISS-003');
  });
});

describe('tabs', () => {
  it('badges only the counts the overview supplies', async () => {
    await renderPage();
    expect(tab('ALL')).toHaveTextContent('ALL3');
    expect(tab('RESOLVED')).toHaveTextContent('RESOLVED2');
    expect(tab('NOT STARTED').querySelector('.tab-count')).toBeNull();
  });

  it('drops the count badges when every stat is zero', async () => {
    mocks.issueApi.GetTenantManagementOverview.mockResolvedValue({ data: {} });
    await renderPage();
    expect(document.body.querySelectorAll('.tab-count')).toHaveLength(0);
  });

  it('shows the status column and the status filter only on the all tab', async () => {
    await renderPage();
    expect(screen.getByTestId('table-columns')).toHaveTextContent(
      'issue_id|name|time|category|severity|status'
    );
    expect(screen.getByTestId('pick-status')).toBeInTheDocument();
  });

  it('swaps in the logged-by and assigned-to columns on a status tab', async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(tab('IN PROGRESS'));
    });
    expect(screen.getByTestId('table-columns')).toHaveTextContent(
      'issue_id|name|time|category|severity|logged_by|assigned_to'
    );
    expect(screen.queryByTestId('pick-status')).toBeNull();
  });

  it('refetches when the tab changes and remembers it', async () => {
    await renderPage();
    await act(async () => {
      fireEvent.click(tab('UNASSIGNED'));
    });
    expect(mocks.issueApi.GetTenantIssuesByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Unassigned' })
    );
    expect(sessionStorage.getItem('tab:control:tenantIssueManagement')).toBe('Unassigned');
  });
});

describe('issue log filters', () => {
  it('offers each distinct category and narrows the table to one', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-category'));
    expect(screen.getByTestId('value-filter-title')).toHaveTextContent('Filter by Category');
    // The bare issue's "—" placeholder is not offered as a real category.
    expect(screen.queryByTestId('apply-—')).toBeNull();
    fireEvent.click(screen.getByTestId('apply-Bug Report'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('narrows the table to one severity', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-severity'));
    fireEvent.click(screen.getByTestId('apply-Low'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('narrows the table to one status', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-status'));
    fireEvent.click(screen.getByTestId('apply-Resolved'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('1');
  });

  it('reopens the whole list when the all-values option is applied', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-severity'));
    fireEvent.click(screen.getByTestId('apply-High'));
    fireEvent.click(screen.getByTestId('pick-severity'));
    fireEvent.click(screen.getByTestId('apply-blank'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('3');
  });

  it('keeps only the issues inside a closed date range', async () => {
    mocks.dateRange = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31) };
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-date'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    // The undated issue has no date to compare, so it stays in the list.
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
    expect(cell(0, 'name')).toBe('Login broken');
  });

  it('keeps only the issues after an open-ended start date', async () => {
    mocks.dateRange = { start: new Date(2026, 1, 1), end: null };
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-date'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('2');
    expect(cell(0, 'issue_id')).toBe('ISS-002');
  });

  it('ignores a range with no start date', async () => {
    mocks.dateRange = { start: null, end: new Date(2026, 0, 1) };
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-date'));
    fireEvent.click(screen.getByTestId('date-filter-apply'));
    expect(screen.getByTestId('table-rows')).toHaveTextContent('3');
  });

  it('closes a filter modal without applying anything', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-category'));
    fireEvent.click(screen.getByTestId('value-filter-close'));
    expect(screen.queryByTestId('value-filter-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('pick-date'));
    fireEvent.click(screen.getByTestId('date-filter-close'));
    expect(screen.queryByTestId('date-filter-modal')).toBeNull();
  });

  it('opens no modal for the placeholder or the clear entry', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('pick-blank'));
    expect(screen.queryByTestId('value-filter-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('pick-clear_filters'));
    expect(screen.queryByTestId('value-filter-modal')).toBeNull();
    expect(screen.getByTestId('table-rows')).toHaveTextContent('3');
  });
});

describe('opening an issue', () => {
  it('replaces the page with the issue detail view', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('act-0-View Issue'));
    expect(screen.getByTestId('view-issue-id')).toHaveTextContent('i1');
    expect(screen.queryByTestId('issue-table')).toBeNull();
  });

  it('reloads the issues on the way back', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('act-0-View Issue'));
    mocks.issueApi.GetTenantIssuesByStatus.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByTestId('view-issue-back'));
    });
    expect(mocks.issueApi.GetTenantIssuesByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all' })
    );
    expect(screen.getByTestId('issue-table')).toBeInTheDocument();
  });
});

describe('a tenant lookup that resolves to nothing', () => {
  it('keeps the generic label when the response body is empty', async () => {
    // `res.data || res || null` only reaches its last arm when the whole
    // response is falsy but still safe to read a property off.
    mocks.tenantApi.GetSingleTenant.mockResolvedValue('');
    await renderPage();
    expect(document.body.querySelector('.tenant-title-breadcrumbs-org')).toHaveTextContent(
      'Tenant'
    );
  });
});
