import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import "./../SuperAdmin.css";
import api from "../../../api/authApis";
import { authErrorMessage } from "../../../Helper/authErrors";
import { showToast } from "../../../Helper/ShowToast";
import { showValidationErrors } from "../../../Helper/formErrors";
import { MISSING_LINK_TOKEN_MESSAGE, readLinkToken } from "../../../Helper/linkToken";
import {
  setPending2FARoute,
  startTwoFactorSession,
} from "../../../ReduxStore/features/authentication";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../Helper/passwordValidation";

// Yup schema. Confirm is held to the same strength rules as the new password.
const schema = yup.object().shape({
  newPassword: passwordSchema("New password"),
  confirmPassword: confirmPasswordSchema("newPassword"),
});

// Where the 2FA step after a reset happens: answer the method already set
// up, or set one up. Null when the response doesn't say enough to choose.
const twoFactorRouteFor = ({ auth2FADone, authType }) => {
  if (auth2FADone) {
    if (authType === "AUTHENTICATOR") return "/SA/2fa-authentication/login";
    if (authType === "SECRETMESSAGE") return "/SA/2fa-question/login";
    return null;
  }
  if (authType === "AUTHENTICATOR") return "/2fa/authenticator";
  if (authType === "SECRETMESSAGE") return "/2fa/security-question";
  return null;
};

const ForgotPasswordResetPassword = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const linkToken = readLinkToken(searchParams);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    if (!linkToken) {
      showToast(MISSING_LINK_TOKEN_MESSAGE, "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.AdminSetPassword({
        id: userId,
        password: data.newPassword,
        token: linkToken,
      });
      showToast(response?.data?.message || "Password updated successfully!", "success");

      // The password is saved. When 2FA comes next, the response says how
      // (method, question, whether it's set up) and hands back a 2FA token.
      // Nobody is signed in on this page, so start the half-finished sign-in
      // from that, the way the login page does, and go to the 2FA step.
      // Without a 2FA token there is nothing to carry that step: sign in
      // instead, which handles 2FA itself.
      const result = response?.data?.data;
      const route = result?.twoFactorToken ? twoFactorRouteFor(result) : null;
      if (!route) {
        navigate("/");
        return;
      }
      dispatch(
        startTwoFactorSession({
          user: {
            ...result,
            id: userId,
            superAdmin: result.isSuperAdmin ?? result.superAdmin,
          },
          twoFactorToken: result.twoFactorToken,
        })
      );
      dispatch(setPending2FARoute(route));
      navigate(route);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Password update error:", error);
      // Unreachable server gets its own message; otherwise the page's wording.
      const message = authErrorMessage(error, "Failed to update password.");
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Set a new Password</h2>
        <p className="subtitle">Please create a new password</p>
        <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
          <div className="form-group">
            <PasswordInput
              required
              label="Password"
              id="newPassword"
              placeholder="Enter new password"
              autoComplete="new-password"
              showStrength
              {...register("newPassword")}
              className={errors.newPassword ? "input-error" : ""}
            />
            {errors.newPassword && (
              <p className="error-message">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="form-group">
            <PasswordInput
              required
              label="Confirm password"
              id="confirmPassword"
              placeholder="Confirm new password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              matchValue={watch("newPassword") || ""}
              className={errors.confirmPassword ? "input-error" : ""}
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
            loading={submitting}
          />
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordResetPassword;