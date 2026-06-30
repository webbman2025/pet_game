import styles from "@/styles/GameModals.module.scss";

interface GameFailScreenProps {
  failTextSrc: string;
}

const GameFailScreen: React.FC<GameFailScreenProps> = ({ failTextSrc }) => (
  <>
    <div className={styles.failOverlay} />
    <img className={styles.failText} src={failTextSrc} alt="Fail" />
  </>
);

export default GameFailScreen;
