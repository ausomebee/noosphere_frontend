import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../Components/Button/Button";
import { TextInput } from "../../Components/Input/Inputs";
import Logo from "../../assets/NoosphereLogo-white.png";
import "./SuperAdmin.css";
import api from "../../api/authApis";
import useAuth from "../../hooks/useAuth";
import { showToast } from "../../Helper/ShowToast";

import { showValidationErrors } from "../../Helper/formErrors";
// Yup validation schema for security answer
const answerSchema = yup.object().shape({
  answer: yup
    .string()
    .required("Answer is required")
    .min(3, "Answer must be at least 3 characters"),
});

const SuperAdmin2FAQuestionLogin = () => {
  const { userId, user } = useAuth();
  const authQuestion = user?.authQuestion;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
      if (response.data.status ==="ok") {
        showToast("Security question verified successfully!", "success");
        navigate("/tenants/pipeline");
      } else {
        throw new Error("Verification failed.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("2FA verification failed:", error);
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
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Two-Factor Authentication</h2>
        <p className="subtitle">Please answer your security question</p>
        <p className="security-question">{authQuestion || "No question available"}</p>
        <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
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
              <p className="error-message">{errors.answer.message}</p>
            )}
          </div>
          <Button
            type="submit"
            label="Continue"
            variant="primary"
            className="auth-button"
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
  );
};

export default SuperAdmin2FAQuestionLogin;