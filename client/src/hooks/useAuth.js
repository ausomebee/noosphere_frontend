import { useSelector } from "react-redux";

const useAuth = () => {
  const auth = useSelector((state) => state.auth);
  const user = auth?.user;
  const tenantLink = user?.tenantLinks?.[0];

  return {
    isAuthenticated: auth?.isAuthenticated ?? false,
    user,

    // Tokens — canonical source is top-level auth state
    accessToken: auth?.accessToken || user?.accessToken,
    refreshToken: auth?.refreshToken || user?.refreshToken,

    // User info
    userId: user?.id || user?.userId || null,
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    avatarUrl: user?.avatarUrl || null,

    // Tenant link IDs
    clientId: tenantLink?.clientId || null,
    tenantClientId: tenantLink?.id || null,
    tenantId: tenantLink?.tenantId || null,
  };
};

export default useAuth;
