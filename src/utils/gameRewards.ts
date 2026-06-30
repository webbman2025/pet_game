import { GameState } from "@/components/GameState";
import {
  clampSatisfaction,
  DAILY_TASK_TARGETS,
} from "@/utils/satisfaction";

type AcquirePointApiData = {
  totalPoint?: number;
  satisfaction?: number;
  game1PlayTimes?: number;
  game1Timer?: number;
  game1Complete?: string | boolean;
  game2PlayTimes?: number;
  game2Timer?: number;
  game2Complete?: string | boolean;
  game3PlayTimes?: number;
  game3Timer?: number;
  game3Complete?: string | boolean;
};

const parseCompleteFlag = (value: string | boolean | undefined): boolean =>
  value === "true" || value === true;

/** Apply points, satisfaction, and daily-task progress locally after a successful mini-game. */
export const applyGameReward = (
  prev: GameState,
  gameName: string,
  pointsEarned: number,
  satisfactionDelta: number
): GameState => {
  const next: GameState = {
    ...prev,
    point: prev.point + pointsEarned,
    satisfaction: clampSatisfaction(prev.satisfaction + satisfactionDelta),
  };

  if (gameName === "feed_game") {
    const plays = Math.min(DAILY_TASK_TARGETS.feed, prev.game1PlayTimes + 1);

    return {
      ...next,
      game1PlayTimes: plays,
      game1Complete: plays >= DAILY_TASK_TARGETS.feed,
      game1Timer: 1,
    };
  }

  if (gameName === "walk_game") {
    const plays = Math.min(DAILY_TASK_TARGETS.walk, prev.game2PlayTimes + 1);

    return {
      ...next,
      game2PlayTimes: plays,
      game2Complete: plays >= DAILY_TASK_TARGETS.walk,
    };
  }

  if (gameName === "spa_game") {
    const plays = Math.min(DAILY_TASK_TARGETS.spa, prev.game3PlayTimes + 1);

    return {
      ...next,
      game3PlayTimes: plays,
      game3Complete: plays >= DAILY_TASK_TARGETS.spa,
    };
  }

  return next;
};

export const mergeAcquirePointResponse = (
  prev: GameState,
  data: AcquirePointApiData,
  gameName: string
): GameState => {
  const next: GameState = {
    ...prev,
    point:
      data.totalPoint != null
        ? Math.max(prev.point, data.totalPoint)
        : prev.point,
    satisfaction:
      data.satisfaction != null
        ? Math.max(prev.satisfaction, data.satisfaction)
        : prev.satisfaction,
  };

  if (gameName === "feed_game") {
    return {
      ...next,
      game1PlayTimes:
        data.game1PlayTimes != null
          ? Math.max(prev.game1PlayTimes, data.game1PlayTimes)
          : prev.game1PlayTimes,
      game1Timer: data.game1Timer ?? prev.game1Timer,
      game1Complete:
        data.game1Complete != null
          ? parseCompleteFlag(data.game1Complete)
          : prev.game1Complete,
    };
  }

  if (gameName === "walk_game") {
    return {
      ...next,
      game2PlayTimes:
        data.game2PlayTimes != null
          ? Math.max(prev.game2PlayTimes, data.game2PlayTimes)
          : prev.game2PlayTimes,
      game2Timer: data.game2Timer ?? prev.game2Timer,
      game2Complete:
        data.game2Complete != null
          ? parseCompleteFlag(data.game2Complete)
          : prev.game2Complete,
    };
  }

  if (gameName === "spa_game") {
    return {
      ...next,
      game3PlayTimes:
        data.game3PlayTimes != null
          ? Math.max(prev.game3PlayTimes, data.game3PlayTimes)
          : prev.game3PlayTimes,
      game3Timer: data.game3Timer ?? prev.game3Timer,
      game3Complete:
        data.game3Complete != null
          ? parseCompleteFlag(data.game3Complete)
          : prev.game3Complete,
    };
  }

  return next;
};

export const parseGameStateFromApi = (data: Record<string, unknown>): GameState => ({
  point: Number(data.point) || 0,
  satisfaction: Number(data.satisfaction) || 0,
  petName: String(data.petName ?? ""),
  game1Complete: data.game1Complete === "true",
  game1PlayTimes: Number(data.game1PlayTimes) || 0,
  game1Timer: Number(data.game1Timer) || 0,
  game2Complete: data.game2Complete === "true",
  game2PlayTimes: Number(data.game2PlayTimes) || 0,
  game2Timer: Number(data.game2Timer) || 0,
  game3Complete: data.game3Complete === "true",
  game3PlayTimes: Number(data.game3PlayTimes) || 0,
  game3Timer: Number(data.game3Timer) || 0,
  poopCount: Number(data.poopCount) || 0,
  lastResetDate:
    typeof data.lastResetDate === "string" ? data.lastResetDate : undefined,
});

/** Prefer fresher local progress when refetch races with a just-finished mini-game. */
export const mergeFetchedGameState = (
  local: GameState,
  remote: GameState
): GameState => {
  const useLocalGame1 = local.game1PlayTimes > remote.game1PlayTimes;
  const useLocalGame2 = local.game2PlayTimes > remote.game2PlayTimes;
  const useLocalGame3 = local.game3PlayTimes > remote.game3PlayTimes;

  return {
    point: Math.max(local.point, remote.point),
    satisfaction: Math.max(local.satisfaction, remote.satisfaction),
    petName: remote.petName || local.petName,
    poopCount: remote.poopCount ?? local.poopCount,
    game1PlayTimes: useLocalGame1 ? local.game1PlayTimes : remote.game1PlayTimes,
    game1Timer: useLocalGame1 ? local.game1Timer : remote.game1Timer,
    game1Complete: useLocalGame1 ? local.game1Complete : remote.game1Complete,
    game2PlayTimes: useLocalGame2 ? local.game2PlayTimes : remote.game2PlayTimes,
    game2Timer: useLocalGame2 ? local.game2Timer : remote.game2Timer,
    game2Complete: useLocalGame2 ? local.game2Complete : remote.game2Complete,
    game3PlayTimes: useLocalGame3 ? local.game3PlayTimes : remote.game3PlayTimes,
    game3Timer: useLocalGame3 ? local.game3Timer : remote.game3Timer,
    game3Complete: useLocalGame3 ? local.game3Complete : remote.game3Complete,
    lastResetDate: remote.lastResetDate ?? local.lastResetDate,
  };
};
