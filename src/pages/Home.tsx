import styles from "@/styles/Home.module.scss";
import { gameConfig } from "@/config/gameConfig";
import { useEffect, useRef, useState } from "react";
import { formatNumberWithCommas } from "@/utils/index";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import { GameState } from "@/components/GameState";
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
    setIsEditingName(false);
  };

  const handleNameKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (!isEditingName) {
      changeName(tempName.trim());
    }
  }, [isEditingName]);

  const FEED_MAX_PLAYS = 3;
  const WALK_MAX_PLAYS = 2;
  const SPA_MAX_PLAYS = 1;
  const FEED_COOLDOWN_MS = 2 * 60 * 60 * 1000;
  const WALK_COOLDOWN_MS = 30 * 60 * 1000;

  const formatRemainingTime = (milliseconds: number) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  const getRemainingCooldown = (lastPlayedTimestamp: number, cooldownMs: number) => {
    if (!lastPlayedTimestamp || cooldownMs <= 0) return 0;
    return Math.max(0, cooldownMs - lastPlayedTimestamp);
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
      const now = Date.now();
      const currentSessionTime = now - lastResumeTimeRef.current;
     
      // Task completion status (daily play counts expected from PlayTimes fields)
      const feedCompletions = Math.min(FEED_MAX_PLAYS, latestGameState.game1PlayTimes);
      const walkCompletions = Math.min(WALK_MAX_PLAYS, latestGameState.game2PlayTimes);
      const spaCompletions = Math.min(SPA_MAX_PLAYS, latestGameState.game3PlayTimes);

      const feedCooldownMs = getRemainingCooldown(latestGameState.game1Timer + currentSessionTime, FEED_COOLDOWN_MS);
      const walkCooldownMs = getRemainingCooldown(latestGameState.game2Timer + currentSessionTime, WALK_COOLDOWN_MS);
      const spaCooldownMs = getRemainingCooldown(latestGameState.game3Timer + currentSessionTime, 0);

      const nextIsFeedDisabled = latestGameState.game1Timer > 0 && (feedCompletions >= FEED_MAX_PLAYS || feedCooldownMs > 0);
      const nextIsWalkDisabled = latestGameState.game2Timer > 0 && (walkCompletions >= WALK_MAX_PLAYS || walkCooldownMs > 0);
      const nextIsSpaDisabled = latestGameState.game3Timer > 0 && (spaCompletions >= SPA_MAX_PLAYS);

      setIsFeedDisabled(nextIsFeedDisabled);
      setIsWalkDisabled(nextIsWalkDisabled);
      setIsSpaDisabled(nextIsSpaDisabled);

      setFeedCooldownLabel(nextIsFeedDisabled && feedCooldownMs > 0 ? formatRemainingTime(feedCooldownMs) : "");
      setWalkCooldownLabel(nextIsWalkDisabled && walkCooldownMs > 0 ? formatRemainingTime(walkCooldownMs) : "");
      setSpaCooldownLabel(nextIsSpaDisabled ? "" : "");

    }, 200);
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  // Calculate satisfaction bar percentage
  const satisfactionPercentage = Math.max(0, Math.min(100, gameState.satisfaction));

  const petImageSrc = (() => {
    if (satisfactionPercentage >= 100) {
      return Math.random() < 0.5 ? assets.ui.petVeryHappyDanceAnim : assets.ui.petVeryHappyAnim;
    }
    if (satisfactionPercentage >= 70) {
      return assets.ui.petHappyAnim;
    }
    if (satisfactionPercentage >= 50) {
      return assets.ui.petNormalAnim;
    }
    if (satisfactionPercentage >= 30) {
      return assets.ui.petBoringAnim;
    }
    return assets.ui.petUnhappyAnim;
  })();

  
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
              {gameStateRef.current.petName || 'Unnamed Pet'}
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
        </div>
      </div>

      {/* Pet Image - Center */}
      <div className={styles.petImageContainer} ref={petImageContainerRef}>
        <img
          ref={petImageRef}
          src={petImageSrc}
          alt="Pet"
          className={satisfactionPercentage < 30 ? styles.petImageUnhappy : styles.petImage}
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
          <div className={styles.taskProgressBar}>
            {[0, 1, 2].map((index) => (
              <div
                key={`feed-${index}`}
                className={`${styles.progressSegment} ${
                  index < gameState.game1PlayTimes ? styles.completed : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Walk Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <img src={assets.ui.walkGameTaskIcon} className={styles.taskIcon} />
            <span>Walk 2 times</span>
          </div>
          <div className={styles.taskProgressBar}>
            {[0, 1].map((index) => (
              <div
                key={`walk-${index}`}
                className={`${styles.progressSegment} ${
                  index < gameState.game2PlayTimes ? styles.completed : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Spa Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <img src={assets.ui.spaGameTaskIcon} className={styles.taskIcon} />
            <span>Spa 1 time</span>
          </div>
          <div className={styles.taskProgressBar}>
            {[0].map((index) => (
              <div
                key={`spa-${index}`}
                className={`${styles.progressSegment} ${
                  index < gameState.game3PlayTimes ? styles.completed : ''
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
