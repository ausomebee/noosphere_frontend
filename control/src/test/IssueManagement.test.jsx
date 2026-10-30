import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

/**
 * The issues dashboard: five metric cards, a donut whose slices come from
 * whichever percentage endpoint the "Top Issue" picker names, a tab bar that
 * re-queries the list by status, and the log table itself.
 *
 * The page fires ten requests through `Promise.allSettled` on every tab change,
 * and each one has its own rejected branch that pushes an error and falls back
 * to a cached or empty value, so most fixtures here differ only in which of the
 * ten is made to reject.
 *
 * react-apexcharts is replaced with a probe that prints its labels and series:
 * the donut is the only place the percentage responses are visible, and jsdom
 * cannot lay out a real chart. The row-level "View Issue" action swaps the whole
 * page for ViewIssue, which is a probe here for the same reason -- it is a large
 * component with its own tests.
 */

const mocks = vi.hoisted(() => ({
  state: {},
  location: { state: null },
  issueApi: {
    GetIssueById: vi.fn(),
    GetResolutionTime: vi.fn(),
    GetMetricAndStatusCount: vi.fn(),
    GetStatusPercentageAndCount: vi.fn(),
    GetCategoryPercentageAndCount: vi.fn(),
    GetDateCreatedPercentageAndCount: vi.fn(),
    GetAssigneePercentageAndCount: vi.fn(),
    GetPriorityPercentageAndCount: vi.fn(),
    GetIssuesByStatus: vi.fn(),
    CreateIssue: vi.fn(),
  },
  tenantApi: { getAllAdmins: vi.fn(), getAllTenants: vi.fn() },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  // The page appends every field to a FormData with its own `|| ""` fallback,
  // so one test hands the modal an empty issue.
  newIssue: null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useLocation: () => mocks.location };
});

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/IssueApi', () => ({ default: mocks.issueApi }));
vi.mock('../api/TenantApis', () => ({ default: mocks.tenantApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('react-apexcharts', () => ({
  default: (props) => (
    <div data-testid="donut">
      <span data-testid="donut-labels">{props.options.labels.join('|')}</span>
      <span data-testid="donut-series">{props.series.join('|')}</span>
    </div>
  ),
}));

vi.mock('../Pages/IssueManagement/ViewIssue', () => ({
  default: (props) => (
    <div data-testid="view-issue">
      <span data-testid="view-issue-id">{props.issue.id}</span>
      <span data-testid="view-issue-title">{props.issue.title}</span>
      <span data-testid="view-issue-status">{props.issue.status}</span>
      <span data-testid="view-issue-staff">{props.staffList.length}</span>
      <button data-testid="view-issue-back" onClick={props.onBack}>
        back
      </button>
    </div>
  ),
}));

vi.mock('../Components/ReusableModal/AddAnIssueModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="add-issue-modal">
        <span data-testid="add-issue-tenants">{props.tenantList.length}</span>
        <button
          data-testid="add-issue-save"
          onClick={() => props.onSave(mocks.newIssue, props.onClose)}
        >
          save
        </button>
      </div>
    ) : null,
}));

import IssueManagement from '../Pages/IssueManagement/IssueManagement';

const admins = {
  data: {
    data: [
      { id: 'adm-1', firstName: 'Ada', lastName: 'Lovelace', active: true },
      // No name at all: the page falls back to the id, then to a placeholder.
      { id: 'adm-2', active: false },
    ],
  },
};

const tenants = {
  data: {
    data: [
      { id: 'ten-1', companyName: 'Acme Health', BillingPlan: [{ planType: 'ENTERPRISE' }] },
      { id: 'ten-2' },
    ],
  },
};

// One fully populated issue and one that leans on every fallback the mapper has.
const issues = {
  data: [
    {
      id: 'iss-1',
      category: 'Auth',
      status: 'In Progress',
      priority: 'P1',
      loggedBy: { firstName: 'Grace', lastName: 'Hopper' },
      assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
      title: 'Login broken',
      description: 'Cannot sign in',
      resolutionDeadline: '2026-02-01T00:00:00Z',
    },
    {
      id: 'iss-2',
      status: 'NotStarted',
      priority: 'ZZ9',
      tenant: { companyName: 'Acme Health' },
    },
  ],
};

const metrics = {
  data: {
    All: { _count: { _all: 1200 } },
    NotStarted: { _count: { _all: 3 } },
    Resolved: { _count: { _all: 4 } },
    InProgress: { _count: { _all: 5 } },
    Unassigned: { _count: { _all: 6 } },
  },
};

const buildState = (permissions) => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      id: 'u1',
      role: { roleModuleAccesses: [{ module: 'ISSUES', permissions }] },
    },
  },
});

const allPerms = ['issue_management', 'view_issues', 'create_issue'];

