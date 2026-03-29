import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../ReduxStore/features/authentication";
import { persistor } from "../ReduxStore/store";

const useIdleTimeout = (timeoutMs = 30 * 60 * 1000) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    persistor.purge();
    navigate("/auth/login");
  }, [dispatch, navigate]);

  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [handleLogout, timeoutMs]);
};

export default useIdleTimeout;
