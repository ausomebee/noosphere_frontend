import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

// Every thunk is a tagged action creator so a dispatch can be recognised by
// name, and any single one can be made to fail for one test.
const { thunks, calls, responses } = vi.hoisted(() => {
  const NAMES = [
    'asyncCreateFeatureGroup',
    'asyncUpdateFeatureGroup',
    'asyncDeleteFeatureGroup',
    'asyncCreateFeature',
    'asyncFetchAllFeatureGroups',
    'asyncFetchAllFeatures',
  ];
  return {
    thunks: Object.fromEntries(
      NAMES.map((name) => [name, (payload) => ({ type: name, payload })])
    ),
    calls: [],
    responses: {},
  };
});
vi.mock('../ReduxStore/features/featureManagementSlice', () => thunks);

const { modalProps, stubModal } = vi.hoisted(() => {
  const modalProps = {};
  const stubModal = (name) => ({
    default: (props) => {
      modalProps[name] = props;
      return props.isOpen ? <div data-testid={`${name}-open`}>{props.children}</div> : null;
    },
  });
  return { modalProps, stubModal };
});
vi.mock('../Components/ReusableModal/CreateFeatureGroupModal', () => stubModal('createGroup'));
vi.mock('../Components/ReusableModal/EditFeatureGroupModal', () => stubModal('editGroup'));
vi.mock('../Components/ReusableModal/SecondDeleteConfirmationModal', () => stubModal('deleteGroup'));
vi.mock('../Components/ReusableModal/AddNewFeatureModal', () => stubModal('createFeature'));

// The board passes each group's title down, not the group object itself.
vi.mock('../Pages/FeatureManagement/FeatureSubComps/FeatureGroup', () => ({
  default: (props) => {
    modalProps.lastGroup = props;
    return <div data-testid="group">{props.title}</div>;
  },
}));
vi.mock('../Pages/FeatureManagement/FeatureSubComps/FeatureUsageStatistic', () => ({
  default: (props) => {
    modalProps.statistics = props;
    return <div data-testid="statistics">{props.featureName}</div>;
  },
}));

const dispatch = vi.fn((action) => {
  calls.push(action);
  const failure = responses[action.type];
  const promise = failure ? Promise.reject(failure) : Promise.resolve({ ok: true });
  promise.unwrap = () => promise;
  promise.catch(() => {});
  return promise;
});

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
  featureManagement: { featureGroups: [], loading: false },
};

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(state),
}));

import FeatureManagement from '../Pages/FeatureManagement/FeatureManagement';

/**
 * The feature-management board.
 *
 * Its four group-level actions all follow one shape: look the group up by its
 * *title* rather than its id, dispatch, refetch, then close and confirm. The
 * lookup is the interesting part — a title the store does not know about makes
 * the whole handler a silent no-op, with no toast and no request, which is
 * pinned below for each action.
 *
 * The board also swaps itself out for a usage-statistics view, and that choice
 * is remembered in sessionStorage, so each test starts from a cleared store.
 */

const groups = [
  { id: 'g1', title: 'Billing' },
  { id: 'g2', title: 'Scheduling' },
];

const dispatched = (type) => calls.filter((c) => c.type === type);
const openHeaderMenu = () => fireEvent.click(screen.getByText('Manage Features'));

// An admin whose role grants exactly the listed permissions and nothing else.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'FEATURE_MANAGEMENT', permissions }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  sessionStorage.clear();
  Object.keys(responses).forEach((k) => delete responses[k]);
  Object.keys(modalProps).forEach((k) => delete modalProps[k]);
  delete state.authentication.user.role;
  state.featureManagement = { featureGroups: groups, loading: false };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('opening the board', () => {
  it('loads the groups and their features', () => {
    render(<FeatureManagement />);
    expect(dispatched('asyncFetchAllFeatureGroups')[0].payload).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(dispatched('asyncFetchAllFeatures')).toHaveLength(1);
  });

  it('renders a card per group', () => {
    render(<FeatureManagement />);
    const cards = screen.getAllByTestId('group');
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.textContent)).toEqual(['Billing', 'Scheduling']);
  });

  it('hands each group a way back to the statistics view', async () => {
    render(<FeatureManagement />);
    await act(async () => {
      modalProps.lastGroup.onViewStatistics({
        featureId: 'f1',
        featureName: 'Invoicing',
        groupTitle: 'Scheduling',
      });
    });
    await waitFor(() => expect(screen.getByTestId('statistics')).toBeInTheDocument());
    expect(screen.getByTestId('statistics').textContent).toBe('Invoicing');

    // And back again, which clears the feature it was showing.
    await act(async () => { modalProps.statistics.onBack(); });
    await waitFor(() => expect(screen.queryByTestId('statistics')).toBeNull());
    expect(screen.getByText('Feature Management')).toBeInTheDocument();
  });

  it('shows a loader while the first load is still running', () => {
    state.featureManagement = { featureGroups: [], loading: true };
    render(<FeatureManagement />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
  });

  it('keeps the groups on screen while a later load runs', () => {
    state.featureManagement = { featureGroups: groups, loading: true };
    render(<FeatureManagement />);
    expect(screen.getAllByTestId('group')).toHaveLength(2);
  });

  it('turns an admin without the module away', () => {
    restrictTo(['something_else']);
    render(<FeatureManagement />);
    expect(screen.queryByText('Feature Management')).not.toBeInTheDocument();
  });
});

describe('the header menu', () => {
  it('lists every action for an unrestricted admin', () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    ['Add New Feature Group', 'Add New Feature', 'Edit Feature Group', 'Remove Feature Group']
      .forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it('hides the create entries from an admin who may not create', () => {
    restrictTo(['view_features', 'edit_feature', 'delete_feature']);
    render(<FeatureManagement />);
    openHeaderMenu();
    expect(screen.queryByText('Add New Feature Group')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Feature Group')).toBeInTheDocument();
  });

  it('hides the edit and delete entries from an admin who may only create', () => {
    restrictTo(['view_features', 'create_feature']);
    render(<FeatureManagement />);
    openHeaderMenu();
    expect(screen.getByText('Add New Feature Group')).toBeInTheDocument();
    expect(screen.queryByText('Edit Feature Group')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove Feature Group')).not.toBeInTheDocument();
  });

  it('greys the edit and delete entries when there are no groups yet', () => {
    state.featureManagement = { featureGroups: [], loading: false };
    render(<FeatureManagement />);
    openHeaderMenu();
    expect(screen.getByText('Edit Feature Group')).toBeDisabled();
    expect(screen.getByText('Remove Feature Group')).toBeDisabled();
  });

  it('closes when a click lands outside it', async () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    expect(screen.getByText('Add New Feature')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText('Add New Feature')).toBeNull());
  });

  it('stays open while a click lands inside it', () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    fireEvent.mouseDown(screen.getByText('Add New Feature'));
    expect(screen.getByText('Add New Feature')).toBeInTheDocument();
  });

  it('toggles shut on a second click of its own button', () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    openHeaderMenu();
    expect(screen.queryByText('Add New Feature')).not.toBeInTheDocument();
  });
});