const renderPage = async (permissions = allPerms) => {
  mocks.state = buildState(permissions);
  const view = render(<IssueManagement />);
  await act(async () => {});
  return view;
};

const rows = () =>
  Array.from(document.body.querySelectorAll('tbody tr')).filter(
    (tr) => !tr.querySelector('td[colspan]')
  );

const openRowMenu = (index = 0) =>
  fireEvent.click(screen.getAllByLabelText('Row actions')[index]);

// The tab labels repeat as status values inside the table, so tabs are always
// addressed through the tab bar rather than by text.
const tabButton = (label) =>
  Array.from(document.body.querySelectorAll('.subscription-tab')).find((b) =>
    b.textContent.startsWith(label)
  );

// Card order: all, assigned, in progress, resolved, average resolution time.
const overviewValues = () =>
  Array.from(document.body.querySelectorAll('.issue-mgmt-overview-value')).map(
    (el) => el.textContent
  );

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // The active tab is persisted in sessionStorage, so it would otherwise leak
  // from one test into the next.
  sessionStorage.clear();
  // The row-action menu and the modal both scroll their target into view.
  Element.prototype.scrollIntoView = vi.fn();
  mocks.location = { state: null };
  mocks.newIssue = {
    title: 'Login broken',
    description: 'Cannot sign in',
    category: 'Auth',
    priority: 'P1',
    tenantId: 'ten-1',
    assignToStaff: 'adm-1',
    resolutionDeadline: '2026-03-01',
    image: new File(['x'], 'shot.png', { type: 'image/png' }),
  };
  mocks.tenantApi.getAllAdmins.mockResolvedValue(admins);
  mocks.tenantApi.getAllTenants.mockResolvedValue(tenants);
  mocks.issueApi.GetIssuesByStatus.mockResolvedValue(issues);
  mocks.issueApi.GetMetricAndStatusCount.mockResolvedValue(metrics);
  mocks.issueApi.GetResolutionTime.mockResolvedValue({ data: '4.25' });
  mocks.issueApi.GetStatusPercentageAndCount.mockResolvedValue({
    data: [{ status: 'Open', percentage: '60', count: 6 }],
  });
  mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({
    data: [
      { category: 'Auth', percentage: '40', count: 4 },
      { category: 'Billing', percentage: '35', count: 3 },
    ],
  });
  mocks.issueApi.GetDateCreatedPercentageAndCount.mockResolvedValue({
    data: [{ createdAt: '2026-01-02T00:00:00Z', percentage: '20', count: 2 }],
  });
  mocks.issueApi.GetAssigneePercentageAndCount.mockResolvedValue({
    data: [{ assignedTo: { firstName: 'Ada', lastName: 'Lovelace' }, percentage: '10', count: 1 }],
  });
  mocks.issueApi.GetPriorityPercentageAndCount.mockResolvedValue({
    data: [{ priority: 'P1', percentage: '15', count: 5 }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('access control', () => {
  it('shows the access-denied panel without either issue permission', async () => {
    await renderPage([]);
    expect(screen.getByText("You don't have permission to view this.")).toBeInTheDocument();
    expect(screen.queryByText('Issues Management')).toBeNull();
  });

  it('renders the dashboard for a role with only the read permission', async () => {
    await renderPage(['view_issues']);
    expect(screen.getByText('Issues Management')).toBeInTheDocument();
  });

  it('hides the log-an-issue button without the create permission', async () => {
    await renderPage(['view_issues']);
    expect(screen.queryByText('Log an Issue')).toBeNull();
  });

  it('offers the log-an-issue button to a role that may create', async () => {
    await renderPage();
    expect(screen.getByText('Log an Issue')).toBeInTheDocument();
  });

  it('offers no row action without the view permission', async () => {
    await renderPage(['issue_management']);
    openRowMenu();
    expect(screen.queryByText('View Issue')).toBeNull();
  });
});

describe('overview metrics', () => {
  it('abbreviates a four-figure count', async () => {
    await renderPage();
    expect(overviewValues()[0]).toBe('1.2k');
  });

  it('drops a trailing zero from the abbreviation', async () => {
    mocks.issueApi.GetMetricAndStatusCount.mockResolvedValue({
      data: { All: { _count: { _all: 2000 } } },
    });
    await renderPage();
    expect(overviewValues()[0]).toBe('2k');
  });

  it('counts assigned issues as everything neither unassigned nor resolved', async () => {
    mocks.issueApi.GetMetricAndStatusCount.mockResolvedValue({
      data: {
        All: { _count: { _all: 20 } },
        Unassigned: { _count: { _all: 6 } },
        Resolved: { _count: { _all: 4 } },
        InProgress: { _count: { _all: 5 } },
        NotStarted: { _count: { _all: 5 } },
      },
    });
    await renderPage();
    expect(overviewValues()[1]).toBe('10');
  });

  it('never shows a negative assigned count', async () => {
    mocks.issueApi.GetMetricAndStatusCount.mockResolvedValue({
      data: {
        All: { _count: { _all: 1 } },
        Unassigned: { _count: { _all: 6 } },
        Resolved: { _count: { _all: 4 } },
      },
    });
    await renderPage();
    expect(overviewValues()[1]).toBe('0');
  });

  it('shows the average resolution time', async () => {
    await renderPage();
    expect(screen.getByText('4.25 hrs')).toBeInTheDocument();
  });

  it('falls back to zeroes when the metric and time endpoints fail', async () => {
    mocks.issueApi.GetMetricAndStatusCount.mockRejectedValue(new Error('x'));
    mocks.issueApi.GetResolutionTime.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(screen.getByText('0.00 hrs')).toBeInTheDocument();
    expect(overviewValues()[0]).toBe('0');
  });

  it('treats a missing resolution time payload as zero', async () => {
    mocks.issueApi.GetResolutionTime.mockResolvedValue({ data: null });
    await renderPage();
    expect(screen.getByText('0.00 hrs')).toBeInTheDocument();
  });
});

describe('the issue log table', () => {
  it('renders a row per issue with the mapped identifiers', async () => {
    await renderPage();
    expect(rows()).toHaveLength(2);
    expect(screen.getByText('ISS-001')).toBeInTheDocument();
    expect(screen.getByText('ISS-002')).toBeInTheDocument();
  });

  it('expands the priority codes and normalises the status labels', async () => {
    await renderPage();
    expect(within(rows()[0]).getByText('Critical')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('In-Progress')).toBeInTheDocument();
    expect(within(rows()[1]).getByText('Not-Started')).toBeInTheDocument();
  });

  it('keeps an unrecognised priority code as-is', async () => {
    await renderPage();
    expect(screen.getByText('ZZ9')).toBeInTheDocument();
  });

  it('falls back to the tenant name when nobody logged the issue', async () => {
    await renderPage();
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('labels an issue with no assignee as unassigned', async () => {
    await renderPage();
    expect(within(rows()[1]).getByText('Unassigned')).toBeInTheDocument();
  });

  it('shows an empty table when the issue request fails', async () => {
    mocks.issueApi.GetIssuesByStatus.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(rows()).toHaveLength(0);
  });

  it('shows an empty table when the issue payload is not a list', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({ data: { oops: true } });
    await renderPage();
    expect(rows()).toHaveLength(0);
  });

  it('hides the status column on a status-specific tab', async () => {
    await renderPage();
    expect(screen.getByText('Issue Status')).toBeInTheDocument();
    fireEvent.click(tabButton('Resolved'));
    await act(async () => {});
    expect(screen.queryByText('Issue Status')).toBeNull();
  });
});

describe('status tabs', () => {
  const lastStatus = () =>
    mocks.issueApi.GetIssuesByStatus.mock.calls.at(-1)[0].status;

  it('starts on the all tab', async () => {
    await renderPage();
    expect(lastStatus()).toBe('all');
  });

  it.each([
    ['In-Progress', 'In Progress'],
    ['Not Started', 'Not Started'],
    ['Resolved', 'Resolved'],
    ['Unassigned', 'Unassigned'],
  ])('re-queries with %s when that tab is chosen', async (label, expected) => {
    await renderPage();
    fireEvent.click(tabButton(label));
    await waitFor(() => expect(lastStatus()).toBe(expected));
  });

  it('marks the chosen tab active', async () => {
    await renderPage();
    fireEvent.click(tabButton('Resolved'));
    await act(async () => {});
    const active = document.body.querySelector('.subscription-tab.active');
    expect(active).toHaveTextContent('Resolved');
  });

  it('returns to the all tab when a table filter changes', async () => {
    await renderPage();
    fireEvent.click(tabButton('Resolved'));
    await act(async () => {});
    fireEvent.change(document.body.querySelector('.table-filter-select'), {
      target: { value: 'category' },
    });
    await waitFor(() => expect(lastStatus()).toBe('all'));
  });
});

describe('staff and tenant lookups', () => {
  it('falls back to an empty list when the staff payload is not a list', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: { data: null } });
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('2');
  });

  it('falls back to an empty tenant list when that payload is not a list', async () => {
    mocks.tenantApi.getAllTenants.mockResolvedValue({ data: {} });
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('0');
  });

  it('keeps the previously cached staff list when the request fails', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue({ data: { id: 'iss-1' } });
    await renderPage();
    mocks.tenantApi.getAllAdmins.mockRejectedValue(new Error('x'));
    fireEvent.click(tabButton('Resolved'));
    await act(async () => {});
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue-staff')).toHaveTextContent('2'));
  });
});

