import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

// The draft lives in redux, so every edit the modal makes is an action. Tagging
// the creators by name lets a test name the action it expects without pulling
// the real slice in.
const actions = vi.hoisted(() => {
  const NAMES = [
    'updateDraft',
    'addTaskToDraft',
    'removeTaskFromDraft',
    'toggleTaskRequiredInDraft',
    'addDocumentToDraft',
    'removeDocumentFromDraft',
    'toggleDocumentRequiredInDraft',
    'resetDraft',
  ];
  return Object.fromEntries(NAMES.map((n) => [n, (payload) => ({ type: n, payload })]));
});
vi.mock('../ReduxStore/features/PipelineSlice', () => actions);

// Probes for the three heavy children: each records the props it was handed and
// exposes a button for the callback the modal cares about.
vi.mock('../Components/ColorPicker', () => ({
  default: ({ color, onChange, onClose }) => (
    <div data-testid="color-picker" data-color={color}>
      <button onClick={() => onChange('#abcdef')}>pick colour</button>
      <button onClick={onClose}>dismiss picker</button>
    </div>
  ),
}));
vi.mock('../Components/ReusableModal/CustomTaskModal', () => ({
  default: ({ isOpen, onSave, onClose }) =>
    isOpen ? (
      <div data-testid="task-modal">
        <button onClick={() => onSave({ id: 't9', name: 'Reference check', required: true })}>
          confirm task
        </button>
        <button onClick={onClose}>dismiss task modal</button>
      </div>
    ) : null,
}));
vi.mock('../Components/ReusableModal/CustomDocumentModal', () => ({
  default: ({ isOpen, onSave, onClose }) =>
    isOpen ? (
      <div data-testid="document-modal">
        <button onClick={() => onSave({ id: 'd9', name: 'Passport', required: false })}>
          confirm document
        </button>
        <button onClick={onClose}>dismiss document modal</button>
      </div>
    ) : null,
}));

const dispatch = vi.fn();
const state = { pipeline: { draft: null } };
vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(state),
}));

import NewPipelineColumnModal from '../Components/ReusableModal/NewPipelineColumnModal';