describe('creating a feature group', () => {
  const open = async () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    fireEvent.click(screen.getByText('Add New Feature Group'));
    await waitFor(() => expect(screen.getByTestId('createGroup-open')).toBeInTheDocument());
  };

  it('dispatches the title and reloads', async () => {
    await open();
    await act(async () => { modalProps.createGroup.onSave({ title: 'Reporting' }); });

    expect(dispatched('asyncCreateFeatureGroup')[0].payload).toEqual({
      name: 'Reporting',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Feature group "Reporting" created successfully',
      'success'
    );
  });

  it('reports the backend reason it was refused', async () => {
    responses.asyncCreateFeatureGroup = 'name already taken';
    await open();
    await act(async () => { modalProps.createGroup.onSave({ title: 'Reporting' }); });
    expect(showToast).toHaveBeenCalledWith('name already taken', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncCreateFeatureGroup = {};
    await open();
    await act(async () => { modalProps.createGroup.onSave({ title: 'Reporting' }); });
    expect(showToast).toHaveBeenCalledWith('Failed to create feature group', 'error');
  });

  it('closes without dispatching anything', async () => {
    await open();
    act(() => modalProps.createGroup.onClose());
    await waitFor(() => expect(screen.queryByTestId('createGroup-open')).toBeNull());
    expect(dispatched('asyncCreateFeatureGroup')).toHaveLength(0);
  });
});

describe('renaming a feature group', () => {
  const open = async () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    fireEvent.click(screen.getByText('Edit Feature Group'));
    await waitFor(() => expect(screen.getByTestId('editGroup-open')).toBeInTheDocument());
  };

  it('looks the group up by title and dispatches its id', async () => {
    await open();
    await act(async () => {
      modalProps.editGroup.onSave({ oldTitle: 'Billing', newTitle: 'Invoicing' });
    });
    expect(dispatched('asyncUpdateFeatureGroup')[0].payload).toEqual(
      expect.objectContaining({ id: 'g1', name: 'Invoicing' })
    );
    expect(showToast).toHaveBeenCalledWith(
      'Feature group updated to "Invoicing" successfully',
      'success'
    );
  });

  it('does nothing at all for a title it does not recognise', async () => {
    await open();
    await act(async () => {
      modalProps.editGroup.onSave({ oldTitle: 'Nowhere', newTitle: 'Invoicing' });
    });
    expect(dispatched('asyncUpdateFeatureGroup')).toHaveLength(0);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('reports the backend reason it was refused', async () => {
    responses.asyncUpdateFeatureGroup = 'group is locked';
    await open();
    await act(async () => {
      modalProps.editGroup.onSave({ oldTitle: 'Billing', newTitle: 'Invoicing' });
    });
    expect(showToast).toHaveBeenCalledWith('group is locked', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncUpdateFeatureGroup = {};
    await open();
    await act(async () => {
      modalProps.editGroup.onSave({ oldTitle: 'Billing', newTitle: 'Invoicing' });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to update feature group', 'error');
  });
});

describe('deleting a feature group', () => {
  const open = async () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    fireEvent.click(screen.getByText('Remove Feature Group'));
    await waitFor(() => expect(screen.getByTestId('deleteGroup-open')).toBeInTheDocument());
  };

  it('dispatches the group id and the administrative password', async () => {
    await open();
    await act(async () => {
      modalProps.deleteGroup.onConfirm({
        selectedGroup: 'Scheduling',
        administratorPassword: 'letmein',
      });
    });
    expect(dispatched('asyncDeleteFeatureGroup')[0].payload).toEqual(
      expect.objectContaining({ id: 'g2', administratorPassword: 'letmein' })
    );
    expect(showToast).toHaveBeenCalledWith(
      'Feature group "Scheduling" deleted successfully',
      'success'
    );
  });

  it('does nothing at all for a group it does not recognise', async () => {
    await open();
    await act(async () => {
      modalProps.deleteGroup.onConfirm({ selectedGroup: 'Nowhere', administratorPassword: 'x' });
    });
    expect(dispatched('asyncDeleteFeatureGroup')).toHaveLength(0);
  });

  it('reports the backend reason it was refused', async () => {
    responses.asyncDeleteFeatureGroup = 'group still has features';
    await open();
    await act(async () => {
      modalProps.deleteGroup.onConfirm({ selectedGroup: 'Billing', administratorPassword: 'x' });
    });
    expect(showToast).toHaveBeenCalledWith('group still has features', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncDeleteFeatureGroup = {};
    await open();
    await act(async () => {
      modalProps.deleteGroup.onConfirm({ selectedGroup: 'Billing', administratorPassword: 'x' });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to delete feature group', 'error');
  });
});

describe('creating a feature', () => {
  const open = async () => {
    render(<FeatureManagement />);
    openHeaderMenu();
    fireEvent.click(screen.getByText('Add New Feature'));
    await waitFor(() => expect(screen.getByTestId('createFeature-open')).toBeInTheDocument());
  };

  it('dispatches everything the form supplied', async () => {
    await open();
    await act(async () => {
      modalProps.createFeature.onSave({
        groupTitle: 'Billing',
        feature: {
          name: 'Invoicing',
          description: 'Send invoices',
          active: true,
          plan: ['Pro'],
          managedBy: 'Ops',
        },
      });
    });
    expect(dispatched('asyncCreateFeature')[0].payload).toEqual({
      featureGroupId: 'g1',
      name: 'Invoicing',
      description: 'Send invoices',
      active: true,
      applicablePlans: ['Pro'],
      managedBy: 'Ops',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Feature "Invoicing" created successfully',
      'success'
    );
  });

  it('fills in the defaults the form left out', async () => {
    await open();
    await act(async () => {
      modalProps.createFeature.onSave({
        groupTitle: 'Billing',
        feature: { name: 'Invoicing' },
      });
    });
    const { payload } = dispatched('asyncCreateFeature')[0];
    expect(payload.description).toBe('');
    expect(payload.applicablePlans).toEqual(['Basic']);
    expect(payload.managedBy).toBe('Admin');
    // `feature.active || true` can only ever be true, so a feature created as
    // inactive is still sent as active.
    expect(payload.active).toBe(true);
  });

  it('still sends an inactive feature as active', async () => {
    await open();
    await act(async () => {
      modalProps.createFeature.onSave({
        groupTitle: 'Billing',
        feature: { name: 'Invoicing', active: false },
      });
    });
    expect(dispatched('asyncCreateFeature')[0].payload.active).toBe(true);
  });

  it('does nothing at all for a group it does not recognise', async () => {
    await open();
    await act(async () => {
      modalProps.createFeature.onSave({
        groupTitle: 'Nowhere',
        feature: { name: 'Invoicing' },
      });
    });
    expect(dispatched('asyncCreateFeature')).toHaveLength(0);
  });

  it('reports the backend reason it was refused', async () => {
    responses.asyncCreateFeature = 'duplicate feature';
    await open();
    await act(async () => {
      modalProps.createFeature.onSave({
        groupTitle: 'Billing',
        feature: { name: 'Invoicing' },
      });
    });
    expect(showToast).toHaveBeenCalledWith('duplicate feature', 'error');
  });

  it('falls back to its own wording', async () => {
    responses.asyncCreateFeature = {};
    await open();
    await act(async () => {
      modalProps.createFeature.onSave({
        groupTitle: 'Billing',
        feature: { name: 'Invoicing' },
      });
    });
    expect(showToast).toHaveBeenCalledWith('Failed to create feature', 'error');
  });
});

describe('a session with no tokens yet', () => {
  it('fetches nothing until the tokens are in the store', () => {
    const { accessToken, refreshToken } = state.authentication;
    state.authentication.accessToken = null;
    state.authentication.refreshToken = null;
    try {
      render(<FeatureManagement />);
      expect(dispatched('asyncFetchAllFeatureGroups')).toHaveLength(0);
      expect(dispatched('asyncFetchAllFeatures')).toHaveLength(0);
    } finally {
      Object.assign(state.authentication, { accessToken, refreshToken });
    }
  });
});
