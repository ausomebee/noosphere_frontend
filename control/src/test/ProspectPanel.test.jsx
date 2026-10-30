import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';

/**
 * The prospect detail page: one candidate's org card, its required tasks and
 * documents, the per-item custom task/document lists, and the payment-link
 * modal.
 *
 * The page reads everything through `useSelector` and writes everything through
 * `useDispatch`, so react-redux is replaced with a shim over a plain state
 * object -- that keeps `useAuth` and `usePermission` real (permission gating is
 * most of the branching here) while letting each test hand the page an exact
 * pipeline state without driving the reducers. Dispatch returns a thenable with
 * `unwrap`, which is the only part of the thunk contract the page uses.
 *
 * Every modal is a probe: it renders nothing when closed and a testid plus a
 * couple of trigger buttons when open. The payment modal's probe additionally
 * renders the active tab's `content`, because that JSX -- plan card, invoice
 * history, regenerate button -- lives in the page and would otherwise never be
 * reached.
 *
 * The candidate object is only rebuilt when status is "succeeded" AND the
 * current stage exists in `columns`; fixtures that omit either leave the page
 * on its blank defaults, which is itself a branch worth pinning.
 */

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: {},
  dispatch: vi.fn(),
  state: {},
  api: {
    getAllAdmins: vi.fn(),
    GetPipelineStage: vi.fn(),
    GetCustomTasks: vi.fn(),
    GetCustomDocuments: vi.fn(),
    CreateCustomTask: vi.fn(),
    CreateCustomDocument: vi.fn(),
    UpdateCustomTask: vi.fn(),
    UpdateCustomDocument: vi.fn(),
    DeleteCustomTask: vi.fn(),
    DeleteCustomDocument: vi.fn(),
  },
  billingApi: { GetPlanByPlanType: vi.fn() },
  invoiceApi: {
    GeneratePaymentLink: vi.fn(),
    RegeneratePaymentLink: vi.fn(),
    GetInvoiceHistory: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  // The edit modal's payload varies per test: the page merges `companyName` or
  // `company`, and falls back to the previous value for anything absent.
  editPayload: { companyName: 'Renamed Co', contactPerson: 'Grace H' },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate, useParams: () => mocks.params };
});

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.api }));
vi.mock('../api/BillingApis', () => ({ default: mocks.billingApi }));
vi.mock('../api/InvoiceApi', () => ({ default: mocks.invoiceApi }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

// A save button that swallows the rejection the page deliberately re-throws so
// the modal can stay open; an unhandled rejection would fail the run.
const saveButton = (testid, onSave, payload) => (
  <button
    data-testid={testid}
    onClick={() => Promise.resolve(onSave(payload)).catch(() => {})}
  >
    save
  </button>
);

vi.mock('../Components/ReusableModal/EditProspectModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="edit-prospect-modal">
        <span data-testid="edit-prospect-staff-count">{props.staffList.length}</span>
        <span data-testid="edit-prospect-stage-count">{props.stages.length}</span>
        <button
          data-testid="edit-prospect-save"
          onClick={() => props.onSave(mocks.editPayload)}
        >
          save
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/CustomTaskModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid={props.initialValues ? 'edit-task-modal' : 'add-task-modal'}>
        <span data-testid="task-modal-initial">{props.initialValues?.name || ''}</span>
        {saveButton(
          props.initialValues ? 'edit-task-save' : 'add-task-save',
          props.onSave,
          { name: 'Kickoff call', required: true }
        )}
        <button data-testid="task-modal-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/CustomDocumentModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid={props.initialValues ? 'edit-doc-modal' : 'add-doc-modal'}>
        <span data-testid="doc-modal-initial">{props.initialValues?.name || ''}</span>
        {saveButton(
          props.initialValues ? 'edit-doc-save' : 'add-doc-save',
          props.onSave,
          { name: 'Signed NDA', required: false }
        )}
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/UploadDocumentModal', () => ({
  default: (props) => (props.isOpen ? <div data-testid="upload-modal" /> : null),
}));

vi.mock('../Components/ReusableModal/MoveCandidateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="move-modal">
        <span data-testid="move-modal-current">{props.currentColumnId}</span>
        {props.columns.map((c) => (
          <button key={c.id} data-testid={`move-to-${c.id}`} onClick={() => props.onSave(c.id)}>
            {c.title}
          </button>
        ))}
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/AssignCandidateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="assign-modal">
        {props.staffList.map((s) => (
          <button
            key={s.staffId}
            data-testid={`assign-${s.staffId}`}
            onClick={() => props.onSave(s.staffId)}
          >
            {s.name}
          </button>
        ))}
        <button data-testid="assign-unknown" onClick={() => props.onSave('nobody')}>
          unknown
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/DeleteConfirmationModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="delete-modal">
        <button data-testid="delete-confirm" onClick={props.onConfirm}>
          confirm
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/SendEmailModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="email-modal">
        <span data-testid="email-recipient">{props.recipientEmail}</span>
      </div>
    ) : null,
}));

// Renders the active tab's content so the page's own tab JSX is exercised.
vi.mock('../Components/ReusableModal/ReusableModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="payment-modal">
        <span data-testid="payment-tab">{props.activeTab}</span>
        {props.tabs
          .filter((t) => t.name === props.activeTab)
          .map((t) => (
            <div key={t.name}>{t.content}</div>
          ))}
        <button data-testid="payment-primary" onClick={props.onPrimaryButtonClick}>
          {props.primaryButtonText}
        </button>
        {props.secondaryButtonText && (
          <button data-testid="payment-secondary" onClick={props.onSecondaryButtonClick}>
            {props.secondaryButtonText}
          </button>
        )}
        <button data-testid="payment-goto-link" onClick={() => props.onTabChange('Payment Link')}>
          link tab
        </button>
      </div>
    ) : null,
}));

import ProspectPanel from '../Components/ProspectPanel/ProspectPanel';

// This Node build exposes no `localStorage` at all -- neither its own nor
// jsdom's survives -- and the page remembers "a link was already generated"
// there, so the suite installs a minimal one.
const installLocalStorage = () => {
  let store = {};
  const shim = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: shim, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
  return shim;
};

const ok = () => ({ unwrap: () => Promise.resolve({ status: 'ok' }) });

// A stage the page can resolve: `columns` is keyed by stage id and carries the
// required task/document definitions the candidate's progress is computed from.
const defaultColumns = () => ({
  s1: {
    id: 's1',
    title: 'Prospecting',
    requiredTasks: [{ id: 't1', name: 'Intro call' }, { id: 't2', name: 'Send deck' }],
    requiredDocuments: [{ id: 'd1', name: 'Signed MSA' }],
  },
  s2: { id: 's2', title: 'Negotiation', requiredTasks: [], requiredDocuments: [] },
  s3: { id: 's3', title: 'Closed' },
});

const defaultItem = () => ({
  paymentVerified: false,
  doneTasks: { 'Intro call': true },
  sentDocuments: {},
  admin: { id: 'a1', firstName: 'Ada', lastName: 'Lovelace' },
  tenant: {
    id: 'tenant-1',
    companyName: 'Acme Health',
    contactPerson: 'Alan T',
    email: 'alan@acme.test',
    phoneNumber: '0800',
    companySize: '50',
    organizationType: 'Clinic',
    leadSource: 'Referral',
    subdomain: 'acme',
    location: { address: '1 High St', city: 'Lagos', stateProvince: 'LA', zip: '10001', country: 'NG' },
  },
});

