import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import { TextInput } from "../../../Components/Input/Inputs";
import TenantLogo from "../../../assets/Logo.svg";
import "../../Authentication/Auth.css";
import api from "../../../api/authApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import { connectSocket } from "../../../api/socketService";
import AccountAccessMessage from "../../../Helper/accountAccessMessage";

// Yup validation schema for security answer
const answerSchema = yup.object().shape({
  answer: yup
    .string()
    .required("Answer is required")
    .min(3, "Answer must be at least 3 characters"),
});

const Admin2FAQuestionLogin = () => {
  const { userId, accessToken, tenantId, authQuestion, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCantAccess, setShowCantAccess] = useState(false);

  // Form setup with react-hook-form and yup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(answerSchema),
  });

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.Admin2FAVerifySecretMessage({
        userId,
        secret: data.answer,
        authQuestion: authQuestion
      });
      if (response.data.status === "ok") {
        showToast("Security question verified successfully!", "success");
        connectSocket({ accessToken, userId, tenantId });
        navigate("/dashboard");
      } else {
        throw new Error("Verification failed.");
      }
    } catch (error) {
      console.error("2FA verification failed:", error);
      const message = error?.response?.data?.message || "Verification failed.";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle "Forgot your security answer?" link. Reveal a role-aware message
  // telling the user how to recover access.
  const handleForgotAnswer = (e) => {
    e.preventDefault();
    setShowCantAccess(true);
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
              {showCantAccess ? (
                <AccountAccessMessage
                  role={role}
                  onBack={() => setShowCantAccess(false)}
                />
              ) : (
                <>
              <h2>Two-Factor Authentication</h2>
              <p className="subtitle">Please answer your security question</p>
              <p className="security-question">{authQuestion || "No question available"}</p>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="auth-container">
                  <TextInput
                    required
                    label="Your Answer"
                    id="security-answer"
                    placeholder="Enter your answer"
                    {...register("answer")}
                    className={`input-text ${errors.answer ? "input-error" : ""}`}
                  />
                  {errors.answer && (
                    <p className="auth-error-message">{errors.answer.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  className="w-full"
                  loading={loading}
                />
                <p className="forgot-answer">
                  <a href="#" onClick={handleForgotAnswer}>
                    Forgot your security answer?
                  </a>
                </p>
              </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin2FAQuestionLogin;