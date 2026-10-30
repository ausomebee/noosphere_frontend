import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// FeatureRow owns a menu, a switch and a modal of its own; the probe records
// what the group hands down to it, which is the whole of the group's job.
const rowProps = vi.hoisted(() => []);
vi.mock('../Pages/FeatureManagement/FeatureSubComps/FeatureRow', () => ({
  default: (props) => {
    rowProps.push(props);
    return (
      <tr data-testid="feature-row">
        <td>{props.feature.name}</td>
      </tr>
    );
  },
}));

import FeatureGroup from '../Pages/FeatureManagement/FeatureSubComps/FeatureGroup';

/**
 * One card on the feature-management board.
 *
 * It is a table header plus a row per feature, and its only real contribution
 * is that it passes its own title down to every row — a row needs the group
 * name to report which group a statistics view was opened from, and has no
 * other way to learn it.
 *
 * There is no default for `features`, so a card rendered without one throws
 * rather than showing an empty table; the test at the bottom pins that.
 */

const feature = (over = {}) => ({
  id: 'f1',
  name: 'Invoicing',
  ...over,
});

const onViewStatistics = vi.fn();

const renderGroup = (features, title = 'Billing') =>
  render(
    <FeatureGroup
      title={title}
      features={features}
      onViewStatistics={onViewStatistics}
    />
  );

beforeEach(() => {
  rowProps.length = 0;
  onViewStatistics.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the card', () => {
  it('heads itself with the group title', () => {
    renderGroup([feature()]);
    expect(document.body.querySelector('.feature-group-title').textContent).toBe(
      'Billing'
    );
  });

  it('lays out the six columns the board expects', () => {
    renderGroup([feature()]);
    expect([...document.body.querySelectorAll('th')].map((th) => th.textContent))
      .toEqual([
        'Feature',
        'Date Added',
        'Managed By',
        'Active',
        'Plans Active',
        'Action',
      ]);
  });

  it('renders the header alone for a group with no features yet', () => {
    renderGroup([]);
    expect(screen.queryAllByTestId('feature-row')).toHaveLength(0);
    expect(document.body.querySelectorAll('th')).toHaveLength(6);
  });
});

describe('the rows', () => {
  it('renders one row per feature, in order', () => {
    renderGroup([feature(), feature({ id: 'f2', name: 'Reporting' })]);
    expect(screen.getAllByTestId('feature-row').map((r) => r.textContent)).toEqual([
      'Invoicing',
      'Reporting',
    ]);
  });

  it('hands each row its feature, the group title and the callback', () => {
    const first = feature();
    renderGroup([first, feature({ id: 'f2', name: 'Reporting' })]);
    expect(rowProps[0].feature).toBe(first);
    expect(rowProps[0].groupTitle).toBe('Billing');
    expect(rowProps[0].onViewStatistics).toBe(onViewStatistics);
    // Every row gets the same title, whichever feature it holds.
    expect(rowProps[1].groupTitle).toBe('Billing');
  });

  it('passes an empty title down as readily as a real one', () => {
    renderGroup([feature()], '');
    expect(rowProps[0].groupTitle).toBe('');
    expect(document.body.querySelector('.feature-group-title').textContent).toBe('');
  });
});

describe('a card with no feature list', () => {
  it('throws rather than rendering an empty table', () => {
    // React logs the failed render, which is noise here rather than a finding.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderGroup(undefined)).toThrow();
  });
});