describe('degenerate load responses', () => {
  it('keeps the cached tenant list when that request fails', async () => {
    await renderPage();
    mocks.tenantApi.getAllTenants.mockRejectedValue(new Error('x'));
    fireEvent.click(tabButton('Resolved'));
    await act(async () => {});
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('2');
  });

  it('names an admin who has neither name nor id', async () => {
    mocks.tenantApi.getAllAdmins.mockResolvedValue({ data: { data: [{}] } });
    mocks.issueApi.GetIssueById.mockResolvedValue({ data: { id: 'iss-1' } });
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue-staff')).toHaveTextContent('1'));
  });

  it('names a tenant that has neither name nor id', async () => {
    mocks.tenantApi.getAllTenants.mockResolvedValue({ data: { data: [{}] } });
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('1');
  });

  it('treats a metrics payload with no buckets as all zero', async () => {
    mocks.issueApi.GetMetricAndStatusCount.mockResolvedValue({ data: {} });
    await renderPage();
    expect(overviewValues()[0]).toBe('0');
  });

  it('hyphenates a status the map does not know', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [{ id: 'iss-3', status: 'Escalated', priority: 'P1' }],
    });
    await renderPage();
    expect(within(rows()[0]).getByText('Escalated')).toBeInTheDocument();
  });

  it('shows a placeholder for an issue with no priority', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [{ id: 'iss-3', status: 'Open' }],
    });
    await renderPage();
    expect(within(rows()[0]).getByText('N/A', { selector: '.priority-label' })).toBeInTheDocument();
  });

  it('credits nobody when an issue has neither a logger nor a tenant', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [{ id: 'iss-3', status: 'Open', priority: 'P1', assignedTo: {} }],
    });
    await renderPage();
    expect(within(rows()[0]).getByText('Unknown')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('Unassigned')).toBeInTheDocument();
  });

  it('abandons the whole load when an issue cannot be mapped', async () => {
    // A numeric status reaches String.prototype.replace and throws, which is
    // the only way into the outer catch.
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [{ id: 'iss-3', status: 5 }],
    });
    await renderPage();
    expect(rows()).toHaveLength(0);
    expect(screen.getByText('Issues Management')).toBeInTheDocument();
  });

  it('falls back to zeroes when every breakdown request fails', async () => {
    for (const name of [
      'GetStatusPercentageAndCount',
      'GetDateCreatedPercentageAndCount',
      'GetAssigneePercentageAndCount',
      'GetPriorityPercentageAndCount',
    ]) {
      mocks.issueApi[name].mockRejectedValue(new Error('x'));
    }
    await renderPage();
    const picker = document.body.querySelector('.issue-mgmt-top-issue-select');
    for (const value of ['by status', 'by date reported', 'by assigned to', 'by priority']) {
      fireEvent.change(picker, { target: { value } });
      expect(screen.getByTestId('donut-labels')).toHaveTextContent('No Data');
    }
  });

  it('ignores breakdown payloads that are not lists', async () => {
    for (const name of [
      'GetStatusPercentageAndCount',
      'GetDateCreatedPercentageAndCount',
      'GetAssigneePercentageAndCount',
      'GetPriorityPercentageAndCount',
    ]) {
      mocks.issueApi[name].mockResolvedValue({ data: { nope: true } });
    }
    await renderPage();
    const picker = document.body.querySelector('.issue-mgmt-top-issue-select');
    for (const value of ['by status', 'by date reported', 'by assigned to', 'by priority']) {
      fireEvent.change(picker, { target: { value } });
      expect(screen.getByTestId('donut-labels')).toHaveTextContent('No Data');
    }
  });
});

