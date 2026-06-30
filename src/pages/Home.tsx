import styles from "@/styles/Home.module.scss";
import { gameConfig } from "@/config/gameConfig";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatNumberWithCommas } from "@/utils/index";
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
  changeName: (name: string) => Promise<boolean>;
  acquirePoint: (gameName: string, point: number, satisfaction: number) => Promise<boolean>;
  isFirstEntry: boolean;
}

const Home: React.FC<HomeProps> = ({
  audioOn,
  setAudioOn,
  onFeed,
  onWalk,
  onSpa,
  gameState,
  setGameState,
  changeName,
  acquirePoint,
  isFirstEntry
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);
  
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
        setGameState({ ...gameState, point: gameState.point + 20, poopCount: Math.max(0, gameState.poopCount - 1) });
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
                  <p className={styles.modalText}>{gameStateRef.current.point}</p>

                  <button className={styles.modalBtn} onClick={() => setShowEndModal(false)} type="button">
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

      {/* Top Bar */}
      <div className={styles.topBar}>
        {/* Pet Name - Top Left */}
        <div className={styles.petNameContainer}>
          {isEditingName ? (
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
          ) : (
            <span
              className={styles.petName}
              onClick={handlePetNameClick}
            >
              {gameState.petName || 'Unnamed Pet'}
            </span>
          )}
        </div>

        {/* Points - Top Right */}
        <div className={styles.pointsContainer}>
          <img src={assets.ui.coinIcon} className={styles.coinIcon}/>
          <div>
            <div className={styles.pointsValue}>
              {formatNumberWithCommas(gameState.point)}
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
