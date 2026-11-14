import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../ReduxStore/features/authentication";
import { persistor } from "../ReduxStore/store";
import { disconnectSocket } from "../api/socketService";
import {
  broadcastLogout,
  shareActivity,
  lastSharedActivity,
  onActivityElsewhere,
} from "../Helper/logoutBroadcast";

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
    // Every tab has been idle for the full period by now, so end them all.
    broadcastLogout({ reason: "idle" });
    // The login page is "/" — there is no /auth/login route, so the old target
    // dropped the user on the 404 page instead of the sign-in form.
    navigate("/");
  }, [dispatch, navigate]);

  useEffect(() => {
    // This tab's own last activity. The idle period runs from the latest
    // activity in ANY open tab of this app, so a tab left in the background
    // never logs out the tab the user is working in.
    let lastLocal = Date.now();

    const schedule = (delay) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(check, Math.max(0, delay));
    };

    function check() {
      const last = Math.max(lastLocal, lastSharedActivity());
      const remaining = last + timeoutMs - Date.now();
      if (remaining > 0) {
        schedule(remaining);
        return;
      }
      handleLogout();
    }

    const onActivity = () => {
      lastLocal = Date.now();
      shareActivity(lastLocal);
      schedule(timeoutMs);
    };

    const stopListening = onActivityElsewhere(() => schedule(timeoutMs));

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, onActivity));
    schedule(timeoutMs); // start initial timer

    return () => {
      clearTimeout(timerRef.current);
      stopListening();
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [handleLogout, timeoutMs]);
};

export default useIdleTimeout;
