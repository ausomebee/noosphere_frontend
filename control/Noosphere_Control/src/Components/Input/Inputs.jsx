import React, { useState } from "react";
import PropTypes from "prop-types";
import "./Inputs.css";

// Text Input Component
const TextInput = ({
  label,
  placeholder,
  type = "text",
  className = "",
  error = "",
  ...props
}) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <input
      type={type}
      className={`input-text ${className} ${error ? "input-error" : ""}`}
      placeholder={placeholder}
      {...props}
    />
    {error && <span className="input-error-message">{error}</span>}
  </div>
);

TextInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
};

// Select Input Component
const SelectInput = ({
  label,
  options,
  className = "",
  error = "",
  ...props
}) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <select className={`input-select ${className} ${error ? "input-error" : ""}`} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <span className="input-error-message">{error}</span>}
  </div>
);

SelectInput.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  className: PropTypes.string,
  error: PropTypes.string,
};

// Checkbox Input Component (with position control)
const CheckboxInput = ({
  label,
  className = "",
  inputPosition = "before",
  ...props
}) => (
  <div className={`input-checkbox-group input-position-${inputPosition}`}>
    {inputPosition === "before" ? (
      <>
        <input type="checkbox" className={`input-checkbox ${className}`} {...props} />
        {label && <label className="input-checkbox-label">{label}</label>}
      </>
    ) : (
      <>
        {label && <label className="input-checkbox-label">{label}</label>}
        <input type="checkbox" className={`input-checkbox ${className}`} {...props} />
      </>
    )}
  </div>
);

CheckboxInput.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  inputPosition: PropTypes.oneOf(["before", "after"]),
};

// Switch Input Component (with position control)
const SwitchInput = ({
  label,
  className = "",
  inputPosition = "after",
  ...props
}) => (
  <div className={`input-switch-group input-position-${inputPosition}`}>
    {inputPosition === "before" ? (
      <>
        <label className="switch">
          <input type="checkbox" className={className} {...props} />
          <span className="slider round"></span>
        </label>
        {label && <label className="input-switch-label">{label}</label>}
      </>
    ) : (
      <>
        {label && <label className="input-switch-label">{label}</label>}
        <label className="switch">
          <input type="checkbox" className={className} {...props} />
          <span className="slider round"></span>
        </label>
      </>
    )}
  </div>
);

SwitchInput.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  inputPosition: PropTypes.oneOf(["before", "after"]),
};

// Textarea Input Component
const TextareaInput = ({
  label,
  placeholder,
  className = "",
  error = "",
  ...props
}) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <textarea
      className={`input-textarea ${className} ${error ? "input-error" : ""}`}
      placeholder={placeholder}
      {...props}
    />
    {error && <span className="input-error-message">{error}</span>}
  </div>
);

TextareaInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
};

// Search Input Component
const SearchInput = ({ placeholder, className = "", ...props }) => (
  <div className="input-group">
    <div className="input-search-wrapper">
      <svg
        className="search-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6b7280"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        className={`input-search ${className}`}
        placeholder={placeholder}
        {...props}
      />
    </div>
  </div>
);

SearchInput.propTypes = {
  placeholder: PropTypes.string,
  className: PropTypes.string,
};

// Radio Input Component
const RadioInput = ({
  label,
  name,
  value,
  className = "",
  inputPosition = "before",
  ...props
}) => (
  <div className={`input-radio-group input-position-${inputPosition}`}>
    {inputPosition === "before" ? (
      <>
        <input
          type="radio"
          className={`input-radio ${className}`}
          name={name}
          value={value}
          {...props}
        />
        {label && <label className="input-radio-label">{label}</label>}
      </>
    ) : (
      <>
        {label && <label className="input-radio-label">{label}</label>}
        <input
          type="radio"
          className={`input-radio ${className}`}
          name={name}
          value={value}
          {...props}
        />
      </>
    )}
  </div>
);

RadioInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
  inputPosition: PropTypes.oneOf(["before", "after"]),
};

// Password Input Component
const PasswordInput = ({
  label,
  placeholder,
  className = "",
  error = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div className="password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          className={`input-text ${className} ${error ? "input-error" : ""}`}
          placeholder={placeholder}
          {...props}
        />
        <button
          type="button"
          className="toggle-password"
          onClick={toggleShowPassword}
        >
          {showPassword ? (
            <svg
              className="eye-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg
              className="eye-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>
      </div>
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

PasswordInput.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
};

// Exports
export {
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
  SearchInput,
  RadioInput,
  PasswordInput,
};