/**
 * The three-tab wizard for adding a pipeline column.
 *
 * It owns none of its data: the column being built is a draft in redux, so
 * every keystroke is an `updateDraft` action and the modal itself only decides
 * which tab is showing and whether the draft is good enough to move on. Only
 * the first tab validates -- the tasks and documents tabs always pass -- which
 * means the last tab's Save can never fail validation.
 *
 * Cancelling deliberately keeps the draft so reopening restores it; only a
 * save that the caller accepted clears it.
 *
 * Its primary button is a plain synchronous handler, so ReusableModal holds it
 * for 600ms after every click; the helper below steps the fake clock past that
 * before the next one.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const draft = (over = {}) => ({
  name: 'Screening',
  description: 'First pass over the applicants',
  colorCode: '#123456',
  requiredTasks: [],
  requiredDocuments: [],
  ...over,
});

const renderModal = (props = {}) =>
  render(<NewPipelineColumnModal isOpen onClose={onClose} onSave={onSave} {...props} />);

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const tab = (name) =>
  Array.from(document.body.querySelectorAll('.tab-button')).find(
    (b) => b.textContent === name
  );

const clickPrimary = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
  // Past ReusableModal's 600ms double-submit guard.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
};

const dispatchedTypes = () => dispatch.mock.calls.map(([a]) => a.type);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  state.pipeline.draft = draft();
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('New pipeline column')).not.toBeInTheDocument();
  });

  it('opens on the first tab with the draft already filled in', () => {
    renderModal();
    expect(screen.getByText('New pipeline column')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Screening')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('First pass over the applicants')
    ).toBeInTheDocument();
    expect(primary().textContent).toBe('Next');
    expect(secondary().textContent).toBe('Cancel');
  });

  it('shows empty fields for a draft that has nothing in it yet', () => {
    state.pipeline.draft = draft({ name: undefined, description: undefined });
    renderModal();
    expect(document.querySelector('.input-text').value).toBe('');
    expect(document.querySelector('textarea').value).toBe('');
  });

  it('returns to the first tab when it is reopened', async () => {
    const { rerender } = renderModal();
    fireEvent.click(tab('Required Documents'));
    expect(primary().textContent).toBe('Save');

    rerender(
      <NewPipelineColumnModal isOpen={false} onClose={onClose} onSave={onSave} />
    );
    rerender(<NewPipelineColumnModal isOpen onClose={onClose} onSave={onSave} />);
    expect(primary().textContent).toBe('Next');
  });
});

describe('editing the basics', () => {
  it('sends every keystroke of the name to the draft', () => {
    renderModal();
    fireEvent.change(screen.getByDisplayValue('Screening'), {
      target: { value: 'Interview' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateDraft',
      payload: { name: 'Interview' },
    });
  });

  it('sends the description to the draft', () => {
    renderModal();
    fireEvent.change(screen.getByDisplayValue('First pass over the applicants'), {
      target: { value: 'Rewritten' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateDraft',
      payload: { description: 'Rewritten' },
    });
  });

  it('shows the draft colour on the swatch', () => {
    renderModal();
    expect(document.querySelector('.color-preview')).toHaveStyle({
      backgroundColor: '#123456',
    });
  });

  it('shows black on the swatch for a draft with no colour yet', () => {
    state.pipeline.draft = draft({ colorCode: undefined });
    renderModal();
    expect(document.querySelector('.color-preview')).toHaveStyle({
      backgroundColor: '#000000',
    });
  });
});

describe('the colour picker', () => {
  const preview = () => document.querySelector('.color-preview');

  it('stays shut until it is asked for', () => {
    renderModal();
    expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
  });

  it('opens from the swatch', () => {
    renderModal();
    fireEvent.click(preview());
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('opens from the Change button', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Change column color'));
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it.each([['Enter'], [' ']])('opens from the swatch on %s', (key) => {
    renderModal();
    fireEvent.keyDown(preview(), { key });
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('ignores any other key on the swatch', () => {
    renderModal();
    fireEvent.keyDown(preview(), { key: 'a' });
    expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
  });

  it('hands the picker the colour already on the draft', () => {
    renderModal();
    fireEvent.click(preview());
    expect(screen.getByTestId('color-picker')).toHaveAttribute('data-color', '#123456');
  });

  it('hands the picker black when the draft has no colour', () => {
    state.pipeline.draft = draft({ colorCode: null });
    renderModal();
    fireEvent.click(preview());
    expect(screen.getByTestId('color-picker')).toHaveAttribute('data-color', '#000000');
  });

  it('writes a picked colour back to the draft', () => {
    renderModal();
    fireEvent.click(preview());
    fireEvent.click(screen.getByText('pick colour'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateDraft',
      payload: { colorCode: '#abcdef' },
    });
  });

  it('closes again when the picker dismisses itself', () => {
    renderModal();
    fireEvent.click(preview());
    fireEvent.click(screen.getByText('dismiss picker'));
    expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
  });
});

describe('validating the first tab', () => {
  it.each([
    ['a draft with no name', { name: '' }, 'Column name is required.'],
    ['a name that is only spaces', { name: '   ' }, 'Column name is required.'],
    ['a draft with no description', { description: '' }, 'Description is required.'],
    [
      'a draft with no colour',
      { colorCode: '' },
      'A valid color code is required.',
    ],
    [
      'a colour that is not six hex digits',
      { colorCode: 'red' },
      'A valid color code is required.',
    ],
  ])('refuses to move on from %s', async (_case, over, message) => {
    state.pipeline.draft = draft(over);
    renderModal();
    await clickPrimary();

    expect(showToast).toHaveBeenCalledWith(message, 'error');
    expect(showToast).toHaveBeenCalledWith('Please fill in all required fields.', 'error');
    expect(primary().textContent).toBe('Next');
  });

  it('moves on from a complete first tab', async () => {
    renderModal();
    await clickPrimary();
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.getByText('No tasks added yet')).toBeInTheDocument();
  });
});

describe('stepping through the tabs', () => {
  it('walks forward to the last tab and renames the primary button', async () => {
    renderModal();
    await clickPrimary();
    expect(secondary().textContent).toBe('Previous');
    await clickPrimary();
    expect(primary().textContent).toBe('Save');
    expect(screen.getByText('No documents added yet')).toBeInTheDocument();
  });

  it('steps back again', async () => {
    renderModal();
    await clickPrimary();
    fireEvent.click(secondary());
    expect(primary().textContent).toBe('Next');
    expect(secondary().textContent).toBe('Cancel');
  });

  it('closes from the first tab instead of stepping back off the end', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(dispatchedTypes()).not.toContain('resetDraft');
  });

  it('jumps straight to a tab from the tab strip', () => {
    renderModal();
    fireEvent.click(tab('Required Documents'));
    expect(screen.getByText('No documents added yet')).toBeInTheDocument();
  });
});

describe('the required tasks tab', () => {
  const openTasks = () => {
    renderModal();
    fireEvent.click(tab('Required Tasks'));
  };

  it('says so when the draft has no tasks', () => {
    openTasks();
    expect(screen.getByText('No tasks added yet')).toBeInTheDocument();
  });

  it('lists the tasks the draft already carries', () => {
    state.pipeline.draft = draft({
      requiredTasks: [
        { id: 't1', name: 'Phone screen', required: true },
        { id: 't2', name: 'Take-home', required: false },
      ],
    });
    openTasks();
    expect(screen.getByText('Phone screen')).toBeInTheDocument();
    expect(document.querySelectorAll('.task-item')).toHaveLength(2);
    expect(document.querySelectorAll('.task-item input[type="checkbox"]')[0].checked).toBe(
      true
    );
    expect(document.querySelectorAll('.task-item input[type="checkbox"]')[1].checked).toBe(
      false
    );
  });

  it('removes a task from the draft', () => {
    state.pipeline.draft = draft({
      requiredTasks: [{ id: 't1', name: 'Phone screen', required: true }],
    });
    openTasks();
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeTaskFromDraft', payload: 't1' });
  });

  it('flips a task between required and optional', () => {
    state.pipeline.draft = draft({
      requiredTasks: [{ id: 't1', name: 'Phone screen', required: true }],
    });
    openTasks();
    fireEvent.click(document.querySelector('.task-item input[type="checkbox"]'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'toggleTaskRequiredInDraft',
      payload: 't1',
    });
  });

  it('adds a task through the task modal and closes it again', () => {
    openTasks();
    expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Add a new task'));
    fireEvent.click(screen.getByText('confirm task'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'addTaskToDraft',
      payload: { id: 't9', name: 'Reference check', required: true },
    });
    expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
  });

  it('lets the task modal be dismissed without adding anything', () => {
    openTasks();
    fireEvent.click(screen.getByText('Add a new task'));
    fireEvent.click(screen.getByText('dismiss task modal'));
    expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    expect(dispatchedTypes()).not.toContain('addTaskToDraft');
  });
});

describe('the required documents tab', () => {
  const openDocuments = () => {
    renderModal();
    fireEvent.click(tab('Required Documents'));
  };

  it('says so when the draft has no documents', () => {
    openDocuments();
    expect(screen.getByText('No documents added yet')).toBeInTheDocument();
  });

  it('lists the documents the draft already carries', () => {
    state.pipeline.draft = draft({
      requiredDocuments: [{ id: 'd1', name: 'CV', required: true }],
    });
    openDocuments();
    expect(screen.getByText('CV')).toBeInTheDocument();
    expect(document.querySelectorAll('.document-item')).toHaveLength(1);
  });

  it('removes a document from the draft', () => {
    state.pipeline.draft = draft({
      requiredDocuments: [{ id: 'd1', name: 'CV', required: true }],
    });
    openDocuments();
    fireEvent.click(screen.getByLabelText('Delete document'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'removeDocumentFromDraft',
      payload: 'd1',
    });
  });

  it('flips a document between required and optional', () => {
    state.pipeline.draft = draft({
      requiredDocuments: [{ id: 'd1', name: 'CV', required: false }],
    });
    openDocuments();
    fireEvent.click(document.querySelector('.document-item input[type="checkbox"]'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'toggleDocumentRequiredInDraft',
      payload: 'd1',
    });
  });

  it('adds a document through the document modal and closes it again', () => {
    openDocuments();
    fireEvent.click(screen.getByText('Request a new document'));
    fireEvent.click(screen.getByText('confirm document'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'addDocumentToDraft',
      payload: { id: 'd9', name: 'Passport', required: false },
    });
    expect(screen.queryByTestId('document-modal')).not.toBeInTheDocument();
  });

  it('lets the document modal be dismissed without adding anything', () => {
    openDocuments();
    fireEvent.click(screen.getByText('Request a new document'));
    fireEvent.click(screen.getByText('dismiss document modal'));
    expect(screen.queryByTestId('document-modal')).not.toBeInTheDocument();
    expect(dispatchedTypes()).not.toContain('addDocumentToDraft');
  });
});

describe('saving', () => {
  const saveFromLastTab = async () => {
    renderModal();
    fireEvent.click(tab('Required Documents'));
    await clickPrimary();
  };

  it('sends only the five fields the column is made of', async () => {
    state.pipeline.draft = draft({
      requiredTasks: [{ id: 't1', name: 'Phone screen', required: true }],
      requiredDocuments: [{ id: 'd1', name: 'CV', required: true }],
      extraJunk: 'ignored',
    });
    await saveFromLastTab();

    expect(onSave).toHaveBeenCalledWith({
      name: 'Screening',
      description: 'First pass over the applicants',
      colorCode: '#123456',
      requiredTasks: [{ id: 't1', name: 'Phone screen', required: true }],
      requiredDocuments: [{ id: 'd1', name: 'CV', required: true }],
    });
  });

  it('clears the draft and closes once the caller accepted it', async () => {
    await saveFromLastTab();
    expect(dispatchedTypes()).toContain('resetDraft');
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the modal and the draft when the save is refused', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    await saveFromLastTab();

    expect(dispatchedTypes()).not.toContain('resetDraft');
    expect(onClose).not.toHaveBeenCalled();
    expect(primary().textContent).toBe('Save');
  });

  it('holds the primary button while the save is in flight', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => (release = resolve)));
    renderModal();
    fireEvent.click(tab('Required Documents'));
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();

    await act(async () => {
      release();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('saves an incomplete draft anyway, because only the first tab validates', async () => {
    // handleSave re-runs validation against whichever tab is showing, and the
    // documents tab has no rules, so a draft that could never have got past the
    // first tab by clicking Next still saves if the tab strip was used instead.
    state.pipeline.draft = draft({ name: '', colorCode: 'not-a-colour' });
    await saveFromLastTab();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: '', colorCode: 'not-a-colour' })
    );
    expect(showToast).not.toHaveBeenCalled();
  });
});
