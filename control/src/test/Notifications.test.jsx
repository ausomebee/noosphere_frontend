import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The admin notification centre: one fetch, a live socket feed on top of it,
 * date grouping, client-side paging and read-state tracking.
 *
 * Every card is built from optional fields, so the fixtures vary one key at a
 * time -- a notification with no title, one with `body` instead of `content`,
 * one whose `createdAt` is unparseable -- rather than describing a realistic
 * feed. Timestamps are written as offsets from now because both the relative
 * time and the date grouping are computed against the clock.
 *
 * The socket is mocked down to a captured callback: `mocks.push` is whatever
 * the page registered with `onNotification`, which is the only way to exercise
 * the live-update path.
 */

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: {},
  api: { getNotifications: vi.fn(), markNotificationRead: vi.fn() },
  push: null,
  unsub: vi.fn(),
  action: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../hooks/useAuth', () => ({ default: () => mocks.auth }));
vi.mock('../api/notificationApi', () => ({ default: mocks.api }));
vi.mock('../api/socketService', () => ({
  onNotification: (cb) => {
    mocks.push = cb;
    return mocks.unsub;
  },
}));
vi.mock('../Data/notificationConfig', () => ({
  getNotificationAction: (...a) => mocks.action(...a),
}));

import Notifications from '../Pages/Notifications/Notifications';

const minutesAgo = (n) => new Date(Date.now() - n * 60_000).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const notif = (over = {}) => ({
  id: over.id ?? 'n1',
  type: 'SYSTEM',
  title: 'Something happened',
  content: 'Details here',
  createdAt: minutesAgo(1),
  isRead: false,
  ...over,
});

const renderPage = async (list = [notif()]) => {
  if (list instanceof Error) {
    mocks.api.getNotifications.mockRejectedValue(list);
  } else if (!Array.isArray(list) && list !== null && typeof list === 'object' && 'raw' in list) {
    // `raw` lets a test hand back a response envelope of its own shape.
    mocks.api.getNotifications.mockResolvedValue(list.raw);
  } else {
    mocks.api.getNotifications.mockResolvedValue({ data: { data: list } });
  }
  const view = render(<Notifications />);
  await act(async () => {});
  return view;
};

