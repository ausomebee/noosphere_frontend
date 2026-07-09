import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../SuperAdmin.css";
import api from "../../../api/authApis";
import useAuth from "../../../hooks/useAuth";
import { showToast, showApiError } from "../../../Helper/ShowToast";

// Yup validation schema for OTP
const otpSchema = yup.object().shape({
  code: yup
    .string()
    .required("OTP is required")
    .matches(/^\d{6}$/, "OTP must be a 6-digit number"),
});

const SuperAdmin2FAAuthenticatorLogin = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  // Form setup with react-hook-form and yup
  const {
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  // Handle OTP input change
  const handleCodeChange = (index, value) => {
    const newCode = [...code];
    if (/^\d?$/.test(value)) {
      newCode[index] = value;
      setCode(newCode);
      // Only judge the code once every box is filled — validating mid-entry
      // told the user "OTP must be a 6-digit number" after their first digit.
      const complete = newCode.every((d) => d !== "");
      setValue("code", newCode.join(""), { shouldValidate: complete });
      if (!complete) clearErrors("code");

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  // Handle key down events for OTP input
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle paste event for OTP input
  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = pastedData.split("");
    while (newCode.length < 6) newCode.push("");
    setCode(newCode);
    const complete = newCode.every((d) => d !== "");
    setValue("code", newCode.join(""), { shouldValidate: complete });
    if (!complete) clearErrors("code");
    inputRefs.current[pastedData.length - 1]?.focus();
  };

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.Admin2FAVerify({
        userId,
        token: data.code,
      });
      if (response.data.status === "ok") {
        showToast("OTP verification successful!", "success");
        navigate("/tenants/pipeline"); // Adjust to dashboard or next step
      } else {
        throw new Error("Verification failed.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("2FA verification failed:", error);
      showApiError(error, "VERIFY_2FA");
    } finally {
      setLoading(false);
    }
  };

  // Handle "Can't access authenticator app?" link
  const handleCantAccess = (e) => {
    e.preventDefault();
    // navigate("/SA/alternate-2fa"); // Adjust the route as needed
    // showToast("Redirecting to alternate 2FA options.", "success");
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Two-Factor Authentication</h2>
        <p className="subtitle">
          Please generate a 6-digit code from your authenticator app and input it below
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="code-input-container">
            {code.map((digit, index) => (
              <React.Fragment key={index}>
                <input
                  id={`code-input-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`code-input ${errors.code ? "input-error" : ""}`}
                  ref={(el) => (inputRefs.current[index] = el)}
                />
                {index === 2 && <span className="code-separator">-</span>}
              </React.Fragment>
            ))}
            
          </div>
          {errors.code && <p className="error-message">{errors.code.message}</p>}
          <Button
            type="submit"
            label="Continue"
            variant="primary"
            className="auth-button"
            loading={loading}
          />
          <p className="cant-access">
            <a href="#" onClick={handleCantAccess}>
              Can't access authenticator app?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SuperAdmin2FAAuthenticatorLogin;