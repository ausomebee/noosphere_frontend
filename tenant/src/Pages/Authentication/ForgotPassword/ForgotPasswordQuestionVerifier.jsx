import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import TenantLogo from "../../../assets/Logo.svg";
import { TextInput } from "../../../Components/Input/Inputs";
import "../../Authentication/Auth.css";
import api from "../../../api/authApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import AccountAccessMessage from "../../../Helper/accountAccessMessage";
import SectionLoader from "../../../Components/SectionLoader";

import { showValidationErrors } from "../../../Helper/formErrors";
const answerSchema = yup.object().shape({
  answer: yup
    .string()
    .required("Answer is required")
    .min(3, "Answer must be at least 3 characters"),
});

const ForgotPasswordQuestionVerifier = () => {
  const { userId: authUserId, authQuestion: authQuestionFromStore, role: authRole } = useAuth();
  const location = useLocation();
  const userId = location.state?.userId || authUserId;
  const authQuestion = location.state?.authQuestion || authQuestionFromStore;
  // In the forgot-password flow the user isn't in the auth store yet, so the
  // role is threaded through navigation state from the reset-password step;
  // fall back to the auth store for any authenticated entry point.
  const role = location.state?.role ?? authRole;
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // Track verification success

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(answerSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.Admin2FAVerifySecretMessage({
        userId,
        secret: data.answer,
        authQuestion: authQuestion,
      });
      if (response.data.status === "ok") {
        showToast("Security question verified successfully!", "success");
        setIsVerified(true);
      } else {
        throw new Error("Verification failed.");
      }
    } catch (error) {
      console.error("2FA verification failed:", error);
      showToast(
        error?.response?.data?.message || "Verification failed.",
        "error"
      );
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
              <h1><span className="hero-line">The all-in-one ABA</span><span className="hero-line">Practice Management</span><span className="hero-line">Solution</span></h1>
            </div>
            <div className="login-section">
              {step === 1 && (
                <>
                  <h2>Two-Factor Authentication</h2>
                  <p className="subtitle">
                    Please answer your security question
                  </p>
                  <p className="security-question">
                    {authQuestion || "No question available"}
                  </p>
                  <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
                    <div className="auth-container">
                      <TextInput
                        required
                        label="Your Answer"
                        id="security-answer"
                        placeholder="Enter your answer"
                        {...register("answer")}
                        className={`input-text ${
                          errors.answer ? "input-error" : ""
                        }`}
                      />
                      {errors.answer && (
                        <p className="error-message">{errors.answer.message}</p>
                      )}
                    </div>
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
                    <SectionLoader />
                  ) : isVerified ? (
                    <>
                      <div className="icon success-icon">✔</div>
                      <h2>Verification successful!</h2>
                      <p className="confirmation-message">
                        You can now proceed to login
                      </p>
                      <Button
                        label="Login"
                        variant="primary"
                        className="w-full"
                        onClick={handleNext}
                      />
                    </>
                  ) : (
                    <>
                      <AccountAccessMessage role={role} />
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

export default ForgotPasswordQuestionVerifier;
