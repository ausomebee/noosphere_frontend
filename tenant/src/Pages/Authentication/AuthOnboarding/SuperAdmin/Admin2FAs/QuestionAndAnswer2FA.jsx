import React, { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../../../Components/Button/Button";
import TenantLogo from "../../../../../assets/Logo.svg";
import { SelectInput, TextInput } from "../../../../../Components/Input/Inputs";
import "../../../Auth.css";
import { useNavigate } from "react-router-dom";
import api from "../../../../../api/authApis";
import useAuth from "../../../../../hooks/useAuth";
import { showToast } from "../../../../../Helper/ShowToast";

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

const QuestionAndAnswer2FA = () => {
  const { userId, superAdmin } = useAuth();
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
    control,
    formState: { errors: securityErrors },
  } = useForm({
    resolver: yupResolver(securityQuestionSchema),
  });

  // Handle back navigation
  const handleNavBack = () => {
    navigate("/auth/2fa-settings");
  };

  // Handle continue for steps
  const handleContinue = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      if (step === 2) {
        navigate("/");
      } else {
        setStep(step + 1);
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const values = useWatch({ control });

  // Handle security question form submission
  const onSecuritySubmit = async (data) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.Admin2FACreateSecretMessage({
        userId,
        secret: data.answer,
        authQuestion: data.securityQuestion,
        module: "TENANT",
      });
      if (response.data.status === "ok") {
        showToast("Security question set successfully!", "success");
        setStep(2);
      } else {
        throw new Error("Failed to set security question.");
      }
    } catch (error) {
      console.error("2FA verification failed:", error);
      const message =
        error?.response?.data?.message || "Failed to set security question.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
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
                  <h2>Secure your account with 2FA</h2>
                  <p className="auth-subtitles">
                    To protect administrative access, please configure 2FA for
                    your account. You'll use this during login and for sensitive
                    actions.
                  </p>
                  <form onSubmit={handleSecuritySubmit(onSecuritySubmit)}>
                    <div className="security-question-container">
                      <Controller
                        name="securityQuestions"
                        control={control}
                        render={({ field }) => (
                          <SelectInput
                            label="Please select a security question"
                            options={securityQuestions}
                            className={`rounded-12px ${
                              securityErrors.securityQuestion
                                ? "input-error"
                                : ""
                            }`}
                            {...registerSecurity("securityQuestion")}
                            {...field}
                          />
                        )}
                      />
                      {securityErrors.securityQuestion && (
                        <p className="auth-error-message">
                          {securityErrors.securityQuestion.message}
                        </p>
                      )}
                      <TextInput
                        label="Your answer"
                        placeholder="Type your answer"
                        className={securityErrors.answer ? "input-error" : ""}
                        {...registerSecurity("answer")}
                      />
                      {securityErrors.answer && (
                        <p className="auth-error-message">
                          {securityErrors.answer.message}
                        </p>
                      )}
                      <TextInput
                        label="Confirm Your answer"
                        placeholder="Confirm your answer"
                        className={
                          securityErrors.confirmAnswer ? "input-error" : ""
                        }
                        {...registerSecurity("confirmAnswer")}
                      />
                      {securityErrors.confirmAnswer && (
                        <p className="auth-error-message">
                          {securityErrors.confirmAnswer.message}
                        </p>
                      )}
                      <h3 className="security-note">
                        Please ensure to use an answer only you would know
                      </h3>
                      {errorMessage && (
                        <p className="auth-error-message">{errorMessage}</p>
                      )}
                    </div>
                    <div className="flex justify-between gap-4">
                      <Button
                        label="Back"
                        variant="secondary"
                        className="w-full"
                        onClick={handleNavBack}
                      />
                      <Button
                        type="submit"
                        label="Continue"
                        variant="primary"
                        className="w-full"
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
                      Please follow the next steps to complete the sign-on
                      process.
                    </p>
                  </div>
                  <Button
                    label="Continue"
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

export default QuestionAndAnswer2FA;
