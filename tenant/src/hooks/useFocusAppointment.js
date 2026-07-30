import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Opens a specific appointment's modal when the user arrives from a
 * notification. The notification navigation carries `focusId` (the appointment
 * id) in `location.state`; once the tab's `list` contains a matching row,
 * `openFn(item)` is called exactly once (so it never re-opens after close).
 *
 * Fully additive: with no `focusId` in state it does nothing, so normal
 * navigation is unaffected.
 *
 * @param {Array}    list   the tab's loaded appointment rows (each with an id)
 * @param {function} openFn handler that opens the view modal for a row
 */
export default function useFocusAppointment(list, openFn) {
  const location = useLocation();
  const consumedRef = useRef(false);

  // A new navigation (new state) re-arms the one-shot guard.
  useEffect(() => {
    consumedRef.current = false;
  }, [location.state]);

  useEffect(() => {
    const focusId = location.state?.focusId;
    if (!focusId || consumedRef.current) return;
    if (!Array.isArray(list) || !list.length) return;
    const item = list.find(
      (i) => i?.id === focusId || i?.rawData?.id === focusId
    );
    if (!item || typeof openFn !== "function") return;
    consumedRef.current = true;
    openFn(item);
  }, [list, location.state, openFn]);
}