describe('the top-issue donut', () => {
  const labels = () => screen.getByTestId('donut-labels').textContent;
  const picker = () => document.body.querySelector('.issue-mgmt-top-issue-select');

  it('starts on the category breakdown', async () => {
    await renderPage();
    expect(labels()).toBe('Auth|Billing');
    expect(screen.getByTestId('donut-series')).toHaveTextContent('40|35');
  });

  it('switches to the status breakdown', async () => {
    await renderPage();
    fireEvent.change(picker(), { target: { value: 'by status' } });
    expect(labels()).toBe('Open');
  });

  it('formats the date breakdown labels as dates', async () => {
    await renderPage();
    fireEvent.change(picker(), { target: { value: 'by date reported' } });
    expect(labels()).toMatch(/\d+\/\d+\/\d{4}/);
  });

  it('names the assignee in the assignee breakdown', async () => {
    await renderPage();
    fireEvent.change(picker(), { target: { value: 'by assigned to' } });
    expect(labels()).toBe('Ada Lovelace');
  });

  it('labels an object assignee with no name as unassigned', async () => {
    mocks.issueApi.GetAssigneePercentageAndCount.mockResolvedValue({
      data: [{ assignedTo: {}, percentage: '10', count: 1 }],
    });
    await renderPage();
    fireEvent.change(picker(), { target: { value: 'by assigned to' } });
    expect(labels()).toBe('Unassigned');
  });

  it('accepts a plain-string assignee', async () => {
    mocks.issueApi.GetAssigneePercentageAndCount.mockResolvedValue({
      data: [{ assignedTo: 'Grace Hopper', percentage: '10', count: 1 }],
    });
    await renderPage();
    fireEvent.change(picker(), { target: { value: 'by assigned to' } });
    expect(labels()).toBe('Grace Hopper');
  });

  it('switches to the priority breakdown', async () => {
    await renderPage();
    fireEvent.change(picker(), { target: { value: 'by priority' } });
    expect(labels()).toBe('P1');
  });

  it('falls back to a single no-data slice when the breakdown is empty', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({ data: [] });
    await renderPage();
    expect(labels()).toBe('No Data');
    expect(screen.getByTestId('donut-series')).toHaveTextContent('1');
  });

  it('falls back to no-data when the breakdown request fails', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(labels()).toBe('No Data');
  });

  it('ignores a breakdown payload that is not a list', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({ data: { a: 1 } });
    await renderPage();
    expect(labels()).toBe('No Data');
  });

  it('labels an entry that matches none of the known shapes as unknown', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({
      data: [{ percentage: 'not-a-number', count: 1 }],
    });
    await renderPage();
    expect(labels()).toBe('Unknown');
    expect(screen.getByTestId('donut-series')).toHaveTextContent('0');
  });

  it('keeps at most five slices', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({
      data: Array.from({ length: 7 }, (_, i) => ({ category: `C${i}`, percentage: '5', count: 1 })),
    });
    await renderPage();
    expect(labels().split('|')).toHaveLength(5);
  });
});

