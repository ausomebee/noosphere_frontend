import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator.css";
import { SelectInput, TextInput } from "../../../Components/Input/Inputs";
import "../SuperAdmin.css";
import { useNavigate } from "react-router-dom";
import api from "../../../api/authApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";

// Yup validation schema for security question
const securityQuestionSchema = yup.object().shape({
  securityQuestion: yup
    .string()
    .required("Please select a security question")
    .oneOf(
      [
        "What is the name of your first pet?",
        "What was the make of your first car?",
        "What is your mother's maiden name?",
        "What was the name of your elementary school?",
        "What is your favorite book?",
        "In what city were you born?",
        "What was your childhood nickname?",
        "What is the name of your favorite teacher?",
        "What was the first concert you attended?",
        "What is your favorite vacation destination?",
        "What was the name of your first best friend?",
        "What is the name of the street you grew up on?",
        "What was your favorite childhood game?",
        "What is the name of your favorite movie?",
        "What was the first job you ever had?",
        "What is your favorite hobby?",
        "What was the model of your first phone?",
        "What is the name of your favorite restaurant?",
        "What was the name of your high school mascot?",
        "What is your favorite historical figure?",
      ],
      "Please select a valid security question"
    ),
  answer: yup
    .string()
    .required("Answer is required")
    .min(3, "Answer must be at least 3 characters"),
  confirmAnswer: yup
    .string()
    .required("Please confirm your answer")
    .oneOf([yup.ref("answer")], "Answers must match"),
});

const SuperAdmin2FAQuestion = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Security question options for SelectInput
  const securityQuestions = [
    { value: "", label: "Select an option" },
    {
      value: "What is the name of your first pet?",
      label: "What is the name of your first pet?",
    },
    {
      value: "What was the make of your first car?",
      label: "What was the make of your first car?",
    },
    {
      value: "What is your mother's maiden name?",
      label: "What is your mother's maiden name?",
    },
    {
      value: "What was the name of your elementary school?",
      label: "What was the name of your elementary school?",
    },
    {
      value: "What is your favorite book?",
      label: "What is your favorite book?",
    },
    {
      value: "In what city were you born?",
      label: "In what city were you born?",
    },
    {
      value: "What was your childhood nickname?",
      label: "What was your childhood nickname?",
    },
    {
      value: "What is the name of your favorite teacher?",
      label: "What is the name of your favorite teacher?",
    },
    {
      value: "What was the first concert you attended?",
      label: "What was the first concert you attended?",
    },
    {
      value: "What is your favorite vacation destination?",
      label: "What is your favorite vacation destination?",
    },
    {
      value: "What was the name of your first best friend?",
      label: "What was the name of your first best friend?",
    },
    {
      value: "What is the name of the street you grew up on?",
      label: "What is the name of the street you grew up on?",
    },
    {
      value: "What was your favorite childhood game?",
      label: "What was your favorite childhood game?",
    },
    {
      value: "What is the name of your favorite movie?",
      label: "What is the name of your favorite movie?",
    },
    {
      value: "What was the first job you ever had?",
      label: "What was the first job you ever had?",
    },
    {
      value: "What is your favorite hobby?",
      label: "What is your favorite hobby?",
    },
    {
      value: "What was the model of your first phone?",
      label: "What was the model of your first phone?",
    },
    {
      value: "What is the name of your favorite restaurant?",
      label: "What is the name of your favorite restaurant?",
    },
    {
      value: "What was the name of your high school mascot?",
      label: "What was the name of your high school mascot?",
    },
    {
      value: "What is your favorite historical figure?",
      label: "What is your favorite historical figure?",
    },
  ];

  // Form setup for security question
  const {
    register: registerSecurity,
    handleSubmit: handleSecuritySubmit,
    formState: { errors: securityErrors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(securityQuestionSchema),
  });

  // Handle back navigation
  const handleNavBack = () => {
    navigate("/SA/2fa-settings");
  };

  // Handle continue for steps
  const handleContinue = () => {
    // 2FA (security question) is set; the administrative password is handled
    // separately during onboarding, so finish here.
    setStep(4);
  };

  // Handle security question form submission
  const onSecuritySubmit = async (data) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.Admin2FACreateSecretMessage({
        userId,
        secret: data.answer,
        authQuestion: data.securityQuestion,
        module: "ADMIN"
      });
      if (response.data.status === "ok") {
        showToast("Security question set successfully!", "success");
        setStep(2);
      } else {
        throw new Error("Failed to set security question.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("2FA verification failed:", error);
      const message =
        error?.response?.data?.message || "Failed to set security question.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle final step (proceed to login)
  const handleProceedToLogin = () => {
    navigate("/");
    
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth2fas-form-container">
        {step === 1 && (
          <>
            <h2>Two-Factor Authentication (2FA)</h2>
            <p className="subtitle">
              To protect administrative access, please configure 2FA for your
              account. You'll use this during login and for sensitive actions.
            </p>
            <form onSubmit={handleSecuritySubmit(onSecuritySubmit)}>
              <div className="security-question-container">
                <SelectInput
                  required
                  label="Please select a security question"
                  options={securityQuestions}
                  className={securityErrors.securityQuestion ? "input-error" : ""}
                  {...registerSecurity("securityQuestion")}
                />
                {securityErrors.securityQuestion && (
                  <p className="error-message">
                    {securityErrors.securityQuestion.message}
                  </p>
                )}
                <TextInput
                  required
                  label="Your answer"
                  placeholder="Type your answer"
                  className={securityErrors.answer ? "input-error" : ""}
                  {...registerSecurity("answer")}
                />
                {securityErrors.answer && (
                  <p className="error-message">
                    {securityErrors.answer.message}
                  </p>
                )}
                <TextInput
                  required
                  label="Confirm Your answer"
                  placeholder="Confirm your answer"
                  className={securityErrors.confirmAnswer ? "input-error" : ""}
                  {...registerSecurity("confirmAnswer")}
                />
                {securityErrors.confirmAnswer && (
                  <p className="error-message">
                    {securityErrors.confirmAnswer.message}
                  </p>
                )}
                <p className="security-note">
                  Please ensure to use an answer only you would know
                </p>
                {errorMessage && (
                  <p className="error-message">{errorMessage}</p>
                )}
              </div>
              <div className="button-group">
                <Button
                  label="Back"
                  variant="secondary"
                  className="auth-button secondary"
                  onClick={handleNavBack}
                />
                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  className="auth-button"
                  loading={loading}
                />
              </div>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            <div className="success-container">
              <div className="success-icon">✔</div>
              <h2>Verification Successful</h2>
              <p className="subtitle">
                Please follow the next steps to complete the sign-on process.
              </p>
            </div>
            <Button
              label="Continue"
              variant="primary"
              className="auth-button"
              onClick={handleContinue}
              loading={loading}
            />
          </>
        )}
        {step === 4 && (
          <>
            <div className="success-container">
              <div className="success-icon">✔</div>
              <h2>You're all set!</h2>
              <p className="subtitle">
                Congratulations - you have successfully signed on to the Noosphere
                platform as the Administrator. You can now log in to the
                platform.
              </p>
            </div>
            <Button
              label="Proceed to login"
              variant="primary"
              className="auth-button"
              onClick={handleProceedToLogin}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdmin2FAQuestion;