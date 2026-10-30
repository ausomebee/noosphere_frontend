import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../ReduxStore/features/authentication";
import { persistor } from "../ReduxStore/store";
import { disconnectSocket } from "../api/socketService";

const useIdleTimeout = (timeoutMs = 30 * 60 * 1000) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    dispatch(logout());
    persistor.purge();
    navigate("/");
  }, [dispatch, navigate]);

  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // start initial timer

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [handleLogout, timeoutMs]);
};

export default useIdleTimeout;
