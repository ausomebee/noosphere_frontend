import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import useAuth from "../../../../hooks/useAuth";
import { showToast } from "../../../../Helper/ShowToast";
import { AdminLogin } from "../../../../ReduxStore/features/authentication";
import "../../Auth.css";
import TenantLogo from "../../../../assets/Logo.svg";
import { PasswordInput, TextInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";

// Yup validation schema
const schema = yup.object().shape({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const InitialSuperLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });
  const { loading } = useAuth();

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(AdminLogin(data));

      if (AdminLogin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Login successful", "success");

        if (!user.auth2FADone) {
          navigate("/auth/change-password");
        } else {
          if (user.authType === "AUTHENTICATOR") {
            navigate("/auth/2fa/login-authenticator");
          } else if (user.authType === "SECRETMESSAGE") {
            navigate("/auth/2fa/login-question");
          } else {
            console.error("Unknown authType:", user.authType);
            showToast("Unknown authentication type", "error");
          }
        }
      } else {
        const errorMessage = resultAction.payload?.message || "Login failed";
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    }
  };

  const forgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="auth-logo-container">
          <img src={TenantLogo} alt="Logo" className="logo" />
        </div>
        <div className="main-container">
          <div className="content-wrapper">
            <div className="items-center justify-center flex promo-wrapper">
              <div className="promo-section">
                <h1>The all-in-one ABA<br />Practice Management<br />Solution</h1>
              </div>
            </div>
            <div className="login-wrapper">
              <div className="login-section">
                <h2>Welcome to NooSphere</h2>
                <p>Please enter the details sent to you via email.</p>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <TextInput
                    label="Email"
                    placeholder="Enter your mail"
                    className="p-4"
                    {...register("email")}
                    error={errors.email?.message}
                  />
                  <PasswordInput
                    label="Password"
                    placeholder="Enter your Password"
                    {...register("password")}
                    error={errors.password?.message}
                  />
                  <Button
                    label="Continue"
                    variant="primary"
                    size="large"
                    className="w-full mt-4"
                    type="submit"
                    loading={loading}
                  />
                  {/* <p className="cant-access">
                    <a href="#" onClick={forgotPassword}>
                      Forgot Password?
                    </a>
                  </p> */}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialSuperLogin;