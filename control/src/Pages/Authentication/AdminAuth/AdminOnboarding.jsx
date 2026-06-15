import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextInput, PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import { useNavigate, useParams } from "react-router-dom";
import "../SuperAdmin.css";
import { useDispatch } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import { OnboardAdmin } from "../../../ReduxStore/features/authentication";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/authApis";

// Yup validation schema
const schema = yup.object().shape({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
      "Password must be strong. At least one upper case letter, one lower case letter, one digit, one special character, and at least 8 characters long."
    ),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password"), null], "Passwords must match"),
});

const AdminOnboarding = () => {
  const { userId, email } = useParams(); // Extract userId and email from route params
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: decodeURIComponent(email || "") }, // Set email from params
  });

  // Update email field if params change
  React.useEffect(() => {
    if (email) {
      setValue("email", decodeURIComponent(email), { shouldValidate: true });
    }
  }, [email, setValue]);

  const handleGetSuperAdminChoice = async () => {
    try {
      const response = await api.GetSuperAdminChoices();
  
      const { setForAll, Authenticator2FA, securityQuestion  } = response.data.data;
      return { setForAll, Authenticator2FA, securityQuestion  };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching SuperAdmin choices:", error);
      return { setForAll: false, Authenticator2FA: false, securityQuestion: false };
    }
  };

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(
        OnboardAdmin({ id: userId, password: data.password })
      );

      if (OnboardAdmin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Onboarding successful", "success");

        const { setForAll, Authenticator2FA, securityQuestion  } = await handleGetSuperAdminChoice();
        const authType = Authenticator2FA
        ? "AUTHENTICATOR"
        : securityQuestion
        ? "SECRETMESSAGE"
        : null;

        if (setForAll && !user.auth2FADone ) {
          if (authType === "AUTHENTICATOR") {
            navigate("/2fa/authenticator");
          } else if (authType === "SECRETMESSAGE") {
            navigate("/2fa/security-question");
          } else {
            if (import.meta.env.DEV) console.error("Unknown authType:", authType);
            showToast("Unknown authentication type", "error");
          }
        } else if ((setForAll || !setForAll) && user.auth2FADone) {
          navigate("/");
        } else if (!setForAll && !user.auth2FADone) {
          navigate("/");
        }
      } else {
        const errorMessage = resultAction.payload?.message || "Onboarding failed";
        showToast(errorMessage, "error");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Onboarding error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    }
  };

  const handleLogin = () => {
    navigate("/");
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Welcome</h2>
        <p className="subtitle">
          Please create your NooSphere password to continue
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <TextInput
              label="Email"
              id="email"
              type="email"
              placeholder="olivia@therapyco.com"
              readOnly
              {...register("email")}
              className={`input-text ${errors.email ? "input-error" : ""} readonly-input`}
            />
            {errors.email && (
              <p className="error-message">{errors.email.message}</p>
            )}
          </div>

          <div className="form-group">
            <PasswordInput
              label="Password"
              id="password"
              placeholder="Enter a password"
              showStrength
              {...register("password")}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && (
              <p className="error-message">{errors.password.message}</p>
            )}
          </div>
          <div className="form-group">
            <PasswordInput
              label="Confirm password"
              id="confirmPassword"
              placeholder="Enter a password"
              {...register("confirmPassword")}
              className={`input-text ${
                errors.confirmPassword ? "input-error" : ""
              }`}
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
          <p className="subtitles">
            Already have an account?
            <a href="#" className="cant-accesss" onClick={handleLogin}>
              Login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminOnboarding;