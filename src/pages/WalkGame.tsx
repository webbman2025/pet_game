import styles from "@/styles/WalkGame.module.scss";
import { useEffect, useRef, useState } from "react";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import GameRetryModal from "@/components/GameRetryModal";
import GameFailScreen from "@/components/GameFailScreen";
import { GameState } from "@/components/GameState";
import { SnowboardEngine, WALK_GAME_DURATION_SEC } from "@/games/snowboardEngine";
import {
  createForkLayout,
  ForkItem,
  ForkLane,
  ForkLayout,
  FORK_ITEM_TOP_RATIO,
  FORK_LANE_CENTER_X_RATIO,
  FORK_ITEM_POP_MS,
  FORK_GIFT_SHRINK_MS,
  ForkRevealPhase,
  isFriendBonusPick,
} from "@/utils/walkFork";

interface WalkGameProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  gameState: GameState;
  onBackToMenu: () => void;
  acquirePoint: (name: string, point: number, satisfaction: number) => void;
}

const TUTORIAL_PAGES = [
  {
    title: "Let's go for a walk!",
    body: "Walk with me and dodge the obstacles! Tap left or right and make it to the end in time!",
    caption: "Each hit costs 1 ❤️ — lose all 3 and the walk ends.",
  },
  {
    title: "Keep walking!",
    body: "Sometimes, we might meet a friend along the way. Swipe left, up, or right at the fork to pick a path and earn extra points!",
    caption: null,
  },
] as const;

const SWIPE_THRESHOLD = 40;
const FORK_SWIPE_THRESHOLD = 48;

const resolveForkLaneFromSwipe = (deltaX: number, deltaY: number): ForkLane | null => {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < FORK_SWIPE_THRESHOLD && absY < FORK_SWIPE_THRESHOLD) {
    return null;
  }

  if (absY > absX && deltaY < -FORK_SWIPE_THRESHOLD) {
    return 1;
  }

  if (deltaX < -FORK_SWIPE_THRESHOLD && absX >= absY) {
    return 0;
  }

  if (deltaX > FORK_SWIPE_THRESHOLD && absX >= absY) {
    return 2;
  }

  return null;
};

type GameResult = "finish" | "fail" | null;