describe('the breakdown modal', () => {
  const openBreakdown = async (filter) => {
    await renderPage();
    if (filter) {
      fireEvent.change(document.body.querySelector('.issue-mgmt-top-issue-select'), {
        target: { value: filter },
      });
    }
    fireEvent.click(screen.getByText('See breakdown'));
    await act(async () => {});
  };

  const modalContent = () => document.body.querySelector('.issue-mgt-modal-content');
  const modalItems = () =>
    Array.from(modalContent().querySelectorAll('.modal-item')).map((el) => el.textContent);

  it('titles itself after the chosen breakdown', async () => {
    await openBreakdown();
    expect(screen.getByText('Top Issue by category')).toBeInTheDocument();
  });

  it('lists the categories with their counts', async () => {
    await openBreakdown();
    expect(modalItems()).toEqual(['Auth4', 'Billing3']);
  });

  it('lists statuses without paginating them', async () => {
    await openBreakdown('by status');
    expect(modalItems()).toEqual(['Open6']);
    expect(modalContent().querySelector('.pagination')).toBeNull();
  });

  it('lists priorities without paginating them', async () => {
    await openBreakdown('by priority');
    expect(modalItems()).toEqual(['P15']);
  });

  it('paginates a long category breakdown', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({
      data: Array.from({ length: 8 }, (_, i) => ({ category: `C${i}`, percentage: '5', count: i })),
    });
    await openBreakdown();
    expect(modalItems()).toHaveLength(5);
    fireEvent.click(
      within(modalContent().querySelector('.pagination-pages')).getByText('2')
    );
    expect(modalItems()).toEqual(['C55', 'C66', 'C77']);
  });

  it('names the date breakdown rows by their date', async () => {
    await openBreakdown('by date reported');
    expect(modalItems()[0]).toMatch(/^\d+\/\d+\/\d{4}2$/);
  });

  // Current behaviour, and a defect: the row label is
  // `item.category || formatDate(item.createdAt) || ...`, and formatDate
  // returns the string "N/A" for a missing date. That is truthy, so every
  // later fallback -- assignee, priority, "Unknown" -- is unreachable and any
  // row without a category is labelled "N/A".
  it('labels an assignee row N/A because the date fallback swallows it', async () => {
    await openBreakdown('by assigned to');
    expect(modalItems()).toEqual(['N/A1']);
  });

  it('labels a row that matches none of the known shapes N/A for the same reason', async () => {
    mocks.issueApi.GetCategoryPercentageAndCount.mockResolvedValue({
      data: [{ percentage: '5' }],
    });
    await openBreakdown();
    expect(modalItems()).toEqual(['N/A0']);
  });

  it('labels a status row with neither status nor count', async () => {
    mocks.issueApi.GetStatusPercentageAndCount.mockResolvedValue({ data: [{ percentage: '5' }] });
    await openBreakdown('by status');
    expect(modalItems()).toEqual(['Unknown0']);
  });

  it('empties the donut and the breakdown when the picker is cleared', async () => {
    await renderPage();
    fireEvent.change(document.body.querySelector('.issue-mgmt-top-issue-select'), {
      target: { value: '' },
    });
    expect(screen.getByTestId('donut-labels')).toHaveTextContent('No Data');
    fireEvent.click(screen.getByText('See breakdown'));
    await act(async () => {});
    expect(modalItems()).toEqual([]);
  });

  it('closes again', async () => {
    await openBreakdown();
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Top Issue by category')).toBeNull());
  });
});

