import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import Select, { components } from "react-select";
import { GoCalendar } from "react-icons/go";

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

/* =====================  TextInput  ===================== */
const TextInput = ({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  className = "",
  width,
  error,
  ...props
}) => {
  const widthClass = width && width !== "full" ? `w-${width}` : "w-full";
  const inlineStyle =
    !isNaN(Number(width)) && width !== "full" ? { width: `${width}px` } : {};

  return (
    <div className="input-group" >
      {label && <label className="input-group-label">{label}<RequiredMark required={required} /></label>}
      <input
        type="text"
        className={`form-control ${widthClass} ${className}`}
        style={inlineStyle}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-required={required || undefined}
        {...props}
      />
      {error && (
        <div className="auth-error-message text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

TextInput.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  width: PropTypes.oneOf(["150", "200", "250", "300", "full"]),
  className: PropTypes.string,
  error: PropTypes.string,
};

/* =====================  PasswordInput  ===================== */
// Shared password policy: min 8 + uppercase + lowercase + digit + special char.
// "Special" is any non-alphanumeric character. This must stay in lockstep with
// `passwordSchema` in src/Helper/passwordValidation.js — if the two drift, this
// checklist can mark a rule unmet for a password the schema happily accepts.
export const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export const PASSWORD_RULES = [
  { test: (v) => (v || "").length >= 8, label: "At least 8 characters" },
  { test: (v) => /[A-Z]/.test(v || ""), label: "One uppercase letter" },
  { test: (v) => /[a-z]/.test(v || ""), label: "One lowercase letter" },
  { test: (v) => /\d/.test(v || ""), label: "One number" },
  { test: (v) => SPECIAL_CHAR_REGEX.test(v || ""), label: "One special character" },
];

const PasswordStrength = ({ value }) => {
  if (!value) return null;
  const score = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const pct = (score / PASSWORD_RULES.length) * 100;
  const label =
    score <= 2 ? "Weak" : score < PASSWORD_RULES.length ? "Medium" : "Strong";
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
        {PASSWORD_RULES.map((r) => {
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

PasswordStrength.propTypes = { value: PropTypes.string };

// Confirm-password indicator. The confirm field enforces the SAME strength rules
// as the password field (see confirmPasswordSchema), so repeating the whole
// checklist here would just be noise — all that's left to tell the user is
// whether the two entries match.
const PasswordMatch = ({ value, matchValue }) => {
  if (!value) return null;
  const ok = value === matchValue;
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
};

const PasswordInput = ({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  className = "",
  error,
  type: _type,
  showStrength = false,
  // Pass the password field's current value to render a "passwords match"
  // indicator under a confirm-password field.
  matchValue,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [typedValue, setTypedValue] = useState(value || "");
  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  // Controlled usage (a `value` prop) is the source of truth — `typedValue` only
  // tracks uncontrolled inputs (react-hook-form `register`) and wouldn't reset
  // when the parent clears the field.
  const currentValue = value !== undefined ? value : typedValue;

  return (
    <div className="input-group">
      {label && <label className="input-group-label">{label}<RequiredMark required={required} /></label>}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={`form-control ${className}`}
          value={value}
          onChange={onChange}
          onInput={(e) => setTypedValue(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: "40px" }}
          aria-required={required || undefined}
          {...props}
        />
        <button type="button" onClick={togglePasswordVisibility} aria-label={showPassword ? "Hide password" : "Show password"} className="password-toggle-btn">
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
            aria-hidden="true"
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
        </button>
      </div>
      {showStrength && <PasswordStrength value={currentValue} />}
      {matchValue !== undefined && (
        <PasswordMatch value={currentValue} matchValue={matchValue} />
      )}
      {error && (
        <div className="auth-error-message text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

PasswordInput.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
  showStrength: PropTypes.bool,
  matchValue: PropTypes.string,
};

const SelectInput = ({
  label,
  required = false,
  value,
  onChange,
  options,
  width,
  className = "",
  error,
  isMulti = false,
  emptyHint,
  placeholder = typeof label === "string" && label
    ? `-- Select ${label} --`
    : "Select an option…",
  ...props
}) => {
  const selectRef = useRef(null);
  const [menuPlacement, setMenuPlacement] = useState("bottom");
  const [menuMaxHeight, setMenuMaxHeight] = useState(200);

  /* ---------- 1.  Stable callback ---------- */
  const updateMenuPlacement = useCallback(() => {
    if (!selectRef.current) return;

    const rect           = selectRef.current.getBoundingClientRect();
    const windowHeight   = window.innerHeight;
    const spaceBelow     = windowHeight - rect.bottom;
    const spaceAbove     = rect.top;
    const menuHeight     = Math.min(300, windowHeight * 0.5);

    setMenuPlacement(
      spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "bottom" : "top"
    );
    setMenuMaxHeight(menuHeight);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- 2.  Stable effect ---------- */
  useEffect(() => {
    updateMenuPlacement(); // initial measure

    window.addEventListener("resize",  updateMenuPlacement);
    window.addEventListener("scroll",  updateMenuPlacement, true);

    return () => {
      window.removeEventListener("resize", updateMenuPlacement);
      window.removeEventListener("scroll", updateMenuPlacement, true);
    };
  }, [updateMenuPlacement]);

  /* ---------- 3.  Rest of your logic ---------- */
  // Drop any manually-added empty/placeholder option (value === "") so the
  // component's own "-- Select {label} --" placeholder shows consistently.
  const cleanOptions = Array.isArray(options)
    ? options.filter((o) => o && o.value !== "")
    : [];

  const selected = isMulti
    ? (value || []).map((v) => cleanOptions.find((o) => o.value === v))
    : cleanOptions.find((o) => o.value === value) || null;

  const handleChange = (newVal) => {
    const v = isMulti ? newVal.map((i) => i.value) : newVal?.value || "";
    onChange?.({ target: { name: props.name, value: v } });
  };

  const widthClass = width && width !== "full" ? `w-${width}` : "w-full";

  const MultiValueContainer = (p) => (
    <components.MultiValueContainer {...p}>
      <span className="selected-label-item">{p.children}</span>
    </components.MultiValueContainer>
  );

  const Option = isMulti
    ? (p) => (
        <components.Option {...p}>
          <input
            type="checkbox"
            checked={p.isSelected}
            onChange={() => null}
            style={{ marginRight: 8 }}
          />
          <label>{p.label}</label>
        </components.Option>
      )
    : components.Option;

  /* ---------- 4.  JSX identical to yours ---------- */
  return (
    <div className={`input-group ${widthClass}`} ref={selectRef}>
      {label && <label className="input-group-label">{label}<RequiredMark required={required} /></label>}
      <div className="select-input-wrapper">
        <Select
          className={`input-select ${className}`}
          classNamePrefix="rs"
          options={cleanOptions}
          value={selected}
          onChange={handleChange}
          isMulti={isMulti}
          menuPosition="absolute"
          menuPlacement={menuPlacement}
          placeholder={placeholder}
          noOptionsMessage={() => emptyHint || "No options"}
          components={{
            Option,
            MultiValueContainer,
            IndicatorSeparator: () => null,
            ClearIndicator: () => null,
            DropdownIndicator: () => null,
          }}
          styles={{
            control: (base) => ({
              ...base,
              border: 0,
              boxShadow: "none",
              background: "transparent",
              minHeight: isMulti ? 20 : 20,
              borderRadius: 12,
              padding: "0 6px",
              cursor: "pointer",
            }),
            menu: (base) => ({
              ...base,
              margin: 0,
              width: selectRef.current?.offsetWidth || "auto",
              maxHeight: `${menuMaxHeight}px`,
            }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            valueContainer: (base) => ({
              ...base,
              padding: 0,
              flexWrap: isMulti ? "wrap" : "nowrap",
              overflow: "hidden",
            }),
            multiValue: () => ({ background: "transparent" }),
            placeholder: (base) => ({ ...base, color: "#999" }),
          }}
          menuPortalTarget={document.body}
          closeMenuOnSelect={!isMulti}
          hideSelectedOptions={false}
          onMenuOpen={updateMenuPlacement}
          {...props}
        />
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
  required: PropTypes.bool,
  label: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
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
  isMulti: PropTypes.bool,
  placeholder: PropTypes.string,
};

/* =====================  rest of components unchanged  ===================== */
const SearchableSelectInput = ({
  label,
  required = false,
  value,
  onChange,
  options,
  width,
  className = "",
  error,
  emptyHint,
  placeholder = typeof label === "string" && label
    ? `-- Select ${label} --`
    : "Search options…",
  disabled, // ✅ ADDED
  ...props
}) => {
  const selectRef = useRef(null);
  const [menuPlacement, setMenuPlacement] = useState("bottom");
  const [menuMaxHeight, setMenuMaxHeight] = useState(200); // Default max height

  const cleanOptions = Array.isArray(options)
    ? options.filter((o) => o && o.value !== "")
    : [];

  const selected = cleanOptions.find((o) => o.value === value) || null;

  const handleChange = (newVal) => {
    onChange?.({ target: { name: props.name, value: newVal?.value || "" } });
  };

  const widthClass = width && width !== "full" ? `w-${width}` : "w-full";

  // Calculate menu placement and max height
  const updateMenuPlacement = () => {
    if (!selectRef.current) return;

    const rect = selectRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuHeight = Math.min(300, windowHeight * 0.5); // Max 300px or 50% of viewport height

    // Set placement: prefer bottom if enough space, otherwise top
    setMenuPlacement(
      spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "bottom" : "top"
    );
    setMenuMaxHeight(menuHeight);
  };

  useEffect(() => {
    updateMenuPlacement();
    window.addEventListener("resize", updateMenuPlacement);
    window.addEventListener("scroll", updateMenuPlacement);
    return () => {
      window.removeEventListener("resize", updateMenuPlacement);
      window.removeEventListener("scroll", updateMenuPlacement);
    };
  }, []);

  return (
    <div className={`input-group ${widthClass}`} ref={selectRef}>
      {label && <label className="input-group-label">{label}<RequiredMark required={required} /></label>}
      <div className="select-input-wrapper">
        <Select
          className={`input-select ${className}`}
          classNamePrefix="rs"
          options={cleanOptions}
          value={selected}
          onChange={handleChange}
          placeholder={placeholder}
          noOptionsMessage={() => emptyHint || "No options"}
          isSearchable
          isDisabled={disabled} // ✅ ADDED
          menuPosition="absolute"
          menuPlacement={menuPlacement}
          components={{
            IndicatorSeparator: () => null,
            ClearIndicator: () => null,
            DropdownIndicator: () => null,
          }}
          styles={{
            control: (base, state) => ({
              ...base,
              border: 0,
              boxShadow: "none",
              background: "transparent",
              minHeight: 36,
              borderRadius: 12,
              padding: "0 8px",
              cursor: state.isDisabled ? "not-allowed" : "pointer", // ✅ ADDED
              opacity: state.isDisabled ? 0.5 : 1, // Optional: visual feedback
            }),
            menu: (base) => ({
              ...base,
              margin: 0,
              width: selectRef.current?.offsetWidth || "auto", // Match input width
              maxHeight: `${menuMaxHeight}px`,
            }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            valueContainer: (base) => ({
              ...base,
              padding: 0,
              overflow: "hidden",
            }),
            placeholder: (base) => ({ ...base, color: "#999" }),
          }}
          menuPortalTarget={document.body}
          onMenuOpen={updateMenuPlacement}
          {...props}
        />
      </div>
      {error && (
        <div className="auth-error-message text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

SearchableSelectInput.propTypes = {
  required: PropTypes.bool,
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
  placeholder: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool, // ✅ ADDED
};

const CheckboxInput = ({ label, checked, onChange, error, ...props }) => (
  <div className="flex-col">
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
    {error && (
      <div className="auth-error-message text-red-500 text-xs mt-1">
        {error}
      </div>
    )}
  </div>
);

CheckboxInput.propTypes = {
  label: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
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

const TextareaInput = ({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  row = "5",
  error,
  ...props
}) => (
  <div className="input-group">
    {label && <label className="input-group-label">{label}<RequiredMark required={required} /></label>}
    <textarea
      className="input-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={row}
      aria-required={required || undefined}
      {...props}
    />
    {error && (
      <div className="auth-error-message text-red-500 text-xs mt-1">
        {error}
      </div>
    )}
  </div>
);

TextareaInput.propTypes = {
  required: PropTypes.bool,
  label: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
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
  error,
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
    {error && (
      <div className="auth-error-message text-red-500 text-xs mt-1">
        {error}
      </div>
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
  error: PropTypes.string,
};

const TimeInput = ({
  value = { hours: 0, minutes: 0, seconds: 0 },
  onChange,
  disabled,
}) => {
  const [time, setTime] = useState(value);

  useEffect(() => {
    setTime(value);
  }, [value]);

  const handleChange = (field, val) => {
    const newValue = Math.max(
      0,
      Math.min(parseInt(val) || 0, field === "hours" ? 23 : 59)
    );
    const newTime = { ...time, [field]: newValue };
    setTime(newTime);
    onChange(newTime);
  };

  const formatTime = () => {
    return `${time.hours.toString().padStart(2, "0")}:${time.minutes
      .toString()
      .padStart(2, "0")}:${time.seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        value={time.hours}
        onChange={(e) => handleChange("hours", e.target.value)}
        min="0"
        max="23"
        disabled={disabled}
        className="w-50 p-4 border rounded-md text-center"
      />
      <span>:</span>
      <input
        type="text"
        value={time.minutes}
        onChange={(e) => handleChange("minutes", e.target.value)}
        min="0"
        max="59"
        disabled={disabled}
        className="w-50 p-4 border rounded-md text-center"
      />
      <span>:</span>
      <input
        type="text"
        value={time.seconds}
        onChange={(e) => handleChange("seconds", e.target.value)}
        min="0"
        max="59"
        disabled={disabled}
        className="w-50 p-4 border rounded-md text-center"
      />
      <span className="ml-2 text-sm text-gray-600">{formatTime()}</span>
    </div>
  );
};

TimeInput.propTypes = {
  value: PropTypes.shape({
    hours: PropTypes.number,
    minutes: PropTypes.number,
    seconds: PropTypes.number,
  }),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

TimeInput.defaultProps = {
  value: { hours: 0, minutes: 0, seconds: 0 },
  disabled: false,
};

const CustomDatePickerInput = ({
  value,
  onClick,
  placeholder,
  error,
  onFocus,
}) => {
  const inputRef = useRef(null);

  const handleClick = (e) => {
 
    if (onClick) onClick(e);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <>
      <div className="custom-datepicker-input-container">
        <input
          type="text"
          value={value}
          onClick={handleClick}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`custom-datepicker-input ${
            error ? "custom-datepicker-input-error" : ""
          }`}
          ref={inputRef}
          readOnly // Explicitly set to read-only
        />
        <GoCalendar className="custom-datepicker-icon" />
      </div>
      {error && (
        <div className="auth-error-message text-red-500 text-xs mt-1">
          {error.message || error} {/* Handle error as object or string */}
        </div>
      )}
    </>
  );
};

CustomDatePickerInput.propTypes = {
  value: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
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
  TimeInput,
  CustomDatePickerInput,
};
