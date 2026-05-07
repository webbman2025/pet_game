import { useSearchParams } from 'next/navigation';
import { gameConfig } from "@config/gameConfig";

export const useLanguage = () => {
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') || 'eng';
  return lang;
};

export const getLangAssets = (lang : string) => {
  if(lang === 'chi') {
    return gameConfig.chi.assets;
  }
  return gameConfig.eng.assets;
};