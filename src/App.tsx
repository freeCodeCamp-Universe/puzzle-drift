import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { SettingsDialog } from './components/SettingsDialog';
import { StartScreen } from './components/StartScreen';
import { LEVELS } from './data/levels';
import { completeLevel, createInitialSaveData, loadProgress, loadSettings, saveProgress, saveSettings } from './utils/progressStorage';
import type { AppView, SaveData } from './types/game';

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [save, setSave] = useState<SaveData>(() => loadProgress());
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => {
    saveProgress(save);
  }, [save]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const startNewGame = () => {
    setSave({ ...createInitialSaveData(), hasActiveRun: true });
    setView('game');
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
        settings={settings}
        onChange={setSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
