import styles from "@/styles/SpaGame.module.scss";
import { useEffect, useRef, useState } from "react";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import GameRetryModal from "@/components/GameRetryModal";
import { GameState } from "@/components/GameState";

interface SpaGameProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  gameState: GameState;
  onBackToMenu: () => void;
  acquirePoint: (name: string, point: number, satisfaction: number) => void;
}

type BubbleSize = "large" | "small";
type BubbleVariant = "ring" | "solid";
type GameResult = "timeUp" | "finish" | null;

interface BubbleItem {
  id: number;
  x: number;
  y: number;
  size: BubbleSize;
  variant: BubbleVariant;
  rotation: number;
  weakened?: boolean;
}

const GAME_DURATION = 15;
const POINTS_PER_BUBBLE = 5;
const TARGET_CLEANING = 100;
const DOG_TOP_PERCENT = 16;
const DOG_HEIGHT_PERCENT = 84;
const MIN_BUBBLE_Y = DOG_TOP_PERCENT - DOG_HEIGHT_PERCENT * 0.15;
const MAX_BUBBLE_Y = 92;

const BUBBLE_TEMPLATE: Omit<BubbleItem, "id" | "x" | "y" | "rotation">[] = [
  { size: "large", variant: "solid" },
  { size: "large", variant: "solid" },
  { size: "large", variant: "solid" },
  { size: "large", variant: "solid" },
  { size: "small", variant: "solid" },
  { size: "small", variant: "solid" },
  { size: "small", variant: "solid" },
  { size: "small", variant: "ring" },
  { size: "small", variant: "ring" },
  { size: "small", variant: "ring" },
  { size: "small", variant: "ring" },
  { size: "small", variant: "ring" },
  { size: "small", variant: "solid" },
  { size: "small", variant: "solid" },
  { size: "small", variant: "ring" },
];

const MIN_BUBBLE_X = 12;
const MAX_BUBBLE_X = 88;
const BUBBLE_GRID_COLS = 5;
const BUBBLE_GRID_ROWS = 3;
const EYE_ZONE = { xMin: 36, xMax: 64, yMin: 32, yMax: 50 };
const DOG_FRAME_INTERVALS_MS = [1000, 2000, 1000, 2500, 1500, 1000];

const isInEyeZone = (x: number, y: number) =>
  x >= EYE_ZONE.xMin &&
  x <= EYE_ZONE.xMax &&
  y >= EYE_ZONE.yMin &&
  y <= EYE_ZONE.yMax;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const generateRandomBubbles = (): BubbleItem[] => {
  const cellIndices = shuffle(
    Array.from({ length: BUBBLE_TEMPLATE.length }, (_, index) => index)
  );
  const cellWidth = (MAX_BUBBLE_X - MIN_BUBBLE_X) / BUBBLE_GRID_COLS;
  const cellHeight = (MAX_BUBBLE_Y - MIN_BUBBLE_Y) / BUBBLE_GRID_ROWS;
  const cellPaddingX = cellWidth * 0.2;
  const cellPaddingY = cellHeight * 0.2;

  return BUBBLE_TEMPLATE.map((template, index) => {
    const cell = cellIndices[index];
    const col = cell % BUBBLE_GRID_COLS;
    const row = Math.floor(cell / BUBBLE_GRID_COLS);
    const xMin = MIN_BUBBLE_X + col * cellWidth + cellPaddingX;
    const xMax = MIN_BUBBLE_X + (col + 1) * cellWidth - cellPaddingX;
    const yMin = MIN_BUBBLE_Y + row * cellHeight + cellPaddingY;
    const yMax = MIN_BUBBLE_Y + (row + 1) * cellHeight - cellPaddingY;

    let x = xMin + Math.random() * (xMax - xMin);
    let y = yMin + Math.random() * (yMax - yMin);

    for (let attempt = 0; attempt < 12 && isInEyeZone(x, y); attempt += 1) {
      x = xMin + Math.random() * (xMax - xMin);
      y = yMin + Math.random() * (yMax - yMin);
    }

    return {
      ...template,
      id: index + 1,
      x,
      y,
      rotation: Math.floor(Math.random() * 360),
    };
  });
};

