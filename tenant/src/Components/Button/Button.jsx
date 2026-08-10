import React, { useState } from "react";
import PropTypes from "prop-types";

const Button = ({
  label,
  variant = "primary",
  size = "medium",
  width = "100%",
  icon,
  iconSize = 20,
  iconPosition = "left",
  type = "button",
  loading = false,
  disabled = false,
  className = "",
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

    return <span className={`btn-icon ${iconPosition}`}>{sizedIcon}</span>;
  };

  return (
    <button
      type={type}
      className={` p-6 btn btn-${variant} btn-${size} ${width} ${
        disabled || isBusy ? "btn-disabled" : ""
      } ${className}`}
      disabled={disabled || isBusy}
      aria-label={isBusy ? "Loading" : label}
      onClick={handleClick}
      {...props}
    >
      {isBusy ? (
        <span className="btn-spinner">
          <svg
            className="spinner animate-spin"
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
          <span className="btn-label">{label}</span>
          {iconPosition === "right" && renderIcon()}
        </>
      )}
    </button>
  );
};

Button.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf([
    "primary",
    "secondary",
    "secondary-danger",
    "secondary-success",
    "danger",
    "dark",
    "ghost",
    "outline",
    "action",
    "action-danger",
    "important",
    "important-danger",
  ]),
  size: PropTypes.oneOf(["small", "medium", "large"]),
  width: PropTypes.string,
  icon: PropTypes.element,
  iconSize: PropTypes.number,
  iconPosition: PropTypes.oneOf(["left", "right"]),
  type: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Button;