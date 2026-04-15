import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import './LoadingSpinner.css';

const LoadingSpinner = React.memo(() => (
  <div className="loading-spinner-container" role="status" aria-live="polite">
    <FaSpinner className="loading-spinner" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
));

export const SectionSpinner = () => (
  <div className="section-spinner-container" role="status" aria-live="polite">
    <FaSpinner className="loading-spinner" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

/** Inline shimmer placeholder for individual values */
export const Skeleton = ({ width = "80px", height = "16px", borderRadius = "4px", style }) => (
  <span
    className="skeleton-shimmer"
    style={{ display: "inline-block", width, height, borderRadius, ...style }}
  />
);

/** Skeleton line for text placeholders */
export const SkeletonText = ({ lines = 1, width = "100%" }) => (
  <div className="skeleton-text-block">
    {Array.from({ length: lines }).map((_, i) => (
      <span
        key={i}
        className="skeleton-shimmer"
        style={{
          display: "block",
          width: i === lines - 1 && lines > 1 ? "60%" : width,
          height: "14px",
          borderRadius: "4px",
          marginBottom: i < lines - 1 ? "8px" : 0,
        }}
      />
    ))}
  </div>
);

/** Card-shaped skeleton for stats/overview cards */
export const SkeletonCard = ({ width = "100%", height = "80px" }) => (
  <div
    className="skeleton-shimmer"
    style={{
      width,
      height,
      borderRadius: "8px",
    }}
  />
);

/** Table skeleton rows */
export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: cols }).map((_, i) => (
        <span key={i} className="skeleton-shimmer" style={{ flex: 1, height: "14px", borderRadius: "4px" }} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="skeleton-table-row">
        {Array.from({ length: cols }).map((_, c) => (
          <span key={c} className="skeleton-shimmer" style={{ flex: 1, height: "14px", borderRadius: "4px" }} />
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSpinner;