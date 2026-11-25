import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import { TextInput } from "../../../Components/Input/Inputs";
import "../SuperAdmin.css";
import api from "../../../api/authApis";
import { authErrorMessage } from "../../../Helper/authErrors";
import { showToast } from "../../../Helper/ShowToast";

import { showValidationErrors } from "../../../Helper/formErrors";
import BackToLogin from "../../../Components/BackToLogin/BackToLogin";
// Yup validation schema for forgot password
const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
});

const ForgetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form setup with react-hook-form and yup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.AdminForgetPassword({
        email: data.email,
      });
      // The backend answers "ok" whether or not the email has an account (so
      // the page can't be used to find out); older backends sent a fixed
      // message instead. Show whatever the backend said.
      const body = response?.data || {};
      if (body.status === "ok" || body.message === "mail sent successfully") {
        showToast(body.message || "Password reset email sent successfully!", "success");
        navigate("/password-reset-confirmation");
      } else {
        throw new Error(body.message || "Failed to initiate password reset.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Password reset failed:", error);
      const message = authErrorMessage(error, "Failed to send password reset email.");
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Forgot Password</h2>
        <p className="subtitle">Please enter your email to reset your password</p>
        <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
          <div className="auth-container">
            <TextInput
              required
              label="Email"
              id="email"
              placeholder="olivia@therapyco.com"
              {...register("email")}
              className={`input-text ${errors.email ? "input-error" : ""}`}
            />
            {errors.email && (
              <p className="error-message">{errors.email.message}</p>
            )}
            {errorMessage && (
              <p className="error-message">{errorMessage}</p>
            )}
          </div>

          <Button
            type="submit"
            label="Continue"
            variant="primary"
            className="auth-button"
            loading={loading}
          />
        </form>
        <BackToLogin />
      </div>
    </div>
  );
};

export default ForgetPassword;