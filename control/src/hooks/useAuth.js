import { useSelector } from "react-redux";

const useAuth = () => {
  const {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    pending2FA,
    pending2FARoute,
  } = useSelector((state) => state.authentication);

  return {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    userId: user?.id || null,
    loading,
    error,
    // Sessions persisted before this field existed have no value: treat as done.
    pending2FA: !!pending2FA,
    pending2FARoute: pending2FARoute || null,
  };
};

export default useAuth;
