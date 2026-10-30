import React from "react";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../SuperAdmin.css"

const PasswordResetConfirmation = () => {
  // Handle "Go to email" button click
  const handleGoToEmail = () => {
    window.location.href = "mailto:";
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Reset password</h2>
        <p className="confirmation-message">
          An email with reset instructions has been sent to your email address. Please follow those instructions to reset your password.
        </p>
        <Button
          label="Go to email"
          variant="primary"
          className="auth-button"
          onClick={handleGoToEmail}
        />
      </div>
    </div>
  );
};

export default PasswordResetConfirmation;