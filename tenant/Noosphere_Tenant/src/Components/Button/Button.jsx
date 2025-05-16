// Button.jsx
import React from "react";
import PropTypes from "prop-types";
import "./Button.css";

// Example React icon library (optional, install if needed)
// import { ReactComponent as ArrowRightIcon } from './path-to-your-svg/arrow-right.svg';
// For this example, we'll use inline SVG, but you can replace with a React icon library like react-icons

const Button = ({
  label,
  variant = "primary",
  icon,
  iconPosition = "right",
  onClick,
  disabled = false,
  className = "",
}) => {
  // Determine if icon should be rendered
  const renderIcon = () => {
    if (!icon) return null;

    // If icon is a string (SVG path or identifier), you can handle it here
    // For simplicity, we'll use an inline SVG or the provided icon
    const IconComponent = icon || (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    );

    return <span className={`button-icon ${iconPosition}`}>{IconComponent}</span>;
  };

  return (
    <button
      className={`custom-button ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {iconPosition === "left" && renderIcon()}
      <span className="button-label">{label}</span>
      {iconPosition === "right" && renderIcon()}
    </button>
  );
};

// PropTypes for type checking
Button.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary"]),
  icon: PropTypes.element, // Accepts React elements (SVG, React icon, etc.)
  iconPosition: PropTypes.oneOf(["left", "right"]),
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;