const buildState = (over = {}) => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      id: 'u1',
      role: { roleModuleAccesses: [{ module: 'TENANT', permissions: over.permissions ?? [] }] },
    },
    ...(over.authentication || {}),
  },
  pipeline: {
    pipeline: { id: 'p1' },
    pipelineItem: 'pipelineItem' in over ? over.pipelineItem : defaultItem(),
    draft: over.draft ?? {
      requiredTasks: [{ id: 't1', name: 'Intro call', required: true }, { id: 't2', name: 'Send deck', required: false }],
      requiredDocuments: [{ id: 'd1', name: 'Signed MSA', required: true }],
    },
    status: over.status ?? 'succeeded',
    stages: over.stages ?? [],
    columns: over.columns ?? defaultColumns(),
  },
});

const renderPanel = async (over = {}) => {
  mocks.state = buildState(over);
  mocks.params = over.params ?? { pipelineStageId: 's1', pipelineItemId: 'i1' };
  const view = render(<ProspectPanel />);
  // Flushes the mount effects: three thunks, the staff/stage load, and the
  // custom task/document load all resolve on the microtask queue.
  await act(async () => {});
  return view;
};

// Every permission the page gates on, for the "fully privileged" default.
const allPerms = ['generate_payment_link', 'move_prospect', 'remove_prospect'];

// The plan-settings selects carry no `for`/`id` pairing, so they are reached
// positionally: renewal frequency is rendered above the plan picker.
const planSettingsSelects = () =>
  document.body.querySelectorAll('.plan-settings-tab select');
const frequencySelect = () => planSettingsSelects()[0];
const planSelect = () => planSettingsSelects()[1];

const sectionItem = (label) =>
  Array.from(document.body.querySelectorAll('.section-item')).find((el) =>
    el.querySelector('label')?.textContent === label
  );

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  installLocalStorage();
  mocks.editPayload = { companyName: 'Renamed Co', contactPerson: 'Grace H' };
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom serves an http origin, so the page would otherwise always take the
  // execCommand fallback; each copy test opts into the branch it is about.
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  document.execCommand = vi.fn();
  mocks.dispatch.mockImplementation(() => ok());
  mocks.api.getAllAdmins.mockResolvedValue({
    data: { data: [{ id: 'a1', firstName: 'Ada', lastName: 'Lovelace', active: true }] },
  });
  mocks.api.GetPipelineStage.mockResolvedValue({
    data: { data: [{ id: 's1', name: 'Prospecting' }, { id: 's2', name: 'Negotiation' }] },
  });
  mocks.api.GetCustomTasks.mockResolvedValue({ data: [] });
  mocks.api.GetCustomDocuments.mockResolvedValue({ data: [] });
  mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [] });
  mocks.invoiceApi.GetInvoiceHistory.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('gating and page-level state', () => {
  it('asks the visitor to log in when there is no access token', async () => {
    await renderPanel({ authentication: { accessToken: null } });
    expect(screen.getByText('Please log in to view this page.')).toBeInTheDocument();
    expect(document.body.querySelector('.prospect-panel')).toBeNull();
  });

  it('reports missing route parameters instead of fetching', async () => {
    await renderPanel({ params: {} });
    expect(
      screen.getByText('Missing required parameters or authentication token.')
    ).toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('reports a failed pipeline load', async () => {
    mocks.dispatch.mockImplementation(() => ({
      unwrap: () => Promise.reject(new Error('boom')),
    }));
    await renderPanel();
    expect(screen.getByText('Failed to load pipeline data.')).toBeInTheDocument();
  });

  it('reports a failed staff load without losing the rest of the page', async () => {
    mocks.api.getAllAdmins.mockRejectedValue(new Error('nope'));
    await renderPanel();
    expect(screen.getByText('Failed to load staff or stages.')).toBeInTheDocument();
    expect(document.body.querySelector('.prospect-panel')).toBeInTheDocument();
  });

  it('skips the stage request when no pipeline id is known yet', async () => {
    const over = { permissions: allPerms };
    mocks.state = buildState(over);
    mocks.state.pipeline.pipeline = null;
    mocks.params = { pipelineStageId: 's1', pipelineItemId: 'i1' };
    render(<ProspectPanel />);
    await act(async () => {});
    expect(mocks.api.GetPipelineStage).not.toHaveBeenCalled();
    expect(mocks.api.getAllAdmins).toHaveBeenCalled();
  });

  it('navigates back to the pipeline board', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Back'));
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/pipeline');
  });
});

describe('degenerate staff and stage payloads', () => {
  it('copes with responses that carry no list at all', async () => {
    mocks.api.getAllAdmins.mockResolvedValue({});
    mocks.api.GetPipelineStage.mockResolvedValue({});
    await renderPanel();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('edit-prospect-staff-count')).toHaveTextContent('0');
    expect(screen.getByTestId('edit-prospect-stage-count')).toHaveTextContent('0');
  });

  it('invents an id and a name for a nameless admin and stage', async () => {
    mocks.api.getAllAdmins.mockResolvedValue({ data: { data: [{}] } });
    mocks.api.GetPipelineStage.mockResolvedValue({ data: { data: [{}] } });
    await renderPanel();
    fireEvent.click(screen.getByText('Reassign to Staff'));
    expect(screen.getByText('Unknown Admin')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('edit-prospect-stage-count')).toHaveTextContent('1');
  });
});

