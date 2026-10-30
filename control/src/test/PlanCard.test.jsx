import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import PlanCard from '../Pages/BillingsAndPayment/PlanCard';

/**
 * One plan tile on the plans-and-pricing board.
 *
 * Its header colour comes from the plan itself, and the card picks black or
 * white lettering by computing the luminance of that colour -- except for an
 * inactive plan, which is greyed out regardless. The card is otherwise a
 * permission-driven menu: the cog only appears if the admin can do at least one
 * of the six things on it, and an inactive plan is offered Activate in place of
 * the view-subscribers and Deactivate pair.
 *
 * The menu closes itself on any mousedown that lands outside both the menu and
 * the cog, which is why several tests below dispatch mousedown on document.body
 * rather than clicking.
 */

const handlers = {
  onDuplicate: vi.fn(),
  onStatusChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

const plan = (over = {}) => ({
  id: 'p1',
  name: 'Pro',
  status: 'active',
  colourCode: '#112233',
  subscriberCount: 12,
  pricing: { cost: '200 USD / month', storage: '500GB', extra: '25 clients' },
  features: ['Invoicing', 'Reporting'],
  ...over,
});

const renderCard = (over = {}) => render(<PlanCard plan={plan(over)} {...handlers} />);

// An admin whose role grants exactly the listed permission keys. Passing none
// leaves the role in place with an empty grant, which is what strips the cog.
const grant = (...permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'BILLING', permissions }],
  };
};

const cog = () => screen.queryByLabelText('Plan options');
const openMenu = () => fireEvent.click(cog());
const header = () => document.querySelector('.plan-header');

beforeEach(() => {
  vi.clearAllMocks();
  delete state.authentication.user.role;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the card body', () => {
  it('shows the plan name, price lines and subscriber count', () => {
    renderCard();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('200 USD / month')).toBeInTheDocument();
    expect(screen.getByText('500GB')).toBeInTheDocument();
    expect(screen.getByText('25 clients')).toBeInTheDocument();
    expect(screen.getByText('12 Subscribers')).toBeInTheDocument();
  });

  it('counts a plan with no subscriber count as none', () => {
    renderCard({ subscriberCount: undefined });
    expect(screen.getByText('0 Subscribers')).toBeInTheDocument();
  });

  it('counts a plan whose subscriber count is zero as none', () => {
    renderCard({ subscriberCount: 0 });
    expect(screen.getByText('0 Subscribers')).toBeInTheDocument();
  });

  it('lists every feature it was given', () => {
    renderCard();
    expect(screen.getByText('Invoicing')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
  });

  it.each([
    ['an empty feature list', []],
    ['no feature list at all', undefined],
    ['a feature list that is not a list', { a: 1 }],
  ])('says there are no features for %s', (_case, features) => {
    renderCard({ features });
    expect(screen.getByText('No features available')).toBeInTheDocument();
  });
});

describe('the header colour', () => {
  it('paints the header in the plan colour', () => {
    renderCard({ colourCode: '#112233' });
    expect(header()).toHaveStyle({ backgroundColor: '#112233' });
  });

  it('falls back to white for a plan with no colour', () => {
    renderCard({ colourCode: null });
    expect(header()).toHaveStyle({ backgroundColor: '#ffffff' });
  });

  it('writes in black on a light header', () => {
    renderCard({ colourCode: '#ffffff' });
    expect(header()).toHaveStyle({ color: '#000' });
  });

  it('writes in white on a dark header', () => {
    renderCard({ colourCode: '#000000' });
    expect(header()).toHaveStyle({ color: '#fff' });
  });

  it('greys the lettering of an inactive plan whatever its colour', () => {
    renderCard({ status: 'inactive', colourCode: '#ffffff' });
    expect(header()).toHaveStyle({ color: '#999' });
  });
});

describe('the status badge', () => {
  it('badges an active plan', () => {
    renderCard({ status: 'active' });
    expect(document.querySelector('.status-badge.active')).toBeInTheDocument();
    expect(document.querySelector('.plan-title')).not.toHaveClass('inactive');
  });

  it('badges an inactive plan and dims its title', () => {
    renderCard({ status: 'inactive' });
    expect(document.querySelector('.inactiveHeader')).toBeInTheDocument();
    expect(document.querySelector('.plan-title')).toHaveClass('inactive');
    expect(document.querySelector('.plan-card')).toHaveClass('inactive');
  });

  it('shows no badge at all for any other status', () => {
    renderCard({ status: 'draft' });
    expect(document.querySelector('.status-badge')).toBeNull();
    expect(document.querySelector('.inactiveHeader')).toBeNull();
  });
});

