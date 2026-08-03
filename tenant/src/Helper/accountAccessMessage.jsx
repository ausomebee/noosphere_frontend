import React from "react";

// Where tenant admins are pointed when they can't get into their account.
export const SUPPORT_EMAIL = "support@ausomebee.com";

// The login response stores `role` either as an object ({ name: "Admin", ... })
// or, in some responses, as a bare string. Read the name either way — mirrors
// the pattern used in Layout/TenantLayout.jsx.
export const getRoleName = (role) =>
  role && typeof role === "object" ? role?.name : role;

// Admins / org owners can be handed off to our support team. Everyone else is a
// tenant staff member who must go through their own administrator. Aligned with
// AdminLogin.jsx, which treats `role?.name === "Admin"` as privileged.
export const isAdminRole = (role) =>
  ["Admin", "Owner"].includes(getRoleName(role));

/**
 * Role-aware "can't access your account" message.
 * - Tenant admin/owner: points to our support email (rendered as a mailto link).
 * - Tenant staff (any non-admin role, or unknown role): points to their own
 *   administrator, since we don't have that admin's email.
 */
const AccountAccessMessage = ({ role, className = "confirmation-message" }) => {
  if (isAdminRole(role)) {
    return (
      <p className={className}>
        Sorry, we can&apos;t access your account right now. Please contact our
        support team at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    );
  }

  return (
    <p className={className}>
      Sorry, you can&apos;t access your account. Please contact your
      administrator.
    </p>
  );
};

export default AccountAccessMessage;
