export type ForkItem = "food" | "ball" | "friend";
export type ForkLane = 0 | 1 | 2;

/** Screen Y-ratio where fork lane items are anchored (matches fork art lane tops). */
export const FORK_ITEM_TOP_RATIO = 0.3;

/** How far below the item anchor the player dog stops (screen height ratio). */
export const FORK_DOG_STOP_BELOW_ITEM_RATIO = 0.07;

/** Gift box shrink-out before item reveal (ms). */
export const FORK_GIFT_SHRINK_MS = 220;

/** Bouncy item pop-in after gift box vanishes (ms). */
export const FORK_ITEM_POP_MS = 480;

export type ForkRevealPhase = "shrinking" | "popping" | "settled";

/** Extra upward shift for the dog at the fork split junction (screen height ratio). */
export const FORK_SPLIT_DOG_OFFSET_UP_RATIO = 0.075;

/** Screen X-ratio for each lane path center on walk_bg_fork_grass.png. */
export const FORK_LANE_CENTER_X_RATIO: Record<ForkLane, number> = {
  0: 0.235,
  1: 0.5,
  2: 0.765,
};

export const getForkLaneFromXRatio = (ratio: number): ForkLane => {
  const boundaryLeft = (FORK_LANE_CENTER_X_RATIO[0] + FORK_LANE_CENTER_X_RATIO[1]) / 2;
  const boundaryRight = (FORK_LANE_CENTER_X_RATIO[1] + FORK_LANE_CENTER_X_RATIO[2]) / 2;
  if (ratio < boundaryLeft) return 0;
  if (ratio < boundaryRight) return 1;
  return 2;
};

export const getNearestForkLaneFromXRatio = (ratio: number): ForkLane => {
  const lanes: ForkLane[] = [0, 1, 2];
  return lanes.reduce((nearest, lane) =>
    Math.abs(ratio - FORK_LANE_CENTER_X_RATIO[lane]) <
    Math.abs(ratio - FORK_LANE_CENTER_X_RATIO[nearest])
      ? lane
      : nearest
  , 0);
};

export interface ForkLayout {
  hasFriend: boolean;
  lanes: Record<ForkLane, ForkItem>;
}

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export const FRIEND_APPEARANCE_CHANCE = 0.35;

export const createForkLayout = (forceFriend: boolean): ForkLayout => {
  const hasFriend = forceFriend || Math.random() < FRIEND_APPEARANCE_CHANCE;
  const items: ForkItem[] = hasFriend ? ["food", "ball", "friend"] : ["food", "ball", "ball"];
  const shuffled = shuffle(items);

  return {
    hasFriend,
    lanes: {
      0: shuffled[0],
      1: shuffled[1],
      2: shuffled[2],
    },
  };
};

export const isFriendBonusPick = (layout: ForkLayout, lane: ForkLane): boolean =>
  layout.hasFriend && layout.lanes[lane] === "friend";
