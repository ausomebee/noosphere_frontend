import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import Button from "../../Components/Button/Button";
import Logo from "../../assets/NoosphereLogo-white.png";
import { PasswordInput } from "../../Components/Input/Inputs";
import shieldLogo from "../../assets/shield.svg";
import "./MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator.css";
import "./SuperAdmin.css";
import api from "../../api/authApis";
import useAuth from "../../hooks/useAuth";
import { showToast } from "../../Helper/ShowToast";

import { showValidationErrors } from "../../Helper/formErrors";
import {
  passwordSchema as strongPassword,
  confirmPasswordSchema,
} from "../../Helper/passwordValidation";

// Standalone onboarding step: set the administrator password. Kept separate
// from the 2FA setup flow so changing the 2FA type never re-triggers it.
//
// The administrative password deliberately keeps its own, stricter 12-character
// policy rather than the shared 8-character one. The confirm field is held to
// the same rule as the password it confirms — not just "must match".
//
// Both fields now go through the shared password schema at that raised minimum,
// so this screen enforces the full policy (upper, lower, digit, special) rather
// than length alone, and the checklist rendered below is built from the same
// minimum. Previously the rule was invisible: the fields showed no checklist at
// all, so the first a user heard of "12 characters" was a failed submit.
const ADMIN_PASSWORD_MIN_LENGTH = 12;

const passwordSchema = yup.object().shape({
  oldAdministratorPassword: yup.string().required("Password is required"),
  newAdministratorPassword: strongPassword(
    "New password",
    ADMIN_PASSWORD_MIN_LENGTH,
  ),
  confirmNewAdministratorPassword: confirmPasswordSchema(
    "newAdministratorPassword",
    ADMIN_PASSWORD_MIN_LENGTH,
  ),
});

const AdministrativePassword = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
 mode: "onTouched",
 reValidateMode: "onBlur",
 resolver: yupResolver(passwordSchema) });

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await api.SuperAdministrativePassword({
        id: userId,
        oldAdministratorPassword: data.oldAdministratorPassword,
        newAdministratorPassword: data.newAdministratorPassword,
      });
      showToast("Administrator password set successfully!", "success");
      // Continue onboarding: pick the 2FA method.
      navigate("/SA/2fa-settings");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Could not set password:", error);
      const message =
        error?.response?.data?.message || "Failed to set password.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth2fas-form-container">
        <h2>Set Administrator Password</h2>
        <p className="subtitle">
          Finish your sign-on process by setting your administrative password.
        </p>
        <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
          <div className="form-groups">
            <div className="password-info">
              <span className="shield-icon">
                <img src={shieldLogo} alt="Shield Logo" className="shield-logo" />
              </span>
              <p className="subtitles">
                You received an Administrator Password by email. This password
                will only be required to authorize high-level platform actions.
              </p>
              <p className="subtitles">
                Please enter the one-time password and create a new, secure
                Administrator Password.
              </p>
              <p className="support-note">
                Didn't get the passcode?{" "}
                <a href="mailto:support@noospherehub.com">
                  Contact support@noospherehub.com
                </a>
              </p>
            </div>
            <div className="password-inputs">
              <div>
                <PasswordInput
                  required
                  label="Old Administrator Password"
                  id="oldAdministratorPassword"
                  placeholder="Enter password"
                  {...register("oldAdministratorPassword")}
                  className={`input-text ${
                    errors.oldAdministratorPassword ? "input-error" : ""
                  }`}
                />
                {errors.oldAdministratorPassword && (
                  <p className="error-message">
                    {errors.oldAdministratorPassword.message}
                  </p>
                )}
              </div>
              <div>
                <PasswordInput
                  required
                  label="New Administrator Password"
                  id="newAdministratorPassword"
                  placeholder="Enter new password"
                  showStrength
                  minLength={ADMIN_PASSWORD_MIN_LENGTH}
                  {...register("newAdministratorPassword")}
                  className={`input-text ${
                    errors.newAdministratorPassword ? "input-error" : ""
                  }`}
                />
                {errors.newAdministratorPassword && (
                  <p className="error-message">
                    {errors.newAdministratorPassword.message}
                  </p>
                )}
              </div>
              <div className="input-group">
                <PasswordInput
                  required
                  label="Confirm New Administrator Password"
                  id="confirmNewAdministratorPassword"
                  placeholder="Confirm new password"
                  {...register("confirmNewAdministratorPassword")}
                  matchValue={watch("newAdministratorPassword") || ""}
                  className={`input-text ${
                    errors.confirmNewAdministratorPassword ? "input-error" : ""
                  }`}
                />
                {errors.confirmNewAdministratorPassword && (
                  <p className="error-message">
                    {errors.confirmNewAdministratorPassword.message}
                  </p>
                )}
              </div>
            </div>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
          <Button
            type="submit"
            label="Continue"
            variant="primary"
            className="auth-button"
            loading={loading}
          />
          <p className="password-policy">
            Please note: You will be required to change this password every 90
            days
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdministrativePassword;
