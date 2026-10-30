import React, { useState } from "react";
import {
  buildPasswordRules,
  DEFAULT_PASSWORD_MIN_LENGTH,
} from "../../Helper/passwordPolicy";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import "./Inputs.css";

// Text Input Component
/* =====================  RequiredMark  =====================
 * The single convention for marking a compulsory field. Purely visual +
 * `aria-required` on the control; it deliberately does NOT set the native
 * `required` attribute, because these inputs live inside forms validated by yup
 * — a native attribute would make the browser block submission with its own
 * bubble before yup could surface its message.
 */
const RequiredMark = ({ required }) =>
  required ? (
    <span className="required-indicator" aria-hidden="true">
      *
    </span>
  ) : null;

RequiredMark.propTypes = { required: PropTypes.bool };

const TextInput = ({
  label,
  required = false,
  placeholder,
  type = "text",
  className = "",
  error = "",
  ...props
}) => (
  <div className="input-group">
    {label && <label className="input-label">{label}<RequiredMark required={required} /></label>}
    <input
      type={type}
      className={`input-text ${className} ${error ? "input-error" : ""}`}
      placeholder={placeholder}
      aria-required={required || undefined}
      {...props}
    />
    {error && <span className="input-error-message">{error}</span>}
  </div>
);

TextInput.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
};

// Select Input Component
const SelectInput = ({
  label,
  required = false,
  options,
  className = "",
  error = "",
  emptyHint,
  ...props
}) => {
  const realOptions = (options || []).filter((option) => option.value !== "");
  const placeholderText =
    realOptions.length === 0 && emptyHint
      ? emptyHint
      : typeof label === "string" && label
      ? `-- Select ${label} --`
      : "-- Select --";
  return (
  <div className="input-group">
    {label && <label className="input-label">{label}<RequiredMark required={required} /></label>}
    <select className={`input-select ${className} ${error ? "input-error" : ""}`} aria-required={required || undefined} {...props}>
      {/* Placeholder (or empty-state hint); manual empty options are dropped. */}
      <option value="">{placeholderText}</option>
      {realOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <span className="input-error-message">{error}</span>}
  </div>
  );
};

SelectInput.propTypes = {
  required: PropTypes.bool,
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
  required = false,
  ...props
}) => {
  const box = (
    <input
      type="checkbox"
      className={`input-checkbox ${className}`}
      aria-required={required || undefined}
      {...props}
    />
  );
  const text = label && (
    <label className="input-checkbox-label">
      {label}
      <RequiredMark required={required} />
    </label>
  );
  return (
    <div className={`input-checkbox-group input-position-${inputPosition}`}>
      {inputPosition === "before" ? (
        <>
          {box}
          {text}
        </>
      ) : (
        <>
          {text}
          {box}
        </>
      )}
    </div>
  );
};

CheckboxInput.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  inputPosition: PropTypes.oneOf(["before", "after"]),
  required: PropTypes.bool,
};

// Switch Input Component (with position control)
const SwitchInput = ({
  label,
  className = "",
  inputPosition = "after",
  required = false,
  ...props
}) => {
  const toggle = (
    <label className="switch">
      <input
        type="checkbox"
        className={className}
        aria-required={required || undefined}
        {...props}
      />
      <span className="slider round"></span>
    </label>
  );
  const text = label && (
    <label className="input-switch-label">
      {label}
      <RequiredMark required={required} />
    </label>
  );
  return (
    <div className={`input-switch-group input-position-${inputPosition}`}>
      {inputPosition === "before" ? (
        <>
          {toggle}
          {text}
        </>
      ) : (
        <>
          {text}
          {toggle}
        </>
      )}
    </div>
  );
};

SwitchInput.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  inputPosition: PropTypes.oneOf(["before", "after"]),
  required: PropTypes.bool,
};

