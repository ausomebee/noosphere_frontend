import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import usePageTitle from '../hooks/usePageTitle';

/**
 * Sets the browser tab title for a page and puts it back on unmount.
 *
 * The restore is what makes it safe for a modal or a nested route to claim the
 * title: the previous value is captured per effect run, so a title change and
 * an unmount both have to be checked against what was there before, not against
 * the bare app name.
 */

beforeEach(() => {
  document.title = 'Noosphere';
});

describe('setting the title', () => {
  it('suffixes the page name with the app name', () => {
    renderHook(() => usePageTitle('Tenants'));
    expect(document.title).toBe('Tenants | Noosphere');
  });

  it.each([
    ['nothing', undefined],
    ['an empty string', ''],
    ['null', null],
  ])('falls back to the bare app name given %s', (_label, title) => {
    renderHook(() => usePageTitle(title));
    expect(document.title).toBe('Noosphere');
  });

  it('follows a title that changes while the page stays mounted', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Tenants' },
    });
    rerender({ title: 'Billing' });
    expect(document.title).toBe('Billing | Noosphere');
  });
});

describe('restoring the title', () => {
  it('puts back whatever was there before', () => {
    document.title = 'Dashboard | Noosphere';
    const { unmount } = renderHook(() => usePageTitle('Tenants'));
    unmount();
    expect(document.title).toBe('Dashboard | Noosphere');
  });

  it('still restores the original title after the page name has changed', () => {
    document.title = 'Dashboard | Noosphere';
    const { rerender, unmount } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Tenants' },
    });
    // Cleanup runs before the next effect, so the second run captures the
    // original title rather than the one its predecessor set -- the restore
    // does not accumulate across renders.
    rerender({ title: 'Billing' });
    unmount();
    expect(document.title).toBe('Dashboard | Noosphere');
  });
});
