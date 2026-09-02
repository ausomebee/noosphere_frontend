import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

// Every thunk becomes a tagged action creator, so a dispatch can be recognised
// by name and any single thunk can be made to fail for one test.
const { thunks, calls, responses } = vi.hoisted(() => {
  const NAMES = [
    'asyncMoveFeatureToAnotherGroup',
    'asyncEnableOrDisableFeature',
    'asyncAssignFeatureToPlan',
    'asyncDeleteFeature',
    'asyncUpdateFeature',
    'asyncFetchAllFeatures',
  ];
  const calls = [];
  const responses = {};
  const thunks = Object.fromEntries(
    NAMES.map((name) => [name, (payload) => ({ type: name, payload })])
  );
  return { thunks, calls, responses, NAMES };
});
vi.mock('../ReduxStore/features/featureManagementSlice', () => thunks);

// The five child modals are covered by their own suites; here each is a probe
// that exposes the callback the row hands it.
const { modalProps, stubModal } = vi.hoisted(() => {
  const modalProps = {};
  const stubModal = (name) => ({
    default: (props) => {
      modalProps[name] = props;
      return props.isOpen ? <div data-testid={`${name}-open`} /> : null;
    },
  });
  return { modalProps, stubModal };
});
vi.mock('../Components/ReusableModal/MoveFeatureModal', () => stubModal('move'));
vi.mock('../Components/ReusableModal/AssignPlanModal', () => stubModal('assign'));
vi.mock('../Components/ReusableModal/SecondDeleteConfirmationModal', () => stubModal('delete'));
vi.mock('../Components/ReusableModal/ToggleActiveModal', () => stubModal('toggle'));
vi.mock('../Components/ReusableModal/EditFeatureModal', () => stubModal('edit'));

// A thunk dispatch returns a promise carrying `.unwrap()`, which is what the
// row awaits; failures reject with a plain string, as the real slice does.
const dispatch = vi.fn((action) => {
  calls.push(action);
  const failure = responses[action.type];
  const promise = failure
    ? Promise.reject(failure)
    : Promise.resolve({ ok: true });
  promise.unwrap = () => promise;
  // Swallow the rejection on the promise the caller does not chain from.
  promise.catch(() => {});
  return promise;
});

const state = {
  authentication: {
    // useAuth reads the tokens off the slice itself, not off the user.
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'u1' },
  },
  featureManagement: {
    featureGroups: [
      { id: 'g1', title: 'Billing' },
      { id: 'g2', title: 'Scheduling' },
    ],
  },
};

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(state),
}));

import FeatureRow from '../Pages/FeatureManagement/FeatureSubComps/FeatureRow';

/**
 * One row of the feature-management table.
 *
 * Each of its five actions follows the same shape: dispatch a thunk, unwrap it,
 * refresh the whole feature list on success, and toast on failure. The thunks
 * reject with a bare string rather than an Error, which is why the row reads
 * the message from both shapes — the string case is the one that actually
 * happens.
 *
 * The action menu is permission-gated per entry, and the enable/disable pair is
 * gated separately from the switch in the Active column, so both are checked
 * against a restricted admin as well as an unrestricted one.
 */

const feature = (over = {}) => ({
  id: 'f1',
  name: 'Invoicing',
  dateAdded: '2026-01-01',
  managedBy: 'Admin',
  active: true,
  plans: ['Pro'],
  plan: ['Pro'],
  ...over,
});

const renderRow = (props = {}) =>
  render(
    <table>
      <tbody>
        <FeatureRow feature={feature()} groupTitle="Billing" {...props} />
      </tbody>
    </table>
  );

const openMenu = () => fireEvent.click(document.body.querySelector('.feature-action-icon'));
const dispatched = (type) => calls.filter((c) => c.type === type);

