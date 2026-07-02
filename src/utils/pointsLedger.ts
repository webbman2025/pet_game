/** Known score keys — extend this list when adding new mini-games. */
export const CORE_GAME_SCORE_KEYS = [
  "feedPoints",
  "walkPoints",
  "spaPoints",
] as const;

export type CoreGameScoreKey = (typeof CORE_GAME_SCORE_KEYS)[number];

export type GameName = "feed_game" | "walk_game" | "spa_game";

/** Shared scores object; supports extra `*Points` keys for future games. */
export type GameScores = Record<string, number>;

const SCORES_STORAGE_KEY = "pet_game_scores";

const EMPTY_SCORES: GameScores = {
  feedPoints: 0,
  walkPoints: 0,
  spaPoints: 0,
};

const GAME_NAME_TO_KEY: Record<GameName, CoreGameScoreKey> = {
  feed_game: "feedPoints",
  walk_game: "walkPoints",
  spa_game: "spaPoints",
};

const SCORE_KEY_SET = new Set<string>(CORE_GAME_SCORE_KEYS);

/** In-memory copy — survives when storage read/write fails. */
let memoryScores: GameScores | null = null;

const canUseStorage = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined";

const sanitizeScore = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

const sanitizeScores = (value: Record<string, unknown> | null | undefined): GameScores => {
  const next: GameScores = { ...EMPTY_SCORES };

  if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value)) {
      next[key] = sanitizeScore(raw);
    }
  }

  for (const key of CORE_GAME_SCORE_KEYS) {
    if (next[key] == null) next[key] = 0;
  }

  return next;
};

const readStoredScores = (): GameScores | null => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SCORES_STORAGE_KEY);
    if (raw == null) return null;
    return sanitizeScores(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
};

const writeStoredScores = (scores: GameScores): void => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Ignore quota / privacy errors; memoryScores still holds the value.
  }
};

const hydrateScores = (): GameScores => {
  if (memoryScores != null) return memoryScores;
  memoryScores = readStoredScores() ?? { ...EMPTY_SCORES };
  return memoryScores;
};

/** Read the shared scores object from memory / localStorage. */
export const readGameScores = (): GameScores => ({ ...hydrateScores() });

export const writeGameScores = (scores: GameScores): void => {
  memoryScores = sanitizeScores(scores);
  writeStoredScores(memoryScores);
};

/** Map API game name → localStorage score key. */
export const gameNameToScoreKey = (gameName: string): CoreGameScoreKey | null => {
  if (gameName in GAME_NAME_TO_KEY) {
    return GAME_NAME_TO_KEY[gameName as GameName];
  }
  return null;
};

/** Accept either a game name (spa_game) or score key (spaPoints). */
export const resolveScoreKey = (gameNameOrKey: string): CoreGameScoreKey | null => {
  const normalized = gameNameOrKey.trim();
  const fromGameName = gameNameToScoreKey(normalized);
  if (fromGameName) return fromGameName;
  if (SCORE_KEY_SET.has(normalized)) {
    return normalized as CoreGameScoreKey;
  }
  return null;
};

/**
 * Record earned points for one game.
 * Accepts game name ("spa_game") or score key ("spaPoints").
 * Other keys are copied unchanged — never overwritten.
 */
export const recordGameScore = (
  gameNameOrKey: string,
  earned: number
): GameScores => {
  const key = resolveScoreKey(gameNameOrKey);
  if (!key) {
    console.warn("recordGameScore: unknown game/key", gameNameOrKey);
    return readGameScores();
  }

  const safeEarned = Math.max(0, earned);
  console.log(key, safeEarned);

  const scores = hydrateScores();
  const next: GameScores = {
    ...scores,
    [key]: (scores[key] ?? 0) + safeEarned,
  };
  writeGameScores(next);
  return next;
};

/** Return every numeric score key currently stored. */
export const getScoreKeys = (scores: GameScores = readGameScores()): string[] =>
  Object.keys(scores).filter(
    (key) => Number.isFinite(scores[key]) && scores[key] >= 0
  );

/**
 * Sum all numeric values in the shared scores object.
 * Future-proof: new game keys are included automatically.
 */
export const sumGameScores = (scores: GameScores = readGameScores()): number =>
  Object.values(scores).reduce(
    (sum, value) => sum + (Number.isFinite(value) && value >= 0 ? value : 0),
    0
  );

/** @alias sumGameScores */
export const getTotalPoints = sumGameScores;

/**
 * Compare server candidate to local ledger total without mis-writing feedPoints.
 * Local per-game keys remain the source of truth.
 */
export const syncTotalPointsFloor = (candidateTotal: number): number => {
  const currentTotal = sumGameScores();
  if (!Number.isFinite(candidateTotal) || candidateTotal < 0) {
    return currentTotal;
  }
  return Math.max(currentTotal, candidateTotal);
};
