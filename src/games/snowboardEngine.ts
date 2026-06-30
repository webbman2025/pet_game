import {
  FORK_DOG_STOP_BELOW_ITEM_RATIO,
  FORK_ITEM_TOP_RATIO,
  FORK_LANE_CENTER_X_RATIO,
  FORK_SPLIT_DOG_OFFSET_UP_RATIO,
} from "@/utils/walkFork";

type WalkLane = 0 | 1 | 2;
const WALK_LANES: WalkLane[] = [0, 1, 2];

export interface SnowboardAssets {
  snowboardBg: string;
  snowboardBgForkGrass?: string;
  snowboardBgGrass?: string;
  snowboardCenter?: string;
  snowboardLeft: string;
  snowboardRight: string;
  supremeFlag: string;
  water: string;
  trap: string;
  stick: string;
  token: string;
  clock?: string;
  arrow: string;
  arrowRight?: string;
  add5Point: string;
  minusHeart: string;
  timesUp: string;
}

const SKIER_WIDTH_RATIO = 0.095;
const SKIER_ASPECT = 324 / 134;
const LARGE_OBSTACLE_WIDTH_RATIO = 0.19;
const SMALL_OBSTACLE_WIDTH_RATIO = 0.11;
const TOKEN_WIDTH_RATIO = 0.075;
const CLOCK_WIDTH_RATIO = 0.085;
const STICK_WIDTH_RATIO = 72 / 393;
const SPAWN_SAFE_ZONE_RATIO = 0.17;
/** Min vertical clearance before the next spawn row (fraction of canvas height). */
const SPAWN_MIN_GAP_RATIO = 0.3;
/** Padding between object hitboxes when checking overlap. */
const SPAWN_BOX_PADDING_PX = 10;
const DOG_ANIM_INTERVAL_MS = 130;
const DOG_ANIM_SEQUENCE = ["snowboardRight", "snowboardLeft"] as const;

export type WalkGameEndReason = "finish" | "fail";
export type WalkFinishPhase = "none" | "rush" | "approach" | "choice" | "lane" | "settled";

export interface SnowboardEngineCallbacks {
  onScoreChange: (score: number) => void;
  onTimerChange: (seconds: number) => void;
  onLivesChange: (lives: number) => void;
  onTimeUp: () => void;
  onFinishPhaseChange: (phase: WalkFinishPhase) => void;
  onGameEnd: (score: number, reason: WalkGameEndReason) => void;
  onForkReady: (score: number) => void;
  onForkLanePick: (lane: 0 | 1 | 2) => void;
  onObstacleHit: () => void;
  onShake: () => void;
}

interface LoadedImage {
  img: HTMLImageElement;
  width: number;
  height: number;
}

interface TrackPoint {
  prevX: number;
  prevY: number;
  curX: number;
  curY: number;
}

interface TrackObject {
  width: number;
  height: number;
  x: number;
  y: number;
  img: LoadedImage;
  isToken: boolean;
  isCollected: boolean;
  kind: "token" | "clock" | "water" | "poop" | "stick";
}

export const WALK_GAME_DURATION_SEC = 30;
const GAME_DURATION_MS = WALK_GAME_DURATION_SEC * 1000;
const FPS_INTERVAL = 1000 / 35;
const MAX_TRACKS = 50;
const MAX_TRACK_OBJECTS = 24;
const MAX_SCROLL_SPEED = 11;
const SCROLL_SPEED_INCREMENT = 0.16;
const SCROLL_ACCELERATION = 1.00035;
const FINISH_RUSH_MIN_SPEED = 9;
const FINISH_RUSH_MAX_SPEED = 20;
const FINISH_RUSH_ACCELERATION = 1.06;
const GRASS_FINISH_SCROLL_RATIO = 0.5;
const TIME_UP_HOLD_MS = 1500;
const DOG_APPROACH_SPEED = 5;
const DOG_AXIS_WALK_SPEED = 5;
const TIME_UP_CENTER_LERP = 0.1;
/** Y-position within fork grass image (0=top) where the 3 lanes diverge */
const FORK_SPLIT_Y_RATIO = 0.74;
/** Fallback: pause after scrolling this far into the fork image */
const FORK_CHOICE_MIN_SCROLL_RATIO = 0.42;
/** Hard cap: never scroll past this point without pausing for lane choice */
const FORK_CHOICE_MAX_SCROLL_RATIO = 0.62;
const GRASS_FILL_COLOR = "#66bb6a";
const TILE_OVERLAP_PX = 1;
const INVINCIBILITY_MS = 2000;
const INVINCIBILITY_FLICKER_CYCLE_MS = 100;
const INVINCIBILITY_MIN_OPACITY = 0.6;
const CLOCK_BONUS_MS = 2000;
/**
 * Spawn weights (roll is 0 … SPAWN_ROLL_RANGE - 1).
 * Biased toward poop/sticks so the path feels busier without starving coins/clocks.
 */
const SPAWN_WEIGHT_TOKEN = 30;
const SPAWN_WEIGHT_CLOCK = 22;
const SPAWN_WEIGHT_WATER = 20;
const SPAWN_WEIGHT_POOP = 42;
const SPAWN_WEIGHT_STICK = 46;
const SPAWN_ROLL_RANGE =
  SPAWN_WEIGHT_TOKEN +
  SPAWN_WEIGHT_CLOCK +
  SPAWN_WEIGHT_WATER +
  SPAWN_WEIGHT_POOP +
  SPAWN_WEIGHT_STICK;

