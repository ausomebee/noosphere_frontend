import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import TenantLogo from "../../../assets/Logo.svg";
import "../../Authentication/Auth.css";
import api from "../../../api/authApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";

// Yup validation schema for OTP
const otpSchema = yup.object().shape({
  code: yup
    .string()
    .required("OTP is required")
    .matches(/^\d{6}$/, "OTP must be a 6-digit number"),
});

const Admin2FAAuthenticatorLogin = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  // Form setup with react-hook-form and yup
  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
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
      setValue("code", newCode.join(""), { shouldValidate: true });

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
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = pastedData.split("");
    while (newCode.length < 6) newCode.push("");
    setCode(newCode);
    setValue("code", newCode.join(""), { shouldValidate: true });
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
        navigate("/dashboard");
      } else {
        throw new Error("Verification failed.");
      }
    } catch (error) {
      console.error("2FA verification failed:", error);
      showToast(
        error?.response?.data?.message || "Verification failed.",
        "error"
      );
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
    <div className="page-wrapper">
      <div className="page-container">
        <div className="auth-logo-container">
          <img src={TenantLogo} alt="Logo" className="logo" />
        </div>
        <div className="main-container">
          <div className="content-wrapper">
            <div className="promo-section">
              <h1>The all-in-one ABA Practice Management Solution</h1>
            </div>
            <div className="login-section">
              <h2>Two-Factor Authentication</h2>
              <p className="subtitle">
                Please generate a 6-digit code from your authenticator app and
                input it below
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
                        onChange={(e) =>
                          handleCodeChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`code-input ${
                          errors.code ? "input-error" : ""
                        }`}
                        ref={(el) => (inputRefs.current[index] = el)}
                      />
                      {index === 2 && <span className="code-separator">-</span>}
                    </React.Fragment>
                  ))}
                </div>
                {errors.code && (
                  <p className="auth-error-message">{errors.code.message}</p>
                )}
                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  loading={loading}
                  className="w-full"
                />
                <p className="cant-access">
                  <a href="#" onClick={handleCantAccess}>
                    Can't access authenticator app?
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin2FAAuthenticatorLogin;