const cards = () => Array.from(document.body.querySelectorAll('.ctrl-notification-card'));
const groupLabels = () =>
  Array.from(document.body.querySelectorAll('.ctrl-notifications-group-label')).map(
    (h) => h.textContent
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.push = null;
  mocks.auth = { userId: 'u1', accessToken: 'token', refreshToken: 'refresh' };
  mocks.action.mockReturnValue(null);
  mocks.api.markNotificationRead.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the feed', () => {
  it('shows a loader until the fetch settles', () => {
    mocks.api.getNotifications.mockReturnValue(new Promise(() => {}));
    render(<Notifications />);
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
  });

  it('titles the page', async () => {
    await renderPage();
    expect(document.title).toBe('Notifications | Noosphere');
  });

  it('renders a card per notification', async () => {
    await renderPage([notif({ id: 'a' }), notif({ id: 'b' })]);
    expect(cards()).toHaveLength(2);
  });

  it('reads a response whose data is the list itself', async () => {
    await renderPage({ raw: { data: [notif({ id: 'a' })] } });
    expect(cards()).toHaveLength(1);
  });

  it('reads a response that is the bare list', async () => {
    await renderPage({ raw: [notif({ id: 'a' }), notif({ id: 'b' })] });
    expect(cards()).toHaveLength(2);
  });

  it('unwraps items delivered inside a notification envelope', async () => {
    await renderPage([{ notification: notif({ id: 'a', title: 'Wrapped' }) }]);
    expect(screen.getByText('Wrapped')).toBeInTheDocument();
  });

  it('treats a non-list payload as an empty feed', async () => {
    await renderPage({ raw: { data: { data: { nope: true } } } });
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('treats a null response as an empty feed', async () => {
    await renderPage({ raw: null });
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('shows the empty state when the fetch fails', async () => {
    await renderPage(new Error('offline'));
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('does not fetch before the store knows who is signed in', async () => {
    mocks.auth = { accessToken: 'token' };
    render(<Notifications />);
    await act(async () => {});
    expect(mocks.api.getNotifications).not.toHaveBeenCalled();
  });

  it('does not fetch without an access token', async () => {
    mocks.auth = { userId: 'u1' };
    render(<Notifications />);
    await act(async () => {});
    expect(mocks.api.getNotifications).not.toHaveBeenCalled();
  });
});

describe('a notification card', () => {
  it('falls back to a generic title', async () => {
    await renderPage([notif({ title: undefined })]);
    expect(screen.getByText('Notification')).toBeInTheDocument();
  });

  it('prefers content, then description, then body for the summary', async () => {
    await renderPage([
      notif({ id: 'a', content: 'From content' }),
      notif({ id: 'b', content: undefined, description: 'From description' }),
      notif({ id: 'c', content: undefined, description: undefined, body: 'From body' }),
    ]);
    expect(screen.getByText('From content')).toBeInTheDocument();
    expect(screen.getByText('From description')).toBeInTheDocument();
    expect(screen.getByText('From body')).toBeInTheDocument();
  });

  it('leaves the summary blank when the notification carries no text', async () => {
    await renderPage([notif({ content: undefined })]);
    expect(document.body.querySelector('.ctrl-notification-card-desc').textContent).toBe('');
  });

  it('marks an unread card', async () => {
    await renderPage([notif({ id: 'a', isRead: false }), notif({ id: 'b', isRead: true })]);
    expect(cards()[0].className).toContain('unread');
    expect(cards()[1].className).not.toContain('unread');
  });

  it('labels the action from the config, or generically without one', async () => {
    mocks.action.mockImplementation((n) => (n.id === 'a' ? { label: 'Open invoice' } : null));
    await renderPage([notif({ id: 'a' }), notif({ id: 'b' })]);
    expect(screen.getByText('Open invoice')).toBeInTheDocument();
    expect(screen.getByText('View details')).toBeInTheDocument();
  });
});

describe('the type icon', () => {
  const iconClassOf = (index) =>
    cards()[index].querySelector('.ctrl-notification-icon').className;

  it('picks an icon per notification domain', async () => {
    // The page sorts by createdAt descending, and `notif` stamps each fixture
    // with its own `Date.now()`. Ten of those only land in the same millisecond
    // on a fast machine; one explicit timestamp is what actually makes the sort
    // stable, so the order below is the fixture order everywhere.
    const at = minutesAgo(1);
    await renderPage([
      notif({ id: 'a', type: 'PAYMENT_RECEIVED', createdAt: at }),
      notif({ id: 'b', type: 'PRODUCT_ACCESS_GRANTED', createdAt: at }),
      notif({ id: 'c', type: 'TENANT_CREATED', createdAt: at }),
      notif({ id: 'd', type: 'PLAN_UPDATED', createdAt: at }),
      notif({ id: 'e', type: 'SUBSCRIPTION_EXPIRING', createdAt: at }),
      notif({ id: 'f', type: 'ISSUE_RESOLVED', createdAt: at }),
      notif({ id: 'g', type: 'SUBSCRIPTION_AUTO_RENEWED', createdAt: at }),
      notif({ id: 'h', type: 'ISSUE_RAISED', createdAt: at }),
      notif({ id: 'i', type: 'ANYTHING_ELSE', createdAt: at }),
      notif({ id: 'j', type: undefined, createdAt: at }),
    ]);
    const keys = cards().map(
      (c) =>
        c
          .querySelector('.ctrl-notification-icon')
          .className.match(/ctrl-notification-icon-(\w+)/)[1]
    );
    expect(keys).toEqual([
      'payment',
      'payment',
      'tenant',
      'plan',
      'subscription',
      'success',
      'subscription',
      'issue',
      'system',
      'system',
    ]);
    expect(iconClassOf(0)).toContain('ctrl-notification-icon-payment');
  });
});

describe('relative timestamps', () => {
  const timeOf = (index) =>
    cards()[index].querySelector('.ctrl-notification-card-time').textContent;

  it('describes seconds, minutes, hours and days in words', async () => {
    await renderPage([
      notif({ id: 'a', createdAt: new Date().toISOString() }),
      notif({ id: 'b', createdAt: minutesAgo(1) }),
      notif({ id: 'c', createdAt: minutesAgo(20) }),
      notif({ id: 'd', createdAt: minutesAgo(60) }),
      notif({ id: 'e', createdAt: minutesAgo(60 * 5) }),
      notif({ id: 'f', createdAt: daysAgo(1) }),
      notif({ id: 'g', createdAt: daysAgo(3) }),
    ]);
    // Newest first, so the fixture order is preserved.
    expect(timeOf(0)).toBe('just now');
    expect(timeOf(1)).toBe('1 minute ago');
    expect(timeOf(2)).toBe('20 minutes ago');
    expect(timeOf(3)).toBe('1 hour ago');
    expect(timeOf(4)).toBe('5 hours ago');
    expect(timeOf(5)).toBe('1 day ago');
    expect(timeOf(6)).toBe('3 days ago');
  });

  it('falls back to a calendar date beyond a week', async () => {
    await renderPage([notif({ createdAt: daysAgo(30) })]);
    expect(timeOf(0)).toMatch(/\d{4}/);
  });

  it('shows nothing for a missing or unparseable timestamp', async () => {
    await renderPage([
      notif({ id: 'a', createdAt: undefined }),
      notif({ id: 'b', createdAt: 'not-a-date' }),
    ]);
    expect(timeOf(0)).toBe('');
    expect(timeOf(1)).toBe('');
  });
});

describe('date grouping', () => {
  it('separates today from yesterday and from older days', async () => {
    await renderPage([
      notif({ id: 'a', createdAt: minutesAgo(5) }),
      notif({ id: 'b', createdAt: daysAgo(1) }),
      notif({ id: 'c', createdAt: daysAgo(4) }),
    ]);
    const labels = groupLabels();
    expect(labels[0]).toBe('Today');
    expect(labels[1]).toBe('Yesterday');
    expect(labels[2]).not.toBe('Yesterday');
    expect(labels).toHaveLength(3);
  });

  it('files undated and unparseable notifications under Earlier', async () => {
    await renderPage([
      notif({ id: 'a', createdAt: undefined }),
      notif({ id: 'b', createdAt: 'garbage' }),
    ]);
    expect(groupLabels()).toEqual(['Earlier']);
    expect(cards()).toHaveLength(2);
  });
});

describe('read state', () => {
  it('counts the unread and offers to clear them all', async () => {
    await renderPage([notif({ id: 'a' }), notif({ id: 'b', isRead: true })]);
    expect(document.body.querySelector('.ctrl-notifications-count').textContent).toBe('1');
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
  });

  it('hides the count and the bulk action when nothing is unread', async () => {
    await renderPage([notif({ isRead: true })]);
    expect(document.body.querySelector('.ctrl-notifications-count')).toBeNull();
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
  });

  it('marks a card read the moment its action is used', async () => {
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      fireEvent.click(screen.getByText('View details'));
    });
    expect(mocks.api.markNotificationRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' })
    );
    expect(cards()[0].className).not.toContain('unread');
  });

  it('does not re-mark a card that was already read', async () => {
    await renderPage([notif({ id: 'a', isRead: true })]);
    await act(async () => {
      fireEvent.click(screen.getByText('View details'));
    });
    expect(mocks.api.markNotificationRead).not.toHaveBeenCalled();
  });

  it('keeps the optimistic update when the server rejects it', async () => {
    mocks.api.markNotificationRead.mockRejectedValue(new Error('500'));
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      fireEvent.click(screen.getByText('View details'));
    });
    expect(cards()[0].className).not.toContain('unread');
  });

  it('clears every unread card and refetches', async () => {
    await renderPage([notif({ id: 'a' }), notif({ id: 'b' }), notif({ id: 'c', isRead: true })]);
    await act(async () => {
      fireEvent.click(screen.getByText('Mark all as read'));
    });
    expect(mocks.api.markNotificationRead).toHaveBeenCalledTimes(2);
    expect(mocks.api.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('still refetches when individual writes fail', async () => {
    mocks.api.markNotificationRead.mockRejectedValue(new Error('500'));
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      fireEvent.click(screen.getByText('Mark all as read'));
    });
    expect(mocks.api.getNotifications).toHaveBeenCalledTimes(2);
  });
});

describe('the primary action', () => {
  it('navigates to the mapped destination', async () => {
    mocks.action.mockReturnValue({ label: 'Open invoice', path: '/billing-payments/invoice-payments' });
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      fireEvent.click(screen.getByText('Open invoice'));
    });
    expect(mocks.navigate).toHaveBeenCalledWith('/billing-payments/invoice-payments', undefined);
  });

  it('carries router state through when the mapping supplies it', async () => {
    mocks.action.mockReturnValue({ label: 'Open issue', path: '/issues', state: { id: 'i1' } });
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      fireEvent.click(screen.getByText('Open issue'));
    });
    expect(mocks.navigate).toHaveBeenCalledWith('/issues', { state: { id: 'i1' } });
  });

  it('stays put when the notification maps to no destination', async () => {
    mocks.action.mockReturnValue({ label: 'Nowhere' });
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      fireEvent.click(screen.getByText('Nowhere'));
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

describe('the live socket feed', () => {
  it('prepends a notification that arrives while the page is open', async () => {
    await renderPage([notif({ id: 'a', title: 'Old news' })]);
    await act(async () => {
      mocks.push(notif({ id: 'b', title: 'Breaking', createdAt: new Date().toISOString() }));
    });
    expect(screen.getByText('Breaking')).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
  });

  it('accepts a push wrapped in a notification envelope', async () => {
    await renderPage([]);
    await act(async () => {
      mocks.push({ notification: notif({ id: 'b', title: 'Wrapped push' }) });
    });
    expect(screen.getByText('Wrapped push')).toBeInTheDocument();
  });

  it('merges a push that updates a notification already on screen', async () => {
    await renderPage([notif({ id: 'a', title: 'Draft', isRead: false })]);
    await act(async () => {
      mocks.push(notif({ id: 'a', title: 'Final', isRead: true }));
    });
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
    expect(cards()[0].className).not.toContain('unread');
  });

  it('appends a push with no id rather than trying to match one', async () => {
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      mocks.push({ title: 'Anonymous', createdAt: new Date().toISOString() });
    });
    expect(cards()).toHaveLength(2);
  });

  it('ignores an empty push', async () => {
    await renderPage([notif({ id: 'a' })]);
    await act(async () => {
      mocks.push(null);
    });
    expect(cards()).toHaveLength(1);
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = await renderPage();
    unmount();
    expect(mocks.unsub).toHaveBeenCalled();
  });
});

