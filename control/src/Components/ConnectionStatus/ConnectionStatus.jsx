import PropTypes from "prop-types";
import "./ConnectionStatus.css";

/**
 * Presence badge pinned to the user's avatar, in the manner of Teams.
 *
 * Replaces the "Connection lost" / "Connection restored" toasts. Those fired on
 * every tab switch — browsers throttle background timers, so the heartbeat
 * misses and the socket drops as a matter of course. Toasting normal behaviour
 * read as a fault, and neither phrase told anyone what it meant for them.
 *
 * Render inside the avatar element, which must carry `conn-status-anchor` so
 * the badge positions against it.
 */
const ConnectionStatus = ({ isConnected, className = "" }) => {
  // Written from the user's side — "you are online" answers the question people
  // actually have, where "connected" describes a socket they never think about.
  const tip = isConnected
    ? "You're online. Messages and notifications arrive live."
    : "You're offline. Reconnecting now — nothing is lost, and updates resume on their own.";

  return (
    <span
      className={`conn-status ${isConnected ? "is-online" : "is-offline"} ${className}`}
      data-tip={tip}
      role="status"
      aria-live="polite"
      // Focusable so the tooltip is reachable by keyboard, not hover alone.
      tabIndex={0}
    >
      <span className="conn-status-sr">{tip}</span>
    </span>
  );
};

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool,
  className: PropTypes.string,
};

export default ConnectionStatus;