describe('stage name resolution', () => {
  it('titles the page with the company and the stage from the columns map', async () => {
    await renderPanel();
    expect(screen.getByText('Acme Health - Prospecting')).toBeInTheDocument();
  });

  it('falls back to the stages list when the stage is not in the columns map', async () => {
    await renderPanel({ columns: {}, stages: [{ stageId: 's1', name: 'Discovery' }] });
    expect(screen.getByText('Discovery')).toBeInTheDocument();
  });

  it('shows Unknown when neither source knows the stage', async () => {
    await renderPanel({ columns: {}, stages: [] });
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('falls back to the generic title while no company is loaded', async () => {
    await renderPanel({ columns: {}, stages: [] });
    expect(screen.getByText('Prospecting')).toBeInTheDocument();
  });
});

describe('organisation card', () => {
  it('shows the tenant details the item carries', async () => {
    await renderPanel();
    expect(screen.getByText('alan@acme.test')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('1 High St')).toBeInTheDocument();
    expect(screen.getByText('Lagos')).toBeInTheDocument();
    expect(screen.getByText('10001')).toBeInTheDocument();
  });

  it('substitutes placeholders for the fields the tenant leaves out', async () => {
    const item = defaultItem();
    item.tenant = { id: 'tenant-1', companyName: 'Acme Health' };
    item.admin = null;
    await renderPanel({ pipelineItem: item });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.queryByText('City')).toBeNull();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('prefers the subscription payment status over the verified flag', async () => {
    const item = defaultItem();
    item.tenant.Subscription = [{ status: 'ACTIVE', payment: { status: 'PAID' } }];
    await renderPanel({ pipelineItem: item });
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('falls back to the unverified badge and a dash with no subscription', async () => {
    await renderPanel();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the verified badge when the item is flagged paid', async () => {
    const item = defaultItem();
    item.paymentVerified = true;
    await renderPanel({ pipelineItem: item });
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
});

describe('building the candidate from the item', () => {
  it('ignores stage requirements that are not lists', async () => {
    await renderPanel({
      columns: { s1: { id: 's1', title: 'Prospecting', requiredTasks: 'nope', requiredDocuments: 7 } },
    });
    expect(screen.getByText('0/0 tasks done')).toBeInTheDocument();
    expect(document.body.querySelectorAll('.section-item')).toHaveLength(0);
  });

  it('falls back to the route id and a placeholder company for a bare tenant', async () => {
    const item = defaultItem();
    item.tenant = {};
    item.admin = {};
    await renderPanel({ pipelineItem: item });
    expect(screen.getByRole('heading', { name: 'Unknown' })).toBeInTheDocument();
    // The admin object survives but its name collapses to an empty string, so
    // the card falls back to the unassigned wording.
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('reports a stage whose requirement list holds a broken entry', async () => {
    const columns = defaultColumns();
    columns.s1.requiredTasks = [null];
    await renderPanel({ columns });
    expect(screen.getByText('Failed to process candidate data.')).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to process candidate data.', 'error');
  });
});

describe('permission gating', () => {
  it('hides every gated action from a role with no permissions', async () => {
    await renderPanel();
    expect(screen.queryByText('Move Candidate')).toBeNull();
    expect(screen.queryByText('Delete prospect')).toBeNull();
    expect(screen.queryByText('Generate payment link')).toBeNull();
    expect(screen.getByText('Send an email')).toBeInTheDocument();
  });

  it('shows each gated action once the role grants it', async () => {
    await renderPanel({ permissions: allPerms });
    expect(screen.getByText('Move Candidate')).toBeInTheDocument();
    expect(screen.getByText('Delete prospect')).toBeInTheDocument();
    expect(screen.getAllByText('Generate payment link').length).toBeGreaterThan(0);
  });

  it('drops the alert action when the role cannot generate payment links', async () => {
    await renderPanel();
    expect(
      screen.getByText('No Payment has been recorded for this candidate')
    ).toBeInTheDocument();
    expect(screen.queryByText('Generate payment link')).toBeNull();
  });

  it('switches to the informational alert once a link was generated before', async () => {
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    expect(
      screen.getByText('Payment link has been generated for this candidate')
    ).toBeInTheDocument();
    expect(screen.getByText('Manage Payment Actions')).toBeInTheDocument();
  });
});

describe('required tasks and documents', () => {
  it('lists the stage requirements with their required badges', async () => {
    await renderPanel();
    expect(sectionItem('Intro call')).toBeTruthy();
    expect(sectionItem('Send deck')).toBeTruthy();
    expect(sectionItem('Signed MSA')).toBeTruthy();
    expect(document.body.querySelectorAll('.requirement-badge.required')).toHaveLength(2);
    expect(document.body.querySelectorAll('.requirement-badge.optional')).toHaveLength(1);
  });

  it('counts the finished items in the section headers', async () => {
    await renderPanel();
    expect(screen.getByText('1/2 tasks done')).toBeInTheDocument();
    expect(screen.getByText('0/1 uploaded')).toBeInTheDocument();
  });

  it('says there is nothing to do when the stage has no requirements', async () => {
    await renderPanel({ params: { pipelineStageId: 's2', pipelineItemId: 'i1' } });
    expect(screen.getByText('No tasks assigned.')).toBeInTheDocument();
    expect(screen.getByText('No documents required.')).toBeInTheDocument();
  });

  it('leaves the lists empty while the pipeline is still loading', async () => {
    await renderPanel({ status: 'loading' });
    expect(screen.queryByText('No tasks assigned.')).toBeNull();
    expect(document.body.querySelectorAll('.section-item')).toHaveLength(0);
  });

  it('ignores an item that has no tenant attached', async () => {
    await renderPanel({ pipelineItem: { doneTasks: {}, sentDocuments: {} } });
    expect(document.body.querySelectorAll('.section-item')).toHaveLength(0);
  });

  it('marks a task done and recounts the progress', async () => {
    await renderPanel();
    fireEvent.click(sectionItem('Send deck').querySelector('input[type="checkbox"]'));
    await waitFor(() => expect(screen.getByText('2/2 tasks done')).toBeInTheDocument());
  });

  it('warns when the task update is rejected', async () => {
    await renderPanel();
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(sectionItem('Send deck').querySelector('input[type="checkbox"]'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update task status', 'error')
    );
    expect(screen.getByText('1/2 tasks done')).toBeInTheDocument();
  });

  it('marks a document uploaded and recounts the progress', async () => {
    await renderPanel();
    fireEvent.click(sectionItem('Signed MSA').querySelector('input[type="checkbox"]'));
    await waitFor(() => expect(screen.getByText('1/1 uploaded')).toBeInTheDocument());
  });

  it('warns when the document update is rejected', async () => {
    await renderPanel();
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(sectionItem('Signed MSA').querySelector('input[type="checkbox"]'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update document status', 'error')
    );
  });
});

describe('custom tasks and documents', () => {
  const customTask = { id: 'ct1', taskName: 'Legal review', isRequired: true, isCompleted: false };
  const customDoc = { id: 'cd1', documentName: 'Insurance cert', isRequired: false, isCompleted: false };

  const withCustoms = async (over = {}) => {
    mocks.api.GetCustomTasks.mockResolvedValue({ data: [customTask] });
    mocks.api.GetCustomDocuments.mockResolvedValue({ data: [customDoc] });
    return renderPanel(over);
  };

  it('renders the fetched custom items alongside the stage requirements', async () => {
    await withCustoms();
    expect(screen.getByText('Legal review')).toBeInTheDocument();
    expect(screen.getByText('Insurance cert')).toBeInTheDocument();
    expect(document.body.querySelectorAll('.requirement-badge.custom')).toHaveLength(2);
  });

  it('counts custom items in the section totals', async () => {
    await withCustoms();
    expect(screen.getByText('1/3 tasks done')).toBeInTheDocument();
    expect(screen.getByText('0/2 uploaded')).toBeInTheDocument();
  });

  it('tolerates a custom-item response that is not an array', async () => {
    mocks.api.GetCustomTasks.mockResolvedValue({ data: null });
    mocks.api.GetCustomDocuments.mockResolvedValue({});
    await renderPanel();
    expect(screen.getByText('1/2 tasks done')).toBeInTheDocument();
  });

  it('survives a failed custom-item load', async () => {
    mocks.api.GetCustomTasks.mockRejectedValue(new Error('down'));
    await renderPanel();
    expect(screen.getByText('1/2 tasks done')).toBeInTheDocument();
  });

  it('adds a custom task through the modal', async () => {
    mocks.api.CreateCustomTask.mockResolvedValue({
      data: { id: 'new', taskName: 'Kickoff call', isRequired: true, isCompleted: false },
    });
    await renderPanel();
    fireEvent.click(screen.getByText('Add a custom task'));
    fireEvent.click(screen.getByTestId('add-task-save'));
    await waitFor(() => expect(screen.getByText('Kickoff call')).toBeInTheDocument());
    expect(mocks.showToast).toHaveBeenCalledWith('Task added successfully!', 'success');
    expect(screen.queryByTestId('add-task-modal')).toBeNull();
  });

  it('invents a local record when the create response carries no body', async () => {
    mocks.api.CreateCustomTask.mockResolvedValue({});
    await renderPanel();
    fireEvent.click(screen.getByText('Add a custom task'));
    fireEvent.click(screen.getByTestId('add-task-save'));
    await waitFor(() => expect(screen.getByText('Kickoff call')).toBeInTheDocument());
  });

  it('keeps the add-task modal open when the create fails', async () => {
    mocks.api.CreateCustomTask.mockRejectedValue(new Error('no'));
    await renderPanel();
    fireEvent.click(screen.getByText('Add a custom task'));
    fireEvent.click(screen.getByTestId('add-task-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to add task', 'error')
    );
    expect(screen.getByTestId('add-task-modal')).toBeInTheDocument();
  });

  it('closes the add-task modal on cancel', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Add a custom task'));
    fireEvent.click(screen.getByTestId('task-modal-close'));
    expect(screen.queryByTestId('add-task-modal')).toBeNull();
  });

  it('adds a custom document through the modal', async () => {
    mocks.api.CreateCustomDocument.mockResolvedValue({
      data: { id: 'newd', documentName: 'Signed NDA', isRequired: false },
    });
    await renderPanel();
    fireEvent.click(screen.getByText('Add custom document request'));
    fireEvent.click(screen.getByTestId('add-doc-save'));
    await waitFor(() => expect(screen.getByText('Signed NDA')).toBeInTheDocument());
    expect(mocks.showToast).toHaveBeenCalledWith('Document added successfully!', 'success');
  });

  it('keeps the add-document modal open when the create fails', async () => {
    mocks.api.CreateCustomDocument.mockRejectedValue(new Error('no'));
    await renderPanel();
    fireEvent.click(screen.getByText('Add custom document request'));
    fireEvent.click(screen.getByTestId('add-doc-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to add document', 'error')
    );
    expect(screen.getByTestId('add-doc-modal')).toBeInTheDocument();
  });

  it('ticks a custom task done', async () => {
    mocks.api.UpdateCustomTask.mockResolvedValue({});
    await withCustoms();
    fireEvent.click(sectionItem('Legal review').querySelector('input[type="checkbox"]'));
    await waitFor(() => expect(screen.getByText('2/3 tasks done')).toBeInTheDocument());
    expect(mocks.api.UpdateCustomTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ct1', isCompleted: true })
    );
  });

  it('warns when ticking a custom task fails', async () => {
    mocks.api.UpdateCustomTask.mockRejectedValue(new Error('x'));
    await withCustoms();
    fireEvent.click(sectionItem('Legal review').querySelector('input[type="checkbox"]'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update custom task', 'error')
    );
  });

  it('ticks a custom document uploaded', async () => {
    mocks.api.UpdateCustomDocument.mockResolvedValue({});
    await withCustoms();
    fireEvent.click(sectionItem('Insurance cert').querySelector('input[type="checkbox"]'));
    await waitFor(() => expect(screen.getByText('1/2 uploaded')).toBeInTheDocument());
  });

  it('warns when ticking a custom document fails', async () => {
    mocks.api.UpdateCustomDocument.mockRejectedValue(new Error('x'));
    await withCustoms();
    fireEvent.click(sectionItem('Insurance cert').querySelector('input[type="checkbox"]'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update custom document', 'error')
    );
  });

  it('deletes a custom task', async () => {
    mocks.api.DeleteCustomTask.mockResolvedValue({});
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Delete custom task'));
    await waitFor(() => expect(screen.queryByText('Legal review')).toBeNull());
    expect(mocks.showToast).toHaveBeenCalledWith('Custom task deleted', 'success');
  });

  it('keeps the custom task listed when the delete fails', async () => {
    mocks.api.DeleteCustomTask.mockRejectedValue(new Error('x'));
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Delete custom task'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to delete custom task', 'error')
    );
    expect(screen.getByText('Legal review')).toBeInTheDocument();
  });

  it('deletes a custom document', async () => {
    mocks.api.DeleteCustomDocument.mockResolvedValue({});
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Delete custom document'));
    await waitFor(() => expect(screen.queryByText('Insurance cert')).toBeNull());
  });

  it('keeps the custom document listed when the delete fails', async () => {
    mocks.api.DeleteCustomDocument.mockRejectedValue(new Error('x'));
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Delete custom document'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to delete custom document', 'error')
    );
  });

  it('opens the edit modal seeded with the custom task and saves the rename', async () => {
    mocks.api.UpdateCustomTask.mockResolvedValue({});
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Edit custom task'));
    expect(screen.getByTestId('task-modal-initial')).toHaveTextContent('Legal review');
    fireEvent.click(screen.getByTestId('edit-task-save'));
    await waitFor(() => expect(screen.getByText('Kickoff call')).toBeInTheDocument());
    expect(screen.queryByTestId('edit-task-modal')).toBeNull();
  });

  it('keeps the edit modal open when the custom task update fails', async () => {
    mocks.api.UpdateCustomTask.mockRejectedValue(new Error('x'));
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Edit custom task'));
    fireEvent.click(screen.getByTestId('edit-task-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update custom task', 'error')
    );
    expect(screen.getByTestId('edit-task-modal')).toBeInTheDocument();
  });

  it('opens the edit modal seeded with the custom document and saves the rename', async () => {
    mocks.api.UpdateCustomDocument.mockResolvedValue({});
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Edit custom document'));
    expect(screen.getByTestId('doc-modal-initial')).toHaveTextContent('Insurance cert');
    fireEvent.click(screen.getByTestId('edit-doc-save'));
    await waitFor(() => expect(screen.getByText('Signed NDA')).toBeInTheDocument());
  });

  it('keeps the edit modal open when the custom document update fails', async () => {
    mocks.api.UpdateCustomDocument.mockRejectedValue(new Error('x'));
    await withCustoms();
    fireEvent.click(screen.getByLabelText('Edit custom document'));
    fireEvent.click(screen.getByTestId('edit-doc-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to update custom document', 'error')
    );
    expect(screen.getByTestId('edit-doc-modal')).toBeInTheDocument();
  });
});

describe('custom items in mixed states', () => {
  // Two of each, so the update and toggle handlers have a sibling to leave
  // alone, and so both arms of the required/optional badge render.
  const twoOfEach = async () => {
    mocks.api.GetCustomTasks.mockResolvedValue({
      data: [
        { id: 'ct1', taskName: 'Legal review', isRequired: true, isCompleted: false },
        { id: 'ct2', taskName: 'Credit check', isRequired: false, isCompleted: false },
      ],
    });
    mocks.api.GetCustomDocuments.mockResolvedValue({
      data: [
        { id: 'cd1', documentName: 'Insurance cert', isRequired: true, isCompleted: false },
        { id: 'cd2', documentName: 'Tax ID', isRequired: false, isCompleted: false },
      ],
    });
    return renderPanel();
  };

  it('badges each custom item by whether it is required', async () => {
    await twoOfEach();
    expect(document.body.querySelectorAll('.requirement-badge.required')).toHaveLength(4);
    expect(document.body.querySelectorAll('.requirement-badge.optional')).toHaveLength(3);
  });

  it('ticks one custom task without disturbing the other', async () => {
    mocks.api.UpdateCustomTask.mockResolvedValue({});
    await twoOfEach();
    fireEvent.click(sectionItem('Credit check').querySelector('input[type="checkbox"]'));
    await waitFor(() =>
      expect(sectionItem('Credit check').querySelector('input[type="checkbox"]')).toBeChecked()
    );
    expect(sectionItem('Legal review').querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it('ticks one custom document without disturbing the other', async () => {
    mocks.api.UpdateCustomDocument.mockResolvedValue({});
    await twoOfEach();
    fireEvent.click(sectionItem('Tax ID').querySelector('input[type="checkbox"]'));
    await waitFor(() =>
      expect(sectionItem('Tax ID').querySelector('input[type="checkbox"]')).toBeChecked()
    );
    expect(sectionItem('Insurance cert').querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  it('renames one custom task without disturbing the other', async () => {
    mocks.api.UpdateCustomTask.mockResolvedValue({});
    await twoOfEach();
    fireEvent.click(screen.getAllByLabelText('Edit custom task')[1]);
    fireEvent.click(screen.getByTestId('edit-task-save'));
    await waitFor(() => expect(screen.getByText('Kickoff call')).toBeInTheDocument());
    expect(screen.getByText('Legal review')).toBeInTheDocument();
  });

  it('renames one custom document without disturbing the other', async () => {
    mocks.api.UpdateCustomDocument.mockResolvedValue({});
    await twoOfEach();
    fireEvent.click(screen.getAllByLabelText('Edit custom document')[1]);
    fireEvent.click(screen.getByTestId('edit-doc-save'));
    await waitFor(() => expect(screen.getByText('Signed NDA')).toBeInTheDocument());
    expect(screen.getByText('Insurance cert')).toBeInTheDocument();
  });

  it('invents a local record when the document create returns no body', async () => {
    mocks.api.CreateCustomDocument.mockResolvedValue({});
    await renderPanel();
    fireEvent.click(screen.getByText('Add custom document request'));
    fireEvent.click(screen.getByTestId('add-doc-save'));
    await waitFor(() => expect(screen.getByText('Signed NDA')).toBeInTheDocument());
  });

  it('badges an optional stage document as optional', async () => {
    await renderPanel({
      draft: {
        requiredTasks: [{ id: 't1', name: 'Intro call', required: true }, { id: 't2', name: 'Send deck', required: true }],
        requiredDocuments: [{ id: 'd1', name: 'Signed MSA', required: false }],
      },
    });
    expect(
      sectionItem('Signed MSA').querySelector('.requirement-badge')
    ).toHaveTextContent('Optional');
  });
});

describe('candidate actions', () => {
  it('merges the edited prospect back into the card', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('edit-prospect-staff-count')).toHaveTextContent('1');
    expect(screen.getByTestId('edit-prospect-stage-count')).toHaveTextContent('2');
    fireEvent.click(screen.getByTestId('edit-prospect-save'));
    await waitFor(() => expect(screen.getByText('Renamed Co')).toBeInTheDocument());
    expect(screen.getByText('Grace H')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-prospect-modal')).toBeNull();
  });

  it('accepts the legacy company field and keeps the untouched values', async () => {
    mocks.editPayload = { company: 'Legacy Co' };
    await renderPanel();
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByTestId('edit-prospect-save'));
    await waitFor(() => expect(screen.getByText('Legacy Co')).toBeInTheDocument());
    expect(screen.getByText('Alan T')).toBeInTheDocument();
  });

  it('empties the checklists when the target stage declares no requirements', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Move Candidate'));
    fireEvent.click(screen.getByTestId('move-to-s3'));
    await waitFor(() => expect(screen.getByText('0/0 tasks done')).toBeInTheDocument());
    expect(screen.getByText('No tasks assigned.')).toBeInTheDocument();
    expect(screen.getByText('No documents required.')).toBeInTheDocument();
  });

  it('leaves the assignee alone when the reassignment is not acknowledged', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Reassign to Staff'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.resolve({ status: 'pending' }) }));
    fireEvent.click(screen.getByTestId('assign-a1'));
    await waitFor(() => expect(screen.queryByTestId('assign-modal')).toBeNull());
    expect(mocks.showToast).not.toHaveBeenCalledWith('Staff assigned successfully!', 'success');
  });

  it('stays on the page when the delete is not acknowledged', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete prospect'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.resolve({ status: 'pending' }) }));
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(screen.queryByTestId('delete-modal')).toBeNull());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('moves the candidate to another stage and routes to it', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Move Candidate'));
    fireEvent.click(screen.getByTestId('move-to-s2'));
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith('/tenants/candidate-single/s2/i1')
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Candidate moved successfully!', 'success');
  });

  it('does nothing when the chosen stage is the current one', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Move Candidate'));
    const before = mocks.dispatch.mock.calls.length;
    fireEvent.click(screen.getByTestId('move-to-s1'));
    await act(async () => {});
    expect(mocks.dispatch.mock.calls).toHaveLength(before);
    expect(screen.getByTestId('move-modal')).toBeInTheDocument();
  });

  it('surfaces a failed move', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Move Candidate'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(screen.getByTestId('move-to-s2'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'MOVE_CANDIDATE')
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('leaves the card untouched when the move is not acknowledged', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Move Candidate'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.resolve({ status: 'pending' }) }));
    fireEvent.click(screen.getByTestId('move-to-s2'));
    await waitFor(() => expect(screen.queryByTestId('move-modal')).toBeNull());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('reassigns the candidate to a staff member', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Reassign to Staff'));
    fireEvent.click(screen.getByTestId('assign-a1'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Staff assigned successfully!', 'success')
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('clears the assignee when the chosen id is not in the staff list', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Reassign to Staff'));
    fireEvent.click(screen.getByTestId('assign-unknown'));
    await waitFor(() => expect(screen.getByText('Unassigned')).toBeInTheDocument());
  });

  it('surfaces a failed reassignment', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Reassign to Staff'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(screen.getByTestId('assign-a1'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'ASSIGN_STAFF')
    );
  });

  it('deletes the prospect and returns to the board', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete prospect'));
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/tenants/pipeline'));
    expect(mocks.showToast).toHaveBeenCalledWith('Prospect deleted successfully!', 'success');
  });

  it('surfaces a failed delete', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete prospect'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_PROSPECT')
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('opens the email modal addressed to the contact', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Send an email'));
    expect(screen.getByTestId('email-recipient')).toHaveTextContent('alan@acme.test');
  });
});

describe('payment link modal', () => {
  const plan = {
    id: 'plan-1',
    name: 'Growth',
    active: true,
    colourCode: '#112233',
    pricePerMonth: { currency: '£', price: 99 },
    forStorage: '50GB',
    features: [{ id: 'f1', name: 'Audit log' }],
    extraFeaturesWithPrice: [{ pricePerMonth: { price: 5 } }],
    extraFeatures: [{ id: 'x1', name: 'Dedicated CSM' }],
  };

  const openModal = async (over = {}) => {
    const view = await renderPanel({ permissions: allPerms, ...over });
    fireEvent.click(screen.getAllByText('Generate payment link')[0]);
    await act(async () => {});
    return view;
  };

  const modal = () => within(screen.getByTestId('payment-modal'));

  it('loads the standard plans when it opens', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    expect(mocks.billingApi.GetPlanByPlanType).toHaveBeenCalledWith(
      expect.objectContaining({ planType: 'STANDARD' })
    );
    expect(screen.getByTestId('payment-tab')).toHaveTextContent('Plan Settings');
  });

  it('reloads the plans when the enterprise type is picked', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    fireEvent.click(modal().getByDisplayValue('ENTERPRISE'));
    await waitFor(() =>
      expect(mocks.billingApi.GetPlanByPlanType).toHaveBeenCalledWith(
        expect.objectContaining({ planType: 'ENTERPRISE' })
      )
    );
  });

  it('drops inactive plans from the picker', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({
      data: [plan, { id: 'plan-2', name: 'Retired', active: false }],
    });
    await openModal();
    expect(modal().getByText('Growth')).toBeInTheDocument();
    expect(modal().queryByText('Retired')).toBeNull();
  });

  it('shows the empty hint when no plans come back', async () => {
    await openModal();
    expect(
      modal().getByText('No plans found. Create one in Billing & Payments → Plans & Pricing.')
    ).toBeInTheDocument();
  });

  it('reports a failed plan load', async () => {
    mocks.billingApi.GetPlanByPlanType.mockRejectedValue(new Error('x'));
    await openModal();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_PLANS');
  });

  it('renders the selected plan card with its pricing and features', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    expect(document.body.querySelector('.modal-plan-card')).toBeInTheDocument();
    expect(modal().getByText('£99 PER MONTH')).toBeInTheDocument();
    expect(modal().getByText('50GB DATA STORAGE')).toBeInTheDocument();
    expect(modal().getByText('$5 FOR EVERY EXTRA CLIENT')).toBeInTheDocument();
    expect(modal().getByText('Audit log')).toBeInTheDocument();
  });

  it('falls back to the unlimited-storage wording and a features placeholder', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({
      data: [{ id: 'plan-3', name: 'Bare', active: true }],
    });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-3' } });
    expect(modal().getByText('$0 PER MONTH')).toBeInTheDocument();
    expect(modal().getByText('Unlimited DATA STORAGE')).toBeInTheDocument();
    expect(modal().getByText('No features available')).toBeInTheDocument();
  });

  it('lists the plan extras only for an enterprise plan', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    expect(modal().queryByText('Dedicated CSM')).toBeNull();
    fireEvent.click(modal().getByDisplayValue('ENTERPRISE'));
    await act(async () => {});
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    expect(modal().getByText('Dedicated CSM')).toBeInTheDocument();
  });

  it('clears the selection when an unknown plan id arrives', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.change(planSelect(), { target: { value: '' } });
    expect(document.body.querySelector('.modal-plan-card')).toBeNull();
  });

  it('refuses to generate a link with no plan chosen', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    fireEvent.click(screen.getByTestId('payment-primary'));
    await act(async () => {});
    expect(mocks.showToast).toHaveBeenCalledWith('Please select a plan', 'error');
    expect(mocks.invoiceApi.GeneratePaymentLink).not.toHaveBeenCalled();
  });

  it('refuses to generate a link with no renewal frequency', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.click(screen.getByTestId('payment-primary'));
    await act(async () => {});
    expect(mocks.showToast).toHaveBeenCalledWith('Please select a renewal frequency', 'error');
  });

  it('sends a monthly quantity of one', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    mocks.invoiceApi.GeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/abc' });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.change(frequencySelect(), { target: { value: 'monthly' } });
    fireEvent.click(screen.getByTestId('payment-primary'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GeneratePaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({ billingFrequency: 'Monthly', quantity: 1, tenantId: 'tenant-1' })
      )
    );
  });

  it('turns a multi-year frequency into a yearly quantity', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    mocks.invoiceApi.GeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/abc' });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.change(frequencySelect(), { target: { value: '3_years' } });
    fireEvent.click(screen.getByTestId('payment-primary'));
    await waitFor(() =>
      expect(mocks.invoiceApi.GeneratePaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({ billingFrequency: 'Yearly', quantity: 3 })
      )
    );
  });

  it('shows the generated link and remembers that one was issued', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    mocks.invoiceApi.GeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/abc' });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.change(frequencySelect(), { target: { value: 'monthly' } });
    fireEvent.click(screen.getByTestId('payment-primary'));
    await waitFor(() => expect(screen.getByTestId('payment-tab')).toHaveTextContent('Payment Link'));
    expect(screen.getByText('https://pay.test/abc')).toBeInTheDocument();
    expect(localStorage.getItem('hasGeneratedPayment_i1')).toBe('true');
  });

  it('surfaces a failed generation', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    mocks.invoiceApi.GeneratePaymentLink.mockRejectedValue(new Error('x'));
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.change(frequencySelect(), { target: { value: 'monthly' } });
    fireEvent.click(screen.getByTestId('payment-primary'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'GENERATE_PAYMENT_LINK')
    );
    expect(screen.getByTestId('payment-tab')).toHaveTextContent('Plan Settings');
  });

  it('opens from the action list rather than the alert', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    await renderPanel({ permissions: allPerms });
    // Index 1 is the Actions-panel button; index 0 is the alert's.
    fireEvent.click(screen.getAllByText('Generate payment link')[1]);
    await act(async () => {});
    expect(screen.getByTestId('payment-tab')).toHaveTextContent('Plan Settings');
  });

  it('copes with a plan response that carries no list', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({});
    await openModal();
    expect(
      modal().getByText('No plans found. Create one in Billing & Payments → Plans & Pricing.')
    ).toBeInTheDocument();
  });

  it('prices an extra-client line that carries no price', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({
      data: [{ ...plan, extraFeaturesWithPrice: [{}] }],
    });
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    expect(modal().getByText('$0 FOR EVERY EXTRA CLIENT')).toBeInTheDocument();
  });

  it('accepts plain-string features and unkeyed extras', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({
      data: [{ ...plan, features: ['Audit log'], extraFeatures: [{ name: 'Dedicated CSM' }] }],
    });
    await openModal();
    fireEvent.click(modal().getByDisplayValue('ENTERPRISE'));
    await act(async () => {});
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    expect(modal().getByText('Audit log')).toBeInTheDocument();
    expect(modal().getByText('Dedicated CSM')).toBeInTheDocument();
  });

  it('treats a generation response with no body as no link', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({ data: [plan] });
    mocks.invoiceApi.GeneratePaymentLink.mockResolvedValue({});
    await openModal();
    fireEvent.change(planSelect(), { target: { value: 'plan-1' } });
    fireEvent.change(frequencySelect(), { target: { value: 'monthly' } });
    fireEvent.click(screen.getByTestId('payment-primary'));
    await waitFor(() => expect(screen.getByTestId('payment-tab')).toHaveTextContent('Payment Link'));
    expect(
      modal().getByText('No payment link generated yet. Go to Plan Settings to generate a link.')
    ).toBeInTheDocument();
  });

  it('closes on cancel', async () => {
    await openModal();
    fireEvent.click(screen.getByTestId('payment-secondary'));
    expect(screen.queryByTestId('payment-modal')).toBeNull();
  });

  it('closes from the payment link tab, where the primary button is Close', async () => {
    await openModal();
    fireEvent.click(screen.getByTestId('payment-goto-link'));
    await act(async () => {});
    expect(screen.getByTestId('payment-primary')).toHaveTextContent('Close');
    fireEvent.click(screen.getByTestId('payment-primary'));
    expect(screen.queryByTestId('payment-modal')).toBeNull();
  });
});

