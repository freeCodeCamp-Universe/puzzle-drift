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

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [save, setSave] = useState<SaveData>(() => loadProgress());
  const [settings, setSettings] = useState(() => loadSettings());
  const skipNextProgressSaveRef = useRef(false);

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
  }, [settings.reducedMotion]);

  const startNewGame = () => {
    setSave({ ...createInitialSaveData(), hasActiveRun: true });
    setView('game');
  };

  const resetProgress = () => {
    clearProgressStorage();
    skipNextProgressSaveRef.current = true;
    setSave(createInitialSaveData());
    setView('start');
  };

  return (
    <main className="app-shell" data-view={view}>
      {view === 'start' && (
        <StartScreen
          canContinue={save.hasActiveRun}
          onContinue={() => setView('game')}
          onNewGame={startNewGame}
          onLevelSelect={() => setView('levels')}
          onSettings={() => setIsSettingsOpen(true)}
          onHowToPlay={() => setIsHowToPlayOpen(true)}
        />
      )}

      {view === 'game' && (
        <GameScreen
          currentLevel={save.currentLevel}
          isSettingsOpen={isSettingsOpen}
          onBack={() => setView('start')}
          onCompleteLevel={(result) =>
            setSave((currentSave) => completeLevel(currentSave, currentSave.currentLevel, result))
          }
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
          onSettings={() => setIsSettingsOpen(true)}
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
        onClose={() => setIsSettingsOpen(false)}
      />
      <HowToPlayDialog isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
    </main>
  );
}
