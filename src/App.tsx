import { useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { SettingsDialog } from './components/SettingsDialog';
import { StartScreen } from './components/StartScreen';
import { useLocalStorage } from './hooks/useLocalStorage';
import { INITIAL_SAVE } from './data/initialSave';
import type { AppView, GameSettings, SaveState } from './types/game';

const INITIAL_SETTINGS: GameSettings = {
  reducedMotion: false,
  soundEnabled: true,
};

export function App() {
  const [view, setView] = useState<AppView>('start');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [save, setSave] = useLocalStorage<SaveState>('puzzle-drift:save', INITIAL_SAVE);
  const [settings, setSettings] = useLocalStorage<GameSettings>(
    'puzzle-drift:settings',
    INITIAL_SETTINGS,
  );

  const startNewGame = () => {
    setSave(INITIAL_SAVE);
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
          onMarkActive={() => setSave({ ...save, hasActiveRun: true })}
        />
      )}

      {view === 'levels' && (
        <LevelSelectScreen
          unlockedLevel={save.unlockedLevel}
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
