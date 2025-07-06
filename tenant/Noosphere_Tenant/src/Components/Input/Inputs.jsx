import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  width,
  ...props
}) => {
  const widthClass = width && width !== "full" ? `w-${width}` : "w-full";
  const inlineStyle =
    !isNaN(Number(width)) && width !== "full" ? { width: `${width}px` } : {};

  return (
    <div className="input-group">
      {label && <label className="input-group-label">{label}</label>}
      <input
        type="text"
        className={`form-control ${widthClass} ${className}`}
        style={inlineStyle}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
};

TextInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  width: PropTypes.oneOf(["150", "200", "250", "300", "full"]),
  className: PropTypes.string,
};

const PasswordInput = ({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="input-group">
      {label && <label className="input-group-label">{label}</label>}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={`form-control ${className}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ paddingRight: "40px" }}
          {...props}
        />
        <svg
          className="password-toggle-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          onClick={togglePasswordVisibility}
        >
          {showPassword ? (
            <>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M1 1l22 22" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

PasswordInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
};

const SelectInput = ({
  label,
  value,
  onChange,
  options,
  width,
  className = "",
  error,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const [selectedValue, setSelectedValue] = useState(props.value || "");

  // Sync selectedValue with value prop
  useEffect(() => {
    setSelectedValue(value || "");
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle option selection
  const handleOptionClick = (value) => {
    setSelectedValue(value);
    setIsOpen(false); // Close the dropdown after selection
    if (props.onChange) {
      props.onChange({
        target: {
          name: props.name, // Pass the name prop provided by react-hook-form
          value: value,     // Pass the selected value
        },
      });
    }
  };

  // Determine the selected label based on the value prop
  const selectedLabel =
    options.find((option) => option.value === value)?.label || "";

  return (
    <div className="input-group">
      {label && <label className="input-group-label">{label}</label>}
      <div
        className={`relative ${width ? `w-${width}` : "w-full"}`}
        ref={wrapperRef}
      >
        <input
          type="text"
          className={`input-select ${className}`}
          value={selectedValue} // Display the selected label instead of value
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder="Select an option..."
          {...props}
        />
        {isOpen && (
          <ul className="select-dropdown">
            {options.map((option) => (
              <li
                key={option.value}
                className={`select-option ${
                  value === option.value ? "selected" : ""
                }`}
                onClick={() => handleOptionClick(option.value)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <div className="auth-error-message text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

SelectInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.oneOf(["150", "200", "250", "300", "full"]),
  className: PropTypes.string,
  error: PropTypes.string,
};

const SearchableSelectInput = ({
  label,
  value,
  onChange,
  options,
  width,
  className = "",
  ...props
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync search field with selected option label
  useEffect(() => {
    const selectedOption = options.find((option) => option.value === value);
    if (selectedOption && search === "") {
      setSearch(selectedOption.label);
    }
  }, [value, options]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options by search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Handle selection
  const handleOptionClick = (option) => {
    onChange({ target: { value: option.value } });
    setSearch(option.label);
    setIsOpen(false);
  };

  // Handle user typing
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setIsOpen(true);
  };

  return (
    <div className="input-group">
      {label && <label className="input-group-label">{label}</label>}
      <div
        className={`relative ${width ? `w-${width}` : "w-full"}`}
        ref={wrapperRef}
      >
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search options..."
          className={`input-select ${className}`}
          {...props}
        />
        {isOpen && filteredOptions.length > 0 && (
          <ul className="select-dropdown">
            {filteredOptions.map((option) => (
              <li
                key={option.value}
                className={`select-option ${
                  value === option.value ? "selected" : ""
                }`}
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

SearchableSelectInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.oneOf(["150", "200", "250", "300", "full"]),
  className: PropTypes.string,
};

const CheckboxInput = ({ label, checked, onChange, ...props }) => (
  <div className="form-checkbox-group">
    <input
      type="checkbox"
      className="form-checkbox"
      checked={checked}
      onChange={onChange}
      {...props}
    />
    {label && <label className="form-checkbox-label">{label}</label>}
  </div>
);

CheckboxInput.propTypes = {
  label: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

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
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const TextareaInput = ({ label, value, onChange, placeholder, ...props }) => (
  <div className="input-group">
    {label && <label className="input-group-label">{label}</label>}
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
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

const SearchInput = ({ value, onChange, placeholder, width, ...props }) => (
  <div className="input-group">
    <div
      className={`input-search-wrapper ${width ? `w-${width}` : "w-full"}`}
      style={!isNaN(width) ? { width: `${width}px` } : {}}
    >
      <svg
        className="search-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-muted)"
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
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  width: PropTypes.oneOf(["150", "200", "250", "300", "full"]),
};

const RadioInput = ({
  label,
  name,
  value,
  checked,
  onChange,
  inputPosition = "before",
  className = "",
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
          checked={checked}
          onChange={onChange}
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
          checked={checked}
          onChange={onChange}
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
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  inputPosition: PropTypes.oneOf(["before", "after"]),
  className: PropTypes.string,
};

export {
  TextInput,
  PasswordInput,
  SelectInput,
  SearchableSelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
  SearchInput,
  RadioInput,
};