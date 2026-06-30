import { GameState } from "@/components/GameState";

/** Local calendar date key (YYYY-MM-DD) for day-boundary checks. */
export const getTodayDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** True when stored reset date is before today (or missing). */
export const shouldResetForNewDay = (
  lastResetDate: string | undefined,
  today = getTodayDateKey()
): boolean => !lastResetDate || lastResetDate !== today;

/**
 * Day-boundary reset: daily tasks + cooldowns only.
 * Does not change points, satisfaction, pet name, or poop count.
 */
export const applyDailyReset = (
  state: GameState,
  today = getTodayDateKey()
): GameState => ({
  ...state,
  game1Complete: false,
  game1PlayTimes: 0,
  game1Timer: 0,
  game2Complete: false,
  game2PlayTimes: 0,
  game2Timer: 0,
  game3Complete: false,
  game3PlayTimes: 0,
  game3Timer: 0,
  lastResetDate: today,
});

/**
 * Runs the real day-boundary reset when the calendar day has changed.
 * Seeds lastResetDate on first load without wiping progress.
 */
export const applyDailyResetIfNewDay = (
  state: GameState,
  today = getTodayDateKey()
): GameState => {
  if (!state.lastResetDate) {
    return { ...state, lastResetDate: today };
  }
  if (state.lastResetDate === today) {
    return state;
  }
  return applyDailyReset(state, today);
};
