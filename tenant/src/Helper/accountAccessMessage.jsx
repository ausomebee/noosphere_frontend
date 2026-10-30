import React from "react";

// Where tenant admins are pointed when they can't get into their account.
export const SUPPORT_EMAIL = "support@noospherehub.com";

// The login response stores `role` either as an object ({ name: "Admin", ... })
// or, in some responses, as a bare string. Read the name either way.
export const getRoleName = (role) =>
  role && typeof role === "object" ? role?.name : role;

// Admins / org owners can be handed off to our support team. Everyone else is a
// tenant staff member who must go through their own administrator.
export const isAdminRole = (role) =>
  ["Admin", "Owner"].includes(getRoleName(role));

/**
 * Role-aware "Unable to verify your identity" card.
 * - Tenant admin/owner: points to our support email (blue mailto link).
 * - Tenant staff (any non-admin role, or unknown role): points to their own
 *   system administrator, since we don't have that admin's email.
 * When `onBack` is provided, an "I understand" button is rendered under the
 * message to return to the login view.
 */
const AccountAccessMessage = ({ role, onBack }) => {
  const admin = isAdminRole(role);

  return (
    <div style={{ textAlign: "center", maxWidth: 440, margin: "0 auto" }}>
      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#EF4444",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✕
      </div>
      <h2
        style={{
          color: "#1D4ED8",
          fontWeight: 700,
          fontSize: 20,
          marginBottom: 8,
        }}
      >
        Unable to verify your identity
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
        {admin ? (
          <>
            Unfortunately we cannot verify your identity. Please contact{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: "#2563eb", fontWeight: 600 }}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            for further assistance
          </>
        ) : (
          "Unfortunately we cannot verify your identity. Please contact your system administrator for further assistance"
        )}
      </p>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "12px 16px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          I understand
        </button>
      )}
    </div>
  );
};

export default AccountAccessMessage;
