import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { modalProps } = vi.hoisted(() => ({ modalProps: {} }));
vi.mock('../Components/ReusableModal/NewPipelineColumnModal', () => ({
  default: (props) => {
    modalProps.current = props;
    return props.isOpen ? <div data-testid="stage-modal" /> : null;
  },
}));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import EmptyState from '../Components/JiraBoard/EmptyState';

/**
 * What the prospect board shows before any stage exists.
 *
 * The only branch here is the permission gate on the call to action: an admin
 * who may not create a stage still sees the explanation, but is not offered a
 * button that would fail. The dialog itself is covered by its own suite.
 */

const onAddFirstStage = vi.fn();

// An admin whose role grants exactly the listed permissions and nothing else.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'TENANTS', permissions }],
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  delete modalProps.current;
  delete state.authentication.user.role;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('what everyone sees', () => {
  it('explains what the board is for', () => {
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    expect(screen.getByText('Setup your onboarding pipeline')).toBeInTheDocument();
    expect(
      screen.getByText(/Set up custom stages to match your organization/)
    ).toBeInTheDocument();
  });
});

describe('the call to action', () => {
  it('is offered to an admin who may create a stage', () => {
    restrictTo(['create_pipeline_stage']);
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    expect(screen.getByText('Add a first stage')).toBeInTheDocument();
  });

  it('is offered to an unrestricted admin', () => {
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    expect(screen.getByText('Add a first stage')).toBeInTheDocument();
  });

  it('is withheld from an admin who may not', () => {
    restrictTo(['view_pipeline']);
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    expect(screen.queryByText('Add a first stage')).not.toBeInTheDocument();
    // The explanation stays either way.
    expect(screen.getByText('Setup your onboarding pipeline')).toBeInTheDocument();
  });
});

describe('creating the first stage', () => {
  it('opens the dialog closed and leaves it that way until asked', () => {
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    expect(screen.queryByTestId('stage-modal')).not.toBeInTheDocument();
  });

  it('opens the dialog from the button', async () => {
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    fireEvent.click(screen.getByText('Add a first stage'));
    await waitFor(() => expect(screen.getByTestId('stage-modal')).toBeInTheDocument());
  });

  it('hands the dialog straight through to the board', async () => {
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    fireEvent.click(screen.getByText('Add a first stage'));
    await waitFor(() => expect(screen.getByTestId('stage-modal')).toBeInTheDocument());
    expect(modalProps.current.onSave).toBe(onAddFirstStage);
  });

  it('closes the dialog again', async () => {
    render(<EmptyState onAddFirstStage={onAddFirstStage} />);
    fireEvent.click(screen.getByText('Add a first stage'));
    await waitFor(() => expect(screen.getByTestId('stage-modal')).toBeInTheDocument());
    modalProps.current.onClose();
    await waitFor(() => expect(screen.queryByTestId('stage-modal')).toBeNull());
  });
});
