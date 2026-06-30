import styles from "@/styles/GameModals.module.scss";

export interface GameModalAssets {
  modalTop: string;
  modalCenter: string;
  modalButtom: string;
  primaryBtn: string;
  secondaryBtn: string;
}

interface GameRetryModalProps {
  assets: GameModalAssets;
  onRetry: () => void;
  onBack: () => void;
}

const GameRetryModal: React.FC<GameRetryModalProps> = ({
  assets,
  onRetry,
  onBack,
}) => (
  <div className={styles.overlay}>
    <div className={styles.failModalWrap}>
      <div className={styles.modalFrame}>
        <img className={styles.modalTop} src={assets.modalTop} alt="" />

        <div className={styles.modalCenterWrap}>
          <img className={styles.modalCenter} src={assets.modalCenter} alt="" />
          <div className={styles.failModalContent}>
            <p className={styles.failModalTitle}>Try Again?</p>
            <button className={styles.failModalBtn} onClick={onRetry} type="button">
              <img className={styles.failModalBtnBg} src={assets.primaryBtn} alt="" />
              <span className={styles.failModalBtnText}>Retry</span>
            </button>
            <button
              className={styles.failModalBtnSecondary}
              onClick={onBack}
              type="button"
            >
              <img className={styles.failModalBtnBg} src={assets.secondaryBtn} alt="" />
              <span className={styles.failModalBtnSecondaryText}>Back</span>
            </button>
          </div>
        </div>

        <img className={styles.modalBottom} src={assets.modalButtom} alt="" />
      </div>
    </div>
  </div>
);

export default GameRetryModal;
