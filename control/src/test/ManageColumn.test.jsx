import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

/**
 * The stage editor behind a pipeline column: a basic-setup tab that edits the
 * Redux draft, a tasks/documents tab that edits the same draft's two lists, and
 * a candidates tab wrapping CustomTable with row and bulk actions.
 *
 * PipelineSlice is mocked into tagged action creators, so both the plain draft
 * edits and the thunks arrive at the mocked dispatch as `{ type, payload }` and
 * can be asserted by name. Nothing writes back: the draft the component renders
 * is the plain object the test supplies, so an edit is verified by the action it
 * dispatches rather than by the value in the field.
 *
 * The three save handlers do not agree on where the acknowledgement lives --
 * assign and move read `response.data.status`, delete reads `response.status` --
 * so the fixtures below deliberately differ in shape.
 */

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { pipelineStageId: 's1' },
  dispatch: vi.fn(),
  unwrap: vi.fn(),
  state: {},
  responses: {},
  api: {
    getAllAdmins: vi.fn(),
    GetPipelineStage: vi.fn(),
    UpdatePipelineStage: vi.fn(),
  },
  showToast: vi.fn(),
}));

vi.mock('../ReduxStore/features/PipelineSlice', () => {
  const module = {};
  for (const name of [
    'updateDraft',
    'addTaskToDraft',
    'removeTaskFromDraft',
    'toggleTaskRequiredInDraft',
    'addDocumentToDraft',
    'removeDocumentFromDraft',
    'toggleDocumentRequiredInDraft',
    'resetDraft',
    'fetchSinglePipelineStages',
    'updateStageTasks',
    'updateStageDocuments',
    'fetchPipelineItems',
    'updatePipelineItemActivity',
    'deletePipelineItem',
    'deletePipelineStage',
    'reassignCandidateToStaff',
  ]) {
    module[name] = (payload) => ({ type: name, payload });
  }
  return module;
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate, useParams: () => mocks.params };
});

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: vi.fn(),
}));

vi.mock('../Components/ColorPicker', () => ({
  default: (props) => (
    <div data-testid="color-picker">
      <span data-testid="color-picker-value">{props.color}</span>
      <button data-testid="color-picker-pick" onClick={() => props.onChange('#ff0000')}>
        pick
      </button>
      <button data-testid="color-picker-close" onClick={props.onClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock('../Components/ReusableModal/CustomTaskModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="task-modal">
        <button data-testid="task-modal-save" onClick={() => props.onSave({ name: 'Intro call' })}>
          save
        </button>
        <button data-testid="task-modal-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/CustomDocumentModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="doc-modal">
        <button data-testid="doc-modal-save" onClick={() => props.onSave({ name: 'Signed MSA' })}>
          save
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/AddProspectModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="prospect-modal">
        <span data-testid="prospect-modal-stage">{props.pipelineStageId}</span>
        <span data-testid="prospect-modal-staff">{props.staffList.length}</span>
        <button data-testid="prospect-modal-save" onClick={() => props.onSave({})}>
          save
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/AssignCandidateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="assign-modal">
        <span data-testid="assign-modal-tasks">{props.taskIds.join('|')}</span>
        <span data-testid="assign-modal-companies">
          {Object.values(props.tasks)
            .map((t) => t.company)
            .join('|')}
        </span>
        <button data-testid="assign-modal-save" onClick={() => props.onSave('adm-1')}>
          save
        </button>
        <button data-testid="assign-modal-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/MoveCandidateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="move-modal">
        <span data-testid="move-modal-current">{props.currentColumnId}</span>
        <span data-testid="move-modal-columns">{props.columns.map((c) => c.title).join('|')}</span>
        <button data-testid="move-modal-save" onClick={() => props.onSave(mocks.moveTarget)}>
          save
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/DeleteConfirmationModal', () => ({
  default: (props) => {
    if (!props.isOpen) return null;
    const kind = props.title === 'Delete this stage?' ? 'stage' : 'candidate';
    return (
      <div data-testid={`delete-${kind}-modal`}>
        <span data-testid={`delete-${kind}-title`}>{props.title}</span>
        <button
          data-testid={`delete-${kind}-confirm`}
          onClick={() => Promise.resolve(props.onConfirm()).catch(() => {})}
        >
          confirm
        </button>
        <button data-testid={`delete-${kind}-close`} onClick={props.onClose}>
          close
        </button>
      </div>
    );
  },
}));

import ManageColumn from '../Components/ManageColumn/ManageColumn';

const defaultDraft = () => ({
  id: 's1',
  name: 'Prospecting',
  description: 'First touch',
  colorCode: '#1E40AF',
  requiredTasks: [
    { id: 't1', name: 'Intro call', required: true },
    { id: 't2', name: 'Send deck', required: false },
  ],
  requiredDocuments: [{ id: 'd1', name: 'Signed MSA', required: true }],
});

const items = [
  {
    id: 'c1',
    companyName: 'Acme Health',
    createdAt: '2026-01-02T00:00:00Z',
    createdBy: 'Grace',
    assignedTo: 'Ada',
    assignToAdmin: 'adm-1',
    completionPercentage: 46,
  },
  // Everything optional is missing, so every placeholder in the mapper runs.
  { id: 'c2' },
];

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
  },
  pipeline: {
    pipeline: 'pipeline' in over ? over.pipeline : { id: 'p1' },
    draft: over.draft ?? defaultDraft(),
    status: over.status ?? 'succeeded',
  },
});

