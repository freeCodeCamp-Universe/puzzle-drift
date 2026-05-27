export type AppView = 'start' | 'game' | 'levels';

export type SaveState = {
  currentLevel: number;
  hasActiveRun: boolean;
  unlockedLevel: number;
};

export type GameSettings = {
  reducedMotion: boolean;
  soundEnabled: boolean;
};

export type LevelMeta = {
  id: number;
  name: string;
};
