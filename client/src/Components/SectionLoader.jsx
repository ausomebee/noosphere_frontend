import React from "react";
import "./SectionLoader.css";

/**
 * Loading indicator for a SECTION inside a page — a card, panel, or table body.
 *
 * Tiers:
 *   page/route  → FullPageLoader (the logo)
 *   section     → this component
 *   table       → the same ring, rendered by the table itself
 */
const SectionLoader = ({ minHeight }) => (
  <div
    className="section-loader"
    style={minHeight ? { minHeight } : undefined}
    role="status"
    aria-live="polite"
  >
    <span className="section-loader-ring" aria-hidden="true" />
    <span className="section-loader-label">Loading...</span>
  </div>
);

export default SectionLoader;