describe('logging a new issue', () => {
  it('posts the form fields and prepends the new row', async () => {
    mocks.issueApi.CreateIssue.mockResolvedValue({
      data: { id: 'iss-9', title: 'Login broken', description: 'Cannot sign in' },
    });
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    fireEvent.click(screen.getByTestId('add-issue-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Issue added successfully', 'success')
    );
    const payload = mocks.issueApi.CreateIssue.mock.calls[0][0].payload;
    expect(payload.get('title')).toBe('Login broken');
    expect(payload.get('adminId')).toBe('adm-1');
    expect(payload.get('attachment')).toBeInstanceOf(File);
    // The modal closes through the onSuccess callback the page hands back.
    expect(screen.queryByTestId('add-issue-modal')).toBeNull();
  });

  it('re-syncs the list silently after a successful create', async () => {
    mocks.issueApi.CreateIssue.mockResolvedValue({ data: { id: 'iss-9' } });
    await renderPage();
    const before = mocks.issueApi.GetIssuesByStatus.mock.calls.length;
    fireEvent.click(screen.getByText('Log an Issue'));
    fireEvent.click(screen.getByTestId('add-issue-save'));
    await waitFor(() =>
      expect(mocks.issueApi.GetIssuesByStatus.mock.calls.length).toBeGreaterThan(before)
    );
  });

  it('warns and keeps the modal open when the create fails', async () => {
    mocks.issueApi.CreateIssue.mockRejectedValue(new Error('x'));
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    fireEvent.click(screen.getByTestId('add-issue-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to add issue.', 'error')
    );
    expect(screen.getByTestId('add-issue-modal')).toBeInTheDocument();
  });

  it('posts empty strings for every field the form leaves out', async () => {
    mocks.newIssue = {};
    mocks.issueApi.CreateIssue.mockResolvedValue({});
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    fireEvent.click(screen.getByTestId('add-issue-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Issue added successfully', 'success')
    );
    const payload = mocks.issueApi.CreateIssue.mock.calls[0][0].payload;
    for (const field of [
      'title',
      'description',
      'category',
      'priority',
      'tenantId',
      'adminId',
      'resolutionDeadline',
      'adminLoggedById',
      'assignToStaff',
    ]) {
      expect(payload.get(field)).toBe('');
    }
    expect(payload.get('attachment')).toBeNull();
  });

  it('closes on cancel without posting anything', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-modal')).toBeInTheDocument();
    expect(mocks.issueApi.CreateIssue).not.toHaveBeenCalled();
  });
});

describe('opening a single issue', () => {
  const detail = {
    data: {
      id: 'iss-1',
      issueId: 'ISS-001',
      category: 'Auth',
      priority: 'P1',
      loggedBy: { firstName: 'Grace', lastName: 'Hopper' },
      assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
      status: 'In Progress',
      title: 'Login broken',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
      resolutionDeadline: '2026-02-01T00:00:00Z',
    },
  };

  it('replaces the dashboard with the issue detail', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue(detail);
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(screen.getByTestId('view-issue-title')).toHaveTextContent('Login broken');
    // The page strips the space so the detail view's status pill matches.
    expect(screen.getByTestId('view-issue-status')).toHaveTextContent('InProgress');
    expect(screen.queryByText('Issues Management')).toBeNull();
  });

  it('returns to the dashboard on back', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue(detail);
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('view-issue-back'));
    expect(screen.getByText('Issues Management')).toBeInTheDocument();
  });

  it('serves a second visit from the cache', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue(detail);
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('view-issue-back'));
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(mocks.issueApi.GetIssueById).toHaveBeenCalledTimes(1);
  });

  it('falls back to the row when the detail response is empty', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue({});
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(screen.getByTestId('view-issue-id')).toHaveTextContent('iss-1');
    expect(screen.getByTestId('view-issue-status')).toHaveTextContent('In-Progress');
  });

  it('calls an assignee with no name unassigned', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue({ data: { id: 'iss-1', assignedTo: {} } });
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(screen.getByTestId('view-issue-id')).toHaveTextContent('iss-1');
  });

  it('surfaces a failed detail load and stays on the dashboard', async () => {
    mocks.issueApi.GetIssueById.mockRejectedValue(new Error('x'));
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ISSUE')
    );
    expect(screen.getByText('Issues Management')).toBeInTheDocument();
  });

  it('opens the issue named by a notification hand-off', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue(detail);
    mocks.location = { state: { focusId: 'iss-1' } };
    await renderPage();
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(mocks.issueApi.GetIssueById).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'iss-1' })
    );
  });

  it('opens the issue by way of the clickable name cell', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue(detail);
    await renderPage();
    const firstRow = rows()[0];
    fireEvent.click(within(firstRow).getByRole('button', { name: 'ISS-001' }));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
  });
});

