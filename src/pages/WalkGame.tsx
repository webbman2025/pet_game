import styles from "@/styles/WalkGame.module.scss";
import { gameConfig } from "@/config/gameConfig";
import { useEffect, useRef, useState } from "react";
import { formatNumberWithCommas } from "@/utils/index";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import { GameState } from "@/components/GameState";

interface WalkGameProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  gameState: GameState;
  onBackToMenu: () => void;
  acquirePoint: (name: string, point: number, satisfaction: number) => void;
}

const WalkGame: React.FC<WalkGameProps> = ({
  audioOn,
  setAudioOn,
  gameState,
  onBackToMenu,
  acquirePoint
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);
  
  const [point, setPoint] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [heartCount, setHeartCount] = useState(3);
  const [timer, setTimer] = useState(20);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const lastResumeTimeRef = useRef<number>(Date.now());

  
  useEffect(() => {
    if (heartCount <= 0) {
      setIsGameOver(true);
    }
  }, [heartCount]);

  useEffect(() => {
    if (isGameOver) {
      acquirePoint("walk_game", point, 5);
      setTimeout(() => setShowEndModal(true), 1000);
    }
  }, [isGameOver]);
  
  useEffect(() => {
    if (showStartModal) return;

    let timer: NodeJS.Timeout;

    lastResumeTimeRef.current = Date.now();

    timer = setInterval(() => {
      const now = Date.now();
      const currentSessionTime = now - lastResumeTimeRef.current;
      const newTimer = Math.max(0, 20 - currentSessionTime / 1000);
      
      setTimer(newTimer);

      if (newTimer <= 0) {
        setIsGameOver(true);
        setIsTimeUp(true);
        clearInterval(timer);
      }

    }, 200);
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showStartModal]);

  const handleStartGame = () => {
    setShowStartModal(false);
  };
  
  return (
    <div className={styles.root}>

      {showStartModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalWrap}>
            <img className={styles.modalDog} src={assets.ui.feedGameBeginDog} alt="Dog" />

            <div className={styles.modalFrame}>
              <img className={styles.modalTop} src={assets.ui.modalTop} alt="Modal Top" />

              <div className={styles.modalCenterWrap}>
                <img className={styles.modalCenter} src={assets.ui.modalCenter} alt="Modal Center" />
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>Feeding Time!</h2>
                  <p className={styles.modalText}>I&apos;m hungry!💖</p>
                  <p className={styles.modalText}>Pick my favourite food!</p>
                  <p className={styles.modalText}>Hurry up - I can&apos;t wait!</p>

                  <button className={styles.modalBtn} onClick={handleStartGame} type="button">
                    <img className={styles.modalBtnBg} src={assets.ui.primaryBtn} alt="Start" />
                    <span className={styles.modalBtnText}>Start</span>
                  </button>
                </div>
              </div>

              <img className={styles.modalBottom} src={assets.ui.modalButtom} alt="Modal Bottom" />
            </div>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalWrap}>
            <img className={styles.modalDog} src={assets.ui.feedGameFinishDog} alt="Dog" />

            <div className={styles.modalFrame}>
              <img className={styles.modalTop} src={assets.ui.modalTop} alt="Modal Top" />

              <div className={styles.modalCenterWrap}>
                <img className={styles.modalCenter} src={assets.ui.modalCenter} alt="Modal Center" />
                <div className={styles.modalContent}>
                  <p className={styles.modalText}>You earned points</p>
                  <p className={styles.modalPointText}>
                    <img src={assets.ui.coinIcon} className={styles.coinIcon}/>
                    +{point}
                  </p>
                  <p className={styles.modalText}>Total Points</p>
                  <p className={styles.modalText}>{gameState.point}</p>

                  <button className={styles.modalBtn} onClick={onBackToMenu} type="button">
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

      <div className={styles.gameTopBar}>
        <div
          className={styles.timerContainer}
        >
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

        <div
          className={styles.pointContainer}
        >
          <img className={styles.pointBox} src={assets.ui.feedGamePointBox} alt="Point" />
          <span className={styles.pointText}>{point}</span>
        </div>
      </div>

      
    </div>
  );
}

export default WalkGame;