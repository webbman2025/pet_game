import styles from "@/styles/FeedGame.module.scss";
import { gameConfig } from "@/config/gameConfig";
import { useEffect, useRef, useState } from "react";
import { formatNumberWithCommas } from "@/utils/index";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import { GameState } from "@/components/GameState";
import GameRetryModal from "@/components/GameRetryModal";
import GameFailScreen from "@/components/GameFailScreen";

interface FeedGameProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  gameState: GameState;
  onBackToMenu: () => void;
  acquirePoint: (name: string, point: number, satisfaction: number) => Promise<boolean>;
}

type GameResult = "finish" | "fail" | null;

const GAME_DURATION_SEC = 20;

const FeedGame: React.FC<FeedGameProps> = ({
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
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [heartCount, setHeartCount] = useState(3);
  const [timer, setTimer] = useState(GAME_DURATION_SEC);
  const [options, setOptions] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerImg, setAnswerImg] = useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isSelectedCorrect, setIsSelectedCorrect] = useState<boolean | null>(null);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const lastResumeTimeRef = useRef<number>(Date.now());
  const gameStateRef = useRef(gameState);
  const hasSubmittedScoreRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (heartCount <= 0 && !isGameOver) {
      setGameResult("fail");
      setIsGameOver(true);
    }
  }, [heartCount, isGameOver]);

  useEffect(() => {
    if (!isGameOver || hasSubmittedScoreRef.current) return;

    hasSubmittedScoreRef.current = true;

    if (gameResult === "finish") {
      let cancelled = false;

      const awardSuccess = async () => {
        const success = await acquirePoint(
          "feed_game",
          point,
          gameConfig.rewards.feed.satisfactionPerCompletion
        );
        if (!cancelled && success) {
          setPointsAwarded(true);
        }
        if (!cancelled) {
          setTimeout(() => setShowEndModal(true), 1000);
        }
      };

      awardSuccess();

      return () => {
        cancelled = true;
      };
    }

    if (gameResult === "fail") {
      const retryTimer = setTimeout(() => setShowRetryModal(true), 1500);
      return () => clearTimeout(retryTimer);
    }
  }, [isGameOver, gameResult, point, acquirePoint]);

  useEffect(() => {
    if (showStartModal || isGameOver) return;

    let interval: NodeJS.Timeout;

    lastResumeTimeRef.current = Date.now();
    randomizeOptions();

    interval = setInterval(() => {
      const currentSessionTime = Date.now() - lastResumeTimeRef.current;
      const newTimer = Math.max(0, GAME_DURATION_SEC - currentSessionTime / 1000);

      setTimer(newTimer);

      if (newTimer <= 0) {
        if (heartCount > 0) {
          setGameResult("finish");
          setIsTimeUp(true);
        }
        setIsGameOver(true);
        clearInterval(interval);
      }
    }, 200);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showStartModal, isGameOver]);

  const handleStartGame = () => {
    hasSubmittedScoreRef.current = false;
    setShowStartModal(false);
  };

  const randomizeOptions = () => {
    const foodOptions = ["Pumpkin", "Broccoli", "Egg", "Salmon", "Dog Kibble", "Rice"];
    const shuffled = foodOptions.sort(() => 0.5 - Math.random());
    setOptions(shuffled.slice(0, 6));

    const correctOption = foodOptions[Math.floor(Math.random() * foodOptions.length)];
    setAnswer(correctOption);

    switch (correctOption) {
      case "Pumpkin":
        setAnswerImg(assets.ui.feedGamePumpkin);
        break;
      case "Broccoli":
        setAnswerImg(assets.ui.feedGameBroccoli);
        break;
      case "Egg":
        setAnswerImg(assets.ui.feedGameEgg);
        break;
      case "Salmon":
        setAnswerImg(assets.ui.feedGameSalmon);
        break;
      case "Dog Kibble":
        setAnswerImg(assets.ui.feedGameDogKibble);
        break;
      case "Rice":
        setAnswerImg(assets.ui.feedGameRice);
        break;
    }
    setSelectedOptionIndex(null);
    setIsSelectedCorrect(null);
  };

  const resetGame = () => {
    hasSubmittedScoreRef.current = false;
    setPoint(0);
    setIsGameOver(false);
    setIsTimeUp(false);
    setGameResult(null);
    setHeartCount(3);
    setTimer(GAME_DURATION_SEC);
    setSelectedOptionIndex(null);
    setIsSelectedCorrect(null);
    setShowEndModal(false);
    setShowRetryModal(false);
    setPointsAwarded(false);
    lastResumeTimeRef.current = Date.now();
    randomizeOptions();
  };

  const handleRetry = () => {
    resetGame();
  };

  const chooseOption = (option: string, optionIndex: number) => () => {
    if (isGameOver) return;
    if (selectedOptionIndex !== null) return;

    const isCorrect = option === answer;
    setSelectedOptionIndex(optionIndex);
    setIsSelectedCorrect(isCorrect);

    if (isCorrect) {
      setPoint((prev) => prev + 10);
    } else {
      setHeartCount((prev) => prev - 1);
    }

    setTimeout(() => randomizeOptions(), 1000);
  };

  const showFailScreen = isGameOver && gameResult === "fail" && !showRetryModal;
  const isPlaying = !isGameOver;
  const showRoundUi = !isGameOver || showFailScreen;

  const retryModalAssets = {
    modalTop: assets.ui.modalTop,
    modalCenter: assets.ui.modalCenter,
    modalButtom: assets.ui.modalButtom,
    primaryBtn: assets.ui.primaryBtn,
    secondaryBtn: assets.ui.secondaryBtn,
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
            <img
              className={`${styles.modalDog} ${styles.modalDogFinish}`}
              src={assets.ui.feedGameFinishDog}
              alt="Dog"
            />

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
                  <p className={styles.modalText}>
                    {formatNumberWithCommas(
                      pointsAwarded
                        ? gameStateRef.current.point
                        : gameStateRef.current.point + point
                    )}
                  </p>

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

      {showRetryModal && (
        <GameRetryModal
          assets={retryModalAssets}
          onRetry={handleRetry}
          onBack={onBackToMenu}
        />
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

      <div className={styles.heartContainer}>
        <img className={styles.heartBox} src={assets.ui.feedGameHeartBox} alt="Heart Box" />

        <div className={styles.hearts}>
          {[...Array(heartCount)].map((_, index) => (
            <img key={index} className={styles.heart} src={assets.ui.feedGameHeart} alt="Heart" />
          ))}
        </div>
      </div>

      {isPlaying && (
        <>
          <div className={styles.correctBg + (isSelectedCorrect ? ' ' + styles.showCorrectBg : '')}></div>
          <img className={styles.plus10Text + (isSelectedCorrect ? ' ' + styles.showPlus10 : '')} src={assets.ui.feedGamePlus10Text} alt="+10"  />

          <div className={styles.failBg + (isSelectedCorrect === false ? ' ' + styles.showFailBg : '')}></div>
          <img className={styles.failText + (isSelectedCorrect === false ? ' ' + styles.showFailText : '')} src={assets.ui.feedGameFailText} alt="Fail"  />
        </>
      )}

      {showFailScreen && (
        <GameFailScreen failTextSrc={assets.ui.feedGameFailText} />
      )}

      <img className={styles.gameOverText + (isTimeUp ? ' ' + styles.showGameOver : '')} src={assets.ui.feedGameTimeUpText} alt="Game Over" />

      <img className={styles.petImage + (isTimeUp ? ' ' + styles.hidePetImage : '')} src={assets.ui.pet} alt="Pet" />

      <img className={styles.finishPetImage + (isTimeUp ? ' ' + styles.showFinishPetImage : '')} src={assets.ui.feedGameTimeoutDog} alt="Pet" />

      {showRoundUi && (
        <img className={styles.thinkingBubble} src={assets.ui.feedGameThinkingBubble} alt="Thinking Bubble" />
      )}

      {showRoundUi && answerImg != null && (
        <img className={styles.answer} src={answerImg} alt="answer"/>
      )}

      <div className={styles.msgBoxContainer}>
        Pick his favourite food now
      </div>

      {showRoundUi && (
        <div className={styles.optionsContainer}>
          {options.map((option, index) => {
            let optionClass = styles.option;
            if (selectedOptionIndex === index && isSelectedCorrect === true) {
              optionClass += ` ${styles.correct}`;
            } else if (selectedOptionIndex === index && isSelectedCorrect === false) {
              optionClass += ` ${styles.wrong}`;
            }
            let optionSrc = "";
            switch (option) {
              case "Pumpkin":
                optionSrc = assets.ui.feedGamePumpkin;
                break;
              case "Broccoli":
                optionSrc = assets.ui.feedGameBroccoli;
                break;
              case "Egg":
                optionSrc = assets.ui.feedGameEgg;
                break;
              case "Salmon":
                optionSrc = assets.ui.feedGameSalmon;
                break;
              case "Dog Kibble":
                optionSrc = assets.ui.feedGameDogKibble;
                break;
              case "Rice":
                optionSrc = assets.ui.feedGameRice;
                break;
            }
            return (
              <div key={index} className={optionClass}>
                <img className={styles.optionImg} src={optionSrc} alt={option} onClick={chooseOption(option, index)}/>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default FeedGame;
