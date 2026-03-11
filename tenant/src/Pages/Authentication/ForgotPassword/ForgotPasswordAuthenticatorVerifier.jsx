import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import TenantLogo from "../../../assets/Logo.svg";
import "../../Authentication/Auth.css";
import api from "../../../api/authApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";

const otpSchema = yup.object().shape({
  code: yup
    .string()
    .required("OTP is required")
    .matches(/^\d{6}$/, "OTP must be a 6-digit number"),
});

const ForgotPasswordAuthenticatorVerifier = () => {
  const { userId: authUserId } = useAuth();
  const location = useLocation();
  const userId = location.state?.userId || authUserId;
  const navigate = useNavigate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // Track verification success
  const inputRefs = useRef([]);

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

  const handleCodeChange = (index, value) => {
    const newCode = [...code];
    if (/^\d?$/.test(value)) {
      newCode[index] = value;
      setCode(newCode);
      setValue("code", newCode.join(""), { shouldValidate: true });

      if (value && index < 5) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = pastedData.split("");
    while (newCode.length < 6) newCode.push("");
    setCode(newCode);
    setValue("code", newCode.join(""), { shouldValidate: true });
    inputRefs.current[pastedData.length - 1]?.focus();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.Admin2FAVerify({
        userId,
        token: data.code,
      });
      if (response.data.status === "ok") {
        showToast("OTP verification successful!", "success");
        setIsVerified(true);
      } else {
        throw new Error("Verification failed.");
      }
    } catch (error) {
      console.error("2FA verification failed:", error);
      showToast(error?.response?.data?.message || "Verification failed.", "error");
      setIsVerified(false);
    } finally {
      setLoading(false);
      setStep(2); // Move to result step
    }
  };

  const handleNext = () => {
    if (isVerified) {
      navigate("/"); // Navigate to login page on success
    } else {
      setStep(1); // Return to step 1 on failure to try again
    }
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
              {step === 1 && (
                <>
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
                    {errors.code && <p className="auth-error-message">{errors.code.message}</p>}
                    <Button
                      type="submit"
                      label="Continue"
                      variant="primary"
                      className="w-full"
                      loading={loading}
                    />
                  </form>
                </>
              )}
              {step === 2 && (
                <>
                  {loading ? (
                    <p>Loading...</p>
                  ) : isVerified ? (
                    <>
                      <div className="icon success-icon">✔</div>
                      <h2>Verification successful!</h2>
                      <p className="confirmation-message">You can now proceed to login</p>
                      <Button
                        label="Login"
                        variant="primary"
                        className="w-full"
                        onClick={handleNext}
                      />
                    </>
                  ) : (
                    <>
                      <div className="icon failure-icon">✖</div>
                      <h2>Unable to verify your identity</h2>
                      <p className="confirmation-message">
                        Unfortunately we cannot verify your identity. Please contact the support team for further assistance
                        
                      </p>
                      <p className="font-bold">Email: support@noosphere.com</p>
                      <Button
                        label="Try Again"
                        variant="primary"
                        className="w-full"
                        onClick={handleNext}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordAuthenticatorVerifier;