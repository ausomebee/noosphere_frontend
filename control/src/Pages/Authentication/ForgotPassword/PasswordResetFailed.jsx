import React from "react";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../SuperAdmin.css";

const PasswordResetFailure = () => {
  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <div className="icon failure-icon">✖</div>
        <h2>Unable to verify your identity</h2>
        <p className="confirmation-message">
        Unfortunately we cannot verify your identity. Please contact the technical team for further assistance
        </p>
      </div>
    </div>
  );
};

export default PasswordResetFailure;