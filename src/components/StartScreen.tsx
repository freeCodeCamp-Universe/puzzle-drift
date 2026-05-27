import { Gamepad2, ListOrdered, Play, RotateCcw, Settings, Sparkles, Star, Timer } from 'lucide-react';

type StartScreenProps = {
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onLevelSelect: () => void;
  onSettings: () => void;
};

export function StartScreen({
  canContinue,
  onContinue,
  onNewGame,
  onLevelSelect,
  onSettings,
}: StartScreenProps) {
  return (
    <section className="screen start-screen" aria-labelledby="game-title">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <Gamepad2 />
        </div>
        <div className="title-kicker">
          <Sparkles aria-hidden="true" />
          <p className="eyebrow">neon logic arcade</p>
        </div>
        <div>
          <h1 id="game-title">Puzzle Drift</h1>
          <p className="tagline">
            Slide through neon mazes, bend portals, unlock gates, and chase perfect routes.
          </p>
        </div>
        <div className="title-stats" aria-label="Game features">
          <span>
            <ListOrdered aria-hidden="true" />
            30 levels
          </span>
          <span>
            <Star aria-hidden="true" />
            3-star goals
          </span>
          <span>
            <Timer aria-hidden="true" />
            timed runs
          </span>
        </div>
      </div>

      <nav className="menu-panel" aria-label="Start menu">
        <button type="button" className="menu-button" onClick={onContinue} disabled={!canContinue}>
          <Play aria-hidden="true" />
          <span>Continue</span>
        </button>
        <button type="button" className="menu-button primary" onClick={onNewGame}>
          <RotateCcw aria-hidden="true" />
          <span>New Game</span>
        </button>
        <button type="button" className="menu-button" onClick={onLevelSelect}>
          <ListOrdered aria-hidden="true" />
          <span>Level Select</span>
        </button>
        <button type="button" className="menu-button" onClick={onSettings}>
          <Settings aria-hidden="true" />
          <span>Settings</span>
        </button>
      </nav>
    </section>
  );
}