describe('paging', () => {
  const many = (count) =>
    Array.from({ length: count }, (_, i) =>
      notif({ id: `n${i}`, title: `Item ${i}`, createdAt: minutesAgo(i) })
    );

  it('leaves the pager off a single page of results', async () => {
    await renderPage(many(10));
    expect(document.body.querySelector('.pagination')).toBeNull();
    expect(cards()).toHaveLength(10);
  });

  it('shows ten at a time and moves between pages', async () => {
    await renderPage(many(23));
    expect(cards()).toHaveLength(10);
    fireEvent.click(screen.getByText('3'));
    expect(cards()).toHaveLength(3);
    expect(screen.getByText('Item 22')).toBeInTheDocument();
  });

  it('pulls the reader back when the feed shrinks under them', async () => {
    await renderPage(many(23));
    fireEvent.click(screen.getByText('3'));
    // Marking all as read refetches; the second response is a shorter feed.
    mocks.api.getNotifications.mockResolvedValue({ data: { data: many(5) } });
    await act(async () => {
      fireEvent.click(screen.getByText('Mark all as read'));
    });
    expect(document.body.querySelector('.pagination')).toBeNull();
    expect(cards()).toHaveLength(5);
  });
});

describe('list updates that leave their neighbours alone', () => {
  it('sorts a notification with no timestamp to the bottom', async () => {
    // The comparator's `|| 0` arms only run when a second entry forces a
    // comparison, so the feed needs two items with one timestamp missing.
    await renderPage([
      notif({ id: 'a', title: 'Undated', createdAt: undefined }),
      notif({ id: 'b', title: 'Dated', createdAt: minutesAgo(5) }),
    ]);
    expect(groupLabels()).toEqual(['Today', 'Earlier']);
    expect(cards()[0]).toHaveTextContent('Dated');
  });

  it('sorts an undated notification that arrives second to the bottom too', async () => {
    // Whichever side of the comparator the undated entry lands on has to be
    // exercised, and the engine only hands it over as `a` in this order.
    await renderPage([
      notif({ id: 'a', title: 'Dated', createdAt: minutesAgo(5) }),
      notif({ id: 'b', title: 'Undated', createdAt: undefined }),
    ]);
    expect(cards()[1]).toHaveTextContent('Undated');
  });

  it('merges a push into one card and leaves the other untouched', async () => {
    await renderPage([
      notif({ id: 'a', title: 'Draft' }),
      notif({ id: 'b', title: 'Untouched' }),
    ]);
    await act(async () => {
      mocks.push(notif({ id: 'a', title: 'Final' }));
    });
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('Untouched')).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
  });

  it('marks one card read without touching the rest of the feed', async () => {
    await renderPage([notif({ id: 'a', title: 'First' }), notif({ id: 'b', title: 'Second' })]);
    await act(async () => {
      fireEvent.click(screen.getAllByText('View details')[0]);
    });
    expect(mocks.api.markNotificationRead).toHaveBeenCalledTimes(1);
    expect(cards()[0].className).not.toContain('unread');
    expect(cards()[1].className).toContain('unread');
  });
});