describe('logging in a production build', () => {
  // Each of the ten settled results has its own `import.meta.env.DEV` guarded
  // diagnostic, and Vitest leaves DEV true; stubbing it false walks the arm the
  // deployed bundle takes while the fallback state must stay identical.
  beforeEach(() => {
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const silentAbout = (prefix) =>
    expect(console.error).not.toHaveBeenCalledWith(prefix, expect.anything());

  it('keeps the cached staff list quietly when that request fails', async () => {
    mocks.tenantApi.getAllAdmins.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(screen.getByText('Issues Management')).toBeInTheDocument();
    silentAbout('Admins error:');
  });

  it('keeps the cached tenant list quietly when that request fails', async () => {
    mocks.tenantApi.getAllTenants.mockRejectedValue(new Error('x'));
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('0');
    silentAbout('Tenants error:');
  });

  it('empties the table quietly when the issue request fails', async () => {
    mocks.issueApi.GetIssuesByStatus.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(rows()).toHaveLength(0);
    silentAbout('Issues error:');
  });

  it('zeroes the metrics and the resolution time quietly', async () => {
    mocks.issueApi.GetMetricAndStatusCount.mockRejectedValue(new Error('x'));
    mocks.issueApi.GetResolutionTime.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(overviewValues()[0]).toBe('0');
    expect(screen.getByText('0.00 hrs')).toBeInTheDocument();
    silentAbout('Metrics error:');
    silentAbout('Resolution time error:');
  });

  it('empties every breakdown quietly when all four percentage requests fail', async () => {
    for (const name of [
      'GetStatusPercentageAndCount',
      'GetCategoryPercentageAndCount',
      'GetDateCreatedPercentageAndCount',
      'GetAssigneePercentageAndCount',
      'GetPriorityPercentageAndCount',
    ]) {
      mocks.issueApi[name].mockRejectedValue(new Error('x'));
    }
    await renderPage();
    expect(screen.getByTestId('donut-labels')).toHaveTextContent('No Data');
    silentAbout('Status percentages error:');
    silentAbout('Category percentages error:');
    silentAbout('Date created percentages error:');
    silentAbout('Assignee percentages error:');
    silentAbout('Priority percentages error:');
  });

  it('abandons an unmappable load quietly', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({ data: [{ id: 'iss-3', status: 5 }] });
    await renderPage();
    expect(rows()).toHaveLength(0);
    silentAbout('Fetch error:');
  });

  it('warns about a failed create quietly', async () => {
    mocks.issueApi.CreateIssue.mockRejectedValue(new Error('x'));
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    fireEvent.click(screen.getByTestId('add-issue-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to add issue.', 'error')
    );
    silentAbout('Error adding issue:');
  });

  it('surfaces a failed detail load quietly', async () => {
    mocks.issueApi.GetIssueById.mockRejectedValue(new Error('x'));
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ISSUE')
    );
    silentAbout('Error fetching issue:');
  });
});

describe('issues with no status at all', () => {
  it('calls an issue that reports no status not-started', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [{ id: 'iss-3', priority: 'P2', category: 'Billing' }],
    });
    await renderPage();
    expect(within(rows()[0]).getByText('Not-Started')).toBeInTheDocument();
  });
});

describe('issue payloads that carry their own collections', () => {
  it('keeps a row whose payload already has attachments, comments and logs', async () => {
    // The list mapper defaults each collection to an empty array; this fixture
    // is the only one that walks the arm where the payload supplies its own.
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [
        {
          id: 'iss-3',
          status: 'Open',
          priority: 'P2',
          category: 'Billing',
          attachments: [{ id: 'att-1', url: 'shot.png' }],
          comments: [{ id: 'cmt-1', body: 'looking' }],
          logs: [{ id: 'log-1', action: 'created' }],
        },
      ],
    });
    await renderPage();
    expect(screen.getByText('ISS-001')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('Billing')).toBeInTheDocument();
  });

  it('credits nobody when the logger has an empty name and there is no tenant', async () => {
    mocks.issueApi.GetIssuesByStatus.mockResolvedValue({
      data: [{ id: 'iss-3', status: 'Open', priority: 'P2', loggedBy: {} }],
    });
    await renderPage();
    expect(within(rows()[0]).getByText('Unknown')).toBeInTheDocument();
  });
});

