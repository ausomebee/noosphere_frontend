import React from "react";
import PropTypes from "prop-types";
import "./Inputs.css";

// Text Input Component
const TextInput = ({ label, value, onChange, placeholder, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <input
      type="text"
      className="input-text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  </div>
);

TextInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

// Select Input Component
const SelectInput = ({ label, value, onChange, options, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <select
      className="input-select"
      value={value}
      onChange={onChange}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

SelectInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
};

// Checkbox Input Component (with and without label)
const CheckboxInput = ({ label, checked, onChange, ...props }) => (
  <div className="input-checkbox-group">
    <input
      type="checkbox"
      className="input-checkbox"
      checked={checked}
      onChange={onChange}
      {...props}
    />
    {label && <label className="input-checkbox-label">{label}</label>}
  </div>
);

CheckboxInput.propTypes = {
  label: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
};

// Switch Input Component
const SwitchInput = ({ label, checked, onChange, ...props }) => (
  <div className="input-switch-group">
    {label && <label className="input-switch-label">{label}</label>}
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={onChange} {...props} />
      <span className="slider round"></span>
    </label>
  </div>
);

SwitchInput.propTypes = {
  label: PropTypes.string,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
};

// Textarea Input Component
const TextareaInput = ({ label, value, onChange, placeholder, ...props }) => (
  <div className="input-group">
    {label && <label className="input-label">{label}</label>}
    <textarea
      className="input-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  </div>
);

TextareaInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

// Search Input Component
const SearchInput = ({ value, onChange, placeholder, ...props }) => (
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
        className="input-search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    </div>
  </div>
);

SearchInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

// Radio Input Component (with and without label)
const RadioInput = ({ label, name, value, checked, onChange, ...props }) => (
  <div className="input-radio-group">
    <input
      type="radio"
      className="input-radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      {...props}
    />
    {label && <label className="input-radio-label">{label}</label>}
  </div>
);

RadioInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  onChange: PropTypes.func,
};

export {
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
  SearchInput,
  RadioInput,
};