describe('payment link history', () => {
  const openHistory = async (history) => {
    mocks.invoiceApi.GetInvoiceHistory.mockResolvedValue({ data: history });
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
  };

  it('says nothing has been generated when the history is empty', async () => {
    await openHistory([]);
    expect(
      screen.getByText('No payment link generated yet. Go to Plan Settings to generate a link.')
    ).toBeInTheDocument();
  });

  it('labels each known history event', async () => {
    await openHistory([
      { tokenId: '1', event: 'PAYMENT_LINK_GENERATED', time: '2026-01-02T09:05:00Z' },
      { tokenId: '2', event: 'PAYMENT_LINK_REGENERATED', time: '2026-01-03T09:05:00Z' },
      { tokenId: '3', event: 'PAYMENT_LINK_PAID', time: '2026-01-04T09:05:00Z' },
      { tokenId: '4', event: 'SOMETHING_ELSE', time: '2026-01-05T09:05:00Z' },
    ]);
    expect(screen.getByText(/Payment link generated/)).toBeInTheDocument();
    expect(screen.getByText(/Payment link regenerated/)).toBeInTheDocument();
    expect(screen.getByText(/Plan purchase payment made on/)).toBeInTheDocument();
    expect(screen.getByText(/SOMETHING_ELSE/)).toBeInTheDocument();
  });

  it('offers a regenerate button only on the last expired entry', async () => {
    await openHistory([
      { tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' },
      { tokenId: '2', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-03T09:05:00Z' },
    ]);
    expect(screen.getAllByText('Regenerate link')).toHaveLength(1);
  });

  it('withholds the regenerate button from a role without the permission', async () => {
    mocks.invoiceApi.GetInvoiceHistory.mockResolvedValue({
      data: [{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }],
    });
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel();
    fireEvent.click(screen.getByText('See More'));
    await act(async () => {});
    expect(screen.queryByText('Regenerate link')).toBeNull();
  });

  it('regenerates the link and refreshes the history', async () => {
    mocks.invoiceApi.RegeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/new' });
    await openHistory([{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }]);
    mocks.invoiceApi.GetInvoiceHistory.mockClear();
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() => expect(screen.getByText('https://pay.test/new')).toBeInTheDocument());
    expect(mocks.invoiceApi.GetInvoiceHistory).toHaveBeenCalled();
  });

  it('surfaces a failed regeneration', async () => {
    mocks.invoiceApi.RegeneratePaymentLink.mockRejectedValue(new Error('x'));
    await openHistory([{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }]);
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'REGENERATE_PAYMENT_LINK')
    );
  });

  it('copes with a history response that carries no list', async () => {
    mocks.invoiceApi.GetInvoiceHistory.mockResolvedValue({});
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
    expect(
      screen.getByText('No payment link generated yet. Go to Plan Settings to generate a link.')
    ).toBeInTheDocument();
  });

  it('keys a history entry by position when it carries no token', async () => {
    await openHistory([{ event: 'PAYMENT_LINK_GENERATED', time: '2026-01-02T09:05:00Z' }]);
    expect(document.body.querySelectorAll('.history-entry')).toHaveLength(1);
  });

  it('does not fetch the history before the candidate is known', async () => {
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms, status: 'loading' });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
    expect(mocks.invoiceApi.GetInvoiceHistory).not.toHaveBeenCalled();
  });

  it('treats a regeneration response with no body as no link', async () => {
    mocks.invoiceApi.RegeneratePaymentLink.mockResolvedValue({});
    await openHistory([{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }]);
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Payment link regenerated!', 'success')
    );
    expect(screen.queryByText('Copy link')).toBeNull();
  });

  it('tolerates a failed history load', async () => {
    mocks.invoiceApi.GetInvoiceHistory.mockRejectedValue(new Error('x'));
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
    expect(
      screen.getByText('No payment link generated yet. Go to Plan Settings to generate a link.')
    ).toBeInTheDocument();
  });

  it('copies the generated link through the clipboard API', async () => {
    mocks.invoiceApi.RegeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/new' });
    await openHistory([{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }]);
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() => expect(screen.getByText('Copy link')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://pay.test/new')
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Link copied to clipboard!', 'success');
  });

  it('falls back to a hidden textarea outside a secure context', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    mocks.invoiceApi.RegeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/new' });
    await openHistory([{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }]);
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() => expect(screen.getByText('Copy link')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('warns when the copy is rejected', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    mocks.invoiceApi.RegeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/new' });
    await openHistory([{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }]);
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() => expect(screen.getByText('Copy link')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to copy link', 'error')
    );
  });
});

