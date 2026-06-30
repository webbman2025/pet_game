import { GameState } from "@/components/GameState";

export type SatisfactionLevel =
  | "unhappy"
  | "boring"
  | "normal"
  | "happy"
  | "veryHappy"
  | "dance";

export const DAILY_TASK_TARGETS = {
  feed: 3,
  walk: 2,
  spa: 1,
} as const;

export const FEED_COOLDOWN_MS = 2 * 60 * 60 * 1000;

export const clampSatisfaction = (value: number): number =>
  Math.max(0, Math.min(100, value));

export const areAllDailyTasksComplete = (gameState: GameState): boolean =>
  gameState.game1PlayTimes >= DAILY_TASK_TARGETS.feed &&
  gameState.game2PlayTimes >= DAILY_TASK_TARGETS.walk &&
  gameState.game3PlayTimes >= DAILY_TASK_TARGETS.spa;

export const getSatisfactionLevel = (
  satisfaction: number,
  allTasksComplete: boolean
): SatisfactionLevel => {
  const pct = clampSatisfaction(satisfaction);

  if (pct >= 100 && allTasksComplete) return "dance";
  if (pct >= 100) return "veryHappy";
  if (pct >= 70) return "happy";
  if (pct >= 50) return "normal";
  if (pct >= 30) return "boring";
  return "unhappy";
};

export const getMoodLabel = (level: SatisfactionLevel): string => {
  switch (level) {
    case "unhappy":
      return "Unhappy";
    case "boring":
      return "Boring";
    case "normal":
      return "Normal";
    case "happy":
      return "Happy!";
    case "veryHappy":
      return "Very Happy!";
    case "dance":
      return "Happy!";
    default:
      return "Normal";
  }
};

export const showsMoodHeart = (level: SatisfactionLevel): boolean =>
  level === "happy" || level === "veryHappy" || level === "dance";

export const showsMoodBubble = (satisfaction: number): boolean =>
  clampSatisfaction(satisfaction) >= 70;

export const getRemainingCooldown = (
  elapsedMs: number,
  cooldownMs: number
): number => {
  if (cooldownMs <= 0) return 0;
  return Math.max(0, cooldownMs - elapsedMs);
};

/** Cooldown elapsed only counts when the server timer field is active (> 0). */
export const getActiveCooldownRemaining = (
  timerMs: number,
  sessionElapsedMs: number,
  cooldownMs: number
): number => {
  if (!timerMs || timerMs <= 0 || cooldownMs <= 0) return 0;
  return getRemainingCooldown(timerMs + sessionElapsedMs, cooldownMs);
};

/** HH:MM:SS for long cooldowns (e.g. Feed 02:00:00). */
export const formatCooldownHms = (milliseconds: number): string => {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export interface GameButtonCooldownState {
  isFeedDisabled: boolean;
  isWalkDisabled: boolean;
  isSpaDisabled: boolean;
  feedCooldownLabel: string;
  walkCooldownLabel: string;
  spaCooldownLabel: string;
  sharedCooldownLabel: string;
  allTasksComplete: boolean;
}

export const getGameButtonCooldownState = (
  gameState: GameState,
  sessionElapsedMs: number
): GameButtonCooldownState => {
  const feedCooldownMs = getActiveCooldownRemaining(
    gameState.game1Timer,
    sessionElapsedMs,
    FEED_COOLDOWN_MS
  );

  const isFeedDisabled = feedCooldownMs > 0;
  const isWalkDisabled = false;
  const isSpaDisabled =
    gameState.game3PlayTimes >= DAILY_TASK_TARGETS.spa;

  const feedCooldownLabel =
    feedCooldownMs > 0 ? formatCooldownHms(feedCooldownMs) : "";

  return {
    isFeedDisabled,
    isWalkDisabled,
    isSpaDisabled,
    feedCooldownLabel,
    walkCooldownLabel: "",
    spaCooldownLabel: "",
    sharedCooldownLabel: "",
    allTasksComplete: areAllDailyTasksComplete(gameState),
  };
};
