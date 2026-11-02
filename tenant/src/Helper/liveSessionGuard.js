/**
 * Lets a page with unsaved, in-progress work (the live appointment session)
 * hold the rest of the app back while it runs.
 *
 * The app uses BrowserRouter, which has no useBlocker, so the layout asks this
 * registry before navigating: with no guard registered, navigation runs as it
 * always did. The same page can also pause the idle auto-logout, which would
 * otherwise end a session the clinician is running hands-off.
 */

let navigationGuard = null;
let idlePauses = 0;

/**
 * Register a guard: `guard(proceed)` is called instead of navigating, and
 * calls `proceed()` if the user confirms. Returns an unregister function.
 */
export const registerNavigationGuard = (guard) => {
  navigationGuard = guard;
  return () => {
    if (navigationGuard === guard) navigationGuard = null;
  };
};

export const hasNavigationGuard = () => !!navigationGuard;

/** Navigate via `proceed`, unless a guard wants to confirm first. */
export const requestNavigation = (proceed) => {
  if (navigationGuard) {
    navigationGuard(proceed);
    return;
  }
  proceed();
};

/** Hold off the idle logout until the returned function is called. */
export const pauseIdleLogout = () => {
  idlePauses += 1;
  let resumed = false;
  return () => {
    if (resumed) return;
    resumed = true;
    idlePauses = Math.max(0, idlePauses - 1);
  };
};

export const isIdleLogoutPaused = () => idlePauses > 0;
