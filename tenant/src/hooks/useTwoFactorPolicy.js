import { useEffect, useState } from "react";
import api from "../api/authApis";
import useAuth from "./useAuth";

/**
 * What the organisation's admin decided about 2FA, as it applies to the
 * signed-in user.
 *
 * When the admin set one method for everyone ("set for all"), staff must set
 * up that method and may not pick another, so the setup pages hide the way
 * back to a choice and the choice page sends them on to the enforced method.
 * When nothing is set for all, staff pick for themselves. The organisation's
 * admin always goes back to their own 2FA settings.
 */

export const METHOD_ROUTES = {
  AUTHENTICATOR: "/auth/2fa/authenticator",
  SECRETMESSAGE: "/auth/2fa/security-question",
};

const SUPER_ADMIN_SETTINGS = "/auth/2fa-settings";
const OWN_CHOICE = "/auth/2fa/choice";

/** The method set for everyone, or null when each admin chooses. */
export const enforcedMethodFrom = (choices) => {
  if (!choices || choices.isEnabled === false || !choices.setForAll) return null;
  if (choices.Authenticator2FA) return "AUTHENTICATOR";
  if (choices.securityQuestion) return "SECRETMESSAGE";
  return null;
};

/**
 * Where "Back" on a 2FA setup page goes, or null for no Back button.
 * While the policy is loading, or couldn't be read, there is no Back: offering
 * a choice the admin may have ruled out is worse than offering none.
 */
export const setupBackTarget = ({ isSuperAdmin, status, enforcedMethod }) => {
  if (isSuperAdmin) return SUPER_ADMIN_SETTINGS;
  if (status !== "ready" || enforcedMethod) return null;
  return OWN_CHOICE;
};

const useTwoFactorPolicy = () => {
  const { user, tenantId } = useAuth();
  // The organisation's admin: the same test the login page uses to send a
  // new admin through the password change and 2FA settings. Accepts the role
  // as an object (today's login) or a plain name.
  const roleName = typeof user?.role === "string" ? user.role : user?.role?.name;
  const isSuperAdmin = user?.superAdmin === true || roleName === "Admin";
  const [state, setState] = useState({ status: "loading", enforcedMethod: null });

  useEffect(() => {
    let active = true;
    if (!tenantId) {
      setState({ status: "failed", enforcedMethod: null });
      return undefined;
    }
    api
      .GetSuperAdminChoices({ id: tenantId })
      .then((response) => {
        if (!active) return;
        setState({
          status: "ready",
          enforcedMethod: enforcedMethodFrom(response?.data?.data),
        });
      })
      .catch(() => {
        if (active) setState({ status: "failed", enforcedMethod: null });
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  return {
    isSuperAdmin,
    status: state.status,
    enforcedMethod: state.enforcedMethod,
    backTarget: setupBackTarget({ isSuperAdmin, ...state }),
  };
};

export default useTwoFactorPolicy;
