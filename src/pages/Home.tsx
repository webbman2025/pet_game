import styles from "@/styles/Home.module.scss";
import { gameConfig } from "@/config/gameConfig";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatNumberWithCommas } from "@/utils/index";
import { readGameScores, getTotalPoints } from "@/utils/pointsLedger";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import { GameState } from "@/components/GameState";
import {
  DAILY_TASK_TARGETS,
  clampSatisfaction,
  areAllDailyTasksComplete,
  getSatisfactionLevel,
  showsMoodBubble,
  getGameButtonCooldownState,
} from "@/utils/satisfaction";
import { getPetAnimationSrc, isUnhappyPetPose } from "@/utils/petAnimation";
import axios from "axios";

interface PoopPosition {
  id: string;
  left: number;
  bottom: number;
  width: number;
  height: number;
}

const createPoopPosition = (): PoopPosition => ({
  id: `poop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  left: 0,
  bottom: 0,
  width: 0,
  height: 0,
});


interface HomeProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  onFeed: () => void;
  onWalk: () => void;
  onSpa: () => void;
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
  pointsRevision: number;
  awardPoints: (amount: number) => void;
  changeName: (name: string) => Promise<boolean>;
  acquirePoint: (gameName: string, point: number, satisfaction: number, bonusPoint?: number) => Promise<boolean>;
  isFirstEntry: boolean;
  onBackToMenu: () => void;
}

const SWIPE_THRESHOLD = 40;

interface HomeTutorialPage {
  title: string;
  image: string;
  lines?: string[];
  body?: string;
  caption?: string | null;
}

const Home: React.FC<HomeProps> = ({
  audioOn,
  setAudioOn,
  onFeed,
  onWalk,
  onSpa,
  gameState,
  setGameState,
  pointsRevision,
  awardPoints,
  changeName,
  acquirePoint,
  isFirstEntry,
  onBackToMenu,
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);

  const gameTutorialPages = useMemo<HomeTutorialPage[]>(
    () => [
      {
        title: "Welcome!",
        lines: [
          "Pick your dog and start your journey together.",
          "Take care of him and grow your bond every day.",
        ],
        image: assets.ui.homeWelcomeTutorial,
      },
      {
        title: "Feeding Time!",
        lines: [
          "I'm hungry!💖",
          "Pick my favourite food!",
          "Hurry up - I can't wait!",
        ],
        image: assets.ui.homeFeedingTimeTutorial,
      },
      {
        title: "Let's go for a walk!",
        body: "Walk with me and dodge the obstacles! Tap left or right and make it to the end in time!",
        caption: "Each hit costs 1 ❤️ — lose all 3 and the walk ends.",
        image: assets.ui.walkGameTutorialPage1,
      },
      {
        title: "Keep walking!",
        body: "Sometimes, we might meet a friend along the way. Swipe left, up, or right at the fork to pick a path and earn extra points!",
        caption: null,
        image: assets.ui.walkGameTutorialPage2,
      },
      {
        title: "Spa Time",
        body: "Tap the bubbles and give me a nice clean spa! Let's finish before time's up!",
        image: assets.ui.spaGameTutorialPreview,
      },
    ],
    [assets]
  );

  const gameTutorialPageCount = gameTutorialPages.length;
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(gameState.petName);
  const [poopPositions, setPoopPositions] = useState<PoopPosition[]>([]);
  const [isFeedDisabled, setIsFeedDisabled] = useState(false);
  const [isWalkDisabled, setIsWalkDisabled] = useState(false);
  const [isSpaDisabled, setIsSpaDisabled] = useState(false);
  const [feedCooldownLabel, setFeedCooldownLabel] = useState("");
  const [walkCooldownLabel, setWalkCooldownLabel] = useState("");
  const [spaCooldownLabel, setSpaCooldownLabel] = useState("");
  const [sharedCooldownLabel, setSharedCooldownLabel] = useState("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [showGameTutorialModal, setShowGameTutorialModal] = useState(false);
  const [gameTutorialPage, setGameTutorialPage] = useState(0);
  const gameTutorialSwipeStartRef = useRef<number | null>(null);
  const poopCountRef = useRef(gameState.poopCount);
  const gameStateRef = useRef(gameState);
  const petImageContainerRef = useRef<HTMLDivElement | null>(null);
  const petImageRef = useRef<HTMLImageElement | null>(null);
  const lastResumeTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    poopCountRef.current = gameState.poopCount;
  }, [gameState.poopCount]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    lastResumeTimeRef.current = Date.now();
  }, [gameState.game1Timer, gameState.game2Timer, gameState.game3Timer]);

  const handlePetNameClick = () => {
    setIsEditingName(true);
    setTempName(gameStateRef.current.petName);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  };

  const handleNameBlur = () => {
    if (tempName.trim()) {
      setGameState({ ...gameStateRef.current, petName: tempName.trim() });
    }
    changeName(tempName.trim());
    setIsEditingName(false);
  };

  const handleNameKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      changeName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const openGameTutorialModal = () => {
    setGameTutorialPage(0);
    setShowGameTutorialModal(true);
  };

  const closeGameTutorialModal = () => {
    setShowGameTutorialModal(false);
    setGameTutorialPage(0);
  };

  const handleGameTutorialOk = () => {
    closeGameTutorialModal();
    onBackToMenu();
  };

  const handleGameTutorialSwipeStart = (clientX: number) => {
    gameTutorialSwipeStartRef.current = clientX;
  };

  const handleGameTutorialSwipeEnd = (clientX: number) => {
    if (gameTutorialSwipeStartRef.current === null) return;
    const delta = clientX - gameTutorialSwipeStartRef.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0) {
        setGameTutorialPage((page) => Math.min(page + 1, gameTutorialPageCount - 1));
      } else {
        setGameTutorialPage((page) => Math.max(page - 1, 0));
      }
    }
    gameTutorialSwipeStartRef.current = null;
  };

  const POOP_ICON_SIZE = 15;

  const rectsOverlap = (
    a: { left: number; bottom: number; width: number; height: number },
    b: { left: number; bottom: number; width: number; height: number }
  ) => {
    const aTop = a.bottom + a.height;
    const bTop = b.bottom + b.height;

    return (
      a.left < b.left + b.width &&
      a.left + a.width > b.left &&
      a.bottom < bTop &&
      aTop > b.bottom
    );
  };

  const generatePoopPositions = () => {
    if (!petImageContainerRef.current || !petImageRef.current) {
      setPoopPositions([]);
      return;
    }

    const containerRect = petImageContainerRef.current.getBoundingClientRect();
    const petRect = petImageRef.current.getBoundingClientRect();

    const petBounds = {
      left: petRect.left - containerRect.left,
      bottom: 0,
      width: petRect.width,
      height: petRect.height,
    };

    const maxLeft = Math.max(0, containerRect.width - POOP_ICON_SIZE - 30);

    setPoopPositions((prev) => {
      const currentCount = prev.length;
      const targetCount = Math.max(0, poopCountRef.current);

      if (targetCount === currentCount) {
        return prev;
      }

      if (targetCount < currentCount) {
        return prev.slice(0, targetCount);
      }

      const newPositions: PoopPosition[] = [];
      const needed = targetCount - currentCount;

      let regenerateCount = 0;

      while (newPositions.length < needed) {
        const candidate: PoopPosition = {
          ...createPoopPosition(),
          left: Math.random() * maxLeft,
          bottom: 0,
          width: Math.random() * POOP_ICON_SIZE + 30,
          height: Math.random() * POOP_ICON_SIZE + 30,
        };

        const overlapsPet = rectsOverlap(candidate, petBounds);
        const overlapsOther = [...prev, ...newPositions].some((other) =>
          rectsOverlap(other, candidate)
        );

        if (!overlapsPet && !overlapsOther) {
          regenerateCount = 0;
          newPositions.push(candidate);
        } else {
          regenerateCount++;

          if (regenerateCount > 20 && !overlapsPet) {
            newPositions.push(candidate);
          }
        }
      }

      return [...prev, ...newPositions];
    });
  };

  useEffect(() => {
    generatePoopPositions();
    const resizeObserver = new ResizeObserver(() => generatePoopPositions());
    if (petImageContainerRef.current) resizeObserver.observe(petImageContainerRef.current);
    if (petImageRef.current) resizeObserver.observe(petImageRef.current);

    return () => resizeObserver.disconnect();
  }, [gameState.poopCount, assets.ui.poop]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    timer = setInterval(() => {
      const latestGameState = gameStateRef.current;
      const currentSessionTime = Date.now() - lastResumeTimeRef.current;
      const cooldownState = getGameButtonCooldownState(
        latestGameState,
        currentSessionTime
      );

      setIsFeedDisabled(cooldownState.isFeedDisabled);
      setIsWalkDisabled(cooldownState.isWalkDisabled);
      setIsSpaDisabled(cooldownState.isSpaDisabled);
      setFeedCooldownLabel(cooldownState.feedCooldownLabel);
      setWalkCooldownLabel(cooldownState.walkCooldownLabel);
      setSpaCooldownLabel(cooldownState.spaCooldownLabel);
      setSharedCooldownLabel(cooldownState.sharedCooldownLabel);
    }, 200);
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const satisfactionPercentage = clampSatisfaction(gameState.satisfaction);
  const allDailyTasksComplete = areAllDailyTasksComplete(gameState);
  const satisfactionLevel = getSatisfactionLevel(
    satisfactionPercentage,
    allDailyTasksComplete
  );
  const showMoodBubble = showsMoodBubble(satisfactionPercentage);

  const petImageSrc = useMemo(
    () => getPetAnimationSrc(satisfactionLevel, assets.ui),
    [satisfactionLevel, assets.ui]
  );

  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const scores = readGameScores();
    console.log("Scores object:", scores);
    setTotalPoints(getTotalPoints(scores));
  }, [pointsRevision]);

  const feedTaskComplete =
    gameState.game1PlayTimes >= DAILY_TASK_TARGETS.feed;
  const walkTaskComplete =
    gameState.game2PlayTimes >= DAILY_TASK_TARGETS.walk;
  const spaTaskComplete =
    gameState.game3PlayTimes >= DAILY_TASK_TARGETS.spa;

  
  // Submit score to API when poop is removed
  const removePoop = async (poopId: string) => {
    try {
      const response = await axios.post(
        "/3Care/GamifyRemovePoop.do",
        {
          campaignID: gameConfig.campaignID,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        }
      );
      if (response.data && response.data.code === 200) {
        setPoopPositions((prev) => prev.filter((poop) => poop.id !== poopId));
        awardPoints(20);
        setGameState({
          ...gameStateRef.current,
          poopCount: Math.max(0, gameStateRef.current.poopCount - 1),
        });
        setShowEndModal(true);
        console.log("Poop removed successfully:", response.data);
      } else {
        console.warn("API returned non-success code:", response.data);
      }
    } catch (error) {
      console.error("Error removing poop:", error);
    }
  };

  return (
    <div className={styles.root}>

      {showEndModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalWrap}>

            <div className={styles.modalFrame}>
              <img className={styles.modalTop} src={assets.ui.modalTop} alt="Modal Top" />

              <div className={styles.modalCenterWrap}>
                <img className={styles.modalCenter} src={assets.ui.modalCenter} alt="Modal Center" />
                <div className={styles.modalContent}>
                  <p className={styles.modalText}>You earned points</p>
                  <p className={styles.modalPointText}>
                    <img src={assets.ui.coinIcon} className={styles.coinIcon}/>
                    +20
                  </p>
                  <p className={styles.modalText}>Total Points</p>
                  <p className={styles.modalText}>
                    {formatNumberWithCommas(totalPoints)}
                  </p>

                  <button
                    className={styles.modalBtn}
                    onClick={() => {
                      setShowEndModal(false);
                      onBackToMenu();
                    }}
                    type="button"
                  >
                    <img className={styles.modalBtnBg} src={assets.ui.primaryBtn} alt="OK" />
                    <span className={styles.modalBtnText}>OK</span>
                  </button>
                </div>
              </div>

              <img className={styles.modalBottom} src={assets.ui.modalButtom} alt="Modal Bottom" />
            </div>
          </div>
        </div>
      )}

      {showGameTutorialModal && (
        <div className={styles.gameTutorialOverlay}>
          <div className={styles.gameTutorialModal}>
            <img
              className={styles.gameTutorialFrame}
              src={assets.ui.spaGameTutorialFrame}
              alt=""
            />
            <div className={styles.gameTutorialContent}>
              <div
                className={styles.gameTutorialCarouselViewport}
                onTouchStart={(event) =>
                  handleGameTutorialSwipeStart(event.touches[0].clientX)
                }
                onTouchEnd={(event) =>
                  handleGameTutorialSwipeEnd(event.changedTouches[0].clientX)
                }
                onMouseDown={(event) =>
                  handleGameTutorialSwipeStart(event.clientX)
                }
                onMouseUp={(event) => handleGameTutorialSwipeEnd(event.clientX)}
              >
                <div
                  className={styles.gameTutorialTrack}
                  style={{
                    width: `${gameTutorialPageCount * 100}%`,
                    transform: `translateX(-${(gameTutorialPage * 100) / gameTutorialPageCount}%)`,
                  }}
                >
                  {gameTutorialPages.map((page) => (
                    <div
                      key={page.title}
                      className={styles.gameTutorialSlide}
                      style={{ flexBasis: `${100 / gameTutorialPageCount}%` }}
                    >
                      <h2 className={styles.gameTutorialTitle}>{page.title}</h2>
                      {page.lines ? (
                        <div className={styles.gameTutorialTextGroup}>
                          {page.lines.map((line) => (
                            <p key={line} className={styles.gameTutorialText}>
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.gameTutorialText}>{page.body}</p>
                      )}
                      <img
                        className={styles.gameTutorialPreview}
                        src={page.image}
                        alt=""
                      />
                      {page.caption !== undefined ? (
                        page.caption ? (
                          <p className={styles.gameTutorialCaption}>{page.caption}</p>
                        ) : (
                          <p className={styles.gameTutorialCaptionSpacer} aria-hidden="true" />
                        )
                      ) : (
                        <p className={styles.gameTutorialCaptionSpacer} aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={styles.gameTutorialDots}
                role="tablist"
                aria-label="Tutorial pages"
              >
                {gameTutorialPages.map((page, index) => (
                  <button
                    key={page.title}
                    type="button"
                    role="tab"
                    aria-selected={gameTutorialPage === index}
                    aria-label={`Tutorial page ${index + 1}`}
                    className={`${styles.gameTutorialDot} ${
                      gameTutorialPage === index ? styles.gameTutorialDotActive : ""
                    }`}
                    onClick={() => setGameTutorialPage(index)}
                  />
                ))}
              </div>

              <button
                className={styles.gameTutorialOkBtn}
                onClick={handleGameTutorialOk}
                type="button"
              >
                <img
                  className={styles.gameTutorialOkBtnBg}
                  src={assets.ui.primaryBtn}
                  alt=""
                />
                <span className={styles.gameTutorialOkBtnText}>OK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className={styles.topBar}>
        {/* Pet Name - Top Left */}
        <div className={styles.petNameContainer}>
          {gameState.petName && isEditingName ? (
            <input
              className={styles.petNameInput}
              type="text"
              value={tempName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyPress}
              autoFocus
              maxLength={20}
            />
          ) : gameState.petName ? (
            <span
              className={styles.petName}
              onClick={handlePetNameClick}
            >
              {gameState.petName}
            </span>
          ) : (
            <button
              type="button"
              className={styles.petNameIconBtn}
              onClick={openGameTutorialModal}
              aria-label="Open game tutorials"
            >
              <img
                src={assets.ui.iconTutorial}
                alt=""
                className={styles.petNameIcon}
              />
            </button>
          )}
        </div>

        {/* Points - Top Right */}
        <div className={styles.pointsContainer}>
          <img src={assets.ui.coinIcon} className={styles.coinIcon}/>
          <div>
            <div className={styles.pointsValue} id="homepagePoints">
              {formatNumberWithCommas(totalPoints)}
            </div>
            <div className={styles.pointsLabel}>points</div>
          </div>
        </div>
      </div>

      {/* Satisfaction Level - Top Middle */}
      <div className={styles.satisfactionContainer}>
        <span className={styles.satisfactionLabel}>
          Satisfaction level
        </span>
        <div className={styles.satisfactionBar}>
          <div
            className={styles.satisfactionFill}
            style={{ width: `${satisfactionPercentage}%` }}
          />
          <span className={styles.satisfactionPercent}>
            {satisfactionPercentage}%
          </span>
        </div>
      </div>

      {/* Pet Image - Center */}
      <div className={styles.petImageContainer} ref={petImageContainerRef}>
        {showMoodBubble && (
          <div className={styles.moodBubble}>
            <img
              src={assets.ui.feedGameThinkingBubble}
              className={styles.moodBubbleBg}
              alt=""
            />
            <div className={styles.moodBubbleContent}>
              <img
                src={assets.ui.feedGameHeart}
                className={styles.moodBubbleIcon}
                alt=""
              />
              <span className={styles.moodBubbleText}>Happy!</span>
            </div>
          </div>
        )}

        <img
          ref={petImageRef}
          src={petImageSrc}
          alt="Pet"
          className={
            isUnhappyPetPose(satisfactionLevel)
              ? styles.petImageUnhappy
              : styles.petImage
          }
        />

        {poopPositions.map((position) => (
          <img
            key={position.id}
            src={assets.ui.poop}
            alt="Poop"
            className={styles.poopMarker}
            style={{ left: `${position.left}px`, bottom: `${position.bottom}px`, width: `${position.width}px`, height: `${position.height}px` }}
            onClick={() => removePoop(position.id)}
          />
        ))}
      </div>

      

      {/* Game Buttons - Bottom Section */}
      <div className={styles.gameButtonsContainer}>
        {sharedCooldownLabel ? (
          <div className={styles.sharedCooldownLabel}>
            <img
              src={assets.ui.timerIcon}
              className={styles.cooldownIcon}
              alt="Timer"
            />
            <span>{sharedCooldownLabel}</span>
          </div>
        ) : null}

        <div className={styles.gameButtonsRow}>
        <div className={styles.gameButtonWrapper}>
          {feedCooldownLabel ? (
            <div className={styles.gameCooldownLabel}>
              <img src={assets.ui.timerIcon} className={styles.cooldownIcon} alt="Timer" />
              <span>{feedCooldownLabel}</span>
            </div>
          ) : null}
          <button
            type="button"
            className={styles.gameButton}
            onClick={onFeed}
            disabled={isFeedDisabled}
          >
            <img src={assets.ui.feedGameIcon} className={styles.buttonIcon}/>
            <span className={styles.buttonText}>Feed</span>
          </button>
        </div>

        <div className={styles.gameButtonWrapper}>
          {walkCooldownLabel ? (
            <div className={styles.gameCooldownLabel}>
              <img src={assets.ui.timerIcon} className={styles.cooldownIcon} alt="Timer" />
              <span>{walkCooldownLabel}</span>
            </div>
          ) : null}
          <button
            type="button"
            className={styles.gameButton}
            onClick={onWalk}
            disabled={isWalkDisabled}
          >
            <img src={assets.ui.walkGameIcon} className={styles.buttonIcon}/>
            <span className={styles.buttonText}>Walk</span>
          </button>
        </div>

        <div className={styles.gameButtonWrapper}>
          {spaCooldownLabel ? (
            <div className={styles.gameCooldownLabel}>
              <img src={assets.ui.timerIcon} className={styles.cooldownIcon} alt="Timer" />
              <span>{spaCooldownLabel}</span>
            </div>
          ) : null}
          <button
            type="button"
            className={styles.gameButton}
            onClick={onSpa}
            disabled={isSpaDisabled}
          >
            <img src={assets.ui.spaGameIcon} className={styles.buttonIcon}/>
            <span className={styles.buttonText}>Spa</span>
          </button>
        </div>
        </div>
      </div>

      {/* Daily Tasks Box - Bottom */}
      <div className={styles.dailyTasksBox}>
        <img src={assets.ui.purpleLine} className={styles.purpleLine} />

        <span className={styles.dailyTasksTitle}>Daily Task</span>
        
        {/* Feed Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <img src={assets.ui.feedGameTaskIcon} className={styles.taskIcon} />
            <span>Feed 3 times</span>
          </div>
          <div className={styles.taskProgressWrap}>
            <div className={styles.taskProgressBar}>
              {[0, 1, 2].map((index) => (
                <div
                  key={`feed-${index}`}
                  className={`${styles.progressSegment} ${
                    index < gameState.game1PlayTimes ? styles.completed : ""
                  }`}
                />
              ))}
            </div>
            {feedTaskComplete && (
              <img
                src={assets.ui.taskTickIcon}
                className={styles.taskTickIcon}
                alt="Complete"
              />
            )}
          </div>
        </div>

        {/* Walk Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <img src={assets.ui.walkGameTaskIcon} className={styles.taskIcon} />
            <span>Walk 2 times</span>
          </div>
          <div className={styles.taskProgressWrap}>
            <div className={styles.taskProgressBar}>
              {[0, 1].map((index) => (
                <div
                  key={`walk-${index}`}
                  className={`${styles.progressSegment} ${
                    index < gameState.game2PlayTimes ? styles.completed : ""
                  }`}
                />
              ))}
            </div>
            {walkTaskComplete && (
              <img
                src={assets.ui.taskTickIcon}
                className={styles.taskTickIcon}
                alt="Complete"
              />
            )}
          </div>
        </div>

        {/* Spa Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <img src={assets.ui.spaGameTaskIcon} className={styles.taskIcon} />
            <span>Spa 1 time</span>
          </div>
          <div className={styles.taskProgressWrap}>
            <div className={styles.taskProgressBar}>
              {[0].map((index) => (
                <div
                  key={`spa-${index}`}
                  className={`${styles.progressSegment} ${
                    index < gameState.game3PlayTimes ? styles.completed : ""
                  }`}
                />
              ))}
            </div>
            {spaTaskComplete && (
              <img
                src={assets.ui.taskTickIcon}
                className={styles.taskTickIcon}
                alt="Complete"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
