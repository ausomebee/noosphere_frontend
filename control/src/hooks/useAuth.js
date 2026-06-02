import { useSelector } from "react-redux";

const useAuth = () => {
  const { isAuthenticated, user, accessToken, refreshToken, loading, error } =
    useSelector((state) => state.authentication);

  return {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    userId: user?.id || null,
    loading,
    error,
  };
};

export default useAuth;
