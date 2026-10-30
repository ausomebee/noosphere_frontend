import { useState } from "react";
import Button from "../Button/Button";
import useVersionCheck from "../../hooks/useVersionCheck";
import "./UpdateNotice.css";

/**
 * Card offering a refresh once a newer build has been deployed.
 *
 * It asks rather than reloading, because the user may be partway through
 * something they have not saved. "Later" hides it for the rest of this page
 * load; the next load picks up the new version anyway.
 */
const UpdateNotice = () => {
  const { updateAvailable } = useVersionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="update-notice" role="status" aria-live="polite">
      <span className="update-notice-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="update-notice-content">
        <p className="update-notice-title">A new version is available</p>
        <p className="update-notice-text">
          Refresh to get the latest improvements. Save any work in progress
          first.
        </p>
        <div className="update-notice-actions">
          <Button
            label="Later"
            variant="secondary"
            size="small"
            width=""
            onClick={() => setDismissed(true)}
          />
          <Button
            label="Refresh"
            variant="primary"
            size="small"
            width=""
            onClick={() => window.location.reload()}
          />
        </div>
      </div>
    </div>
  );
};

export default UpdateNotice;