const WalkGame: React.FC<WalkGameProps> = ({
  gameState,
  onBackToMenu,
  acquirePoint,
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnowboardEngine | null>(null);
  const hasSubmittedScoreRef = useRef(false);
  const acquirePointRef = useRef(acquirePoint);
  acquirePointRef.current = acquirePoint;
  const swipeStartXRef = useRef<number | null>(null);
  const forkSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingStartRef = useRef(false);
  const prevScoreRef = useRef(0);
  const minusHeartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceFriendWalkRef = useRef(false);
  const forkPickLockedRef = useRef(false);
  const forkScoreRef = useRef(0);
  const forkLayoutRef = useRef<ForkLayout | null>(null);
  const forkShrinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forkPopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forkBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleForkPickRef = useRef<(lane: ForkLane) => void>(() => {});

  const [point, setPoint] = useState(0);
  const [heartCount, setHeartCount] = useState(3);
  const [timer, setTimer] = useState(WALK_GAME_DURATION_SEC);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [showTimeUpScreen, setShowTimeUpScreen] = useState(false);
  const [showPlus5, setShowPlus5] = useState(false);
  const [showMinusHeart, setShowMinusHeart] = useState(false);
  const [showForkScreen, setShowForkScreen] = useState(false);
  const [showBonusBanner, setShowBonusBanner] = useState(false);
  const [showFinishBanner, setShowFinishBanner] = useState(false);
  const [forkLayout, setForkLayout] = useState<ForkLayout | null>(null);
  const [endModalItem, setEndModalItem] = useState<ForkItem>("ball");
  const [earnedBonus, setEarnedBonus] = useState(0);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isFinishRush, setIsFinishRush] = useState(false);
  const [isForkWalking, setIsForkWalking] = useState(false);
  const [showForkChoiceHint, setShowForkChoiceHint] = useState(false);
  const [pickedForkLane, setPickedForkLane] = useState<ForkLane | null>(null);
  const [forkRevealPhase, setForkRevealPhase] = useState<ForkRevealPhase | null>(null);
  const [tutorialPage, setTutorialPage] = useState(0);

  const tutorialImages = [
    assets.ui.walkGameTutorialPage1,
    assets.ui.walkGameTutorialPage2,
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SnowboardEngine(
      canvas,
      {
        snowboardBg: assets.ui.snowboardBg,
        snowboardBgForkGrass: assets.ui.snowboardBgForkGrass,
        snowboardBgGrass: assets.ui.snowboardBgGrass,
        snowboardCenter: assets.ui.snowboardCenter,
        snowboardLeft: assets.ui.snowboardLeft,
        snowboardRight: assets.ui.snowboardRight,
        supremeFlag: assets.ui.snowboardSupremeFlag,
        water: assets.ui.snowboardWater,
        trap: assets.ui.snowboardTrap,
        stick: assets.ui.snowboardStick,
        token: assets.ui.snowboardToken,
        clock: assets.ui.snowboardClock,
        arrow: assets.ui.snowboardArrow,
        arrowRight: assets.ui.snowboardArrowRight,
        add5Point: assets.ui.snowboardAdd5Point,
        minusHeart: assets.ui.snowboardMinusHeart,
        timesUp: assets.ui.snowboardTimesUp,
      },
      {
        onScoreChange: (score) => {
          if (score > prevScoreRef.current) {
            setShowPlus5(true);
            setTimeout(() => setShowPlus5(false), 800);
          }
          prevScoreRef.current = score;
          setPoint(score);
        },
        onTimerChange: setTimer,
        onLivesChange: setHeartCount,
        onTimeUp: () => setShowTimeUpScreen(true),
        onFinishPhaseChange: (phase) => {
          if (phase === "rush") {
            setIsFinishRush(true);
          }
          if (phase === "approach" || phase === "choice" || phase === "lane" || phase === "settled" || phase === "none") {
            setIsFinishRush(false);
          }
          setShowForkChoiceHint(phase === "choice");
        },
        onForkReady: (score) => {
          forkScoreRef.current = score;
          const layout = createForkLayout(forceFriendWalkRef.current);
          forkLayoutRef.current = layout;
          setPoint(score);
          setForkLayout(layout);
          setShowForkScreen(true);
          setShowTimeUpScreen(false);
          setIsFinishRush(false);
        },
        onForkLanePick: (lane) => {
          handleForkPickRef.current(lane);
        },
        onGameEnd: (score, reason) => {
          if (hasSubmittedScoreRef.current) return;
          hasSubmittedScoreRef.current = true;
          setIsGameOver(true);
          setGameResult(reason);

          if (reason === "finish") {
            return;
          }

          setTimeout(() => setShowRetryModal(true), 1500);
        },
        onShake: () => {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        },
        onObstacleHit: () => {
          if (minusHeartTimeoutRef.current) {
            clearTimeout(minusHeartTimeoutRef.current);
          }
          setShowMinusHeart(true);
          minusHeartTimeoutRef.current = setTimeout(() => {
            setShowMinusHeart(false);
            minusHeartTimeoutRef.current = null;
          }, 900);
        },
      }
    );

    engineRef.current = engine;

    engine
      .load()
      .then(() => {
        setIsEngineReady(true);
        engine.drawPreviewFrame();
      })
      .catch((error) => console.error("Failed to load walk game assets:", error));

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (minusHeartTimeoutRef.current) {
        clearTimeout(minusHeartTimeoutRef.current);
      }
      clearForkRevealTimeouts();
      engine.destroy();
      engineRef.current = null;
      setIsEngineReady(false);
      pendingStartRef.current = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!showStartModal || !engineRef.current || !isEngineReady) return;
    engineRef.current.drawPreviewFrame();
  }, [showStartModal, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady || !pendingStartRef.current || !engineRef.current) return;
    pendingStartRef.current = false;
    engineRef.current.start();
  }, [isEngineReady]);

  const clearForkRevealTimeouts = () => {
    if (forkShrinkTimeoutRef.current) {
      clearTimeout(forkShrinkTimeoutRef.current);
      forkShrinkTimeoutRef.current = null;
    }
    if (forkPopTimeoutRef.current) {
      clearTimeout(forkPopTimeoutRef.current);
      forkPopTimeoutRef.current = null;
    }
    if (forkBannerTimeoutRef.current) {
      clearTimeout(forkBannerTimeoutRef.current);
      forkBannerTimeoutRef.current = null;
    }
  };

  const resetForkState = () => {
    clearForkRevealTimeouts();
    forkPickLockedRef.current = false;
    forkScoreRef.current = 0;
    forkLayoutRef.current = null;
    setShowForkScreen(false);
    setShowBonusBanner(false);
    setShowFinishBanner(false);
    setForkLayout(null);
    setEndModalItem("ball");
    setEarnedBonus(0);
    setEarnedTotal(0);
    setIsFinishRush(false);
    setIsForkWalking(false);
    setShowForkChoiceHint(false);
    setPickedForkLane(null);
    forkSwipeStartRef.current = null;
    setForkRevealPhase(null);
  };

  const finishWalkWithReward = (modalItem: ForkItem, baseScore: number, bonus: number) => {
    if (hasSubmittedScoreRef.current) return;
    hasSubmittedScoreRef.current = true;

    const totalEarned = baseScore + bonus;
    setEndModalItem(modalItem);
    setEarnedBonus(bonus);
    setEarnedTotal(totalEarned);
    setIsGameOver(true);
    setGameResult("finish");
    setShowTimeUpScreen(false);
    acquirePointRef.current("walk_game", totalEarned, 5);
    engineRef.current?.markWalkComplete();
    setShowEndModal(true);
  };

  const handleForkPick = (lane: ForkLane) => {
    const layout = forkLayoutRef.current;
    const engine = engineRef.current;
    if (!layout || !engine || forkPickLockedRef.current) return;
    if (engine.getFinishPhase() !== "choice") return;
    if (!engine.isForkPickReady()) return;

    const pickedItem = layout.lanes[lane];
    const gotFriendBonus = isFriendBonusPick(layout, lane);
    const score = forkScoreRef.current;

    const showRevealBanner = () => {
      if (gotFriendBonus) {
        setShowBonusBanner(true);
        forkBannerTimeoutRef.current = setTimeout(() => {
          forkBannerTimeoutRef.current = null;
          setShowBonusBanner(false);
          setShowForkScreen(false);
          finishWalkWithReward("friend", score, score);
        }, 1500);
        return;
      }

      setShowFinishBanner(true);
      forkBannerTimeoutRef.current = setTimeout(() => {
        forkBannerTimeoutRef.current = null;
        setShowFinishBanner(false);
        setShowForkScreen(false);
        const modalItem: ForkItem = pickedItem === "food" ? "food" : "ball";
        finishWalkWithReward(modalItem, score, 0);
      }, 1500);
    };

    const onLaneComplete = () => {
      setIsForkWalking(false);
      setForkRevealPhase("shrinking");

      forkShrinkTimeoutRef.current = setTimeout(() => {
        forkShrinkTimeoutRef.current = null;
        setForkRevealPhase("popping");

        forkPopTimeoutRef.current = setTimeout(() => {
          forkPopTimeoutRef.current = null;
          setForkRevealPhase("settled");
          showRevealBanner();
        }, FORK_ITEM_POP_MS);
      }, FORK_GIFT_SHRINK_MS);
    };

    setPickedForkLane(lane);
    setForkRevealPhase(null);
    setShowForkChoiceHint(false);

    if (!engine.startLaneWalk(lane, onLaneComplete)) return;

    forkPickLockedRef.current = true;
    setIsForkWalking(true);
    setShowTimeUpScreen(false);
    setIsFinishRush(false);
  };

  handleForkPickRef.current = handleForkPick;

  const resetGame = () => {
    if (!engineRef.current) return;
    hasSubmittedScoreRef.current = false;
    prevScoreRef.current = 0;
    setIsGameOver(false);
    setGameResult(null);
    setShowEndModal(false);
    setShowRetryModal(false);
    setShowTimeUpScreen(false);
    setShowPlus5(false);
    setShowMinusHeart(false);
    setIsFinishRush(false);
    resetForkState();
    setPoint(0);
    setHeartCount(3);
    setTimer(WALK_GAME_DURATION_SEC);
    engineRef.current.start();
  };

  const handleStartGame = () => {
    forceFriendWalkRef.current = gameState.game2PlayTimes === 0;
    hasSubmittedScoreRef.current = false;
    prevScoreRef.current = 0;
    setIsGameOver(false);
    setGameResult(null);
    setShowEndModal(false);
    setShowRetryModal(false);
    setShowTimeUpScreen(false);
    setShowPlus5(false);
    setShowMinusHeart(false);
    setIsFinishRush(false);
    resetForkState();
    setPoint(0);
    setHeartCount(3);
    setTimer(WALK_GAME_DURATION_SEC);
    setTutorialPage(0);
    setShowStartModal(false);
    pendingStartRef.current = true;
    if (engineRef.current && isEngineReady) {
      pendingStartRef.current = false;
      engineRef.current.start();
    }
  };

  const handleRetry = () => {
    resetGame();
  };

  const forkChoiceActive =
    showForkScreen && !isForkWalking && pickedForkLane === null;

  const handleSwipeStart = (clientX: number) => {
    swipeStartXRef.current = clientX;
  };

  const handleSwipeEnd = (clientX: number) => {
    if (swipeStartXRef.current === null) return;
    const delta = clientX - swipeStartXRef.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0) {
        setTutorialPage((page) => Math.min(page + 1, TUTORIAL_PAGES.length - 1));
      } else {
        setTutorialPage((page) => Math.max(page - 1, 0));
      }
    }
    swipeStartXRef.current = null;
  };

  const handleForkSwipeStart = (clientX: number, clientY: number) => {
    if (!forkChoiceActive) return;
    forkSwipeStartRef.current = { x: clientX, y: clientY };
  };

  const handleForkSwipeEnd = (clientX: number, clientY: number) => {
    const start = forkSwipeStartRef.current;
    forkSwipeStartRef.current = null;
    if (!start || !forkChoiceActive) return;

    const lane = resolveForkLaneFromSwipe(clientX - start.x, clientY - start.y);
    if (lane !== null) {
      handleForkPick(lane);
    }
  };

  const totalPoints = gameState.point + earnedTotal;
  const showFailScreen = isGameOver && gameResult === "fail" && !showRetryModal;
  const showTimeUpBlack = showTimeUpScreen && !showFailScreen && !showForkScreen && !isFinishRush;
  const showTimeUpText = showTimeUpScreen && !showFailScreen && !showForkScreen;

  const forkItemImage = (item: ForkItem) => {
    if (item === "food") return assets.ui.walkForkFood;
    if (item === "ball") return assets.ui.walkForkBall;
    return assets.ui.walkForkFriend;
  };

  const forkItemAnchorStyle = (lane: ForkLane): React.CSSProperties => ({
    left: `${FORK_LANE_CENTER_X_RATIO[lane] * 100}%`,
    top: `${FORK_ITEM_TOP_RATIO * 100}%`,
  });

  const renderForkLaneItems = (item: ForkItem, popAnimating: boolean) => (
    <div
      className={`${styles.forkLaneItems} ${popAnimating ? styles.forkItemPop : ""}`}
    >
      {item === "friend" ? (
        <>
          <img
            className={styles.forkFriendHeart}
            src={assets.ui.walkForkFriendHeart}
            alt=""
          />
          <img className={styles.forkFriendDog} src={assets.ui.walkForkFriend} alt="" />
        </>
      ) : (
        <img
          className={item === "food" ? styles.forkFoodItem : styles.forkBallItem}
          src={forkItemImage(item)}
          alt=""
        />
      )}
    </div>
  );

  const renderForkLaneContent = (lane: ForkLane, item: ForkItem) => {
    const bounceGiftBoxes = showForkChoiceHint && pickedForkLane === null;

    if (forkRevealPhase === "shrinking") {
      return (
        <div className={styles.forkRevealSlot}>
          <img
            className={`${styles.forkGiftBox} ${styles.forkGiftShrink}`}
            src={assets.ui.walkForkGiftBox}
            alt=""
          />
        </div>
      );
    }

    if (forkRevealPhase === "popping") {
      return (
        <div className={styles.forkRevealSlot}>
          {renderForkLaneItems(item, true)}
        </div>
      );
    }

    if (forkRevealPhase === "settled") {
      return renderForkLaneItems(item, false);
    }

    return (
      <div
        className={`${styles.forkLaneItems} ${bounceGiftBoxes ? styles.forkLaneItemsBounce : ""}`}
      >
        <img
          className={styles.forkGiftBox}
          src={assets.ui.walkForkGiftBox}
          alt=""
        />
      </div>
    );
  };

  const endModalDogImage = {
    friend: assets.ui.walkPointsModalFriend,
    ball: assets.ui.walkPointsModalBall,
    food: assets.ui.walkPointsModalFood,
  }[endModalItem];

  const endModalDogClassName = {
    friend: styles.modalDogFriend,
    ball: styles.modalDogBall,
    food: styles.modalDogFood,
  }[endModalItem];

  const tutorialOverlay = (
    <div className={styles.tutorialOverlay}>
      <div className={styles.tutorialModal}>
        <img
          className={styles.tutorialFrame}
          src={assets.ui.spaGameTutorialFrame}
          alt=""
        />
        <div className={styles.tutorialContent}>
          <div
            className={styles.tutorialCarouselViewport}
            onTouchStart={(event) => handleSwipeStart(event.touches[0].clientX)}
            onTouchEnd={(event) => handleSwipeEnd(event.changedTouches[0].clientX)}
            onMouseDown={(event) => handleSwipeStart(event.clientX)}
            onMouseUp={(event) => handleSwipeEnd(event.clientX)}
          >
            <div
              className={styles.tutorialTrack}
              style={{ transform: `translateX(-${tutorialPage * 50}%)` }}
            >
              {TUTORIAL_PAGES.map((page, index) => (
                <div key={page.title} className={styles.tutorialSlide}>
                  <h2 className={styles.tutorialTitle}>{page.title}</h2>
                  <p className={styles.tutorialText}>{page.body}</p>
                  <img
                    className={styles.tutorialPreview}
                    src={tutorialImages[index]}
                    alt=""
                  />
                  {page.caption ? (
                    <p className={styles.tutorialCaption}>{page.caption}</p>
                  ) : (
                    <p className={styles.tutorialCaptionSpacer} aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.tutorialDots} role="tablist" aria-label="Tutorial pages">
            <button
              type="button"
              role="tab"
              aria-selected={tutorialPage === 0}
              aria-label="Tutorial page 1"
              className={`${styles.tutorialDot} ${tutorialPage === 0 ? styles.tutorialDotActive : ""}`}
              onClick={() => setTutorialPage(0)}
            />
            <button
              type="button"
              role="tab"
              aria-selected={tutorialPage === 1}
              aria-label="Tutorial page 2"
              className={`${styles.tutorialDot} ${tutorialPage === 1 ? styles.tutorialDotActive : ""}`}
              onClick={() => setTutorialPage(1)}
            />
          </div>

          <div className={styles.tutorialActions}>
            <button
              className={styles.tutorialBtn}
              onClick={handleStartGame}
              type="button"
            >
              <img className={styles.tutorialBtnBg} src={assets.ui.primaryBtn} alt="" />
              <span className={styles.tutorialBtnText}>Start</span>
            </button>
            <button
              className={styles.tutorialBtnSecondary}
              onClick={onBackToMenu}
              type="button"
            >
              <img className={styles.tutorialBtnBg} src={assets.ui.secondaryBtn} alt="" />
              <span className={styles.tutorialBtnSecondaryText}>Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${styles.root} ${isShaking ? styles.shake : ""}`}>
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

      {showEndModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalWrap}>
            <img
              className={`${styles.modalDog} ${endModalDogClassName}`}
              src={endModalDogImage}
              alt="Dog"
            />

            <div className={styles.modalFrame}>
              <img className={styles.modalTop} src={assets.ui.modalTop} alt="" />

              <div className={styles.modalCenterWrap}>
                <img className={styles.modalCenter} src={assets.ui.modalCenter} alt="" />
                <div className={styles.modalContent}>
                  <p className={styles.modalText}>You earned points</p>
                  <p className={styles.modalPointText}>
                    <img src={assets.ui.coinIcon} className={styles.coinIcon} alt="" />
                    +{earnedTotal}
                  </p>
                  {earnedBonus > 0 && (
                    <p className={styles.modalBonusText}>{earnedBonus} extra point!</p>
                  )}
                  <p className={styles.modalText}>Total Points</p>
                  <p className={styles.modalPointTotal}>{totalPoints}</p>

                  <button className={styles.modalBtn} onClick={onBackToMenu} type="button">
                    <img className={styles.modalBtnBg} src={assets.ui.primaryBtn} alt="" />
                    <span className={styles.modalBtnText}>OK</span>
                  </button>
                </div>
              </div>

              <img className={styles.modalBottom} src={assets.ui.modalButtom} alt="" />
            </div>
          </div>
        </div>
      )}

      {showBonusBanner && (
        <img
          className={styles.bonusBanner}
          src={assets.ui.walkBonusPointsText}
          alt="Bonus Points!"
        />
      )}

      {showFinishBanner && <p className={styles.finishBanner}>Finish</p>}

      <div className={styles.topOverlay} />

      {showFailScreen && (
        <GameFailScreen failTextSrc={assets.ui.feedGameFailText} />
      )}

      {showTimeUpBlack && <div className={styles.timeUpOverlay} />}

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          className={`${styles.canvas} ${forkChoiceActive ? styles.canvasForkChoice : ""}`}
        />
        <img
          className={`${styles.plus5Text} ${showPlus5 ? styles.showPlus5 : ""}`}
          src={assets.ui.snowboardAdd5Point}
          alt="+5"
        />
        <img
          className={`${styles.minusHeartText} ${showMinusHeart ? styles.showMinusHeart : ""}`}
          src={assets.ui.snowboardMinusHeart}
          alt="-1 heart"
        />
      </div>

      {showTimeUpText && <p className={styles.timeUpTitle}>TIME&apos;S UP</p>}

      <div className={styles.gameTopBar}>
        <div className={styles.timerContainer}>
          <img className={styles.timerBox} src={assets.ui.feedGameTimerBox} alt="Timer" />
          <span className={styles.timerText}>{Math.floor(timer)}s</span>
        </div>

        <div className={styles.heartContainer}>
          <img className={styles.heartBox} src={assets.ui.feedGameHeartBox} alt="Heart Box" />
          <div className={styles.hearts}>
            {[...Array(heartCount)].map((_, index) => (
              <img key={index} className={styles.heart} src={assets.ui.feedGameHeart} alt="Heart" />
            ))}
          </div>
        </div>

        <div className={styles.pointContainer}>
          <img className={styles.pointBox} src={assets.ui.feedGamePointBox} alt="Point" />
          <span className={styles.pointText}>{point}</span>
        </div>
      </div>

      {showForkScreen && forkLayout && (
        <div
          className={[
            styles.forkOverlay,
            isForkWalking ? styles.forkOverlayWalking : styles.forkOverlayChoice,
          ].join(" ")}
          role="group"
          aria-label={isForkWalking ? undefined : "Swipe left, up, or right to choose a path"}
          onTouchStart={(event) => {
            if (!forkChoiceActive) return;
            event.preventDefault();
            handleForkSwipeStart(event.touches[0].clientX, event.touches[0].clientY);
          }}
          onTouchEnd={(event) => {
            if (!forkChoiceActive) return;
            event.preventDefault();
            handleForkSwipeEnd(
              event.changedTouches[0].clientX,
              event.changedTouches[0].clientY
            );
          }}
          onMouseDown={(event) => {
            if (!forkChoiceActive) return;
            handleForkSwipeStart(event.clientX, event.clientY);
          }}
          onMouseUp={(event) => {
            if (!forkChoiceActive) return;
            handleForkSwipeEnd(event.clientX, event.clientY);
          }}
        >
          {showForkChoiceHint && (
            <p className={styles.forkChoicePrompt}>
              Swipe ← ↑ →
              <br />
              to choose a path
            </p>
          )}

          {([0, 1, 2] as ForkLane[]).map((lane) => (
            <div
              key={`item-${lane}`}
              className={styles.forkItemAnchor}
              style={forkItemAnchorStyle(lane)}
            >
              {renderForkLaneContent(lane, forkLayout.lanes[lane])}
            </div>
          ))}
        </div>
      )}

      {showStartModal && tutorialOverlay}
    </div>
  );
};

export default WalkGame;
