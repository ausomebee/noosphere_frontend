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
 * @param {Array}    list      the tab's loaded appointment rows (each with an id)
 * @param {function} openFn    handler that opens the view modal for a row
 * @param {function} [fetchById] optional async fallback: given the base id it
 *   resolves the row to open when it isn't present in `list` (e.g. the list
 *   endpoint 404'd, or the appointment lives on another tab). Makes the modal
 *   open straight from the notification regardless of list state.
 */
export default function useFocusAppointment(list, openFn, fetchById) {
  const location = useLocation();
  const navigate = useNavigate();
  const consumedRef = useRef(false);

  // A new navigation (new state) re-arms the one-shot guard.
  useEffect(() => {
    consumedRef.current = false;
  }, [location.state]);

  useEffect(() => {
    const focusId = location.state?.focusId;
    if (!focusId || consumedRef.current || typeof openFn !== "function") return;
    // A recurring appointment is expanded into rows whose id is
    // `${masterId}_${timestamp}`, while the notification carries the master id.
    // Compare on the base id so a freshly created appointment still matches.
    const baseId = (v) => (typeof v === "string" ? v.split("_")[0] : v);
    const target = baseId(focusId);

    const consume = () =>
      navigate(location.pathname + location.search, { replace: true, state: null });

    // 1) Prefer fetching the single appointment by id, so the modal always
    //    shows fresh, complete data and opens regardless of the tab's list
    //    state (list rows can be thin/expanded or not loaded yet).
    if (typeof fetchById === "function") {
      consumedRef.current = true;
      Promise.resolve(fetchById(target))
        .then((item) => {
          if (item) openFn(item);
        })
        .catch(() => {});
      consume();
      return;
    }

    // 2) Fallback: use the row already in the loaded list.
    if (Array.isArray(list) && list.length) {
      const item = list.find((i) =>
        [
          i?.id,
          i?.appointmentId,
          i?.rawData?.id,
          i?.rawData?.appointmentId,
        ].some((c) => c != null && baseId(c) === target)
      );
      if (item) {
        consumedRef.current = true;
        openFn(item);
        consume();
      }
    }
  }, [list, location.state, location.pathname, location.search, openFn, fetchById, navigate]);
}