describe('logging in a production build', () => {
  // Every diagnostic on this page sits behind `import.meta.env.DEV`, which
  // Vitest leaves true; stubbing it false is the only way to reach the arm a
  // deployed bundle actually takes, and the visible outcome must not change.
  beforeEach(() => {
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports a failed staff load without writing to the console', async () => {
    mocks.api.getAllAdmins.mockRejectedValue(new Error('nope'));
    await renderPanel();
    expect(screen.getByText('Failed to load staff or stages.')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to fetch staff or stages:',
      expect.anything()
    );
  });

  it('reports a failed pipeline load without writing to the console', async () => {
    mocks.dispatch.mockImplementation(() => ({
      unwrap: () => Promise.reject(new Error('boom')),
    }));
    await renderPanel();
    expect(screen.getByText('Failed to load pipeline data.')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to fetch pipeline data:',
      expect.anything()
    );
  });

  it('reports a broken candidate payload without writing to the console', async () => {
    const columns = defaultColumns();
    columns.s1.requiredTasks = [null];
    await renderPanel({ columns });
    expect(screen.getByText('Failed to process candidate data.')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalledWith(
      'Error updating candidate state:',
      expect.anything()
    );
  });

  it('swallows a failed custom-item load without writing to the console', async () => {
    mocks.api.GetCustomTasks.mockRejectedValue(new Error('down'));
    await renderPanel();
    expect(screen.getByText('1/2 tasks done')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalledWith(
      'Error fetching custom items:',
      expect.anything()
    );
  });

  it('swallows a failed history load without writing to the console', async () => {
    mocks.invoiceApi.GetInvoiceHistory.mockRejectedValue(new Error('x'));
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to fetch invoice history:',
      expect.anything()
    );
  });

  it('warns about a failed task create without writing to the console', async () => {
    mocks.api.CreateCustomTask.mockRejectedValue(new Error('no'));
    await renderPanel();
    fireEvent.click(screen.getByText('Add a custom task'));
    fireEvent.click(screen.getByTestId('add-task-save'));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('Failed to add task', 'error')
    );
    expect(console.error).not.toHaveBeenCalledWith('Error adding task:', expect.anything());
  });

  it('surfaces a failed move without writing to the console', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Move Candidate'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(screen.getByTestId('move-to-s2'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'MOVE_CANDIDATE')
    );
    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to move candidate:',
      expect.anything()
    );
  });

  it('surfaces a failed reassignment without writing to the console', async () => {
    await renderPanel();
    fireEvent.click(screen.getByText('Reassign to Staff'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(screen.getByTestId('assign-a1'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'ASSIGN_STAFF')
    );
    expect(console.error).not.toHaveBeenCalledWith('Failed to assign staff:', expect.anything());
  });

  it('surfaces a failed delete without writing to the console', async () => {
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete prospect'));
    mocks.dispatch.mockImplementation(() => ({ unwrap: () => Promise.reject(new Error('x')) }));
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() =>
      expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_PROSPECT')
    );
    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to delete prospect:',
      expect.anything()
    );
  });
});

