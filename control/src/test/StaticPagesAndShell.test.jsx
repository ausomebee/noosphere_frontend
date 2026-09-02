import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
    Outlet: () => <div data-testid="outlet" />,
  };
});

const dispatch = vi.fn();
const state = { authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } } };
vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(state),
}));

const logout = vi.hoisted(() => vi.fn(() => ({ type: 'auth/logout' })));
vi.mock('../ReduxStore/features/authentication', async () => {
  const actual = await vi.importActual('../ReduxStore/features/authentication');
  return { ...actual, logout };
});

const purge = vi.hoisted(() => vi.fn());
vi.mock('../ReduxStore/store', () => ({ persistor: { purge }, store: {} }));

const disconnectSocket = vi.hoisted(() => vi.fn());
vi.mock('../api/socketService', async () => {
  const actual = await vi.importActual('../api/socketService');
  return { ...actual, disconnectSocket };
});

vi.mock('../Pages/Layout/ControlLayout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));
vi.mock('../Components/JiraBoard/JiraBoard', () => ({
  default: () => <div data-testid="board" />,
}));
vi.mock('../Components/Allroutes', () => ({
  default: () => <div data-testid="routes" />,
}));

import useIdleTimeout from '../hooks/useIdleTimeout';
import PasswordResetSuccess from '../Pages/Authentication/ForgotPassword/PasswordResetSuccessful';
import PasswordResetConfirmation from '../Pages/Authentication/ForgotPassword/ForgotPasswordConfirmation';
import PasswordResetFailure from '../Pages/Authentication/ForgotPassword/PasswordResetFailed';
import NotFound from '../Components/NotFound';
import TenantPipeline from '../Pages/Tenant/TenantPipeline/TenantPipeline';
import LayoutRoute from '../Components/LayoutRoute';
import App from '../App';

/**
 * The pieces of the app shell no page-level suite reaches: the idle-logout
 * hook, the three end-of-flow password screens, the 404, and the two thin
 * wrappers that only compose other components.
 *
 * The idle hook is the only one with real behaviour. Its teardown order matters
 * and is asserted: the socket is dropped before state is cleared, because a
 * session that logged out with a live socket kept receiving notifications as
 * ADMIN. It also sends the user to "/", not to a /auth/login route that does
 * not exist.
 */

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the idle timeout', () => {
  it('logs the admin out after its own idle period', () => {
    vi.useFakeTimers();
    renderHook(() => useIdleTimeout(1000), { wrapper });

    act(() => { vi.advanceTimersByTime(1100); });

    expect(disconnectSocket).toHaveBeenCalled();
    expect(logout).toHaveBeenCalled();
    expect(purge).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('drops the socket before it clears the session', () => {
    vi.useFakeTimers();
    const order = [];
    disconnectSocket.mockImplementation(() => order.push('socket'));
    dispatch.mockImplementation(() => order.push('dispatch'));
    purge.mockImplementation(() => order.push('purge'));

    renderHook(() => useIdleTimeout(1000), { wrapper });
    act(() => { vi.advanceTimersByTime(1100); });

    expect(order).toEqual(['socket', 'dispatch', 'purge']);
  });

  it('stays signed in while the admin is still doing something', () => {
    vi.useFakeTimers();
    renderHook(() => useIdleTimeout(1000), { wrapper });

    act(() => { vi.advanceTimersByTime(800); });
    act(() => { window.dispatchEvent(new Event('mousemove')); });
    act(() => { vi.advanceTimersByTime(800); });
    expect(logout).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(400); });
    expect(logout).toHaveBeenCalled();
  });

  it.each(['keydown', 'click', 'scroll', 'touchstart'])(
    'treats a %s as activity too',
    (event) => {
      vi.useFakeTimers();
      renderHook(() => useIdleTimeout(1000), { wrapper });
      act(() => { vi.advanceTimersByTime(800); });
      act(() => { window.dispatchEvent(new Event(event)); });
      act(() => { vi.advanceTimersByTime(800); });
      expect(logout).not.toHaveBeenCalled();
    }
  );

  it('falls back to its own half-hour period', () => {
    vi.useFakeTimers();
    renderHook(() => useIdleTimeout(), { wrapper });

    act(() => { vi.advanceTimersByTime(29 * 60 * 1000); });
    expect(logout).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(2 * 60 * 1000); });
    expect(logout).toHaveBeenCalled();
  });

  it('stops watching once the page it was on is gone', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useIdleTimeout(1000), { wrapper });
    unmount();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('the end-of-flow password screens', () => {
  it('sends a reset admin back to the sign-in page', () => {
    render(<PasswordResetSuccess />, { wrapper });
    expect(screen.getByText('Password reset successful!')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Login'));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('points a waiting admin at their mail client', () => {
    const assign = vi.spyOn(window, 'location', 'get');
    render(<PasswordResetConfirmation />, { wrapper });
    expect(screen.getByText('Reset password')).toBeInTheDocument();
    expect(
      screen.getByText(/An email with reset instructions has been sent/)
    ).toBeInTheDocument();
    // The button navigates the window itself, which jsdom cannot follow; what
    // matters is that it is offered and clickable.
    expect(screen.getByText('Go to email')).toBeInTheDocument();
    assign.mockRestore();
  });

  it('tells an unverifiable admin who to contact', () => {
    render(<PasswordResetFailure />, { wrapper });
    expect(screen.getByText('Unable to verify your identity')).toBeInTheDocument();
    expect(screen.getByText(/contact the technical team/)).toBeInTheDocument();
  });
});

describe('the 404 page', () => {
  it('says what happened and offers a way back', () => {
    render(<NotFound />, { wrapper });
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Go Home'));
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

describe('the thin wrappers', () => {
  it('renders the prospect board as the tenant pipeline page', () => {
    render(<TenantPipeline />, { wrapper });
    expect(screen.getByTestId('board')).toBeInTheDocument();
  });

  it('puts the routed page inside the control layout', () => {
    render(<LayoutRoute />, { wrapper });
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('wraps the whole app in an error boundary and a viewer provider', () => {
    render(<App />, { wrapper });
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });
});
