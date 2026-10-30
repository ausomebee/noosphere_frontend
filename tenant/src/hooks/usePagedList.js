import { useEffect, useMemo, useState } from "react";

/**
 * Client-side paging for lists shown inside a modal — trackers, activity logs,
 * change requests. These arrive whole rather than page by page, and a modal has
 * far less room than a table, so a long history otherwise turns into a scroll
 * with no sense of how much is there.
 *
 * Returns `page` alongside `setPage` so a caller can reset to the first page
 * when its modal reopens.
 */
const usePagedList = (items, pageSize = 5) => {
  const [page, setPage] = useState(1);

  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

  // A shorter list can leave the current page out of range — after items are
  // filtered, or a fresh record loads while the previous one is still shown.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    total: list.length,
    // Nothing to page through when it all fits on one screen.
    showPagination: list.length > pageSize,
  };
};

export default usePagedList;