describe('half-shaped staff and stage payloads', () => {
  it('copes with an envelope whose inner list is missing', async () => {
    // `{ data: {} }` is the shape the earlier "no list at all" fixture cannot
    // reach: the outer `data` resolves, so only the inner `?.data` falls away.
    mocks.api.getAllAdmins.mockResolvedValue({ data: {} });
    mocks.api.GetPipelineStage.mockResolvedValue({ data: {} });
    await renderPanel();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('edit-prospect-staff-count')).toHaveTextContent('0');
    expect(screen.getByTestId('edit-prospect-stage-count')).toHaveTextContent('0');
  });
});

describe('editing every field at once', () => {
  it('takes each supplied value in place of the one on the card', async () => {
    mocks.editPayload = {
      companyName: 'Nimbus Care',
      contactPerson: 'Rae M',
      email: 'rae@nimbus.test',
      phone: '0900',
      companySize: '250',
      organizationType: 'Hospital',
      location: '9 Low Rd',
      city: 'Abuja',
      state: 'FC',
      zipCode: '90210',
      country: 'GH',
      leadSource: 'Webinar',
      subdomain: 'nimbus',
    };
    await renderPanel();
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByTestId('edit-prospect-save'));
    await waitFor(() => expect(screen.getByText('Nimbus Care')).toBeInTheDocument());
    expect(screen.getByText('rae@nimbus.test')).toBeInTheDocument();
    expect(screen.getByText('0900')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('Hospital')).toBeInTheDocument();
    expect(screen.getByText('9 Low Rd')).toBeInTheDocument();
    expect(screen.getByText('Abuja')).toBeInTheDocument();
    expect(screen.getByText('FC')).toBeInTheDocument();
    expect(screen.getByText('90210')).toBeInTheDocument();
    expect(screen.getByText('GH')).toBeInTheDocument();
  });
});

