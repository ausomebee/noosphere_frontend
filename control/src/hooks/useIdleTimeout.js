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

  // Same teardown order as the layout's Log out button and as tenant/client:
  // drop the socket first, then clear state, then leave. The socket matters now
  // that control has one — without this an idle session kept a live connection
  // registered as ADMIN and went on receiving notifications after logout.
  const handleLogout = useCallback(() => {
    disconnectSocket();
    dispatch(logout());
    persistor.purge();
    // The login page is "/" — there is no /auth/login route, so the old target
    // dropped the user on the 404 page instead of the sign-in form.
    navigate("/");
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
