import styles from "@styles/Home.module.scss";
import { gameConfig } from "@config/gameConfig";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { formatNumberWithCommas } from "@utils/index";
import { useLanguage, getLangAssets } from "@hooks/useLanguage";


interface HomeProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  onPlay: () => void;
  onInstructions: () => void;
  onLeaderBoard: () => void;
  onEventDetails: () => void;
}

const Home: React.FC<HomeProps> = ({
  audioOn,
  setAudioOn,
  onPlay,
  onInstructions,
  onLeaderBoard,
  onEventDetails,
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);


  return (
    <div className={styles.root}>
      <img
        src={assets.ui.HomeBackground}
        className={styles.backgroundImage}
        alt="Home background"
      />

      <button
        type="button"
        className={styles.audioControlButton}
        onClick={() => setAudioOn(!audioOn)}
      >
        {audioOn ? (
          <img src={assets.ui.audioOnButton} alt="Audio on" />
        ) : (
          <img src={assets.ui.audioOffButton} alt="Audio off" />
        )}
      </button>

      <img
        src={assets.ui.HomeTitle}
        className={styles.titleImage}
        alt="Game title"
      />

      <img
        src={assets.ui.HomeEventDetails}
        className={styles.HomeEventDetails}
        alt="Home Event Details"
      />

      <button
        type="button"
        className={styles.eventDetailsButton}
        onClick={onEventDetails}
      />

      <div className={styles.HomeUserGameInfoBox}>
        <img
          src={checkInDayBox}
          alt="Home round gift box"
        />

        <div className={styles.HomeUserGameGiftNumberContainer}>
          <img
            src={assets.ui.giftBoxIcon}
            alt="Home round gift box"
            className={styles.giftBoxIcon}
          />
          <Typography className={styles.giftNumText}>
            {formatNumberWithCommas(specialItemPoint)}
          </Typography>
        </div>
      </div>

      <button type="button" className={styles.playButton} onClick={onPlay}> 
        <img src={assets.ui.playButton} alt="Play button" />
      </button>

      <button className={styles.instructionsButton} onClick={onInstructions}>
        <img
          src={assets.ui.instructionsButton}
          alt="Instructions button"
        />
      </button>

      <img
        src={assets.ui.HomeBackgroundBottom}
        className={styles.HomeBackgroundBottom}
        alt="Home background"
      />
    </div>
  );
};

export default Home;
