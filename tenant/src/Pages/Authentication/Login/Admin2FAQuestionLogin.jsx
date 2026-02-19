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

// Yup validation schema for security answer
const answerSchema = yup.object().shape({
  answer: yup
    .string()
    .required("Answer is required")
    .min(3, "Answer must be at least 3 characters"),
});

const Admin2FAQuestionLogin = () => {
  const { userId, authQuestion } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form setup with react-hook-form and yup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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

  // Handle "Forgot answer?" link
  const handleForgotAnswer = (e) => {
    e.preventDefault();
    // navigate("/SA/forgot-security-answer");
    // showToast("Redirecting to reset security answer.", "success");
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
              <p className="subtitle">Please answer your security question</p>
              <p className="security-question">{authQuestion || "No question available"}</p>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="auth-container">
                  <TextInput
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
                    Forgot answer?
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

export default Admin2FAQuestionLogin;