const allPerms = [
  'edit_pipeline_stage',
  'delete_pipeline_stage',
  'add_prospect',
  'move_prospect',
  'remove_prospect',
];

const renderColumn = async (over = {}) => {
  mocks.state = buildState(over);
  mocks.params = over.params ?? { pipelineStageId: 's1' };
  const view = render(<ManageColumn />);
  await act(async () => {});
  return view;
};

const dispatched = (type) =>
  mocks.dispatch.mock.calls.map(([a]) => a).filter((a) => a && a.type === type);

const tab = (name) =>
  Array.from(document.body.querySelectorAll('.tab')).find((b) =>
    b.textContent.startsWith(name)
  );

const openTab = async (name) => {
  await act(async () => {
    fireEvent.click(tab(name));
  });
};

const rows = () =>
  Array.from(document.body.querySelectorAll('tbody tr')).filter(
    (tr) => !tr.querySelector('td[colspan]')
  );

const rowAction = async (rowIndex, label) => {
  fireEvent.click(screen.getAllByLabelText('Row actions')[rowIndex]);
  await act(async () => {
    fireEvent.click(screen.getByText(label));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  mocks.responses = {};
  mocks.moveTarget = 's2';
  mocks.dispatch.mockImplementation((action) => ({ unwrap: () => mocks.unwrap(action) }));
  mocks.unwrap.mockImplementation((action) => {
    const configured = mocks.responses[action.type];
    if (typeof configured === 'function') return configured(action);
    if (configured !== undefined) return Promise.resolve(configured);
    switch (action.type) {
      case 'fetchPipelineItems':
        return Promise.resolve({ items });
      case 'fetchSinglePipelineStages':
        return Promise.resolve({
          data: {
            id: 's1',
            name: 'Prospecting',
            description: 'First touch',
            colourCode: '#1E40AF',
            requiredTasks: [{ id: 't1', name: 'Intro call', required: true }],
            requiredDocuments: [],
          },
        });
      case 'deletePipelineItem':
        return Promise.resolve({ status: 'ok' });
      default:
        // Assign and move both read the acknowledgement one level deeper.
        return Promise.resolve({ data: { status: 'ok' } });
    }
  });
  mocks.api.getAllAdmins.mockResolvedValue({
    data: { data: [{ id: 'adm-1', firstName: 'Ada', lastName: 'Lovelace', active: true }] },
  });
  mocks.api.GetPipelineStage.mockResolvedValue({
    data: { data: [{ id: 's1', name: 'Prospecting' }, { id: 's2' }] },
  });
  mocks.api.UpdatePipelineStage.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the header', () => {
  it('titles the page with the draft name', async () => {
    await renderColumn();
    expect(screen.getByRole('heading', { name: 'Prospecting' })).toBeInTheDocument();
  });

  it('falls back to a generic title with no draft name', async () => {
    await renderColumn({ draft: { ...defaultDraft(), name: '' } });
    expect(screen.getByRole('heading', { name: 'Pipeline Stage' })).toBeInTheDocument();
  });

  it('goes back when the header is clicked', async () => {
    await renderColumn();
    fireEvent.click(screen.getByLabelText('Go back'));
    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });
});

describe('the initial load', () => {
  it('seeds the draft from the fetched stage', async () => {
    await renderColumn();
    expect(dispatched('updateDraft').at(-1).payload).toEqual({
      id: 's1',
      name: 'Prospecting',
      description: 'First touch',
      colorCode: '#1E40AF',
      requiredTasks: [{ id: 't1', name: 'Intro call', required: true }],
      requiredDocuments: [],
    });
  });

  it('fills in the values the stage response omits', async () => {
    mocks.responses.fetchSinglePipelineStages = () => Promise.resolve({ data: { id: 's1' } });
    await renderColumn();
    expect(dispatched('updateDraft').at(-1).payload).toEqual({
      id: 's1',
      name: '',
      description: '',
      colorCode: '#1E40AF',
      requiredTasks: [],
      requiredDocuments: [],
    });
  });

  it('leaves the draft alone when the stage response carries no record', async () => {
    mocks.responses.fetchSinglePipelineStages = () => Promise.resolve({ data: null });
    await renderColumn();
    expect(dispatched('updateDraft')).toHaveLength(0);
  });

  it('survives a failed stage fetch', async () => {
    mocks.responses.fetchSinglePipelineStages = () => Promise.reject(new Error('x'));
    await renderColumn();
    expect(screen.getByRole('heading', { name: 'Prospecting' })).toBeInTheDocument();
  });

  it('fetches nothing without a stage id in the route', async () => {
    await renderColumn({ params: {} });
    expect(dispatched('fetchSinglePipelineStages')).toHaveLength(0);
    expect(dispatched('fetchPipelineItems')).toHaveLength(0);
  });

  it('resets the draft when it unmounts', async () => {
    const { unmount } = await renderColumn();
    unmount();
    expect(dispatched('resetDraft')).toHaveLength(1);
  });

  it('skips the stage list request without a pipeline', async () => {
    await renderColumn({ pipeline: null });
    expect(mocks.api.GetPipelineStage).not.toHaveBeenCalled();
  });

  it('survives a failed staff fetch', async () => {
    mocks.api.getAllAdmins.mockRejectedValue(new Error('x'));
    await renderColumn({ permissions: allPerms });
    await openTab('Candidates');
    fireEvent.click(screen.getByText('Add new candidate'));
    expect(screen.getByTestId('prospect-modal-staff')).toHaveTextContent('0');
  });
});

describe('the candidate table', () => {
  const openCandidates = async (over = {}) => {
    await renderColumn({ permissions: allPerms, ...over });
    await openTab('Candidates');
  };

  it('counts the candidates on the tab', async () => {
    await renderColumn();
    expect(document.body.querySelector('.candidate-count')).toHaveTextContent('2');
  });

  it('maps each item into a row', async () => {
    await openCandidates();
    expect(rows()).toHaveLength(2);
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });

  it('substitutes placeholders for the fields an item omits', async () => {
    await openCandidates();
    expect(screen.getByText('Unknown Company')).toBeInTheDocument();
    expect(screen.getByText('Unknown Admin')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('rounds the completion percentage to the nearest ten', async () => {
    await openCandidates();
    expect(within(rows()[0]).getByText('50%')).toBeInTheDocument();
  });

  it('empties the table when the item request fails', async () => {
    mocks.responses.fetchPipelineItems = () => Promise.reject(new Error('x'));
    await openCandidates();
    expect(rows()).toHaveLength(0);
  });

  it('offers every row action to a fully privileged admin', async () => {
    await openCandidates();
    fireEvent.click(screen.getAllByLabelText('Row actions')[0]);
    expect(screen.getByText('Move candidate')).toBeInTheDocument();
    expect(screen.getByText('Remove candidate')).toBeInTheDocument();
    expect(screen.getByText('Reassign to staff')).toBeInTheDocument();
  });

  it('hides the gated row actions from an admin without them', async () => {
    await openCandidates({ permissions: ['edit_pipeline_stage'] });
    fireEvent.click(screen.getAllByLabelText('Row actions')[0]);
    expect(screen.queryByText('Move candidate')).toBeNull();
    expect(screen.queryByText('Remove candidate')).toBeNull();
    expect(screen.getByText('Reassign to staff')).toBeInTheDocument();
  });

  it('hides the add-candidate button without the permission', async () => {
    await openCandidates({ permissions: [] });
    expect(screen.queryByText('Add new candidate')).toBeNull();
  });

  it('opens a candidate from its row action', async () => {
    await openCandidates();
    await rowAction(0, 'View candidate');
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/candidate-single/s1/c1');
  });

  it('opens a candidate in edit mode from its row action', async () => {
    await openCandidates();
    await rowAction(0, 'Edit candidate');
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/candidate-single/s1/c1/edit');
  });

  it('refetches the list after a prospect is added', async () => {
    await openCandidates();
    fireEvent.click(screen.getByText('Add new candidate'));
    expect(screen.getByTestId('prospect-modal-stage')).toHaveTextContent('s1');
    const before = dispatched('fetchPipelineItems').length;
    await act(async () => {
      fireEvent.click(screen.getByTestId('prospect-modal-save'));
    });
    expect(dispatched('fetchPipelineItems').length).toBeGreaterThan(before);
    expect(screen.queryByTestId('prospect-modal')).toBeNull();
  });
});

describe('the basic setup tab', () => {
  it('dispatches a draft update as the name is typed', async () => {
    await renderColumn({ permissions: allPerms });
    fireEvent.change(screen.getByPlaceholderText('Enter column name'), { target: { value: 'Screening' } });
    expect(dispatched('updateDraft').at(-1).payload).toEqual({ name: 'Screening' });
  });

  it('dispatches a draft update as the description is typed', async () => {
    await renderColumn({ permissions: allPerms });
    fireEvent.change(screen.getByPlaceholderText('Enter description'), { target: { value: 'Later' } });
    expect(dispatched('updateDraft').at(-1).payload).toEqual({ description: 'Later' });
  });

  it('opens the colour picker from the swatch', async () => {
    await renderColumn();
    fireEvent.click(document.body.querySelector('.color-preview'));
    expect(screen.getByTestId('color-picker-value')).toHaveTextContent('#1E40AF');
  });

  it('opens the colour picker from the keyboard', async () => {
    await renderColumn();
    fireEvent.keyDown(document.body.querySelector('.color-preview'), { key: 'Enter' });
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('ignores an unrelated key on the swatch', async () => {
    await renderColumn();
    fireEvent.keyDown(document.body.querySelector('.color-preview'), { key: 'a' });
    expect(screen.queryByTestId('color-picker')).toBeNull();
  });

  it('opens the colour picker from the change button', async () => {
    await renderColumn();
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('stores the chosen colour and closes the picker', async () => {
    await renderColumn();
    fireEvent.click(screen.getByText('Change'));
    fireEvent.click(screen.getByTestId('color-picker-pick'));
    expect(dispatched('updateDraft').at(-1).payload).toEqual({ colorCode: '#ff0000' });
    expect(screen.queryByTestId('color-picker')).toBeNull();
  });

  it('closes the picker without choosing anything', async () => {
    await renderColumn();
    fireEvent.click(screen.getByText('Change'));
    const before = dispatched('updateDraft').length;
    fireEvent.click(screen.getByTestId('color-picker-close'));
    expect(screen.queryByTestId('color-picker')).toBeNull();
    expect(dispatched('updateDraft')).toHaveLength(before);
  });

  it('saves the stage details', async () => {
    await renderColumn({ permissions: allPerms });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });
    expect(mocks.api.UpdatePipelineStage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 's1',
        name: 'Prospecting',
        description: 'First touch',
        colourCode: '#1E40AF',
      })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Stage information updated successfully!',
      'success'
    );
  });

  it('reports the server message when the save fails', async () => {
    mocks.api.UpdatePipelineStage.mockRejectedValue({
      response: { data: { message: 'Name already taken' } },
    });
    await renderColumn({ permissions: allPerms });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Name already taken', 'error');
  });

  it('falls back to a generic message when the failure carries none', async () => {
    mocks.api.UpdatePipelineStage.mockRejectedValue(new Error('x'));
    await renderColumn({ permissions: allPerms });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to update stage information', 'error');
  });

  it('hides both write buttons from a read-only admin', async () => {
    await renderColumn();
    expect(screen.queryByText('Save Changes')).toBeNull();
    expect(screen.queryByText('Delete this Column')).toBeNull();
  });
});

describe('deleting the stage', () => {
  it('deletes it and navigates back', async () => {
    await renderColumn({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete this Column'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-stage-confirm'));
    });
    expect(dispatched('deletePipelineStage').at(-1).payload).toEqual(
      expect.objectContaining({ id: 's1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Stage deleted', 'success');
    expect(mocks.navigate).toHaveBeenCalledWith(-1);
  });

  it('keeps the confirmation open and reports the failure', async () => {
    mocks.responses.deletePipelineStage = () => Promise.reject(new Error('Stage in use'));
    await renderColumn({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete this Column'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-stage-confirm'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Stage in use', 'error');
    expect(screen.getByTestId('delete-stage-modal')).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalledWith(-1);
  });

  it('falls back to a generic message when the rejection carries none', async () => {
    mocks.responses.deletePipelineStage = () => Promise.reject({});
    await renderColumn({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete this Column'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-stage-confirm'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Failed to delete stage. Please try again.',
      'error'
    );
  });

  it('closes the confirmation again', async () => {
    await renderColumn({ permissions: allPerms });
    fireEvent.click(screen.getByText('Delete this Column'));
    fireEvent.click(screen.getByTestId('delete-stage-close'));
    expect(screen.queryByTestId('delete-stage-modal')).toBeNull();
  });
});

describe('the tasks and documents tab', () => {
  const openTasks = async (over = {}) => {
    await renderColumn({ permissions: allPerms, ...over });
    await openTab('Tasks');
  };

  it('lists the draft tasks and documents', async () => {
    await openTasks();
    expect(screen.getByText('Intro call')).toBeInTheDocument();
    expect(screen.getByText('Send deck')).toBeInTheDocument();
    expect(screen.getByText('Signed MSA')).toBeInTheDocument();
  });

  it('says so when either list is empty', async () => {
    await openTasks({ draft: { ...defaultDraft(), requiredTasks: [], requiredDocuments: [] } });
    expect(screen.getByText('No tasks added yet')).toBeInTheDocument();
    expect(screen.getByText('No documents added yet')).toBeInTheDocument();
  });

  it('removes a task from the draft', async () => {
    await openTasks();
    fireEvent.click(document.body.querySelectorAll('.tasks-list .delete-btn')[0]);
    expect(dispatched('removeTaskFromDraft').at(-1).payload).toBe('t1');
  });

  it('removes a document from the draft', async () => {
    await openTasks();
    fireEvent.click(document.body.querySelector('.documents-lists .delete-btn'));
    expect(dispatched('removeDocumentFromDraft').at(-1).payload).toBe('d1');
  });

  it('toggles whether a task is required', async () => {
    await openTasks();
    fireEvent.click(document.body.querySelectorAll('.tasks-list input[type="checkbox"]')[1]);
    expect(dispatched('toggleTaskRequiredInDraft').at(-1).payload).toBe('t2');
  });

  it('toggles whether a document is required', async () => {
    await openTasks();
    fireEvent.click(document.body.querySelector('.documents-lists input[type="checkbox"]'));
    expect(dispatched('toggleDocumentRequiredInDraft').at(-1).payload).toBe('d1');
  });

  it('adds a task through the modal', async () => {
    await openTasks();
    fireEvent.click(screen.getByText('Add a new task'));
    fireEvent.click(screen.getByTestId('task-modal-save'));
    expect(dispatched('addTaskToDraft').at(-1).payload).toEqual(
      expect.objectContaining({ name: 'Intro call', required: true })
    );
    expect(screen.queryByTestId('task-modal')).toBeNull();
  });

  it('closes the task modal without adding anything', async () => {
    await openTasks();
    fireEvent.click(screen.getByText('Add a new task'));
    fireEvent.click(screen.getByTestId('task-modal-close'));
    expect(screen.queryByTestId('task-modal')).toBeNull();
    expect(dispatched('addTaskToDraft')).toHaveLength(0);
  });

  it('adds a document through the modal', async () => {
    await openTasks();
    fireEvent.click(screen.getByText('Request a new document'));
    fireEvent.click(screen.getByTestId('doc-modal-save'));
    expect(dispatched('addDocumentToDraft').at(-1).payload).toEqual(
      expect.objectContaining({ name: 'Signed MSA', required: true })
    );
  });

  it('saves the task list', async () => {
    await openTasks();
    await act(async () => {
      fireEvent.click(screen.getByText('Save Tasks'));
    });
    expect(dispatched('updateStageTasks').at(-1).payload).toEqual(
      expect.objectContaining({ pipelineStageId: 's1', requiredTasks: defaultDraft().requiredTasks })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('RequiredTasks updated successfully!', 'success');
  });

  it('saves the document list', async () => {
    await openTasks();
    await act(async () => {
      fireEvent.click(screen.getByText('Save Documents'));
    });
    expect(dispatched('updateStageDocuments').at(-1).payload).toEqual(
      expect.objectContaining({ requiredDocuments: defaultDraft().requiredDocuments })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'RequiredDocuments updated successfully!',
      'success'
    );
  });

  it('reports the server message when a save fails', async () => {
    mocks.responses.updateStageTasks = () =>
      Promise.reject({ response: { data: { message: 'Too many tasks' } } });
    await openTasks();
    await act(async () => {
      fireEvent.click(screen.getByText('Save Tasks'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Too many tasks', 'error');
  });

  it('falls back to a generic message when the failure carries none', async () => {
    mocks.responses.updateStageDocuments = () => Promise.reject(new Error('x'));
    await openTasks();
    await act(async () => {
      fireEvent.click(screen.getByText('Save Documents'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to update requiredDocuments', 'error');
  });

  it('hides every editing control from a read-only admin', async () => {
    await renderColumn();
    await openTab('Tasks');
    expect(screen.queryByText('Add a new task')).toBeNull();
    expect(screen.queryByText('Save Tasks')).toBeNull();
    expect(document.body.querySelectorAll('.delete-btn')).toHaveLength(0);
    expect(document.body.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });
});

describe('reassigning a candidate', () => {
  const openAssign = async (over = {}) => {
    await renderColumn({ permissions: allPerms, ...over });
    await openTab('Candidates');
    await rowAction(0, 'Reassign to staff');
  };

  it('carries the candidate into the modal', async () => {
    await openAssign();
    expect(screen.getByTestId('assign-modal-tasks')).toHaveTextContent('c1');
    expect(screen.getByTestId('assign-modal-companies')).toHaveTextContent('Acme Health');
  });

  it('assigns the candidate and refetches', async () => {
    await openAssign();
    const before = dispatched('fetchPipelineItems').length;
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(dispatched('reassignCandidateToStaff').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['c1'], assignToAdmin: 'adm-1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Assigned 1 candidate(s) successfully!',
      'success'
    );
    expect(dispatched('fetchPipelineItems').length).toBeGreaterThan(before);
    expect(screen.queryByTestId('assign-modal')).toBeNull();
  });

  it('keeps the modal open when the assignment is not acknowledged', async () => {
    mocks.responses.reassignCandidateToStaff = { data: { status: 'error' } };
    await openAssign();
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to assign candidate(s).', 'error');
    expect(screen.getByTestId('assign-modal')).toBeInTheDocument();
  });

  it('reports the server message when the assignment fails', async () => {
    mocks.responses.reassignCandidateToStaff = () =>
      Promise.reject({ response: { data: { message: 'Admin is inactive' } } });
    await openAssign();
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Admin is inactive', 'error');
  });

  it('clears the selection when the modal is dismissed', async () => {
    await openAssign();
    fireEvent.click(screen.getByTestId('assign-modal-close'));
    expect(screen.queryByTestId('assign-modal')).toBeNull();
  });
});

describe('moving a candidate', () => {
  const openMove = async (over = {}) => {
    await renderColumn({ permissions: allPerms, ...over });
    await openTab('Candidates');
    await rowAction(0, 'Move candidate');
  };

  it('offers the other stages by name', async () => {
    await openMove();
    expect(screen.getByTestId('move-modal-current')).toHaveTextContent('s1');
    expect(screen.getByTestId('move-modal-columns')).toHaveTextContent('Prospecting|Unnamed Stage');
  });

  it('moves the candidate and names the target stage', async () => {
    await openMove();
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(dispatched('updatePipelineItemActivity').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['c1'], pipelineStageId: 's2' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Moved 1 candidate(s) to Unnamed Stage',
      'success'
    );
  });

  it('names an unrecognised target stage generically', async () => {
    mocks.moveTarget = 'ghost';
    await openMove();
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Moved 1 candidate(s) to Unknown Stage',
      'success'
    );
  });

  it('keeps the modal open when the move is not acknowledged', async () => {
    mocks.responses.updatePipelineItemActivity = { data: { status: 'error' } };
    await openMove();
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to move candidate(s).', 'error');
    expect(screen.getByTestId('move-modal')).toBeInTheDocument();
  });

  it('reports the server message when the move fails', async () => {
    mocks.responses.updatePipelineItemActivity = () =>
      Promise.reject({ response: { data: { message: 'Stage is full' } } });
    await openMove();
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Stage is full', 'error');
  });
});

describe('deleting candidates', () => {
  const openDelete = async (over = {}) => {
    await renderColumn({ permissions: allPerms, ...over });
    await openTab('Candidates');
    await rowAction(0, 'Remove candidate');
  };

  it('deletes the candidate and refetches', async () => {
    await openDelete();
    const before = dispatched('fetchPipelineItems').length;
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(dispatched('deletePipelineItem').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['c1'] })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Deleted 1 candidate(s) successfully!',
      'success'
    );
    expect(dispatched('fetchPipelineItems').length).toBeGreaterThan(before);
  });

  it('keeps the confirmation open when the delete is not acknowledged', async () => {
    mocks.responses.deletePipelineItem = { status: 'error' };
    await openDelete();
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to delete candidate(s).', 'error');
    expect(screen.getByTestId('delete-candidate-modal')).toBeInTheDocument();
  });

  it('reports the server message when the delete fails', async () => {
    mocks.responses.deletePipelineItem = () =>
      Promise.reject({ response: { data: { message: 'Candidate is locked' } } });
    await openDelete();
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Candidate is locked', 'error');
  });

  it('clears the selection when the confirmation is dismissed', async () => {
    await openDelete();
    fireEvent.click(screen.getByTestId('delete-candidate-close'));
    expect(screen.queryByTestId('delete-candidate-modal')).toBeNull();
  });
});

describe('the bulk action bar', () => {
  const selectFirstRow = async () => {
    await renderColumn({ permissions: allPerms });
    await openTab('Candidates');
    fireEvent.click(document.body.querySelector('tbody input[type="checkbox"]'));
  };

  it('appears once a row is ticked', async () => {
    await selectFirstRow();
    expect(document.body.querySelector('.selected-items-actions')).toBeInTheDocument();
  });

  it('opens the assign modal for the ticked rows', async () => {
    await selectFirstRow();
    await act(async () => {
      fireEvent.click(screen.getByText('Assign to Staff'));
    });
    expect(screen.getByTestId('assign-modal-tasks')).toHaveTextContent('c1');
  });

  it('opens the move modal for the ticked rows', async () => {
    await selectFirstRow();
    await act(async () => {
      fireEvent.click(screen.getByText('Move candidates'));
    });
    expect(screen.getByTestId('move-modal')).toBeInTheDocument();
  });

  it('opens the delete confirmation for the ticked rows', async () => {
    await selectFirstRow();
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    expect(screen.getByTestId('delete-candidate-title')).toHaveTextContent(
      'delete 1 candidate(s)'
    );
  });
});

describe('the busy indicator', () => {
  it('shows a loader while the pipeline status is loading', async () => {
    await renderColumn({ status: 'loading' });
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
  });

  it('shows no loader once the load has settled', async () => {
    await renderColumn();
    expect(document.body.querySelector('.section-loader')).toBeNull();
  });
});

describe('a stage the route never named', () => {
  // Without a pipelineStageId the mount effect never fires, and both save
  // handlers bail out before they reach the API.
  it('saves neither the basic setup nor the task list', async () => {
    await renderColumn({ permissions: allPerms, params: {} });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });
    expect(mocks.api.UpdatePipelineStage).not.toHaveBeenCalled();

    await openTab('Tasks');
    await act(async () => {
      fireEvent.click(screen.getByText('Save Tasks'));
    });
    expect(dispatched('updateStageTasks')).toHaveLength(0);
  });
});

describe('a stage with no colour on the draft', () => {
  it('paints the swatch black', async () => {
    await renderColumn({ draft: { ...defaultDraft(), colorCode: '' } });
    expect(document.body.querySelector('.color-preview')).toHaveStyle({
      backgroundColor: '#000000',
    });
  });
});

describe('the staff and stage lookups', () => {
  it('names an admin whose record carries no name parts', async () => {
    mocks.api.getAllAdmins.mockResolvedValue({
      data: { data: [{ id: 'adm-9', firstName: '', lastName: null, active: true }] },
    });
    await renderColumn({ permissions: allPerms });
    await openTab('Candidates');
    await rowAction(0, 'Reassign to staff');
    expect(screen.getByText('Unknown Admin')).toBeInTheDocument();
  });

  it('falls back to empty lists when neither response carries a body', async () => {
    mocks.api.getAllAdmins.mockResolvedValue({});
    mocks.api.GetPipelineStage.mockResolvedValue({});
    await renderColumn({ permissions: allPerms });
    await openTab('Candidates');

    fireEvent.click(screen.getByText('Add new candidate'));
    expect(screen.getByTestId('prospect-modal-staff')).toHaveTextContent('0');
    fireEvent.click(screen.getByTestId('prospect-modal-save'));

    await rowAction(0, 'Move candidate');
    expect(screen.getByTestId('move-modal-columns').textContent).toBe('');
  });
});

describe('a bulk action carried through', () => {
  const openBulk = async (label) => {
    await renderColumn({ permissions: allPerms });
    await openTab('Candidates');
    fireEvent.click(document.body.querySelector('tbody input[type="checkbox"]'));
    await act(async () => {
      fireEvent.click(screen.getByText(label));
    });
  };

  it('assigns every ticked row', async () => {
    await openBulk('Assign to Staff');
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(dispatched('reassignCandidateToStaff').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['c1'] })
    );
  });

  it('moves every ticked row', async () => {
    await openBulk('Move candidates');
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(dispatched('updatePipelineItemActivity').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['c1'], pipelineStageId: 's2' })
    );
  });

  it('deletes every ticked row', async () => {
    await openBulk('Delete');
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(dispatched('deletePipelineItem').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['c1'] })
    );
  });
});

describe('the shipped build', () => {
  // Eight failure paths each log through an `import.meta.env.DEV` guard that is
  // always true under Vitest; stubbing it false is the only way to the silent
  // arm the production bundle takes.
  beforeEach(() => {
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('says nothing when all three mount fetches fail', async () => {
    mocks.responses.fetchPipelineItems = () => Promise.reject(new Error('x'));
    mocks.responses.fetchSinglePipelineStages = () => Promise.reject(new Error('x'));
    mocks.api.getAllAdmins.mockRejectedValue(new Error('x'));
    await renderColumn({ permissions: allPerms });

    for (const message of [
      'Failed to fetch pipeline items:',
      'Failed to fetch stage data:',
      'Failed to fetch staff or stages:',
    ]) {
      expect(console.error).not.toHaveBeenCalledWith(message, expect.anything());
    }
  });

  it('says nothing when the basic setup will not save', async () => {
    mocks.api.UpdatePipelineStage.mockRejectedValue(new Error('x'));
    await renderColumn({ permissions: allPerms });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to update stage:',
      expect.anything()
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Failed to update stage information',
      'error'
    );
  });

  it('says nothing when the task list will not save', async () => {
    mocks.responses.updateStageTasks = () => Promise.reject(new Error('x'));
    await renderColumn({ permissions: allPerms });
    await openTab('Tasks');
    await act(async () => {
      fireEvent.click(screen.getByText('Save Tasks'));
    });

    expect(console.error).not.toHaveBeenCalledWith(
      'Failed to update requiredTasks:',
      expect.anything()
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Failed to update requiredTasks',
      'error'
    );
  });

  it.each([
    ['Reassign to staff', 'assign-modal-save', 'reassignCandidateToStaff', 'Staff assignment failed:'],
    ['Move candidate', 'move-modal-save', 'updatePipelineItemActivity', 'Candidate move failed:'],
    ['Remove candidate', 'delete-candidate-confirm', 'deletePipelineItem', 'Candidate deletion failed:'],
  ])('says nothing when %s fails', async (action, saveId, thunk, message) => {
    mocks.responses[thunk] = () => Promise.reject(new Error('x'));
    await renderColumn({ permissions: allPerms });
    await openTab('Candidates');
    await rowAction(0, action);
    await act(async () => {
      fireEvent.click(screen.getByTestId(saveId));
    });

    expect(console.error).not.toHaveBeenCalledWith(message, expect.anything());
  });
});
