import { useEffect, useRef, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { HowToPlayDialog } from './components/HowToPlayDialog';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { SettingsDialog } from './components/SettingsDialog';
import { StartScreen } from './components/StartScreen';
import { LEVELS } from './data/levels';
import {
  clearProgressStorage,
  completeLevel,
  createInitialSaveData,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
  unlockHintTier,
} from './utils/progressStorage';
import type { AppView, SaveData } from './types/game';

type LevelCompletionPayload = {
  completedLevelId: number;
  doorsOpened: number;
  firstTryClear: boolean;
  hintsUsed: number;
  keysCollected: number;
  moves: number;
  portalsUsed: number;
  stars: number;
  timeSeconds: number;
};

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [save, setSave] = useState<SaveData>(() => loadProgress());
  const [settings, setSettings] = useState(() => loadSettings());
  const skipNextProgressSaveRef = useRef(false);
  const settingsReturnFocusRef = useRef<HTMLElement | null>(null);
  const howToPlayReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (skipNextProgressSaveRef.current) {
      skipNextProgressSaveRef.current = false;

      return;
    }

    saveProgress(save);
  }, [save]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('high-contrast', settings.highContrast);
  }, [settings.highContrast, settings.reducedMotion]);

  const openSettings = () => {
    settingsReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    window.setTimeout(() => {
      settingsReturnFocusRef.current?.focus();
      settingsReturnFocusRef.current = null;
    }, 0);
  };

  const openHowToPlay = () => {
    howToPlayReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsHowToPlayOpen(true);
  };

  const closeHowToPlay = () => {
    setIsHowToPlayOpen(false);
    window.setTimeout(() => {
      howToPlayReturnFocusRef.current?.focus();
      howToPlayReturnFocusRef.current = null;
    }, 0);
  };

  const startNewGame = () => {
    setSave({ ...createInitialSaveData(), hasActiveRun: true });
    setView('game');
  };

  const resetProgress = () => {
    clearProgressStorage();
    skipNextProgressSaveRef.current = true;
    setSave(createInitialSaveData());
    setStatusMessage('Progress reset. Settings preserved.');
    setView('start');
  };

  const handleLevelComplete = (completedLevelId: number, stats: Omit<LevelCompletionPayload, 'completedLevelId'>) => {
    setSave((currentSave) => {
      if (completedLevelId !== currentSave.currentLevel) {
        console.warn('Ignoring stale level completion payload.', {
          completedLevelId,
          currentLevelId: currentSave.currentLevel,
        });

        return currentSave;
      }

      return completeLevel(currentSave, completedLevelId, stats);
    });
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <main className="app-shell" data-view={view} id="main-content" tabIndex={-1}>
        {view === 'start' && (
          <StartScreen
            canContinue={save.hasActiveRun}
            onContinue={() => setView('game')}
            onNewGame={startNewGame}
            onLevelSelect={() => setView('levels')}
            onSettings={openSettings}
            onHowToPlay={openHowToPlay}
          />
        )}

      {view === 'game' && (
        <GameScreen
          currentLevel={save.currentLevel}
          isSettingsOpen={isSettingsOpen}
          onBack={() => setView('start')}
          onCompleteLevel={({ completedLevelId, ...stats }) => handleLevelComplete(completedLevelId, stats)}
          onLevelSelect={() => setView('levels')}
          onUnlockHintTier={(levelId, tierNumber) =>
            setSave((currentSave) => unlockHintTier(currentSave, levelId, tierNumber))
          }
          onNextLevel={() =>
            setSave((currentSave) => ({
              ...currentSave,
              currentLevel: Math.min(currentSave.currentLevel + 1, LEVELS.length),
              hasActiveRun: true,
            }))
          }
          onSettings={openSettings}
          settings={settings}
          progress={save}
          reducedMotion={settings.reducedMotion}
        />
      )}

      {view === 'levels' && (
        <LevelSelectScreen
          progress={save}
          onBack={() => setView('start')}
          onSelectLevel={(level) => {
            setSave({ ...save, currentLevel: level, hasActiveRun: true });
            setView('game');
          }}
        />
      )}

      <SettingsDialog
        isOpen={isSettingsOpen}
        onResetProgress={resetProgress}
        settings={settings}
        onChange={setSettings}
        onClose={closeSettings}
      />
      <HowToPlayDialog isOpen={isHowToPlayOpen} onClose={closeHowToPlay} />
      {statusMessage ? (
        <p className="sr-only" role="status" aria-label={statusMessage} aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>
      ) : null}
      </main>
    </>
  );
}
