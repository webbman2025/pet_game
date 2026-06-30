import { useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/DevDebugPanel.module.scss";
import { GameState } from "@/components/GameState";
import { clampSatisfaction } from "@/utils/satisfaction";

interface DevDebugPanelProps {
  gameState: GameState;
  onSimulateNewDay: () => void;
  onSetSatisfaction: (value: number) => void;
}

const SATISFACTION_PRESETS = [0, 30, 50, 70, 100] as const;

const DevDebugPanel: React.FC<DevDebugPanelProps> = ({
  gameState,
  onSimulateNewDay,
  onSetSatisfaction,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  return createPortal(
    <div className={styles.host} aria-label="Dev debug panel">
      {isOpen ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <p className={styles.title}>Dev Tools</p>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Close dev tools"
            >
              ×
            </button>
          </div>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onSimulateNewDay}
          >
            Simulate New Day
          </button>

          <div className={styles.section}>
            <p className={styles.label}>
              Satisfaction ({clampSatisfaction(gameState.satisfaction)}%)
            </p>
            <div className={styles.presetRow}>
              {SATISFACTION_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => onSetSatisfaction(value)}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>

          <p className={styles.hint}>
            New day resets daily tasks + cooldowns only. Points and satisfaction
            are unchanged.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsOpen(true)}
          aria-label="Open dev tools"
        >
          Dev
        </button>
      )}
    </div>,
    document.body,
  );
};

export default DevDebugPanel;
