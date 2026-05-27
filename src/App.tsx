import { useEffect, useRef, useState } from 'react';
import { GameScreen } from './components/GameScreen';
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
} from './utils/progressStorage';
import type { AppView, SaveData } from './types/game';

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    root.classList.remove('theme-rift-dark', 'theme-crystal-blue', 'theme-ember-grid', 'theme-forest-circuit');
    root.classList.add(`theme-${settings.theme}`);
  }, [settings.reducedMotion, settings.theme]);

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
        />
      )}

      {view === 'game' && (
        <GameScreen
          currentLevel={save.currentLevel}
          onBack={() => setView('start')}
          onCompleteLevel={(result) =>
            setSave((currentSave) => completeLevel(currentSave, currentSave.currentLevel, result))
          }
          onLevelSelect={() => setView('levels')}
          onMarkActive={() => setSave({ ...save, hasActiveRun: true })}
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
    </main>
  );
}
