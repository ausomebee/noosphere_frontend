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
      if (response.data.message === "mail sent successfully") {
        showToast("Password reset email sent successfully!", "success");
        navigate("/password-reset-confirmation");
      } else {
        throw new Error("Failed to initiate password reset.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Password reset failed:", error);
      const message = error?.response?.data?.message || "Failed to send password reset email.";
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="auth-container">
            <TextInput
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
      </div>
    </div>
  );
};

export default ForgetPassword;