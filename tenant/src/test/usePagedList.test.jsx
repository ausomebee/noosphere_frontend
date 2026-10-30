import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePagedList from "../hooks/usePagedList";

const items = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe("usePagedList", () => {
  it("returns the first page and the page count", () => {
    const { result } = renderHook(() => usePagedList(items(12), 5));
    expect(result.current.pageItems.map((i) => i.id)).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.total).toBe(12);
  });

  it("moves between pages, and the last page holds the remainder", () => {
    const { result } = renderHook(() => usePagedList(items(12), 5));
    act(() => result.current.setPage(3));
    expect(result.current.pageItems.map((i) => i.id)).toEqual([11, 12]);
  });

  it("hides the pager when everything fits on one page", () => {
    const { result } = renderHook(() => usePagedList(items(5), 5));
    expect(result.current.showPagination).toBe(false);
    expect(result.current.totalPages).toBe(1);
  });

  it("shows the pager as soon as the list overflows", () => {
    const { result } = renderHook(() => usePagedList(items(6), 5));
    expect(result.current.showPagination).toBe(true);
  });

  it("falls back to page one when the list shrinks out from under it", () => {
    const { result, rerender } = renderHook(({ list }) => usePagedList(list, 5), {
      initialProps: { list: items(12) },
    });
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    rerender({ list: items(4) });
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toHaveLength(4);
  });

  it("survives an empty or missing list", () => {
    const { result } = renderHook(() => usePagedList([], 5));
    expect(result.current.pageItems).toEqual([]);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.showPagination).toBe(false);

    const { result: undef } = renderHook(() => usePagedList(undefined, 5));
    expect(undef.current.pageItems).toEqual([]);
    expect(undef.current.total).toBe(0);
  });
});
