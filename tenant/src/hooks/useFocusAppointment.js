import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Opens a specific appointment's modal when the user arrives from a
 * notification. The notification navigation carries `focusId` (the appointment
 * id) in `location.state`; once the tab's `list` contains a matching row,
 * `openFn(item)` is called exactly once.
 *
 * After opening, the navigation state is cleared (replace) so that re-mounting
 * this tab (e.g. switching sub-tabs and back) can't re-open the modal from the
 * still-present history state.
 *
 * Fully additive: with no `focusId` in state it does nothing, so normal
 * navigation is unaffected.
 *
 * @param {Array}    list   the tab's loaded appointment rows (each with an id)
 * @param {function} openFn handler that opens the view modal for a row
 */
export default function useFocusAppointment(list, openFn) {
  const location = useLocation();
  const navigate = useNavigate();
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
    // Consume the focus so a later re-mount doesn't re-open the modal.
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [list, location.state, location.pathname, location.search, openFn, navigate]);
}