// Textarea Input Component
const TextareaInput = ({
  label,
  required = false,
  placeholder,
  className = "",
  error = "",
  ...props
}) => (
  <div className="input-group">
    {label && <label className="input-label">{label}<RequiredMark required={required} /></label>}
    <textarea
      className={`input-textarea ${className} ${error ? "input-error" : ""}`}
      placeholder={placeholder}
      aria-required={required || undefined}
      {...props}
    />
    {error && <span className="input-error-message">{error}</span>}
  </div>
);

TextareaInput.propTypes = {
  required: PropTypes.bool,
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
        aria-hidden="true"
        focusable="false"
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
// The policy itself lives in src/Helper/passwordPolicy.js so that this checklist
// and `passwordSchema` in src/Helper/passwordValidation.js read the same rules
// without either importing the other. If they drifted, this checklist could
// mark a rule unmet for a password the schema accepts, or call one Strong that
// the schema then rejects.
const PasswordStrength = ({ value, minLength = DEFAULT_PASSWORD_MIN_LENGTH }) => {
  if (!value) return null;
  const rules = buildPasswordRules(minLength);
  const score = rules.filter((r) => r.test(value)).length;
  const pct = (score / rules.length) * 100;
  const label = score <= 2 ? "Weak" : score < rules.length ? "Medium" : "Strong";
  // Brand-themed via CSS vars (control = black, tenant/client = blue).
  const brand = "var(--button-primary-color, var(--color-primary, #004aba))";
  const muted = "var(--color-muted, #98a2b3)";
  return (
    <div className="password-strength" style={{ marginTop: 6 }}>
      <div style={{ height: 6, background: "var(--input-border, #e5e7eb)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: brand, transition: "width .2s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: brand, fontWeight: 600 }}>{label} password</span>
      <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", fontSize: 11 }}>
        {rules.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.label} style={{ color: ok ? brand : muted }}>
              {ok ? "✓" : "○"} {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

PasswordStrength.propTypes = {
  value: PropTypes.string,
  minLength: PropTypes.number,
};

// Confirm-password indicator. The confirm field enforces the SAME strength rules
// as the password field (see confirmPasswordSchema), so repeating the whole
// checklist here would just be noise — all that's left to tell the user is
// whether the two entries match.
const PasswordMatch = ({ value, matchValue, showMismatch = false }) => {
  if (!value) return null;
  const ok = value === matchValue;
  // A ✓ is welcome the moment the two agree, but don't nag with a ✕ while the
  // user is still typing the confirmation — hold it until they leave the field.
  if (!ok && !showMismatch) return null;
  const good = "var(--button-primary-color, var(--color-primary, #004aba))";
  const bad = "var(--color-danger, #ef4444)";
  return (
    <div
      className="password-match"
      style={{
        marginTop: 6,
        fontSize: 12,
        fontWeight: 600,
        color: ok ? good : bad,
      }}
    >
      {ok ? "✓ Passwords match" : "✕ Passwords do not match"}
    </div>
  );
};

PasswordMatch.propTypes = {
  value: PropTypes.string,
  matchValue: PropTypes.string,
  showMismatch: PropTypes.bool,
};

const PasswordInput = ({
  label,
  required = false,
  onBlur,
  placeholder,
  className = "",
  error = "",
  type: _type,
  showStrength = false,
  // Override the length rule the checklist shows. Defaults to the shared
  // policy; the administrator password screen passes its stricter minimum so
  // the checklist matches the schema that will actually judge the input.
  minLength = DEFAULT_PASSWORD_MIN_LENGTH,
  // Pass the password field's current value to render a "passwords match"
  // indicator under a confirm-password field.
  matchValue,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [typedValue, setTypedValue] = useState(props.value || "");
  // Controlled usage (a `value` prop) is the source of truth — `typedValue` only
  // tracks uncontrolled inputs (react-hook-form `register`) and wouldn't reset
  // when the parent clears the field.
  const currentValue = props.value !== undefined ? props.value : typedValue;

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <div className="input-group">
      {label && <label className="input-label">{label}<RequiredMark required={required} /></label>}
      <div className="password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          className={`input-text ${className} ${error ? "input-error" : ""}`}
          placeholder={placeholder}
          aria-required={required || undefined}
          {...props}
          onInput={(e) => setTypedValue(e.target.value)}
          onBlur={(e) => {
            setBlurred(true);
            onBlur?.(e);
          }}
        />
        <button
          type="button"
          className="toggle-password"
          onClick={toggleShowPassword}
          role="button"
          tabIndex={0}
          aria-label={showPassword ? "Hide password" : "Show password"}
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
      {showStrength && (
        <PasswordStrength value={currentValue} minLength={minLength} />
      )}
      {matchValue !== undefined && (
        <PasswordMatch
          value={currentValue}
          matchValue={matchValue}
          showMismatch={blurred}
        />
      )}
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

PasswordInput.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string,
  showStrength: PropTypes.bool,
  minLength: PropTypes.number,
  matchValue: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
};

// Multi-Select Input Component
const MultiSelectInput = ({
  label,
  required = false,
  options = [],
  value = [],
  onChange,
  placeholder = "Select...",
  error = "",
  usePortal = false,
  dropDirection = "down",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState(null);
  const containerRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateDropdownPosition = React.useCallback(() => {
    if (!usePortal || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // The stylesheet positions the dropdown for the non-portal case with
    // `position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px`.
    // When portalled we switch to `position: fixed`, so those leftovers must be
    // cleared explicitly — otherwise `top: 100%` (now 100% of the viewport)
    // fights the `bottom`/`top` we set here and the dropdown collapses to zero
    // height, which makes it look like it never opens.
    const base = {
      position: "fixed",
      left: rect.left,
      right: "auto",
      top: "auto",
      bottom: "auto",
      marginTop: 0,
      width: rect.width,
      zIndex: 99999,
    };
    if (dropDirection === "up") {
      setDropdownPos({
        ...base,
        bottom: window.innerHeight - rect.top + 4,
      });
    } else {
      setDropdownPos({
        ...base,
        top: rect.bottom + 4,
      });
    }
  }, [usePortal, dropDirection]);

  // Measure before paint so the dropdown never flashes at its unpositioned
  // (stylesheet) location before the fixed coordinates are applied.
  React.useLayoutEffect(() => {
    if (isOpen && usePortal) {
      updateDropdownPosition();
    }
  }, [isOpen, usePortal, updateDropdownPosition]);

  const handleToggle = (optionValue) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
  };

  const handleRemove = (optionValue) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = options.filter((o) => value.includes(o.value));

  const dropdownContent = isOpen ? (
    <div
      className="multi-select-dropdown"
      ref={dropdownRef}
      style={usePortal && dropdownPos ? dropdownPos : undefined}
    >
      {options.length === 0 ? (
        <div className="multi-select-option multi-select-empty">No options available</div>
      ) : (
        options.map((option) => (
          <label key={option.value} className="multi-select-option">
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))
      )}
    </div>
  ) : null;

  return (
    <div className="input-group" ref={containerRef}>
      {label && <label className="input-label">{label}<RequiredMark required={required} /></label>}
      <div
        ref={triggerRef}
        className={`multi-select-trigger ${error ? "input-error" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedLabels.length > 0 ? (
          <div className="multi-select-tags">
            {selectedLabels.map((item) => (
              <span key={item.value} className="multi-select-tag">
                {item.label}
                <button
                  type="button"
                  className="multi-select-tag-remove"
                  aria-label="Remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.value);
                  }}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="multi-select-placeholder">{placeholder}</span>
        )}
      </div>
      {usePortal
        ? dropdownPos && createPortal(dropdownContent, document.body)
        : dropdownContent}
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

MultiSelectInput.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  usePortal: PropTypes.bool,
  dropDirection: PropTypes.oneOf(["up", "down"]),
};

// Exports
export {
  RequiredMark,
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
  SearchInput,
  RadioInput,
  PasswordInput,
  MultiSelectInput,
};