// An admin whose role grants exactly the listed permissions and nothing else.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'FEATURE_MANAGEMENT', permissions }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  Object.keys(responses).forEach((k) => delete responses[k]);
  Object.keys(modalProps).forEach((k) => delete modalProps[k]);
  delete state.authentication.user.role;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the row itself', () => {
  it('renders the feature it was given', () => {
    renderRow();
    expect(screen.getByText('Invoicing')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('says so when the feature is switched off', () => {
    renderRow({ feature: feature({ active: false }) });
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('tags the plans the feature belongs to', () => {
    renderRow({ feature: feature({ plans: ['Pro', 'Team Plus'] }) });
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Team Plus')).toBeInTheDocument();
    // The tag class is slugified from the plan name.
    expect(document.body.querySelector('.plan-tag-team-plus')).toBeInTheDocument();
  });

  it.each([
    ['an empty plan list', []],
    ['a plan list that is not a list', undefined],
  ])('marks %s as unassigned', (_case, plans) => {
    renderRow({ feature: feature({ plans }) });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(document.body.querySelector('.plan-tag-unassigned')).toBeInTheDocument();
  });
});

describe('the active switch', () => {
  it('offers a switch to an admin who may deactivate an active feature', () => {
    restrictTo(['deactivate_feature']);
    renderRow();
    expect(document.body.querySelector('input[type="checkbox"]')).toBeInTheDocument();
  });

  it('hides the switch from an admin who may only activate', () => {
    restrictTo(['activate_feature']);
    renderRow();
    expect(document.body.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('offers a switch to an admin who may activate an inactive feature', () => {
    restrictTo(['activate_feature']);
    renderRow({ feature: feature({ active: false }) });
    expect(document.body.querySelector('input[type="checkbox"]')).toBeInTheDocument();
  });

  it('opens the confirmation rather than toggling directly', async () => {
    renderRow();
    fireEvent.click(document.body.querySelector('input[type="checkbox"]'));
    await waitFor(() => expect(screen.getByTestId('toggle-open')).toBeInTheDocument());
    expect(dispatched('asyncEnableOrDisableFeature')).toHaveLength(0);
  });
});

describe('the action menu', () => {
  it('lists every action for an unrestricted admin', () => {
    renderRow();
    openMenu();
    ['Move to Feature Group', 'Edit Feature', 'Enable Feature', 'Disable Feature', 'Assign to Plan', 'Remove Feature']
      .forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('hides the gated entries from a restricted admin', () => {
    restrictTo(['view_feature']);
    renderRow();
    openMenu();
    expect(screen.getByText('Move to Feature Group')).toBeInTheDocument();
    expect(screen.getByText('Assign to Plan')).toBeInTheDocument();
    expect(screen.queryByText('Edit Feature')).not.toBeInTheDocument();
    expect(screen.queryByText('Enable Feature')).not.toBeInTheDocument();
    expect(screen.queryByText('Disable Feature')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove Feature')).not.toBeInTheDocument();
  });

  it('dims the enable entry on a feature that is already active', () => {
    renderRow();
    openMenu();
    expect(screen.getByText('Enable Feature').className).toContain('blurred');
    expect(screen.getByText('Disable Feature').className).not.toContain('blurred');
  });

  it('dims the disable entry on a feature that is already inactive', () => {
    renderRow({ feature: feature({ active: false }) });
    openMenu();
    expect(screen.getByText('Disable Feature').className).toContain('blurred');
  });

  it('closes when a click lands outside it', async () => {
    renderRow();
    openMenu();
    expect(screen.getByText('Assign to Plan')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText('Assign to Plan')).toBeNull());
  });

  it('stays open while a click lands inside it', () => {
    renderRow();
    openMenu();
    fireEvent.mouseDown(screen.getByText('Assign to Plan'));
    expect(screen.getByText('Assign to Plan')).toBeInTheDocument();
  });
});

describe('moving a feature to another group', () => {
  const open = async () => {
    renderRow();
    openMenu();
    fireEvent.click(screen.getByText('Move to Feature Group'));
    await waitFor(() => expect(screen.getByTestId('move-open')).toBeInTheDocument());
  };

  it('dispatches with the target group id and reloads', async () => {
    await open();
    await act(async () => {
      modalProps.move.onSave({ featureId: 'f1', toGroupTitle: 'Scheduling' });
    });

    expect(dispatched('asyncMoveFeatureToAnotherGroup')[0].payload).toEqual({
      id: 'f1',
      featureGroupId: 'g2',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(dispatched('asyncFetchAllFeatures')).toHaveLength(1);
    expect(showToast).toHaveBeenCalledWith(
      'Feature "Invoicing" moved to "Scheduling" successfully',
      'success'
    );
  });

  it('refuses a group it does not recognise', async () => {
    await open();
    await act(async () => {
      modalProps.move.onSave({ featureId: 'f1', toGroupTitle: 'Nowhere' });
    });
    expect(showToast).toHaveBeenCalledWith('Target group "Nowhere" not found', 'error');
    expect(dispatched('asyncMoveFeatureToAnotherGroup')).toHaveLength(0);
  });

  it('reports the backend message when the move is refused', async () => {
    responses.asyncMoveFeatureToAnotherGroup = 'group is full';
    await open();
    await act(async () => {
      modalProps.move.onSave({ featureId: 'f1', toGroupTitle: 'Scheduling' });
    });
    expect(showToast).toHaveBeenCalledWith('group is full', 'error');
  });

  it('falls back to its own wording when the rejection carries nothing', async () => {
    responses.asyncMoveFeatureToAnotherGroup = {};
    await open();
    await act(async () => {
      modalProps.move.onSave({ featureId: 'f1', toGroupTitle: 'Scheduling' });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to move feature', 'error');
  });

  it('reads a rejection delivered as an Error', async () => {
    responses.asyncMoveFeatureToAnotherGroup = new Error('boom');
    await open();
    await act(async () => {
      modalProps.move.onSave({ featureId: 'f1', toGroupTitle: 'Scheduling' });
    });
    expect(showToast).toHaveBeenCalledWith('boom', 'error');
  });
});

describe('toggling a feature', () => {
  const open = async () => {
    renderRow();
    openMenu();
    fireEvent.click(screen.getByText('Disable Feature'));
    await waitFor(() => expect(screen.getByTestId('toggle-open')).toBeInTheDocument());
  };

  it.each([
    [true, 'enabled'],
    [false, 'disabled'],
  ])('dispatches an active state of %s and says so', async (active, word) => {
    await open();
    await act(async () => { modalProps.toggle.onConfirm(active); });

    expect(dispatched('asyncEnableOrDisableFeature')[0].payload).toEqual({
      id: 'f1',
      active,
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      `Feature "Invoicing" ${word} successfully`,
      'success'
    );
  });

  it('reports a refused toggle', async () => {
    responses.asyncEnableOrDisableFeature = 'feature is locked';
    await open();
    await act(async () => { modalProps.toggle.onConfirm(false); });
    expect(showToast).toHaveBeenCalledWith('feature is locked', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncEnableOrDisableFeature = {};
    await open();
    await act(async () => { modalProps.toggle.onConfirm(false); });
    expect(showToast).toHaveBeenCalledWith('Failed to toggle feature', 'error');
  });
});

describe('assigning a feature to plans', () => {
  const open = async () => {
    renderRow();
    openMenu();
    fireEvent.click(screen.getByText('Assign to Plan'));
    await waitFor(() => expect(screen.getByTestId('assign-open')).toBeInTheDocument());
  };

  it('dispatches the chosen plans and reloads', async () => {
    await open();
    await act(async () => {
      modalProps.assign.onSave({ featureId: 'f1', plans: ['Pro', 'Team'] });
    });
    expect(dispatched('asyncAssignFeatureToPlan')[0].payload).toEqual({
      id: 'f1',
      applicablePlans: ['Pro', 'Team'],
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Feature "Invoicing" assigned to plan(s) successfully',
      'success'
    );
  });

  it('reports a refused assignment', async () => {
    responses.asyncAssignFeatureToPlan = 'plan not found';
    await open();
    await act(async () => {
      modalProps.assign.onSave({ featureId: 'f1', plans: [] });
    });
    expect(showToast).toHaveBeenCalledWith('plan not found', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncAssignFeatureToPlan = {};
    await open();
    await act(async () => {
      modalProps.assign.onSave({ featureId: 'f1', plans: [] });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to assign plans', 'error');
  });
});

describe('deleting a feature', () => {
  const open = async () => {
    renderRow();
    openMenu();
    fireEvent.click(screen.getByText('Remove Feature'));
    await waitFor(() => expect(screen.getByTestId('delete-open')).toBeInTheDocument());
  };

  it('dispatches with the administrative password and reloads', async () => {
    await open();
    await act(async () => {
      modalProps.delete.onConfirm({ featureId: 'f1', administratorPassword: 'letmein' });
    });
    expect(dispatched('asyncDeleteFeature')[0].payload).toEqual({
      id: 'f1',
      administratorPassword: 'letmein',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Feature "Invoicing" deleted successfully',
      'success'
    );
  });

  it('reports the backend reason a delete was refused', async () => {
    responses.asyncDeleteFeature = 'feature is in use by 3 plans';
    await open();
    await act(async () => {
      modalProps.delete.onConfirm({ featureId: 'f1', administratorPassword: 'x' });
    });
    expect(showToast).toHaveBeenCalledWith('feature is in use by 3 plans', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncDeleteFeature = {};
    await open();
    await act(async () => {
      modalProps.delete.onConfirm({ featureId: 'f1', administratorPassword: 'x' });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to delete feature', 'error');
  });
});

describe('editing a feature', () => {
  const open = async () => {
    renderRow();
    openMenu();
    fireEvent.click(screen.getByText('Edit Feature'));
    await waitFor(() => expect(screen.getByTestId('edit-open')).toBeInTheDocument());
  };

  it('dispatches everything the form changed', async () => {
    await open();
    await act(async () => {
      modalProps.edit.onSave({
        name: 'Invoicing v2',
        description: 'Now with taxes',
        active: false,
        plan: ['Team'],
        managedBy: 'Ops',
      });
    });
    expect(dispatched('asyncUpdateFeature')[0].payload).toEqual({
      id: 'f1',
      name: 'Invoicing v2',
      description: 'Now with taxes',
      active: false,
      applicablePlans: ['Team'],
      managedBy: 'Ops',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Feature "Invoicing v2" updated successfully',
      'success'
    );
  });

  it('keeps the feature values the form did not change', async () => {
    await open();
    await act(async () => {
      modalProps.edit.onSave({ name: 'Invoicing', active: true });
    });
    const { payload } = dispatched('asyncUpdateFeature')[0];
    expect(payload.description).toBe('');
    expect(payload.applicablePlans).toEqual(['Pro']);
    expect(payload.managedBy).toBe('Admin');
  });

  it('defaults the manager when neither the form nor the feature names one', async () => {
    renderRow({ feature: feature({ managedBy: null }) });
    openMenu();
    fireEvent.click(screen.getByText('Edit Feature'));
    await waitFor(() => expect(screen.getByTestId('edit-open')).toBeInTheDocument());
    await act(async () => {
      modalProps.edit.onSave({ name: 'Invoicing', active: true });
    });
    expect(dispatched('asyncUpdateFeature')[0].payload.managedBy).toBe('Admin');
  });

  it('reports a refused edit', async () => {
    responses.asyncUpdateFeature = 'name already taken';
    await open();
    await act(async () => {
      modalProps.edit.onSave({ name: 'Invoicing', active: true });
    });
    expect(showToast).toHaveBeenCalledWith('name already taken', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncUpdateFeature = {};
    await open();
    await act(async () => {
      modalProps.edit.onSave({ name: 'Invoicing', active: true });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to edit feature', 'error');
  });
});
