import { SatisfactionLevel } from "@/utils/satisfaction";

export interface PetUiAssets {
  petVeryHappyDanceAnim: string;
  petVeryHappyAnim: string;
  petHappyAnim: string;
  petNormalAnim: string;
  petBoringAnim: string;
  petUnhappyAnim: string;
}

export const getPetAnimationSrc = (
  level: SatisfactionLevel,
  assets: PetUiAssets
): string => {
  switch (level) {
    case "dance":
      return assets.petVeryHappyDanceAnim;
    case "veryHappy":
      return assets.petVeryHappyAnim;
    case "happy":
      return assets.petHappyAnim;
    case "normal":
      return assets.petNormalAnim;
    case "boring":
      return assets.petBoringAnim;
    case "unhappy":
      return assets.petUnhappyAnim;
    default:
      return assets.petNormalAnim;
  }
};

export const isUnhappyPetPose = (level: SatisfactionLevel): boolean =>
  level === "unhappy";
