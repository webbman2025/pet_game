import styles from "@styles/Home.module.scss";
import { gameConfig } from "@config/gameConfig";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { formatNumberWithCommas } from "@utils/index";
import { useLanguage, getLangAssets } from "@hooks/useLanguage";
import { GameState } from "@/components/GameState";


interface HomeProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  onFeed: () => void;
  onWalk: () => void;
  onSpa: () => void;
  gameState: GameState;
  isFirstEntry: boolean;
}

const Home: React.FC<HomeProps> = ({
  audioOn,
  setAudioOn,
  onFeed,
  onWalk,
  onSpa,
  gameState,
  isFirstEntry
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [petName, setPetName] = useState(gameState.petName);
  const [tempName, setTempName] = useState(petName);

  const handlePetNameClick = () => {
    setIsEditingName(true);
    setTempName(petName);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  };

  const handleNameBlur = () => {
    if (tempName.trim()) {
      setPetName(tempName.trim());
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

  // Calculate satisfaction bar percentage
  const satisfactionPercentage = Math.max(0, Math.min(100, gameState.satisfaction));

  // Task completion status
  const feedCompletions = Math.min(3, gameState.game1PlayTimes);
  const walkCompletions = Math.min(2, gameState.game2PlayTimes);
  const spaCompletions = Math.min(1, gameState.game3PlayTimes);

  return (
    <div className={styles.root}>
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
            <Typography
              className={styles.petName}
              onClick={handlePetNameClick}
            >
              {petName || 'Unnamed Pet'}
            </Typography>
          )}
        </div>

        {/* Satisfaction Level - Top Middle */}
        <div className={styles.satisfactionContainer}>
          <Typography className={styles.satisfactionLabel}>
            Satisfaction level
          </Typography>
          <div className={styles.satisfactionBar}>
            <div
              className={styles.satisfactionFill}
              style={{ width: `${satisfactionPercentage}%` }}
            />
          </div>
        </div>

        {/* Points - Top Right */}
        <div className={styles.pointsContainer}>
          <Typography className={styles.pointsValue}>
            {formatNumberWithCommas(gameState.point)}
          </Typography>
          <Typography className={styles.pointsLabel}>points</Typography>
        </div>
      </div>

      {/* Pet Image - Center */}
      <div className={styles.petImageContainer}>
        <img src={assets.ui.landingBackground} alt="Pet" className={styles.petImage} />
      </div>

      {/* Game Buttons - Bottom Section */}
      <div className={styles.gameButtonsContainer}>
        <button className={styles.gameButton} onClick={onFeed}>
          <span className={styles.buttonIcon}>🍖</span>
          <span className={styles.buttonText}>Feed</span>
        </button>
        <button className={styles.gameButton} onClick={onWalk}>
          <span className={styles.buttonIcon}>🐾</span>
          <span className={styles.buttonText}>Walk</span>
        </button>
        <button className={styles.gameButton} onClick={onSpa}>
          <span className={styles.buttonIcon}>🛁</span>
          <span className={styles.buttonText}>Spa</span>
        </button>
      </div>

      {/* Daily Tasks Box - Bottom */}
      <div className={styles.dailyTasksBox}>
        <Typography className={styles.dailyTasksTitle}>Daily Task</Typography>
        
        {/* Feed Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <span className={styles.taskIcon}>🍖</span>
            <span>Feed 3 times</span>
          </div>
          <div className={styles.taskProgressBar}>
            {[0, 1, 2].map((index) => (
              <div
                key={`feed-${index}`}
                className={`${styles.progressSegment} ${
                  index < feedCompletions ? styles.completed : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Walk Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <span className={styles.taskIcon}>🐾</span>
            <span>Walk 2 times</span>
          </div>
          <div className={styles.taskProgressBar}>
            {[0, 1].map((index) => (
              <div
                key={`walk-${index}`}
                className={`${styles.progressSegment} ${
                  index < walkCompletions ? styles.completed : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Spa Task */}
        <div className={styles.taskItem}>
          <div className={styles.taskLabel}>
            <span className={styles.taskIcon}>🛁</span>
            <span>Spa 1 time</span>
          </div>
          <div className={styles.taskProgressBar}>
            {[0].map((index) => (
              <div
                key={`spa-${index}`}
                className={`${styles.progressSegment} ${
                  index < spaCompletions ? styles.completed : ''
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
