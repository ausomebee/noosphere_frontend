import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../SuperAdmin.css";

// Yup validation schema for setting new password
const setPasswordSchema = yup.object().shape({
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password"), null], "Passwords must match"),
});

const SetNewPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Extract reset token from URL query parameters
  const query = new URLSearchParams(location.search);
  const token = query.get("token");

  // Form setup with react-hook-form and yup
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    console.log(data)
    navigate("/SA/2fa-question/login")
  }
//   // Handle form submission
//   const onSubmit = async (data) => {
//     if (!token) {
//       console.error("No reset token provided");
//       return;
//     }

//     setLoading(true);

//     try {
//       // Send new password and token to server to update the user's password
//       const response = await fetch("/api/reset-password", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           token,
//           newPassword: data.password,
//         }),
//       });

//       const result = await response.json();
//       if (result.success) {
//         // Navigate to a success page or login page
//         navigate("/"); // Redirect to login after successful password reset
//       } else {
//         throw new Error(result.message || "Failed to reset password. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error resetting password:", error);
//       // For simplicity, we're logging the error; you can add a state to display server-side errors
//     } finally {
//       setLoading(false);
//     }
//   };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Set a new password</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="input-group">
            <PasswordInput
              label="Password"
              id="password"
              placeholder="Enter password"
              {...register("password")}
              className={`input-text ${errors.password ? "input-error" : ""}`}
            />
            {errors.password && (
              <p className="error-message">{errors.password.message}</p>
            )}
          </div>
          <div className="input-group">
            <PasswordInput
              label="Confirm password"
              id="confirmPassword"
              placeholder="Enter password"
              {...register("confirmPassword")}
              className={`input-text ${errors.confirmPassword ? "input-error" : ""}`}
            />
            {errors.confirmPassword && (
              <p className="error-message">{errors.confirmPassword.message}</p>
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

export default SetNewPassword;