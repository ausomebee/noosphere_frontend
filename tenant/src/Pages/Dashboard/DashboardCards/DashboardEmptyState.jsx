import React from "react";

// Shared empty / error state for dashboard cards.
// Keeps the existing look: a "No data to show" heading, one grey
// description sentence, and an optional CTA (passed as children).
const DashboardEmptyState = ({
  heading = "No data to show",
  description,
  children,
}) => (
  <div>
    <p className="text-muted text-lg mb-4 text-left">{heading}</p>
    {description && <p className="text-muted text-left mb-16">{description}</p>}
    {children}
  </div>
);

export default DashboardEmptyState;
