/**
 * Shared mobile detection utility
 */
export const isMobile = window.matchMedia("(max-width: 500px)").matches;

/**
 * Reactive mobile detection function for components that need to check dynamically
 */
export function checkIsMobile(): boolean {
  return window.matchMedia("(max-width: 500px)").matches;
}