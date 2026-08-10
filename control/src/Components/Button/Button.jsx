import React, { useState } from "react";
import PropTypes from "prop-types";
import "./Button.css";

const Button = React.memo(({
  label,
  variant = "primary",
  icon,
  iconPosition = "left",
  iconSize = 20,
  type = "button",
  loading = false,
  disabled = false,
  className = "",
  width = "100%",
  onClick,
  ...props
}) => {
  // Auto-disable while an async onClick is in flight, so no button can be
  // double-clicked into a duplicate request without any per-caller wiring.
  const [busy, setBusy] = useState(false);
  const isBusy = loading || busy;

  const handleClick = (e) => {
    if (disabled || isBusy) return;
    const result = onClick?.(e);
    if (result && typeof result.then === "function") {
      setBusy(true);
      Promise.resolve(result).finally(() => setBusy(false));
    }
  };

  const renderIcon = () => {
    if (!icon) return null;

    const sizedIcon = React.cloneElement(icon, {
      width: icon.props.width || iconSize,
      height: icon.props.height || iconSize,
    });

    return <span className={`button-icon ${iconPosition}`}>{sizedIcon}</span>;
  };

  return (
    <button
      type={type}
      className={`custom-button ${variant} ${className}`}
      disabled={disabled || isBusy}
      style={{ width }}
      onClick={handleClick}
      {...props}
    >
      {isBusy ? (
        <span className="button-spinner">
          <svg
            className="spinner"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : (
        <>
          {iconPosition === "left" && renderIcon()}
          <span className="button-label">{label}</span>
          {iconPosition === "right" && renderIcon()}
        </>
      )}
    </button>
  );
});

Button.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf([
    "primary",
    "secondary",
    "secondary-danger",
    "danger",
    "dark",
    "ghost",
    "outline",
    "action",
    "action-danger",
    "important",
    "important-danger",
  ]),
  icon: PropTypes.element,
  iconPosition: PropTypes.oneOf(["left", "right"]),
  iconSize: PropTypes.number,
  type: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  width: PropTypes.string,
  onClick: PropTypes.func,
};

export default Button;