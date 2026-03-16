import React from "react";
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
  ...props
}) => {
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
      disabled={disabled || loading}
      style={{ width }}
      {...props}
    >
      {loading ? (
        <span className="button-spinner">
          <svg
            className="spinner"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
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
};

export default Button;