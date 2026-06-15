import { useSyncExternalStore } from "react";

// Tiny global registry of how many modals are currently open. ReusableModal
// increments on open / decrements on close; JiraBoard reads it so the board
// (dnd-kit) goes inert while ANY modal is open — including modals opened from a
// column's own local state, which JiraBoard otherwise can't see. Module-level
// state (not redux/persisted), so it resets cleanly on reload.
let count = 0;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

export const modalRegistry = {
  open() {
    count += 1;
    emit();
  },
  close() {
    count = Math.max(0, count - 1);
    emit();
  },
  getSnapshot: () => count,
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAnyModalOpen() {
  return useSyncExternalStore(modalRegistry.subscribe, modalRegistry.getSnapshot) > 0;
}
