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
import { isIdleLogoutPaused } from "../Helper/liveSessionGuard";

const useIdleTimeout = (timeoutMs = 30 * 60 * 1000) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const handleLogout = useCallback(() => {
    disconnectSocket();
    dispatch(logout());
    persistor.purge();
    // Every tab has been idle for the full period by now, so end them all.
    broadcastLogout({ reason: "idle" });
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
      // A live appointment session can run for a long time with nobody
      // touching the screen; logging out then would lose it. Wait again.
      if (isIdleLogoutPaused()) {
        schedule(timeoutMs);
        return;
      }
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

    // While a live session holds the logout off, keep the other tabs from
    // timing out too: their logout would end this tab's session as well.
    const heartbeat = setInterval(() => {
      if (isIdleLogoutPaused()) shareActivity();
    }, Math.min(timeoutMs / 3, 60000));

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, onActivity));
    schedule(timeoutMs); // start initial timer

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(heartbeat);
      stopListening();
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [handleLogout, timeoutMs]);
};

export default useIdleTimeout;