const SpaGame: React.FC<SpaGameProps> = ({
  gameState,
  onBackToMenu,
  acquirePoint,
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);

  const [point, setPoint] = useState(0);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [poppingIds, setPoppingIds] = useState<number[]>([]);
  const [shakingIds, setShakingIds] = useState<number[]>([]);
  const [showPlus5, setShowPlus5] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [dogSmiling, setDogSmiling] = useState(false);
  const lastResumeTimeRef = useRef<number>(Date.now());
  const totalBubblesRef = useRef(BUBBLE_TEMPLATE.length);
  const bubblesRef = useRef(bubbles);
  const hasSubmittedScoreRef = useRef(false);
  bubblesRef.current = bubbles;

  useEffect(() => {
    if (!isGameOver || hasSubmittedScoreRef.current) return;

    hasSubmittedScoreRef.current = true;

    if (gameResult === "finish") {
      acquirePoint("spa_game", point, 5);
      const modalTimer = setTimeout(() => setShowEndModal(true), 2000);
      return () => clearTimeout(modalTimer);
    }

    if (gameResult === "timeUp") {
      const retryTimer = setTimeout(() => setShowRetryModal(true), 1500);
      return () => clearTimeout(retryTimer);
    }
  }, [isGameOver, gameResult, point, acquirePoint]);

  useEffect(() => {
    if (showStartModal || isGameOver) return;
    if (bubbles.length === 0) {
      setIsWin(true);
      setGameResult("finish");
      setIsGameOver(true);
      setCleaningProgress(TARGET_CLEANING);
    }
  }, [bubbles.length, showStartModal, isGameOver]);

  useEffect(() => {
    if (showStartModal || isGameOver) return;

    setDogSmiling(false);
    let intervalIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNextSwap = () => {
      timeoutId = setTimeout(() => {
        setDogSmiling((prev) => !prev);
        intervalIndex = (intervalIndex + 1) % DOG_FRAME_INTERVALS_MS.length;
        scheduleNextSwap();
      }, DOG_FRAME_INTERVALS_MS[intervalIndex]);
    };

    scheduleNextSwap();

    return () => clearTimeout(timeoutId);
  }, [showStartModal, isGameOver]);

  useEffect(() => {
    if (showStartModal || isGameOver) return;

    lastResumeTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastResumeTimeRef.current) / 1000;
      const newTimer = Math.max(0, GAME_DURATION - elapsed);
      setTimer(newTimer);

      if (newTimer <= 0) {
        setTimer(0);
        if (bubblesRef.current.length > 0) {
          setIsWin(false);
          setGameResult("timeUp");
          setIsGameOver(true);
        }
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [showStartModal, isGameOver]);

  const handleStartGame = () => {
    setBubbles(generateRandomBubbles());
    setShowStartModal(false);
  };

  const resetGame = () => {
    hasSubmittedScoreRef.current = false;
    setPoint(0);
    setCleaningProgress(0);
    setIsGameOver(false);
    setIsWin(false);
    setGameResult(null);
    setTimer(GAME_DURATION);
    setBubbles(generateRandomBubbles());
    setPoppingIds([]);
    setShakingIds([]);
    setShowPlus5(false);
    setShowRetryModal(false);
    setDogSmiling(false);
    lastResumeTimeRef.current = Date.now();
  };

  const handleRetry = () => {
    resetGame();
  };

  const removeBubble = (bubbleId: number) => {
    if (poppingIds.includes(bubbleId)) return;

    setPoppingIds((prev) => [...prev, bubbleId]);
    setPoint((prev) => prev + POINTS_PER_BUBBLE);
    setShowPlus5(true);
    setTimeout(() => setShowPlus5(false), 800);

    setTimeout(() => {
      setBubbles((prev) => {
        const remaining = prev.filter((bubble) => bubble.id !== bubbleId);
        const cleared = totalBubblesRef.current - remaining.length;
        setCleaningProgress((cleared / totalBubblesRef.current) * TARGET_CLEANING);
        return remaining;
      });
      setPoppingIds((prev) => prev.filter((id) => id !== bubbleId));
    }, 150);
  };

  const tapBubble = (bubbleId: number) => {
    if (isGameOver || showStartModal || poppingIds.includes(bubbleId)) return;

    const bubble = bubbles.find((item) => item.id === bubbleId);
    if (!bubble) return;

    if (bubble.size === "large") {
      if (!bubble.weakened) {
        if (shakingIds.includes(bubbleId)) return;

        setBubbles((prev) =>
          prev.map((item) =>
            item.id === bubbleId ? { ...item, weakened: true } : item
          )
        );
        setShakingIds((prev) => [...prev, bubbleId]);
        setTimeout(() => {
          setShakingIds((prev) => prev.filter((id) => id !== bubbleId));
        }, 550);
        return;
      }

      removeBubble(bubbleId);
      return;
    }

    removeBubble(bubbleId);
  };

  const handleBubblePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    bubbleId: number
  ) => {
    event.preventDefault();
    tapBubble(bubbleId);
  };

  const getBubbleSrc = (bubble: BubbleItem) => {
    if (bubble.size === "large") {
      return assets.ui.spaGameBubbleL;
    }
    return bubble.variant === "ring"
      ? assets.ui.spaGameBubbleSRing
      : assets.ui.spaGameBubbleS;
  };

  const showBubbles = !isGameOver || gameResult === "timeUp";
  const showFinishScreen = isGameOver && gameResult === "finish" && !showEndModal;
  const showTimeUpScreen = isGameOver && gameResult === "timeUp" && !showRetryModal;
  const dogImageSrc =
    showFinishScreen || (isGameOver && gameResult === "finish")
      ? assets.ui.spaGameDogClean
      : dogSmiling
        ? assets.ui.spaGameDogSmile
        : assets.ui.spaGameDog;
  const totalPoints = gameState.point + point;

  return (
    <div className={styles.root}>
      <div className={styles.topOverlay} />

      {showStartModal && (
        <div className={styles.tutorialOverlay}>
          <div className={styles.tutorialModal}>
            <img
              className={styles.tutorialFrame}
              src={assets.ui.spaGameTutorialFrame}
              alt=""
            />
            <div className={styles.tutorialContent}>
              <h2 className={styles.tutorialTitle}>Spa Time</h2>
              <p className={styles.tutorialText}>
                Tap the bubbles and give me a nice clean spa!
                <br />
                Let&apos;s finish before time&apos;s up!
              </p>
              <img
                className={styles.tutorialPreview}
                src={assets.ui.spaGameTutorialPreview}
                alt="Spa preview"
              />
              <button className={styles.tutorialBtn} onClick={handleStartGame} type="button">
                <img className={styles.tutorialBtnBg} src={assets.ui.primaryBtn} alt="" />
                <span className={styles.tutorialBtnText}>Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className={styles.pointsModalOverlay}>
          <div className={styles.pointsModalWrap}>
            <img
              className={styles.pointsModalDog}
              src={assets.ui.spaGamePointsDog}
              alt="Dog"
            />
            <div className={styles.pointsModalFrame}>
              <img className={styles.modalTop} src={assets.ui.modalTop} alt="" />

              <div className={styles.modalCenterWrap}>
                <img className={styles.modalCenter} src={assets.ui.modalCenter} alt="" />
                <div className={styles.pointsModalContent}>
                  <p className={styles.pointsModalTitle}>You earned points</p>
                  <div className={styles.pointsModalEarned}>
                    <img src={assets.ui.coinIcon} className={styles.pointsCoinIcon} alt="" />
                    <span>+{point}</span>
                  </div>
                  <p className={styles.pointsModalTotalLabel}>Total Points</p>
                  <p className={styles.pointsModalTotal}>{totalPoints}</p>
                  <button className={styles.pointsModalBtn} onClick={onBackToMenu} type="button">
                    <img className={styles.pointsModalBtnBg} src={assets.ui.primaryBtn} alt="" />
                    <span className={styles.pointsModalBtnText}>OK</span>
                  </button>
                </div>
              </div>

              <img className={styles.modalBottom} src={assets.ui.modalButtom} alt="" />
            </div>
          </div>
        </div>
      )}

      {showRetryModal && (
        <GameRetryModal
          assets={{
            modalTop: assets.ui.modalTop,
            modalCenter: assets.ui.modalCenter,
            modalButtom: assets.ui.modalButtom,
            primaryBtn: assets.ui.primaryBtn,
            secondaryBtn: assets.ui.secondaryBtn,
          }}
          onRetry={handleRetry}
          onBack={onBackToMenu}
        />
      )}

      {showTimeUpScreen && (
        <>
          <div className={styles.timeUpOverlay} />
          <p className={styles.timeUpTitle}>TIME&apos;S UP</p>
        </>
      )}

      {showFinishScreen && (
        <>
          <div className={styles.finishOverlay} />
          <p className={styles.finishTitle}>FINISH</p>
          <img className={styles.finishBling1} src={assets.ui.spaGameBlingL} alt="" />
          <img className={styles.finishBling2} src={assets.ui.spaGameBlingM} alt="" />
          <img className={styles.finishBling3} src={assets.ui.spaGameBlingS} alt="" />
          <img className={styles.finishBling4} src={assets.ui.spaGameBlingS} alt="" />
          <img className={styles.finishBling5} src={assets.ui.spaGameBlingS} alt="" />
          <img className={styles.finishBling6} src={assets.ui.spaGameBlingM} alt="" />
        </>
      )}

      <div className={styles.gameTopBar}>
        <div className={styles.timerContainer}>
          <img className={styles.timerBox} src={assets.ui.feedGameTimerBox} alt="Timer" />
          <span className={styles.timerText}>{Math.floor(timer)}s</span>
        </div>

        <div className={styles.pointContainer}>
          <img className={styles.pointBox} src={assets.ui.feedGamePointBox} alt="Point" />
          <span className={styles.pointText}>{point}</span>
        </div>
      </div>

      <div className={styles.gameArea}>
        <div className={styles.petScene}>
          <img className={styles.dogImage} src={dogImageSrc} alt="Pet in spa" />

          {showFinishScreen && (
            <>
              <img className={styles.petBlingA} src={assets.ui.spaGameBlingL} alt="" />
              <img className={styles.petBlingB} src={assets.ui.spaGameBlingL} alt="" />
              <img className={styles.petBlingC} src={assets.ui.spaGameBlingM} alt="" />
              <img className={styles.petBlingD} src={assets.ui.spaGameBlingM} alt="" />
              <img className={styles.petBlingE} src={assets.ui.spaGameBlingS} alt="" />
              <img className={styles.petBlingF} src={assets.ui.spaGameBlingS} alt="" />
              <img className={styles.petBlingG} src={assets.ui.spaGameBlingS} alt="" />
            </>
          )}

          {!showStartModal && showBubbles &&
            bubbles.map((bubble) => (
              <button
                key={bubble.id}
                type="button"
                className={[
                  styles.bubble,
                  bubble.size === "large" ? styles.bubbleLarge : styles.bubbleSmall,
                  bubble.weakened ? styles.bubbleWeakened : "",
                  shakingIds.includes(bubble.id) ? styles.bubbleShaking : "",
                  poppingIds.includes(bubble.id) ? styles.bubblePopping : "",
                  !shakingIds.includes(bubble.id) && !poppingIds.includes(bubble.id)
                    ? styles.bubbleIdle
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  animationDelay: `${(bubble.id % 5) * 0.35}s`,
                }}
                onPointerDown={(event) => handleBubblePointerDown(event, bubble.id)}
                aria-label="Pop bubble"
              >
                <img
                  className={styles.bubbleImg}
                  src={getBubbleSrc(bubble)}
                  alt=""
                  style={{ ["--bubble-rotation" as string]: `${bubble.rotation}deg` }}
                />
              </button>
            ))}
        </div>

        <img
          className={styles.plus5Text + (showPlus5 ? " " + styles.showPlus5 : "")}
          src={assets.ui.feedGamePlus10Text}
          alt="+5"
        />
      </div>

      <div className={styles.cleaningBarContainer}>
        <img
          className={styles.cleaningBarFrame}
          src={assets.ui.spaGameCleaningBar}
          alt="Cleaning progress"
        />
        <div className={styles.cleaningBarTrack}>
          <div
            className={styles.cleaningBarFill}
            style={{ width: `${cleaningProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SpaGame;
