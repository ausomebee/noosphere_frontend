import { useSelector } from "react-redux";

const useAuth = () => {
  const auth = useSelector((s) => s.authentication);
  const user = auth?.user;

  return {
    isAuthenticated: auth?.isAuthenticated ?? false,
    loading: auth?.loading ?? false,
    error: auth?.error ?? null,
    user,
    userId: user?.id,
    tenantId: user?.tenantId,
    accessToken: user?.accessToken,
    refreshToken: user?.refreshToken,
    email: user?.email,
    role: user?.role,
    superAdmin: user?.superAdmin,
    authQuestion: user?.authQuestion,
    auth2FADone: user?.auth2FADone,
    authType: user?.authType,
  };
};

export default useAuth;