describe('a draft that describes no requirements', () => {
  it('badges every stage item optional when the draft carries no lists', async () => {
    // The badges read the draft positionally, so an empty draft exercises the
    // "no list" arm of both lookups rather than the "entry says optional" one.
    await renderPanel({ draft: {} });
    expect(document.body.querySelectorAll('.requirement-badge.required')).toHaveLength(0);
    expect(document.body.querySelectorAll('.requirement-badge.optional')).toHaveLength(3);
  });

  it('badges a stage item optional when the draft is shorter than the stage', async () => {
    await renderPanel({ draft: { requiredTasks: [], requiredDocuments: [] } });
    expect(sectionItem('Intro call').querySelector('.requirement-badge')).toHaveTextContent(
      'Optional'
    );
    expect(sectionItem('Signed MSA').querySelector('.requirement-badge')).toHaveTextContent(
      'Optional'
    );
  });
});

describe('stage name with no stage list', () => {
  it('says Unknown when the stages slice holds nothing at all', async () => {
    mocks.state = buildState({ columns: {} });
    mocks.state.pipeline.stages = null;
    mocks.params = { pipelineStageId: 's1', pipelineItemId: 'i1' };
    render(<ProspectPanel />);
    await act(async () => {});
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('incomplete route parameters', () => {
  it('refuses to fetch when only the item id is in the route', async () => {
    await renderPanel({ params: { pipelineItemId: 'i1' } });
    expect(
      screen.getByText('Missing required parameters or authentication token.')
    ).toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});

describe('a stage with no requirements but custom items', () => {
  it('drops the empty-state lines once a custom item exists', async () => {
    mocks.api.GetCustomTasks.mockResolvedValue({
      data: [{ id: 'ct1', taskName: 'Legal review', isRequired: true, isCompleted: false }],
    });
    mocks.api.GetCustomDocuments.mockResolvedValue({
      data: [{ id: 'cd1', documentName: 'Insurance cert', isRequired: false, isCompleted: false }],
    });
    await renderPanel({ params: { pipelineStageId: 's2', pipelineItemId: 'i1' } });
    expect(screen.queryByText('No tasks assigned.')).toBeNull();
    expect(screen.queryByText('No documents required.')).toBeNull();
    expect(screen.getByText('0/1 tasks done')).toBeInTheDocument();
    expect(screen.getByText('0/1 uploaded')).toBeInTheDocument();
  });
});

describe('custom items that arrive already finished', () => {
  it('counts and ticks them without any interaction', async () => {
    mocks.api.GetCustomTasks.mockResolvedValue({
      data: [{ id: 'ct1', taskName: 'Legal review', isRequired: true, isCompleted: true }],
    });
    mocks.api.GetCustomDocuments.mockResolvedValue({
      data: [{ id: 'cd1', documentName: 'Insurance cert', isRequired: true, isCompleted: true }],
    });
    await renderPanel();
    expect(screen.getByText('2/3 tasks done')).toBeInTheDocument();
    expect(screen.getByText('1/2 uploaded')).toBeInTheDocument();
    expect(sectionItem('Legal review').querySelector('input[type="checkbox"]')).toBeChecked();
    expect(sectionItem('Insurance cert').querySelector('input[type="checkbox"]')).toBeChecked();
  });
});

describe('plan cards with empty collections', () => {
  it('shows the features placeholder for a plan whose feature list is empty', async () => {
    mocks.billingApi.GetPlanByPlanType.mockResolvedValue({
      data: [{ id: 'plan-4', name: 'Lean', active: true, features: [], forStorage: '10GB' }],
    });
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getAllByText('Generate payment link')[0]);
    await act(async () => {});
    fireEvent.change(planSelect(), { target: { value: 'plan-4' } });
    expect(screen.getByText('No features available')).toBeInTheDocument();
    expect(screen.getByText('10GB DATA STORAGE')).toBeInTheDocument();
  });
});

describe('history while it is still in flight', () => {
  it('shows the section loader until the history resolves', async () => {
    let release;
    mocks.invoiceApi.GetInvoiceHistory.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ data: [] });
      })
    );
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await act(async () => {
      release();
    });
    expect(screen.queryByText('Loading...')).toBeNull();
  });
});

describe('copying without a clipboard API', () => {
  const original = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
  });

  it('falls back to the hidden textarea when the browser exposes no clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    mocks.invoiceApi.RegeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/new' });
    mocks.invoiceApi.GetInvoiceHistory.mockResolvedValue({
      data: [{ tokenId: '1', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-02T09:05:00Z' }],
    });
    localStorage.setItem('hasGeneratedPayment_i1', 'true');
    await renderPanel({ permissions: allPerms });
    fireEvent.click(screen.getByText('Manage Payment Actions'));
    await act(async () => {});
    fireEvent.click(screen.getByText('Regenerate link'));
    await waitFor(() => expect(screen.getByText('Copy link')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
    expect(mocks.showToast).toHaveBeenCalledWith('Link copied to clipboard!', 'success');
  });
});