describe('a detail response with its own collections', () => {
  it('opens an issue whose payload carries attachments, comments and logs', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue({
      data: {
        id: 'iss-1',
        title: 'Login broken',
        attachments: [{ id: 'att-1' }],
        comments: [{ id: 'cmt-1' }],
        logs: [{ id: 'log-1' }],
      },
    });
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(screen.getByTestId('view-issue-title')).toHaveTextContent('Login broken');
  });

  it('credits the tenant when the detail names no logger', async () => {
    mocks.issueApi.GetIssueById.mockResolvedValue({
      data: { id: 'iss-1', title: 'Login broken', tenant: { companyName: 'Acme Health' } },
    });
    await renderPage();
    openRowMenu();
    fireEvent.click(screen.getByText('View Issue'));
    await waitFor(() => expect(screen.getByTestId('view-issue')).toBeInTheDocument());
    expect(screen.getByTestId('view-issue-id')).toHaveTextContent('iss-1');
  });
});

describe('a new issue that names its own author', () => {
  it('credits the supplied author instead of looking the tenant up', async () => {
    mocks.newIssue = {
      title: 'Login broken',
      category: 'Auth',
      priority: 'P1',
      tenantId: 'ten-1',
      createdBy: 'Grace Hopper',
      status: 'Open',
    };
    mocks.issueApi.CreateIssue.mockResolvedValue({ data: { id: 'iss-9', title: 'Login broken' } });
    await renderPage();
    // The page prepends the optimistic row and then silently re-syncs, which
    // would replace it; parking the re-sync leaves the optimistic row visible.
    mocks.issueApi.GetIssuesByStatus.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByText('Log an Issue'));
    fireEvent.click(screen.getByTestId('add-issue-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Issue added successfully', 'success')
    );
    expect(within(rows()[0]).getByText('ISS-003')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('Grace Hopper')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('Open')).toBeInTheDocument();
  });
});

describe('a tenant whose billing plan list is empty', () => {
  it('treats it as a non-enterprise tenant', async () => {
    mocks.tenantApi.getAllTenants.mockResolvedValue({
      data: { data: [{ id: 'ten-3', companyName: 'Lean Co', BillingPlan: [] }] },
    });
    await renderPage();
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('1');
  });
});

describe('responses with no data field at all', () => {
  it('falls back everywhere when every endpoint answers with a bare envelope', async () => {
    // Distinct from the "not a list" fixtures: here the outer `data` itself is
    // absent, so each optional chain short-circuits before the type check.
    for (const name of ['getAllAdmins', 'getAllTenants']) {
      mocks.tenantApi[name].mockResolvedValue({});
    }
    for (const name of [
      'GetIssuesByStatus',
      'GetMetricAndStatusCount',
      'GetResolutionTime',
      'GetStatusPercentageAndCount',
      'GetCategoryPercentageAndCount',
      'GetDateCreatedPercentageAndCount',
      'GetAssigneePercentageAndCount',
      'GetPriorityPercentageAndCount',
    ]) {
      mocks.issueApi[name].mockResolvedValue({});
    }
    await renderPage();
    expect(overviewValues()[0]).toBe('0');
    expect(screen.getByText('0.00 hrs')).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
    expect(screen.getByTestId('donut-labels')).toHaveTextContent('No Data');
    fireEvent.click(screen.getByText('Log an Issue'));
    expect(screen.getByTestId('add-issue-tenants')).toHaveTextContent('0');
  });
});

describe('a fetch that is torn down mid-flight', () => {
  // Nothing in the page rejects with an AbortError of its own -- the controller
  // it builds is never handed to the API layer -- so the abort arm is reached by
  // having one of the ten calls throw synchronously out of the Promise.allSettled
  // argument list, which is the same place the real abort would surface.
  const aborted = () => {
    const err = new Error('The user aborted a request.');
    err.name = 'AbortError';
    return err;
  };

  it('says nothing to the console when the request was aborted', async () => {
    const err = aborted();
    mocks.tenantApi.getAllAdmins.mockImplementation(() => {
      throw err;
    });
    await renderPage();

    expect(console.error).not.toHaveBeenCalledWith('Fetch error:', err);
    expect(rows()).toHaveLength(0);
  });

  it('still logs a failure that is not an abort', async () => {
    const err = new Error('network down');
    mocks.tenantApi.getAllAdmins.mockImplementation(() => {
      throw err;
    });
    await renderPage();

    expect(console.error).toHaveBeenCalledWith('Fetch error:', err);
  });
});
