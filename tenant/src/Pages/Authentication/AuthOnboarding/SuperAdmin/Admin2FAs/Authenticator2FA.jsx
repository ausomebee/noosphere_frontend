import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import QRCode from "react-qr-code";
import Button from "../../../../../Components/Button/Button";
import TenantLogo from "../../../../../assets/Logo.svg";
import "../../../Auth.css";
import { useNavigate } from "react-router-dom";
import api from "../../../../../api/authApis";
import useAuth from "../../../../../hooks/useAuth";
import { showToast } from "../../../../../Helper/ShowToast";

const TOTP_PERIOD_MS = 30_000;

const Authenticator2FA = () => {
  const { userId, superAdmin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [secondCode, setSecondCode] = useState(["", "", "", "", "", ""]);
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [otpPhase, setOtpPhase] = useState(1);
  const [firstOtp, setFirstOtp] = useState(""); // Store first OTP for comparison
  // The authenticator app rolls its code every 30 seconds and the backend
  // rejects a code that was already spent, so the second phase has to use the
  // *next* code. Remember which 30s window the first code came from and hold
  // the user until that window has rolled over.
  const [firstOtpWindow, setFirstOtpWindow] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const inputRefs = useRef([]);

  const currentWindow = Math.floor(now / TOTP_PERIOD_MS);
  const awaitingNewCode =
    otpPhase === 2 && firstOtpWindow !== null && currentWindow === firstOtpWindow;
  const secondsUntilNewCode = awaitingNewCode
    ? Math.max(1, Math.ceil(((firstOtpWindow + 1) * TOTP_PERIOD_MS - now) / 1000))
    : 0;

  // Only tick while phase 2 is actually waiting for the code to refresh.
  useEffect(() => {
    if (!awaitingNewCode) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [awaitingNewCode]);

  // Fetch QR code on component mount
  useEffect(() => {
    if (step === 1) {
      getQRcode();
    }
  }, []);

  const getQRcode = async () => {
    setLoading(true);
    try {
      const response = await api.Admin2FALink({
        id: userId,
        moduleType: "TENANT",
      });
      setQrCodeValue(response.data.data.qrcode);
    } catch (error) {
      console.error("Could not get QR code:", error);
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (token) => {
    setLoading(true);
    try {
      const response = await api.Admin2FAVerify({
        userId,
        token,
      });
      if (response.data.data === true) {
        showToast(
          `OTP ${otpPhase === 1 ? "first" : "second"} verification successful!`,
          "success"
        );
        return true;
      }
      showToast("Invalid OTP. Please try again.", "error");
      return false;
    } catch (error) {
      console.error("2FA verification failed:", error);
      showToast(
        error?.response?.data?.message || "Verification failed.",
        "error"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value, isSecondPhase = false) => {
    const currentCode = isSecondPhase ? [...secondCode] : [...code];
    if (/^\d?$/.test(value)) {
      currentCode[index] = value;
      isSecondPhase ? setSecondCode(currentCode) : setCode(currentCode);
      if (value && index < 5) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index, e, isSecondPhase = false) => {
    const currentCode = isSecondPhase ? [...secondCode] : [...code];
    if (e.key === "Backspace" && !currentCode[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e, isSecondPhase = false) => {
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = pastedData.split("");
    while (newCode.length < 6) newCode.push("");
    isSecondPhase ? setSecondCode(newCode) : setCode(newCode);
    inputRefs.current[pastedData.length - 1]?.focus();
  };

  const handleOTPSubmit = async () => {
    setLoading(true);
    try {
      const currentCode = otpPhase === 1 ? code.join("") : secondCode.join("");
      if (currentCode.length !== 6) {
        showToast("Please enter a 6-digit code.", "error");
        setLoading(false);
        return;
      }

      if (awaitingNewCode) {
        showToast(
          `Wait ${secondsUntilNewCode}s for your app to show a new code, then enter it.`,
          "error"
        );
        setLoading(false);
        return;
      }

      // Check if second OTP matches first OTP in otpPhase 2
      if (otpPhase === 2 && currentCode === firstOtp) {
        showToast(
          "Please use a different OTP from your authenticator app.",
          "error"
        );
        setSecondCode(["", "", "", "", "", ""]); // Clear second code
        inputRefs.current[0].focus(); // Focus on first input
        setLoading(false);
        return;
      }

      const isValid = await verify2FA(currentCode);
      if (!isValid) {
        setLoading(false);
        return;
      }

      if (otpPhase === 1) {
        setFirstOtp(currentCode); // Store first OTP
        setFirstOtpWindow(Math.floor(Date.now() / TOTP_PERIOD_MS));
        setNow(Date.now());
        setOtpPhase(2);
        setCode(["", "", "", "", "", ""]); // Reset first code
        setSecondCode(["", "", "", "", "", ""]); // Ensure second code is cleared
      } else {
        setStep(3);
        setOtpPhase(1); // Reset for future attempts
        setFirstOtp(""); // Clear stored OTP
        setFirstOtpWindow(null);
        setCode(["", "", "", "", "", ""]);
        setSecondCode(["", "", "", "", "", ""]);
      }
    } catch (error) {
      console.error("Error during OTP submission:", error);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      if (step === 3) {
        navigate("/");
      } else {
        setStep(step + 1);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setOtpPhase(1);
      setFirstOtp(""); // Clear stored OTP
      setFirstOtpWindow(null);
      setCode(["", "", "", "", "", ""]);
      setSecondCode(["", "", "", "", "", ""]);
    }
  };

  const handleNavBack = () => {
    navigate("/auth/2fa-settings");
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
              <h1><span className="hero-line">The all-in-one ABA</span><span className="hero-line">Practice Management</span><span className="hero-line">Solution</span></h1>
            </div>
            <div className="login-section">
              {step === 1 && (
                <>
                  <h2>Secure Your Account with 2FA</h2>
                  <p className="auth-subtitles">
                    To protect administrative access, please configure 2FA for
                    your account. You'll use this during login and for sensitive
                    actions.
                  </p>
                  <div className="qr-code-container">
                    <div className="step-instruction">
                      <p>
                        <span className="step-number">1</span>
                        <span className="step-text">
                          Download an authentication app (e.g., Microsoft
                          Authenticator, Authy, etc.).
                        </span>
                      </p>
                      <p>
                        <span className="step-number">2</span>
                        <span className="step-text">
                          Use your authentication app to scan the QR code shown.
                        </span>
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {qrCodeValue && (
                        <img
                          src={qrCodeValue}
                          alt="QR Code"
                          style={{ width: 300, height: 300 }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between gap-4">
                    <Button
                      label="Back"
                      variant="secondary"
                      onClick={handleNavBack}
                      className="w-full"
                    />
                    <Button
                      label="Continue"
                      variant="primary"
                      onClick={handleContinue}
                      loading={loading}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2>Secure Your Account with 2FA</h2>
                  <p className="auth-subtitle">
                    To protect administrative access, please configure 2FA for
                    your account. You’ll use this during login and for sensitive
                    actions.
                  </p>
                  <p className="auth-subtitle">
                    {otpPhase === 1
                      ? "Enter the code currently showing in your app to confirm the setup."
                      : "This second code must be a different one. Your app refreshes its code every 30 seconds \u2014 wait for it to change, then enter the new code."}
                  </p>
                  {otpPhase === 2 && (
                    <p className="otp-wait-notice" role="status" aria-live="polite">
                      {awaitingNewCode
                        ? `Your app is still showing the code you just used. A new code appears in ${secondsUntilNewCode}s.`
                        : "Your app is now showing a new code \u2014 enter it below."}
                    </p>
                  )}
                  <div className="code-input-container">
                    {(otpPhase === 1 ? code : secondCode).map(
                      (digit, index) => (
                        <React.Fragment key={index}>
                          <input
                            id={`code-input-${index}`}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={(e) =>
                              handleCodeChange(
                                index,
                                e.target.value,
                                otpPhase === 2
                              )
                            }
                            onKeyDown={(e) =>
                              handleKeyDown(index, e, otpPhase === 2)
                            }
                            onPaste={(e) => handlePaste(e, otpPhase === 2)}
                            disabled={awaitingNewCode}
                            className="code-input"
                            ref={(el) => (inputRefs.current[index] = el)}
                          />
                          {index === 2 && (
                            <span className="code-separator">-</span>
                          )}
                        </React.Fragment>
                      )
                    )}
                  </div>
                  <div className="flex justify-between gap-4">
                    <Button
                      label="Back"
                      variant="secondary"
                      onClick={handleBack}
                      className="w-full"
                    />
                    <Button
                      label="Continue"
                      variant="primary"
                      onClick={handleOTPSubmit}
                      loading={loading}
                      disabled={awaitingNewCode}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="success-container">
                    <div className="success-icon">✔</div>
                    <h2>Account creation successful</h2>
                    <p className="subtitle">
                      You can now login to your account
                    </p>
                  </div>
                  <Button
                    label="Login"
                    variant="primary"
                    className="w-full"
                    onClick={handleContinue}
                    loading={loading}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Authenticator2FA;
