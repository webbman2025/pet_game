"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Home from "@/pages/Home";
import FeedGame from "@/pages/FeedGame";
import WalkGame from "@/pages/WalkGame";
import SpaGame from "@/pages/SpaGame";

import { GameState } from "@/components/GameState";
import { gameConfig } from "@/config/gameConfig";
import {
  applyGameReward,
  mergeAcquirePointResponse,
  mergeFetchedGameState,
  parseGameStateFromApi,
} from "@/utils/gameRewards";
import {
  applyDailyReset,
  applyDailyResetIfNewDay,
} from "@/utils/dailyReset";
import { clampSatisfaction } from "@/utils/satisfaction";
import DevDebugPanel from "@/components/DevDebugPanel";
import { useLanguage, getLangAssets } from "@/hooks/useLanguage";
import "@/styles/global.scss";

export default function App() {
  const lang = useLanguage();
  const assets = getLangAssets(lang);

  // Configuration - now imported from centralized config
  const { sounds } = gameConfig;
  const [page, setPage] = useState<"home" | "feedGame" | "walkGame" | "spaGame">("home");
  const [audioOn, setAudioOn] = useState(true);
  const [isFirstEntry, setIsFirstEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    point: 0,
    satisfaction: 100,
    petName: "",
    game1Complete: false,
    game1PlayTimes: 0,
    game1Timer: 0,
    game2Complete: false,
    game2PlayTimes: 0,
    game2Timer: 0,
    game3Complete: false,
    game3PlayTimes: 0,
    game3Timer: 0,
    poopCount: 0
  });


  // Audio Context setup with useRef to persist across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const shouldBePlayingRef = useRef<boolean>(false); // Track if audio should be playing
  

  window.onload = () => {
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  // Initialize AudioContext once — shared across Home and all mini-games
  useEffect(() => {
    const backgroundSound = sounds.background;

    const initAudio = async () => {
      if (audioBufferRef.current && audioContextRef.current) {
        if (audioOn) {
          shouldBePlayingRef.current = true;
          await unlockBackgroundAudio();
        }
        return;
      }

      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();

        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = backgroundSound.volume;
        gainNodeRef.current.connect(audioContextRef.current.destination);

        const response = await fetch(backgroundSound.path);
        if (!response.ok) {
          throw new Error(`Failed to load audio (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        audioBufferRef.current = await audioContextRef.current.decodeAudioData(
          arrayBuffer
        );

        shouldBePlayingRef.current = audioOn;
        if (audioOn) {
          await unlockBackgroundAudio();
        }
      } catch (error) {
        console.warn("Failed to initialize audio:", error);
      }
    };

    initAudio();

    return () => {
      if (isPlayingRef.current) {
        pauseTimeRef.current = getCurrentAudioPosition();
      }
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch {
          // Source may already be stopped.
        }
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      isPlayingRef.current = false;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioBufferRef.current = null;
      gainNodeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Disable mobile browser zoom
  useEffect(() => {
    document.body.style.zoom = "1";
    const eventListener = (e: any) => {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = "1";
    };

    document.addEventListener("gesturestart", eventListener);
    document.addEventListener("gesturechange", eventListener);
    document.addEventListener("gestureend", eventListener);
    return () => {
      document.removeEventListener("gesturestart", eventListener);
      document.removeEventListener("gesturechange", eventListener);
      document.removeEventListener("gestureend", eventListener);
    };
  }, []);

  // Helper function to get current audio position
  const getCurrentAudioPosition = (): number => {
    if (
      !audioContextRef.current ||
      !audioBufferRef.current ||
      !isPlayingRef.current
    ) {
      return pauseTimeRef.current;
    }

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    return elapsed % audioBufferRef.current.duration;
  };

  // Audio control functions
  const playAudio = async (
    playbackRate: number = 1,
    preservePosition: boolean = false
  ) => {
    if (
      !audioContextRef.current ||
      !audioBufferRef.current ||
      !gainNodeRef.current
    )
      return;

    try {
      // Resume AudioContext if suspended (common on iOS)
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Get current position before stopping if we want to preserve it
      const currentPosition = preservePosition
        ? getCurrentAudioPosition()
        : pauseTimeRef.current;

      // Completely clean up any previous source instance
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (error) {
          // Ignore errors if source is already stopped
          console.warn("Failed to stop audio source:", error);
        }
        audioSourceRef.current.disconnect();
        audioSourceRef.current.onended = null; // Clear event handler
        audioSourceRef.current = null; // Nullify reference
      }

      // Reset state to ensure clean start
      isPlayingRef.current = false;

      // Create completely new source instance
      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBufferRef.current;
      audioSourceRef.current.loop = true;
      audioSourceRef.current.playbackRate.value = playbackRate;
      audioSourceRef.current.connect(gainNodeRef.current);

      // Start from current position, pause time, or beginning
      const offset = currentPosition % audioBufferRef.current.duration;
      audioSourceRef.current.start(0, offset);
      startTimeRef.current = audioContextRef.current.currentTime - offset;
      isPlayingRef.current = true;
      shouldBePlayingRef.current = true;

      // Handle source ending (shouldn't happen with loop, but just in case)
      audioSourceRef.current.onended = () => {
        isPlayingRef.current = false;
        audioSourceRef.current = null; // Clean up reference when ended
      };
    } catch (error) {
      console.warn("Failed to play audio:", error);
      // Ensure clean state even on error
      isPlayingRef.current = false;
      if (audioSourceRef.current) {
        audioSourceRef.current = null;
      }
    }
  };

  const pauseAudio = () => {
    if (
      audioSourceRef.current &&
      isPlayingRef.current &&
      audioContextRef.current
    ) {
      // Calculate current position
      const elapsed =
        audioContextRef.current.currentTime - startTimeRef.current;
      pauseTimeRef.current = elapsed;

      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
      isPlayingRef.current = false;
    }
  };

  const unlockBackgroundAudio = async () => {
    if (!audioOn) return;

    shouldBePlayingRef.current = true;

    if (!audioBufferRef.current || !audioContextRef.current || !gainNodeRef.current) {
      return;
    }

    if (isPlayingRef.current) return;

    await playAudio(1, pauseTimeRef.current > 0);
  };

  // Function to change playback rate without restarting from beginning
  const changePlaybackRate = async (newRate: number) => {
    if (audioOn && audioBufferRef.current && shouldBePlayingRef.current) {
      await playAudio(newRate, true); // preservePosition = true
    }
  };

  // Handle audio playback based on audioOn state
  const controlAudio = () => {
    if (audioOn && audioBufferRef.current) {
      shouldBePlayingRef.current = true;
      void unlockBackgroundAudio();
    } else {
      shouldBePlayingRef.current = false;
      pauseAudio();
    }
  };

  useEffect(() => {
    controlAudio();
  }, [audioOn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading) {
      void unlockBackgroundAudio();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check AudioContext state periodically and attempt to resume if needed
  useEffect(() => {
    const checkAudioContext = async () => {
      // Don't interfere if document is hidden
      if (document.hidden) return;

      if (audioContextRef.current && shouldBePlayingRef.current) {
        if (audioContextRef.current.state === "suspended") {
          console.log(
            "Periodic check: AudioContext is suspended, waiting for user interaction"
          );
        } else if (
          audioContextRef.current.state === "running" &&
          !isPlayingRef.current
        ) {
          void unlockBackgroundAudio();
        }
      }
    };

    const interval = setInterval(checkAudioContext, 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle autoplay restrictions — start/resume on any user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (document.hidden || !audioOn) return;
      void unlockBackgroundAudio();
    };

    const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];
    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, {
        passive: true,
      });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [audioOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle background to foreground transition
  useEffect(() => {
    const handleVisibilityChange = async () => {
      console.log(
        "Visibility change handler - hidden:",
        document.hidden,
        "AudioContext state:",
        audioContextRef.current?.state,
        "shouldBePlaying:",
        shouldBePlayingRef.current,
        "isPlaying:",
        isPlayingRef.current
      );

      if (document.hidden) {
        // Page is now hidden - pause audio if playing
        if (isPlayingRef.current) {
          console.log("Visibility handler: Page hidden - pausing audio");
          pauseAudio();
        }
      } else if (
        !document.hidden &&
        shouldBePlayingRef.current &&
        audioContextRef.current
      ) {
        // Page is now visible and audio should be playing
        console.log(
          "Visibility handler: Page is now visible and audio should be playing"
        );
        try {
          if (audioContextRef.current.state === "suspended") {
            console.log(
              "Visibility handler: Attempting to resume suspended AudioContext"
            );
            await audioContextRef.current.resume();
          }

          // If AudioContext is running but audio isn't playing, restart it
          if (
            audioContextRef.current.state === "running" &&
            !isPlayingRef.current
          ) {
            await unlockBackgroundAudio();
          }
        } catch (error) {
          console.warn("Failed to resume audio on visibility change:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup - removed focus event listener to avoid conflicts
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch user's highest score from API on component mount
  const fetchGameState = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await axios.get(
        "/3Care/GamifyPetGameState.do",
        {
          params: {
            campaignID: gameConfig.campaignID
          },
        }
      );
      if (response.data && response.data.code === 200) {
        setIsFirstEntry(response.data.firstEntry === "true");
        const remote = parseGameStateFromApi(response.data);
        setGameState((prev) =>
          applyDailyResetIfNewDay(mergeFetchedGameState(prev, remote))
        );
      } else {
        console.warn("API returned non-success code:", response.data);
      }
    } catch (error) {
      console.error("Error fetching Game State:", error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      hasLoadedOnceRef.current = true;
    }
  };

  const acquirePoint = useCallback(async (
    gameName: string,
    point: number,
    satisfaction: number
  ) => {
    setGameState((prev) => applyGameReward(prev, gameName, point, satisfaction));

    try {
      const response = await axios.get(
        "/3Care/GamifyPetGameAcquirePoint.do",
        {
          params: {
            campaignID: gameConfig.campaignID,
            name: gameName,
            point: point,
            satisfaction: satisfaction
          },
        }
      );
      if (response.data && response.data.code === 200) {
        setGameState((prev) =>
          mergeAcquirePointResponse(prev, response.data, gameName)
        );
      } else {
        console.warn("API returned non-success code:", response.data);
      }
    } catch (error) {
      console.error("Error acquirePoint:", error);
    }

    return true;
  }, []);

  const changeName = async (name: string) => {
    try {
      const response = await axios.get(
        "/3Care/GamifyChangeConfig.do",
        {
          params: {
            campaignID: gameConfig.campaignID,
            type: "name",
            value: name
          },
        }
      );
      if (response.data && response.data.code === 200) {
        return true;
      } else {
        console.warn("API returned non-success code:", response.data);
        //window.location.reload(); // Reload page if API fails
      }
    } catch (error) {
      console.error("Error changeName:", error);
    }
    return false;
  };

  useEffect(() => {
    fetchGameState({ silent: hasLoadedOnceRef.current });
  }, [page]);

  const handleFeedGame = () => {
    setPage("feedGame");
  };

  const handleWalkGame = () => {
    setPage("walkGame");
  };

  const handleSpaGame = () => {
    setPage("spaGame");
  };

  const handleBackToMenu = () => {
    setPage("home");
  };

  const simulateNewDay = useCallback(() => {
    setGameState((prev) => applyDailyReset(prev));
  }, []);

  const setDevSatisfaction = useCallback((value: number) => {
    setGameState((prev) => ({
      ...prev,
      satisfaction: clampSatisfaction(value),
    }));
  }, []);

  if (isLoading) {
    return (
      <div
        className="appShell"
        onPointerDown={() => void unlockBackgroundAudio()}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}
      >
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div
      className="appShell"
      onPointerDown={() => void unlockBackgroundAudio()}
    >
      {page === "home" && (
        <Home
          audioOn={audioOn} 
          setAudioOn={setAudioOn}
          onFeed={handleFeedGame}
          onWalk={handleWalkGame}
          onSpa={handleSpaGame}
          gameState={gameState}
          setGameState={setGameState}
          changeName={changeName}
          acquirePoint={acquirePoint}
          isFirstEntry={isFirstEntry}
        />
      )}
      {page === "feedGame" && (
        <FeedGame
          gameState={gameState}
          audioOn={audioOn}
          setAudioOn={setAudioOn}
          onBackToMenu={handleBackToMenu}
          acquirePoint={acquirePoint}
        />
      )}
      {page === "walkGame" && (
        <WalkGame
          gameState={gameState}
          audioOn={audioOn}
          setAudioOn={setAudioOn}
          onBackToMenu={handleBackToMenu}
          acquirePoint={acquirePoint}
        />
      )}
      {page === "spaGame" && (
        <SpaGame
          gameState={gameState}
          audioOn={audioOn}
          setAudioOn={setAudioOn}
          onBackToMenu={handleBackToMenu}
          acquirePoint={acquirePoint}
        />
      )}

      {import.meta.env.DEV && page === "home" && (
        <DevDebugPanel
          gameState={gameState}
          onSimulateNewDay={simulateNewDay}
          onSetSatisfaction={setDevSatisfaction}
        />
      )}
    </div>
  );
}