describe('who gets the cog at all', () => {
  it('offers it to an admin with every permission', () => {
    renderCard();
    expect(cog()).toBeInTheDocument();
  });

  it.each([
    'activate_plan',
    'deactivate_plan',
    'view_subscribers',
    'duplicate_plan',
    'edit_plan',
    'delete_plan',
  ])('offers it to an admin who can only %s', (permission) => {
    grant(permission);
    renderCard();
    expect(cog()).toBeInTheDocument();
  });

  it('hides it from an admin who can do none of the six', () => {
    grant('view_billing');
    renderCard();
    expect(cog()).toBeNull();
  });
});

describe('the menu', () => {
  it('stays shut until the cog is clicked', () => {
    renderCard();
    expect(document.querySelector('.dropdown-menu')).toBeNull();
    expect(cog()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on the cog and closes again on a second click', () => {
    renderCard();
    openMenu();
    expect(document.querySelector('.dropdown-menu')).toBeInTheDocument();
    expect(cog()).toHaveAttribute('aria-expanded', 'true');
    openMenu();
    expect(document.querySelector('.dropdown-menu')).toBeNull();
  });

  it('offers the whole menu for an active plan', () => {
    renderCard();
    openMenu();
    expect(screen.getByText('View subscriber list')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Plan')).toBeInTheDocument();
    expect(screen.getByText('Duplicate Plan')).toBeInTheDocument();
    expect(screen.getByText('Edit Plan')).toBeInTheDocument();
    expect(screen.getByText('Delete Plan')).toBeInTheDocument();
    expect(screen.queryByText('Activate Plan')).not.toBeInTheDocument();
  });

  it('offers only Activate in place of the active-plan pair', () => {
    renderCard({ status: 'inactive' });
    openMenu();
    expect(screen.getByText('Activate Plan')).toBeInTheDocument();
    expect(screen.queryByText('View subscriber list')).not.toBeInTheDocument();
    expect(screen.queryByText('Deactivate Plan')).not.toBeInTheDocument();
  });

  it('leaves an inactive plan with nothing to activate when the admin may not', () => {
    grant('edit_plan');
    renderCard({ status: 'inactive' });
    openMenu();
    expect(screen.queryByText('Activate Plan')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Plan')).toBeInTheDocument();
  });

  it('shows an active plan only the entries the admin is granted', () => {
    grant('duplicate_plan');
    renderCard();
    openMenu();
    expect(screen.getByText('Duplicate Plan')).toBeInTheDocument();
    expect(screen.queryByText('View subscriber list')).not.toBeInTheDocument();
    expect(screen.queryByText('Deactivate Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete Plan')).not.toBeInTheDocument();
  });
});

describe('choosing something from the menu', () => {
  const choose = (label, over) => {
    renderCard(over);
    openMenu();
    fireEvent.click(screen.getByText(label));
  };

  it('duplicates the plan', () => {
    choose('Duplicate Plan');
    expect(handlers.onDuplicate).toHaveBeenCalled();
  });

  it('edits the plan', () => {
    choose('Edit Plan');
    expect(handlers.onEdit).toHaveBeenCalled();
  });

  it('deletes the plan', () => {
    choose('Delete Plan');
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it('deactivates an active plan', () => {
    choose('Deactivate Plan');
    expect(handlers.onStatusChange).toHaveBeenCalledWith('deactivate');
  });

  it('activates an inactive plan', () => {
    choose('Activate Plan', { status: 'inactive' });
    expect(handlers.onStatusChange).toHaveBeenCalledWith('activate');
  });

  it('navigates to the subscriber list for the plan', () => {
    choose('View subscriber list');
    expect(navigate).toHaveBeenCalledWith('/plans/subscribers/p1');
  });

  it('closes the menu behind whichever entry was chosen', () => {
    choose('Edit Plan');
    expect(document.querySelector('.dropdown-menu')).toBeNull();
  });
});

describe('closing the menu by clicking away', () => {
  it('closes on a mousedown outside the card', () => {
    renderCard();
    openMenu();
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.dropdown-menu')).toBeNull();
  });

  it('stays open for a mousedown inside the menu itself', () => {
    renderCard();
    openMenu();
    fireEvent.mouseDown(document.querySelector('.dropdown-items'));
    expect(document.querySelector('.dropdown-menu')).toBeInTheDocument();
  });

  it('stays open for a mousedown on the cog, which handles its own toggling', () => {
    renderCard();
    openMenu();
    fireEvent.mouseDown(cog());
    expect(document.querySelector('.dropdown-menu')).toBeInTheDocument();
  });

  it('ignores an outside mousedown while the menu is shut', () => {
    // With no menu rendered there is no ref to compare against, so the listener
    // bails out before it ever looks at the event target.
    renderCard();
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.dropdown-menu')).toBeNull();
  });

  it('stops listening once the card is gone', () => {
    const removeListener = vi.spyOn(document, 'removeEventListener');
    renderCard().unmount();
    expect(removeListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });
});
