import { ArrowLeft, Lock, Map } from 'lucide-react';
import { LEVELS } from '../data/levels';

type LevelSelectScreenProps = {
  unlockedLevel: number;
  onBack: () => void;
  onSelectLevel: (level: number) => void;
};

export function LevelSelectScreen({
  unlockedLevel,
  onBack,
  onSelectLevel,
}: LevelSelectScreenProps) {
  return (
    <section className="screen level-screen" aria-labelledby="level-select-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">route planner</p>
          <h2 id="level-select-title">Level Select</h2>
        </div>
      </header>

      <div className="placeholder-panel">
        <Map aria-hidden="true" />
        <p>Placeholder level select screen</p>
      </div>

      <div className="level-grid" aria-label="Available levels">
        {LEVELS.map((level) => {
          const isLocked = level.id > unlockedLevel;

          return (
            <button
              type="button"
              className="level-button"
              key={level.id}
              onClick={() => onSelectLevel(level.id)}
              disabled={isLocked}
            >
              {isLocked ? <Lock aria-hidden="true" /> : <span>{level.id}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
