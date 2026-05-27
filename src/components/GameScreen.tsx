import { ArrowLeft, CircleCheck, Sparkles } from 'lucide-react';

type GameScreenProps = {
  currentLevel: number;
  onBack: () => void;
  onCompleteLevel: () => void;
  onMarkActive: () => void;
};

export function GameScreen({
  currentLevel,
  onBack,
  onCompleteLevel,
  onMarkActive,
}: GameScreenProps) {
  return (
    <section className="screen game-screen" aria-labelledby="game-screen-title">
      <header className="screen-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div>
          <p className="eyebrow">current drift</p>
          <h2 id="game-screen-title">Level {currentLevel}</h2>
        </div>
      </header>

      <div className="game-board-placeholder" role="img" aria-label="Puzzle grid placeholder">
        {Array.from({ length: 25 }, (_, index) => (
          <span key={index} className={index % 4 === 0 ? 'tile hot' : 'tile'} />
        ))}
      </div>

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
