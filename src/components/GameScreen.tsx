import { ArrowLeft, CircleCheck, Sparkles } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { GameBoard } from './GameBoard';

type GameScreenProps = {
  currentLevel: number;
  onBack: () => void;
  onCompleteLevel: () => void;
  onLevelSelect: () => void;
  onMarkActive: () => void;
};

export function GameScreen({
  currentLevel,
  onBack,
  onCompleteLevel,
  onLevelSelect,
  onMarkActive,
}: GameScreenProps) {
  const level = LEVELS.find((candidate) => candidate.id === currentLevel) ?? LEVELS[0];

  return (
    <section className="screen game-screen" aria-labelledby="game-screen-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">current drift</p>
          <h2 id="game-screen-title">Level {level.id}</h2>
        </div>
      </header>

      <GameBoard
        elapsedSeconds={0}
        level={level}
        moves={0}
        onLevelSelect={onLevelSelect}
        onPause={() => undefined}
        onReset={() => undefined}
        onUndo={() => undefined}
      />

      <button type="button" className="menu-button compact" onClick={onMarkActive}>
        <Sparkles aria-hidden="true" />
        <span>Placeholder Game Screen</span>
      </button>

      <button type="button" className="menu-button compact primary" onClick={onCompleteLevel}>
        <CircleCheck aria-hidden="true" />
        <span>Complete Level</span>
      </button>
    </section>
  );
}
