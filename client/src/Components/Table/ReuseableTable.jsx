import React, { useState, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { IoSearchOutline, IoChevronDown, IoChevronUp } from "react-icons/io5";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { BsListUl, BsGrid } from "react-icons/bs";
import { FiMoreVertical } from "react-icons/fi";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import "./ReusableTable.css";
import SectionLoader from "../SectionLoader";

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="table-empty-state">
    {icon && <div className="empty-icon">{icon}</div>}
    <h3 className="empty-title">{title || "No data"}</h3>
    {subtitle && <p className="empty-subtitle">{subtitle}</p>}
  </div>
);

const ReusableTable = ({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  columns,
  data,
  searchPlaceholder = "Search",
  onSearch,
  showFilters = true,
  showViewToggle = true,
  emptyState,
  actions,
  renderExpandedRow,
  pagination,
  onPageChange,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState("list");
  const [expandedRows, setExpandedRows] = useState([]);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [menuRect, setMenuRect] = useState(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const menuRef = useRef(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch?.(value);
    }, 300);
  }, [onSearch]);

  const toggleRowExpand = (rowId) => {
    setExpandedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  };

  const closeActionMenu = () => {
    setOpenActionMenu(null);
    setMenuRow(null);
    setMenuRect(null);
    setMenuStyle(null);
  };

  const toggleActionMenu = (row, e) => {
    if (openActionMenu === row.id) {
      closeActionMenu();
      return;
    }
    // Anchor the menu to the button and render it in a portal (fixed) so the
    // table's overflow can't clip it. Final position is computed after render.
    setMenuRect(e.currentTarget.getBoundingClientRect());
    setMenuStyle(null);
    setMenuRow(row);
    setOpenActionMenu(row.id);
  };

  const menuActions = Array.isArray(actions) ? actions.filter((a) => a.menu) : [];

  // Once the menu is rendered, measure it and flip up / clamp horizontally so
  // it never spills off-screen (opens upward when there's no room below).
  useLayoutEffect(() => {
    if (!openActionMenu || !menuRect || !menuRef.current) return;
    const mh = menuRef.current.offsetHeight;
    const mw = menuRef.current.offsetWidth;
    const gap = 4;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let top;
    const roomBelow = vh - menuRect.bottom;
    if (roomBelow >= mh + gap || menuRect.top < mh + gap) {
      top = Math.min(menuRect.bottom + gap, vh - mh - 8);
    } else {
      top = Math.max(8, menuRect.top - gap - mh);
    }

    let left = menuRect.right - mw; // right-aligned to the button
    if (left + mw > vw - 8) left = vw - mw - 8;
    if (left < 8) left = 8;

    setMenuStyle({ top, left });
  }, [openActionMenu, menuRect]);

  const renderPagination = () => {
    if (!pagination) return null;
    const { currentPage, totalPages } = pagination;
    if (totalPages <= 1) return null;
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) pages.push("...");

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");

      // Always show last page
      pages.push(totalPages);
    }

    return (
      <div className="table-pagination">
        <button
          className="pagination-btn prev"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <IoArrowBack size={16} />
          <span>Previous</span>
        </button>

        <div className="pagination-pages">
          {pages.map((page, idx) => (
            <button
              key={idx}
              className={`pagination-page ${
                page === currentPage ? "active" : ""
              } ${page === "..." ? "dots" : ""}`}
              onClick={() => page !== "..." && onPageChange?.(page)}
              disabled={page === "..."}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className="pagination-btn next"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span>Next</span>
          <IoArrowForward size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="reusable-table-container">
      {/* Header */}
      <div className="table-header">
        <div className="table-header-text">
          <h2 className="table-title">{title}</h2>
          {subtitle && <p className="table-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="table-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`table-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => onTabChange?.(tab.key)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="table-controls">
        <div className="table-search">
          <IoSearchOutline size={18} className="search-icon" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="table-actions">
          {showFilters && (
            <button className="filter-btn">
              <HiOutlineAdjustmentsHorizontal size={18} />
              <span>Filters</span>
            </button>
          )}
          {showViewToggle && (
            <div className="view-toggle">
              <button
                className={`view-btn ${viewType === "list" ? "active" : ""}`}
                onClick={() => setViewType("list")}
                aria-label="List view"
              >
                <BsListUl size={18} />
              </button>
              <button
                className={`view-btn ${viewType === "grid" ? "active" : ""}`}
                onClick={() => setViewType("grid")}
                aria-label="Grid view"
              >
                <BsGrid size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <SectionLoader />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={emptyState?.icon}
            title={emptyState?.title}
            subtitle={emptyState?.subtitle}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {renderExpandedRow && <th className="expand-col"></th>}
                {columns.map((col) => (
                  <th key={col.key} style={col.style}>
                    {col.title}
                  </th>
                ))}
                {actions && <th className="actions-col"></th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <React.Fragment key={row.id || rowIndex}>
                  <tr
                    onClick={() => toggleRowExpand(row.id)}
                    className={expandedRows.includes(row.id) ? "expanded" : ""}
                  >
                    {renderExpandedRow && (
                      <td className="expand-col">
                        <button className="expand-btn" aria-label={expandedRows.includes(row.id) ? "Collapse row" : "Expand row"}>
                          {expandedRows.includes(row.id) ? (
                            <IoChevronUp size={16} />
                          ) : (
                            <IoChevronDown size={16} />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} data-label={col.title}>
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </td>
                    ))}
                    {actions && (
                      <td className="actions-col">
                        <div className="row-actions">
                          {actions.map((action, idx) =>
                            action.render ? (
                              <React.Fragment key={idx}>
                                {action.render(row)}
                              </React.Fragment>
                            ) : null
                          )}
                          {actions.some((a) => a.menu) && (
                            <div className="action-menu-container">
                              <button
                                className="action-menu-btn"
                                onClick={(e) => toggleActionMenu(row, e)}
                                aria-label="More actions"
                              >
                                <FiMoreVertical size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {renderExpandedRow && expandedRows.includes(row.id) && (
                    <tr className="expanded-row">
                      <td colSpan={columns.length + (actions ? 2 : 1)}>
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.length > 0 && renderPagination()}

      {/* Row action menu — portaled to the body so the table's overflow never
          clips it (fixes the menu opening into empty/cut-off space). */}
      {openActionMenu && menuRow && menuRect &&
        createPortal(
          <>
            <div className="action-menu-backdrop" onClick={closeActionMenu} />
            <div
              ref={menuRef}
              className="action-menu action-menu--portal"
              style={menuStyle || { top: 0, left: 0, visibility: "hidden" }}
            >
              {menuActions.map((action, idx) => (
                <button
                  key={idx}
                  className="action-menu-item"
                  onClick={() => {
                    action.onClick?.(menuRow);
                    closeActionMenu();
                  }}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default ReusableTable;
