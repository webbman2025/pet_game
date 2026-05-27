import styles from "@/styles/SpaGame.module.scss";
import { gameConfig } from "@/config/gameConfig";
import { useEffect, useState } from "react";
import { formatNumberWithCommas } from "@/utils/index";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import { GameState } from "@/components/GameState";

interface SpaGameProps {
  audioOn: boolean;
  setAudioOn: (audioOn: boolean) => void;
  gameState: GameState;
  onBackToMenu: () => void;
  acquirePoint: (name: string, point: number, satisfaction: number) => void;
}

const SpaGame: React.FC<SpaGameProps> = ({
}) => {
  const lang = useLanguage();
  const assets = getLangAssets(lang);

  return (
    <div className={styles.root}>

    </div>
  );
}

export default SpaGame;