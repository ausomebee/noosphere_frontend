import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import TenantLogo from "../../../assets/Logo.svg";
import { TextInput } from "../../../Components/Input/Inputs";
import "../../Authentication/Auth.css";
import api from "../../../api/authApis";
import { showToast } from "../../../Helper/ShowToast";

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
      if (response.data.message === "Reset link sent to email") {
        showToast("Password reset email sent successfully!", "success");
      } else {
        throw new Error("Failed to initiate password reset.");
      }
    } catch (error) {
      console.error("Password reset failed:", error);
      const message =
        error?.response?.data?.message ||
        "Failed to send password reset email.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const rememberPassword = () => {
    navigate("/");
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
              <h2>Forgot Password</h2>
              <p className="subtitle">
                Please enter your email to reset your password
              </p>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="auth-container">
                  <TextInput
                    required
                    label="Email"
                    id="email"
                    placeholder="olivia@therapyco.com"
                    {...register("email")}
                    className={`input-text ${
                      errors.email ? "input-error" : ""
                    }`}
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
                  className="w-full"
                  loading={loading}
                />
              </form>
              <p className="cant-access ">
                <a href="#" onClick={rememberPassword}>
                  Remember Password?
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
