import type { ChecklistItemId } from '$lib/components/Checklist/checklistItems';
import { getContext, setContext } from 'svelte';

const CHECKLIST_CONTEXT_KEY = 'checklist-tracker';

export type ChecklistTracker = {
  trackItem: (itemId: ChecklistItemId) => void;
  isItemCompleted: (itemId: ChecklistItemId) => boolean;
};

// Module-level reference to the tracker for use in event handlers
let globalTracker: ChecklistTracker | null = null;

/**
 * Sets up the checklist tracker context. Call this in the root component
 * that manages checklist state.
 */
export const setChecklistContext = (tracker: ChecklistTracker) => {
  setContext(CHECKLIST_CONTEXT_KEY, tracker);
  // Also store globally for event handler access
  globalTracker = tracker;
};

/**
 * Gets the checklist tracker from context. Returns null if not in a context
 * where checklist tracking is available. Only call during component init.
 */
export const getChecklistTracker = (): ChecklistTracker | null => {
  try {
    return getContext<ChecklistTracker>(CHECKLIST_CONTEXT_KEY) ?? null;
  } catch {
    // Context not available (e.g., called outside component initialization)
    return null;
  }
};

/**
 * Tracks a checklist item as completed. Safe to call anywhere including
 * event handlers - uses global reference set during context initialization.
 */
export const trackChecklistItem = (itemId: ChecklistItemId) => {
  if (globalTracker && !globalTracker.isItemCompleted(itemId)) {
    globalTracker.trackItem(itemId);
  }
};