const loadImage = (src: string): Promise<LoadedImage> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || 1;
      const height = img.naturalHeight || 1;
      resolve({ img, width, height });
    };
    img.onerror = reject;
    img.src = src;
  });

export class SnowboardEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: SnowboardAssets;
  private callbacks: SnowboardEngineCallbacks;
  private images: Partial<Record<keyof SnowboardAssets, LoadedImage>> = {};
  private animationId: number | null = null;
  private then = Date.now();
  private countDown = 0;
  private timerMs = GAME_DURATION_MS;
  private isRunning = false;
  private isEnded = false;
  private hasTriggeredTimeUp = false;
  private hasTriggeredFork = false;
  private forkPhaseActive = false;
  private finishPhase: WalkFinishPhase = "none";
  private finishScrollPos = 0;
  private finishTransitionGrassOffset = 0;
  private forkGrassDrawHeight = 0;
  private onLaneWalkComplete: (() => void) | null = null;
  private rushStartSkierX = 0;
  private rushCenterSkierX = 0;
  private choicePhaseStartedAt = 0;
  private hasNotifiedForkReady = false;
  private choiceResolved = false;
  private laneWalkSegment: "horizontal" | "vertical" = "horizontal";
  private laneWalkTargetX = 0;
  private laneWalkTargetY = 0;
  private score = 0;
  private lives = 3;
  private speed = 0;
  private acceleration = SCROLL_ACCELERATION;
  private skierX = 0;
  private skierY = 0;
  private skierWidth = 0;
  private skierHeight = 0;
  private skierImg: LoadedImage | null = null;
  private invincibleUntil = 0;
  private prevPointerX: number | null = null;
  private isDragging = false;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private dpr = 1;
  private bgScrollOffset = 0;
  private grassTileHeight = 0;
  private dogAnimFrameIndex = 0;
  private dogAnimLastTick = 0;
  private tracks: TrackPoint[] = [];
  private trackObjects: TrackObject[] = [];
  private arrow = {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    visible: true,
  };
  private flag = {
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    active: false,
  };

  constructor(
    canvas: HTMLCanvasElement,
    assets: SnowboardAssets,
    callbacks: SnowboardEngineCallbacks
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to acquire 2D canvas context");
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.assets = assets;
    this.callbacks = callbacks;
    this.bindPointerEvents();
  }

  async load(): Promise<void> {
    const entries = Object.entries(this.assets).filter(
      ([, src]) => typeof src === "string" && src.length > 0
    ) as [keyof SnowboardAssets, string][];
    const results = await Promise.allSettled(
      entries.map(async ([key, src]) => [key, await loadImage(src)] as const)
    );
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const [key, image] = result.value;
        this.images[key] = image;
      } else {
        console.error("Failed to load walk game asset:", result.reason);
      }
    });
    this.resize();
  }

  /** Static gameplay frame for tutorial overlay (before start). */
  drawPreviewFrame(): void {
    if (this.isRunning) return;
    this.layoutEntities();
    this.trackObjects = [];
    this.bgScrollOffset = 0;
    this.arrow.visible = false;
    this.draw();
  }

  private updateGrassTileHeight(): void {
    const grassImg = this.images.snowboardBgGrass;
    const forkGrassImg = this.images.snowboardBgForkGrass;
    if (grassImg && this.canvasWidth > 0) {
      this.grassTileHeight = Math.round(
        this.canvasWidth * (grassImg.height / grassImg.width)
      );
    }
    if (forkGrassImg && this.canvasWidth > 0) {
      this.forkGrassDrawHeight = Math.round(
        this.canvasWidth * (forkGrassImg.height / forkGrassImg.width)
      );
    }
  }

  private sizeFromImage(img: LoadedImage, widthRatio: number): { width: number; height: number } {
    const width = this.canvasWidth * widthRatio;
    const height = width * (img.height / img.width);
    return { width, height };
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvasWidth = Math.max(rect.width, 1) * this.dpr;
    this.canvasHeight = Math.max(rect.height, 1) * this.dpr;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.updateGrassTileHeight();
    if (this.isRunning || this.trackObjects.length > 0) {
      this.layoutEntities();
    } else if (!this.isEnded && this.finishPhase === "none") {
      this.layoutEntities();
      this.draw();
    }
  }

  start(): void {
    this.stop();
    this.resetState();
    this.isRunning = true;
    this.countDown = Date.now() + GAME_DURATION_MS;
    this.then = Date.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.unbindPointerEvents();
  }

  private resetState(): void {
    this.isEnded = false;
    this.hasTriggeredTimeUp = false;
    this.hasTriggeredFork = false;
    this.forkPhaseActive = false;
    this.finishPhase = "none";
    this.finishScrollPos = 0;
    this.finishTransitionGrassOffset = 0;
    this.onLaneWalkComplete = null;
    this.rushStartSkierX = 0;
    this.rushCenterSkierX = 0;
    this.hasNotifiedForkReady = false;
    this.choiceResolved = false;
    this.laneWalkSegment = "horizontal";
    this.score = 0;
    this.lives = 3;
    this.speed = 0;
    this.timerMs = GAME_DURATION_MS;
    this.prevPointerX = null;
    this.tracks = [];
    this.trackObjects = [];
    this.invincibleUntil = 0;
    this.bgScrollOffset = 0;
    this.dogAnimFrameIndex = 0;
    this.dogAnimLastTick = Date.now();
    this.callbacks.onScoreChange(0);
    this.callbacks.onLivesChange(3);
    this.callbacks.onTimerChange(WALK_GAME_DURATION_SEC);
    this.layoutEntities();
    this.spawnWave();
  }

  private layoutEntities(): void {
    const leftImg = this.images.snowboardLeft;
    const grassImg = this.images.snowboardBgGrass;
    const flagImg = this.images.supremeFlag;
    if (!leftImg || !grassImg || !flagImg) return;

    this.skierWidth = this.canvasWidth * SKIER_WIDTH_RATIO;
    this.skierHeight = this.skierWidth * SKIER_ASPECT;
    this.skierX = this.canvasWidth / 2 - this.skierWidth / 2;
    const bottomMargin = this.canvasHeight * 0.05;
    this.skierY = this.canvasHeight - this.skierHeight - bottomMargin;

    const walkFrames = DOG_ANIM_SEQUENCE.map((key) => this.images[key]).filter(
      (frame): frame is LoadedImage => Boolean(frame)
    );
    this.dogAnimFrameIndex = 0;
    this.skierImg = walkFrames[0] ?? leftImg;

    const arrowImg = this.images.arrow;
    if (arrowImg) {
      this.arrow.width = this.canvasWidth * 0.14;
      this.arrow.height = arrowImg.width / arrowImg.height > 2
        ? this.arrow.width / (arrowImg.width / arrowImg.height)
        : this.arrow.width;
      this.arrow.x = this.canvasWidth * 0.18;
      this.arrow.y = -this.arrow.height;
      this.arrow.visible = true;
    }

    this.flag.width = this.canvasWidth * 0.9;
    this.flag.height = this.flag.width * (414 / 740);
    this.flag.x = this.canvasWidth * 0.05;
    this.flag.y = -this.flag.height;
    this.flag.active = false;
    this.updateGrassTileHeight();
  }

  moveDogToForkLane(lane: 0 | 1 | 2): void {
    const targetX = this.canvasWidth * FORK_LANE_CENTER_X_RATIO[lane] - this.skierWidth / 2;
    const { minX, maxX } = this.getPlayableLaneBounds(this.skierWidth);
    this.skierX = Math.max(minX, Math.min(maxX, targetX));
  }

  startLaneWalk(lane: 0 | 1 | 2, onComplete: () => void): boolean {
    if (this.finishPhase !== "choice" || this.choiceResolved) return false;
    this.choiceResolved = true;
    this.laneWalkTargetX = this.getLaneDogX(lane);
    this.laneWalkTargetY = this.getLaneItemDogY();
    this.laneWalkSegment =
      Math.abs(this.skierX - this.laneWalkTargetX) < 2 ? "vertical" : "horizontal";
    this.setFinishPhase("lane");
    this.onLaneWalkComplete = onComplete;
    return true;
  }

  getFinishPhase(): WalkFinishPhase {
    return this.finishPhase;
  }

  isForkPickReady(): boolean {
    return this.canAcceptForkPick();
  }

  private spawnWave(): void {
    const roll = Math.random();

    if (roll < 0.3) {
      this.spawnKindInLane(this.rollSpawnKind("collectible"), this.pickRandomLanes(1)[0]);
      return;
    }

    if (roll < 0.58) {
      this.spawnKindInLane(this.rollSpawnKind("hazard"), this.pickRandomLanes(1)[0]);
      return;
    }

    if (roll < 0.84) {
      const [laneA, laneB] = this.pickRandomLanes(2);
      this.spawnKindInLane(this.rollSpawnKind("hazard"), laneA);
      this.spawnKindInLane(this.rollSpawnKind("hazard"), laneB);
      return;
    }

    const hazardLane = this.pickRandomLanes(1)[0];
    const safeLanes = WALK_LANES.filter((lane) => lane !== hazardLane);
    this.spawnKindInLane(this.rollSpawnKind("hazard"), hazardLane);
    this.spawnKindInLane(
      this.rollSpawnKind("collectible"),
      safeLanes[Math.floor(Math.random() * safeLanes.length)]
    );
  }

  private rollSpawnKind(
    pool: "collectible" | "hazard" | "any"
  ): TrackObject["kind"] {
    if (pool === "collectible") {
      return Math.random() < 0.58 ? "token" : "clock";
    }

    if (pool === "hazard") {
      const roll = Math.floor(
        Math.random() * (SPAWN_WEIGHT_WATER + SPAWN_WEIGHT_POOP + SPAWN_WEIGHT_STICK)
      );
      if (roll < SPAWN_WEIGHT_WATER) return "water";
      if (roll < SPAWN_WEIGHT_WATER + SPAWN_WEIGHT_POOP) return "poop";
      return "stick";
    }

    const roll = Math.floor(Math.random() * SPAWN_ROLL_RANGE);
    if (roll < SPAWN_WEIGHT_TOKEN) return "token";
    if (roll < SPAWN_WEIGHT_TOKEN + SPAWN_WEIGHT_CLOCK) return "clock";
    if (roll < SPAWN_WEIGHT_TOKEN + SPAWN_WEIGHT_CLOCK + SPAWN_WEIGHT_WATER) return "water";
    if (
      roll <
      SPAWN_WEIGHT_TOKEN + SPAWN_WEIGHT_CLOCK + SPAWN_WEIGHT_WATER + SPAWN_WEIGHT_POOP
    ) {
      return "poop";
    }
    return "stick";
  }

  private pickRandomLanes(count: 1 | 2): WalkLane[] {
    const shuffled = [...WALK_LANES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private spawnKindInLane(kind: TrackObject["kind"], lane: WalkLane): boolean {
    const spec = this.getSpawnSpec(kind);
    if (!spec) return false;

    const y = -spec.height;
    const x = this.laneCenterX(lane, spec.width);
    if (this.wouldOverlap({ x, y, width: spec.width, height: spec.height })) {
      return false;
    }

    this.trackObjects.push({
      width: spec.width,
      height: spec.height,
      x,
      y,
      img: spec.img,
      isToken: kind === "token",
      isCollected: false,
      kind,
    });
    return true;
  }

  private getSpawnSpec(
    kind: TrackObject["kind"]
  ): { img: LoadedImage; width: number; height: number } | null {
    const tokenImg = this.images.token;
    const clockImg = this.images.clock;
    const waterImg = this.images.water;
    const poopImg = this.images.trap;
    const stickImg = this.images.stick;

    switch (kind) {
      case "token":
        return tokenImg
          ? { img: tokenImg, ...this.sizeFromImage(tokenImg, TOKEN_WIDTH_RATIO) }
          : null;
      case "clock":
        return clockImg
          ? { img: clockImg, ...this.sizeFromImage(clockImg, CLOCK_WIDTH_RATIO) }
          : null;
      case "water":
        return waterImg
          ? { img: waterImg, ...this.sizeFromImage(waterImg, LARGE_OBSTACLE_WIDTH_RATIO) }
          : null;
      case "poop":
        return poopImg
          ? { img: poopImg, ...this.sizeFromImage(poopImg, SMALL_OBSTACLE_WIDTH_RATIO) }
          : null;
      case "stick":
        return stickImg
          ? { img: stickImg, ...this.sizeFromImage(stickImg, STICK_WIDTH_RATIO) }
          : null;
      default:
        return null;
    }
  }

  private laneCenterX(lane: WalkLane, width: number): number {
    const center = this.canvasWidth * FORK_LANE_CENTER_X_RATIO[lane];
    const x = center - width / 2;
    const { minX, maxX } = this.getPlayableLaneBounds(width);
    return Math.max(minX, Math.min(maxX, x));
  }

  private rectsOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
    padding = SPAWN_BOX_PADDING_PX
  ): boolean {
    return !(
      a.x + a.width + padding < b.x ||
      b.x + b.width + padding < a.x ||
      a.y + a.height + padding < b.y ||
      b.y + b.height + padding < a.y
    );
  }

  private wouldOverlap(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    return this.trackObjects.some(
      (object) => !object.isCollected && this.rectsOverlap(rect, object)
    );
  }

  private getLeadSpawnY(): number {
    const active = this.trackObjects.filter((object) => !object.isCollected);
    if (!active.length) return Number.POSITIVE_INFINITY;
    return Math.min(...active.map((object) => object.y));
  }

  private isCollectibleKind(kind: TrackObject["kind"]): boolean {
    return kind === "token" || kind === "clock";
  }

  private collectClockBonus(): void {
    this.countDown += CLOCK_BONUS_MS;
    const seconds = Math.max(0, Math.ceil((this.countDown - Date.now()) / 1000));
    this.callbacks.onTimerChange(seconds);
  }

  private getPlayableLaneBounds(entityWidth: number): { minX: number; maxX: number } {
    const minX = this.canvasWidth * SPAWN_SAFE_ZONE_RATIO;
    const maxX = this.canvasWidth * (1 - SPAWN_SAFE_ZONE_RATIO) - entityWidth;
    return { minX, maxX: Math.max(minX, maxX) };
  }

  private isInvincible(): boolean {
    return Date.now() < this.invincibleUntil;
  }

  private getInvincibilityOpacity(): number {
    if (!this.isInvincible()) return 1;

    const elapsed = INVINCIBILITY_MS - (this.invincibleUntil - Date.now());
    const phase = (elapsed % INVINCIBILITY_FLICKER_CYCLE_MS) / INVINCIBILITY_FLICKER_CYCLE_MS;
    if (phase < 0.5) {
      return 1 - phase * 2 * (1 - INVINCIBILITY_MIN_OPACITY);
    }
    return INVINCIBILITY_MIN_OPACITY + (phase - 0.5) * 2 * (1 - INVINCIBILITY_MIN_OPACITY);
  }

  private drawTiledLayer(img: LoadedImage): void {
    const tileW = this.canvasWidth;
    const tileH =
      this.grassTileHeight || Math.round(this.canvasWidth * (img.height / img.width));
    if (tileH <= 0) return;

    const offset = ((this.bgScrollOffset % tileH) + tileH) % tileH;
    const startIndex = Math.floor(-offset / tileH) - 1;
    const endIndex = Math.ceil((this.canvasHeight - offset) / tileH) + 1;

    for (let i = startIndex; i <= endIndex; i++) {
      const drawY = Math.round(i * tileH + offset);
      this.ctx.drawImage(
        img.img,
        0,
        0,
        img.width,
        img.height,
        0,
        drawY,
        tileW,
        tileH + TILE_OVERLAP_PX
      );
    }
  }

  private scrollBackground(): void {
    if (this.finishPhase !== "none") return;
    this.bgScrollOffset += this.speed;
    const tileH = this.grassTileHeight;
    if (tileH > 0) {
      this.bgScrollOffset = ((this.bgScrollOffset % tileH) + tileH) % tileH;
    }
  }

  private setFinishPhase(phase: WalkFinishPhase): void {
    this.finishPhase = phase;
    this.callbacks.onFinishPhaseChange(phase);
  }

  private beginFinishRush(): void {
    const tileH = this.grassTileHeight;
    const forkImg = this.images.snowboardBgForkGrass;
    if (!forkImg || this.forkGrassDrawHeight <= 0) {
      console.warn(
        "[WalkGame] walk_bg_fork_grass.png missing — fork background will not render"
      );
    }
    this.finishTransitionGrassOffset =
      tileH > 0 ? ((this.bgScrollOffset % tileH) + tileH) % tileH : 0;
    this.finishScrollPos = 0;
    this.rushStartSkierX = this.skierX;
    this.rushCenterSkierX = this.canvasWidth / 2 - this.skierWidth / 2;
    this.setFinishPhase("rush");
    this.trackObjects = [];
    this.arrow.visible = false;
    this.speed = Math.max(this.speed, FINISH_RUSH_MIN_SPEED);
  }

  private updateRushDogCenter(): void {
    const grassTail = this.getGrassRemainderDistance();
    const forkH = this.forkGrassDrawHeight;
    const targetScroll =
      grassTail + (forkH > 0 ? forkH * FORK_CHOICE_MIN_SCROLL_RATIO : this.canvasHeight * 0.3);
    const progress = targetScroll > 0 ? Math.min(1, this.finishScrollPos / targetScroll) : 1;
    this.skierX =
      this.rushStartSkierX +
      (this.rushCenterSkierX - this.rushStartSkierX) * progress;
  }

  private getGrassRemainderDistance(): number {
    const tileH = this.grassTileHeight;
    if (tileH <= 0) return 0;
    const offset = this.finishTransitionGrassOffset;
    const fullRemainder = offset === 0 ? tileH : tileH - offset;
    return fullRemainder * GRASS_FINISH_SCROLL_RATIO;
  }

  private getForkScrollDistance(): number {
    return Math.max(0, this.finishScrollPos - this.getGrassRemainderDistance());
  }

  private getForkSplitScreenY(forkScroll: number): number {
    const splitY = this.forkGrassDrawHeight * FORK_SPLIT_Y_RATIO;
    return this.canvasHeight - this.forkGrassDrawHeight + forkScroll + splitY;
  }

  private getDogBottomY(): number {
    const bottomMargin = this.canvasHeight * 0.05;
    return this.canvasHeight - this.skierHeight - bottomMargin;
  }

  private getLaneDogX(lane: 0 | 1 | 2): number {
    return this.canvasWidth * FORK_LANE_CENTER_X_RATIO[lane] - this.skierWidth / 2;
  }

  private getLaneItemDogY(): number {
    const itemAnchorY = this.canvasHeight * FORK_ITEM_TOP_RATIO;
    return itemAnchorY + this.canvasHeight * FORK_DOG_STOP_BELOW_ITEM_RATIO;
  }

  private getForkSplitDogY(): number {
    const forkScroll = this.getForkScrollDistance();
    const offsetUp = this.canvasHeight * FORK_SPLIT_DOG_OFFSET_UP_RATIO;
    return this.getForkSplitScreenY(forkScroll) - this.skierHeight - offsetUp;
  }

  private getApproachStartScroll(): number {
    const grassRemainder = this.getGrassRemainderDistance();
    const forkH = this.forkGrassDrawHeight;
    if (forkH <= 0) {
      return grassRemainder + this.canvasHeight * 0.3;
    }

    const splitYInImage = forkH * FORK_SPLIT_Y_RATIO;
    const targetSplitScreenY = this.canvasHeight * 0.6;
    const forkScroll = targetSplitScreenY - this.canvasHeight + forkH - splitYInImage;
    return grassRemainder + Math.max(forkH * 0.12, forkScroll);
  }

  private updateTimeUpCentering(): void {
    const targetX = this.canvasWidth / 2 - this.skierWidth / 2;
    this.skierX += (targetX - this.skierX) * TIME_UP_CENTER_LERP;
    this.rushCenterSkierX = targetX;
  }

  private beginApproach(): void {
    this.finishScrollPos = this.getApproachStartScroll();
    this.skierX = this.rushCenterSkierX;
    this.setFinishPhase("approach");
  }

  private updateApproach(): void {
    const targetY = this.getForkSplitDogY();
    this.skierX = this.rushCenterSkierX;
    if (this.skierY > targetY + 1) {
      this.skierY = Math.max(targetY, this.skierY - DOG_APPROACH_SPEED);
      return;
    }
    this.skierY = targetY;
    this.enterForkChoice();
  }

  private completeLaneWalk(): void {
    this.skierX = this.laneWalkTargetX;
    this.skierY = this.laneWalkTargetY;
    this.setFinishPhase("settled");
    this.forkPhaseActive = true;
    const onComplete = this.onLaneWalkComplete;
    this.onLaneWalkComplete = null;
    onComplete?.();
  }

  private updateLaneWalk(): void {
    if (this.laneWalkSegment === "horizontal") {
      const dx = this.laneWalkTargetX - this.skierX;
      if (Math.abs(dx) <= DOG_AXIS_WALK_SPEED) {
        this.skierX = this.laneWalkTargetX;
        this.laneWalkSegment = "vertical";
        return;
      }
      this.skierX += Math.sign(dx) * DOG_AXIS_WALK_SPEED;
      return;
    }

    const dy = this.laneWalkTargetY - this.skierY;
    if (Math.abs(dy) <= DOG_AXIS_WALK_SPEED) {
      this.completeLaneWalk();
      return;
    }
    this.skierY += Math.sign(dy) * DOG_AXIS_WALK_SPEED;
  }

  private checkRushComplete(): void {
    const target = this.getApproachStartScroll();
    const forkScroll = this.getForkScrollDistance();
    const forkH = this.forkGrassDrawHeight;
    const maxReached =
      forkH > 0 && forkScroll >= forkH * FORK_CHOICE_MAX_SCROLL_RATIO;
    if (this.finishScrollPos >= target || maxReached) {
      this.beginApproach();
    }
  }

  private enterForkChoice(): void {
    if (this.hasTriggeredFork) return;
    this.skierX = this.rushCenterSkierX;
    this.skierY = this.getForkSplitDogY();
    this.choicePhaseStartedAt = Date.now();
    this.setFinishPhase("choice");
    this.forkPhaseActive = true;
    this.speed = 0;
    this.hasTriggeredFork = true;
    if (!this.hasNotifiedForkReady) {
      this.hasNotifiedForkReady = true;
      this.callbacks.onForkReady(this.score);
    }
  }

  private canAcceptForkPick(): boolean {
    return (
      this.finishPhase === "choice" &&
      Date.now() - this.choicePhaseStartedAt > 150
    );
  }

  private drawGrassAtOffset(offset: number): void {
    const grassImg = this.images.snowboardBgGrass;
    if (!grassImg) return;

    const tileW = this.canvasWidth;
    const tileH =
      this.grassTileHeight || Math.round(this.canvasWidth * (grassImg.height / grassImg.width));
    if (tileH <= 0) return;

    const normalizedOffset = ((offset % tileH) + tileH) % tileH;
    const startIndex = Math.floor(-normalizedOffset / tileH) - 1;
    const endIndex = Math.ceil((this.canvasHeight - normalizedOffset) / tileH) + 1;

    for (let i = startIndex; i <= endIndex; i++) {
      const drawY = Math.round(i * tileH + normalizedOffset);
      this.ctx.drawImage(
        grassImg.img,
        0,
        0,
        grassImg.width,
        grassImg.height,
        0,
        drawY,
        tileW,
        tileH + TILE_OVERLAP_PX
      );
    }
  }

  private drawFinishSequence(scrollPos: number): void {
    const grassImg = this.images.snowboardBgGrass;
    const forkGrassImg = this.images.snowboardBgForkGrass;
    const tileH = this.grassTileHeight;
    const forkH = this.forkGrassDrawHeight;
    const grassRemainder = this.getGrassRemainderDistance();
    const forkScroll = Math.max(0, scrollPos - grassRemainder);

    this.ctx.fillStyle = GRASS_FILL_COLOR;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (!grassImg || tileH <= 0) return;

    if (scrollPos < grassRemainder) {
      this.drawGrassAtOffset(this.finishTransitionGrassOffset + scrollPos);
      return;
    }

    if (!forkGrassImg || forkH <= 0) {
      this.drawGrassAtOffset(this.finishTransitionGrassOffset + scrollPos);
      return;
    }

    const forkDrawY = Math.round(this.canvasHeight - forkH + forkScroll);
    this.ctx.drawImage(
      forkGrassImg.img,
      0,
      0,
      forkGrassImg.width,
      forkGrassImg.height,
      0,
      forkDrawY,
      this.canvasWidth,
      forkH
    );

    if (forkDrawY > 0 && forkScroll < tileH) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, this.canvasWidth, forkDrawY);
      this.ctx.clip();
      this.drawGrassAtOffset(this.finishTransitionGrassOffset + scrollPos);
      this.ctx.restore();
    }
  }

  private updateDogAnimation(): void {
    if (this.isEnded) return;
    if (
      !this.isRunning &&
      !this.forkPhaseActive &&
      this.finishPhase === "none"
    ) {
      return;
    }

    const walkFrames = DOG_ANIM_SEQUENCE.map((key) => this.images[key]).filter(
      (frame): frame is LoadedImage => Boolean(frame)
    );
    if (walkFrames.length === 0) return;

    const now = Date.now();
    if (now - this.dogAnimLastTick < DOG_ANIM_INTERVAL_MS) return;

    this.dogAnimLastTick = now;
    this.dogAnimFrameIndex = (this.dogAnimFrameIndex + 1) % walkFrames.length;
    this.skierImg = walkFrames[this.dogAnimFrameIndex];
  }

  private loop = (): void => {
    const now = Date.now();
    const delta = now - this.then;

    if (delta >= FPS_INTERVAL) {
      this.then = now - (delta % FPS_INTERVAL);
      if (!this.isEnded) {
        this.update();
      }
      this.draw();
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    if (this.isEnded) return;

    if (this.finishPhase === "rush") {
      this.speed = Math.min(this.speed * FINISH_RUSH_ACCELERATION, FINISH_RUSH_MAX_SPEED);
      this.finishScrollPos += this.speed;
      this.updateRushDogCenter();
      this.checkRushComplete();
      this.updateDogAnimation();
      return;
    }

    if (this.finishPhase === "approach") {
      this.updateApproach();
      this.updateDogAnimation();
      return;
    }

    if (this.finishPhase === "choice") {
      this.updateDogAnimation();
      return;
    }

    if (this.finishPhase === "lane") {
      this.updateLaneWalk();
      this.updateDogAnimation();
      return;
    }

    if (this.finishPhase === "settled") {
      this.updateDogAnimation();
      return;
    }

    if (!this.isRunning) return;

    const now = Date.now();
    this.timerMs = this.countDown - now;
    const seconds = Math.max(0, Math.ceil(this.timerMs / 1000));
    this.callbacks.onTimerChange(seconds);

    if (this.timerMs <= 0 && !this.hasTriggeredTimeUp) {
      this.hasTriggeredTimeUp = true;
      this.callbacks.onTimeUp();
    }

    if (
      this.timerMs <= -TIME_UP_HOLD_MS &&
      this.finishPhase === "none" &&
      !this.hasTriggeredFork
    ) {
      this.beginFinishRush();
    }

    if (this.timerMs > 0) {
      this.updateSpeed(false);
      this.scrollBackground();
      this.updateTracks();
      this.updateTrackObjects(true);
      this.maybeSpawnTrackObject();
      this.updateArrow();
      this.updateSkierTracks();
      this.updateDogAnimation();
    } else if (this.finishPhase === "none") {
      this.updateTimeUpCentering();
      this.updateDogAnimation();
    }
  }

  private updateSpeed(slowdown: boolean): void {
    if (slowdown) {
      this.speed *= 0.99;
    } else if (this.speed < MAX_SCROLL_SPEED) {
      this.speed += SCROLL_SPEED_INCREMENT;
    }
    this.speed *= this.acceleration;
  }

  private updateTracks(): void {
    this.tracks.forEach((track) => {
      track.prevY += this.speed;
      track.curY += this.speed;
    });
  }

  private updateSkierTracks(): void {
    if (!this.arrow.visible || !this.skierImg) return;

    const newTrack: TrackPoint = {
      curX: this.skierX + this.skierWidth * 0.5,
      curY: this.skierY + this.skierHeight * 0.9,
      prevX: this.tracks.length
        ? this.tracks[this.tracks.length - 1].curX
        : this.skierX + this.skierWidth * 0.5,
      prevY: this.tracks.length
        ? this.tracks[this.tracks.length - 1].curY
        : this.skierY + this.skierHeight * 0.9,
    };
    this.tracks.push(newTrack);
    if (this.tracks.length > MAX_TRACKS) {
      this.tracks.shift();
    }
  }

  private updateTrackObjects(checkCollisions: boolean): void {
    this.trackObjects = this.trackObjects.filter((object) => {
      if (!object.isCollected && checkCollisions) {
        if (this.intersects(object) && (this.isCollectibleKind(object.kind) || !this.isInvincible())) {
          if (object.kind === "token") {
            this.score += 5;
            this.callbacks.onScoreChange(this.score);
            this.triggerHit(true);
          } else if (object.kind === "clock") {
            this.collectClockBonus();
          } else {
            this.lives -= 1;
            this.callbacks.onLivesChange(this.lives);
            this.triggerHit(false);
            if (this.lives <= 0) {
              this.endGame("fail");
            }
          }
          object.isCollected = true;
        }
        object.y += this.speed;
      }
      return object.y <= this.canvasHeight + object.height;
    });
  }

  private maybeSpawnTrackObject(): void {
    const leadY = this.getLeadSpawnY();
    const gapThreshold = this.canvasHeight * SPAWN_MIN_GAP_RATIO;
    if (leadY > gapThreshold) {
      this.spawnWave();
      if (this.trackObjects.length > MAX_TRACK_OBJECTS) {
        this.trackObjects.shift();
      }
    }
  }

  private updateArrow(): void {
    if (!this.arrow.visible) return;
    this.arrow.y += this.speed;
    if (this.arrow.y + this.arrow.height >= this.skierY - this.skierHeight * 0.1) {
      this.arrow.visible = false;
    }
  }

  private draw(): void {
    const ctx = this.ctx;

    if (this.finishPhase !== "none") {
      this.drawFinishSequence(this.finishScrollPos);
      if (this.skierImg) {
        ctx.drawImage(
          this.skierImg.img,
          this.skierX,
          this.skierY,
          this.skierWidth,
          this.skierHeight
        );
      }
      return;
    }

    ctx.fillStyle = GRASS_FILL_COLOR;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const grassImg = this.images.snowboardBgGrass;
    if (grassImg) {
      this.drawTiledLayer(grassImg);
    }

    this.trackObjects.forEach((object) => {
      if (!object.isCollected) {
        ctx.drawImage(object.img.img, object.x, object.y, object.width, object.height);
      }
    });

    if (this.arrow.visible) {
      const arrowLeftImg = this.images.arrow?.img;
      const arrowRightImg = this.images.arrowRight?.img ?? arrowLeftImg;
      const rightX = this.canvasWidth * 0.68;
      if (arrowLeftImg) {
        ctx.drawImage(
          arrowLeftImg,
          this.arrow.x,
          this.arrow.y,
          this.arrow.width,
          this.arrow.height
        );
      }
      if (arrowRightImg) {
        ctx.drawImage(
          arrowRightImg,
          rightX,
          this.arrow.y,
          this.arrow.width,
          this.arrow.height
        );
      }
    }

    if (this.skierImg) {
      const dogOpacity = this.getInvincibilityOpacity();
      ctx.save();
      ctx.globalAlpha = dogOpacity;
      ctx.drawImage(
        this.skierImg.img,
        this.skierX,
        this.skierY,
        this.skierWidth,
        this.skierHeight
      );
      ctx.restore();
    }

    if (this.flag.active) {
      const flagImg = this.images.supremeFlag?.img;
      if (flagImg) {
        ctx.drawImage(
          flagImg,
          this.flag.x,
          this.flag.y,
          this.flag.width,
          this.flag.height
        );
      }
    }
  }

  private getObjectHitbox(object: TrackObject): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (object.kind === "stick") {
      const hitWidth = object.width * 0.92;
      const hitHeight = Math.max(object.height * 0.7, this.skierHeight * 0.32);
      const sweep = this.speed;
      return {
        x: object.x + (object.width - hitWidth) * 0.5,
        y: object.y + object.height - hitHeight - sweep,
        width: hitWidth,
        height: hitHeight + sweep,
      };
    }

    return {
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
    };
  }

  private intersects(object: TrackObject): boolean {
    const box = this.getObjectHitbox(object);
    const dogLeft = this.skierX + this.canvasWidth * 0.05;
    const dogRight = this.skierX + this.skierWidth - this.canvasWidth * 0.05;
    const dogTop = this.skierY + this.skierHeight * 0.2;
    const dogBottom = this.skierY + this.skierHeight;

    return !(
      dogLeft > box.x + box.width ||
      dogRight < box.x ||
      dogTop > box.y + box.height ||
      dogBottom < box.y
    );
  }

  private triggerHit(isToken: boolean): void {
    if (isToken) {
      return;
    }

    this.invincibleUntil = Date.now() + INVINCIBILITY_MS;
    this.speed = 0;
    this.callbacks.onObstacleHit();
    this.callbacks.onShake();
  }

  private endGame(reason: WalkGameEndReason): void {
    if (this.isEnded) return;
    this.isEnded = true;
    this.isRunning = false;
    this.callbacks.onGameEnd(this.score, reason);
  }

  markWalkComplete(): void {
    this.isEnded = true;
    this.isRunning = false;
  }

  private bindPointerEvents(): void {
    this.canvas.addEventListener("mousedown", this.onPointerDown);
    this.canvas.addEventListener("mousemove", this.onPointerMove);
    this.canvas.addEventListener("mouseup", this.onPointerUp);
    this.canvas.addEventListener("mouseleave", this.onPointerUp);
    this.canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.onTouchEnd, { passive: false });
  }

  private unbindPointerEvents(): void {
    this.canvas.removeEventListener("mousedown", this.onPointerDown);
    this.canvas.removeEventListener("mousemove", this.onPointerMove);
    this.canvas.removeEventListener("mouseup", this.onPointerUp);
    this.canvas.removeEventListener("mouseleave", this.onPointerUp);
    this.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.canvas.removeEventListener("touchmove", this.onTouchMove);
    this.canvas.removeEventListener("touchend", this.onTouchEnd);
  }

  private onPointerDown = (event: MouseEvent): void => {
    if (this.isEnded) return;
    if (this.finishPhase === "choice") return;
    this.isDragging = true;
    this.handlePointer(event.clientX);
  };

  private onPointerMove = (event: MouseEvent): void => {
    if (this.isEnded) return;
    if (this.finishPhase === "choice") return;
    if (!this.isDragging || this.finishPhase !== "none") return;
    this.handlePointer(event.clientX);
  };

  private onPointerUp = (): void => {
    if (this.finishPhase === "choice") return;
    this.isDragging = false;
    this.prevPointerX = null;
  };

  private onTouchStart = (event: TouchEvent): void => {
    if (this.isEnded) return;
    if (this.finishPhase === "choice") return;
    if (this.finishPhase !== "none") return;
    event.preventDefault();
    this.handlePointer(event.touches[0].clientX);
  };

  private onTouchMove = (event: TouchEvent): void => {
    if (this.isEnded) return;
    if (this.finishPhase === "choice") return;
    if (this.finishPhase !== "none") return;
    event.preventDefault();
    this.handlePointer(event.touches[0].clientX);
  };

  private onTouchEnd = (event: TouchEvent): void => {
    if (this.finishPhase === "choice") return;
    event.preventDefault();
    this.prevPointerX = null;
  };

  private handlePointer(clientX: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvasWidth / rect.width;
    const pointerX = (clientX - rect.left) * scale;

    if (this.prevPointerX !== null) {
      const moveX = this.prevPointerX - pointerX;
      this.skierX -= moveX;

      const { minX, maxX } = this.getPlayableLaneBounds(this.skierWidth);
      if (this.skierX < minX) this.skierX = minX;
      if (this.skierX > maxX) this.skierX = maxX;
    }

    this.prevPointerX = pointerX;
  }
}
