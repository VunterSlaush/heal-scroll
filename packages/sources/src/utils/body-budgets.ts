/**
 * Per-card text budgets, sized to the full-screen slide layout: a text-only
 * card holds ~20 lines comfortably, a card with the 42%-height image ~12.
 * Truncating below these wastes the screen (and the reader's attention).
 */
export const BODY_TEXT_BUDGET = 1000;
export const BODY_VISUAL_BUDGET = 650;

export function bodyBudget(hasImage: boolean): number {
  return hasImage ? BODY_VISUAL_BUDGET : BODY_TEXT_BUDGET;
}
