import { gameConfig } from "@/config/gameConfig";

export const useLanguage = () => {
  const lang = localStorage.getItem('lang') || 'eng';
  return lang;
};

export const getLangAssets = (lang : string) => {
  if(lang === 'chi') {
    return gameConfig.chi.assets;
  }
  return gameConfig.eng.assets;
};