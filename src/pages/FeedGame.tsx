import styles from "@styles/FeedGame.module.scss";
import { gameConfig } from "@config/gameConfig";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { formatNumberWithCommas } from "@utils/index";
import { useLanguage, getLangAssets } from "@hooks/useLanguage";
import { GameState } from "@/components/GameState";

interface FeedGameProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  gameState: GameState;
  onBackToMenu: () => void;
}

const FeedGame: React.FC<FeedGameProps> = ({
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);

  return (
    <div className={styles.root}>

    </div>
  );
}

export default FeedGame;