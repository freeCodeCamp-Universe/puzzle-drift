import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleCheck, ListOrdered, RotateCcw, Settings, Sparkles, Play } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { calculateStars, createInitialGameState, getDirectionFromKey, movePlayer } from '../logic/movement';
import type { GameState } from '../types/game';
import { GameBoard } from './GameBoard';

type CompletionPayload = {
  moves: number;
  stars: number;
  timeSeconds: number;
};

type GameScreenProps = {
  currentLevel: number;
  onBack: () => void;
  onCompleteLevel: (payload: CompletionPayload) => void;
  onLevelSelect: () => void;
  onMarkActive: () => void;
  onSettings: () => void;
  reducedMotion: boolean;
};

export function GameScreen({
  currentLevel,
  onBack,
  onCompleteLevel,
  onLevelSelect,
  onMarkActive,
  onSettings,
  reducedMotion,
}: GameScreenProps) {
  const level = LEVELS.find((candidate) => candidate.id === currentLevel) ?? LEVELS[0];
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(level));
  const [, setHistory] = useState<GameState[]>([]);
  const [hazardFlashCount, setHazardFlashCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const savedCompletionRef = useRef(false);

  useEffect(() => {
    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setIsPaused(false);
    savedCompletionRef.current = false;
  }, [level]);

  useEffect(() => {
    if (isPaused || gameState.isComplete || gameState.isFailed) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setGameState((currentState) => ({
        ...currentState,
        elapsedSeconds: currentState.elapsedSeconds + 1,
      }));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [gameState.isComplete, gameState.isFailed, isPaused]);

  useEffect(() => {
    if (!gameState.isComplete || savedCompletionRef.current) {
      return;
    }

    savedCompletionRef.current = true;
    onCompleteLevel({
      moves: gameState.moves,
      stars: calculateStars(level, gameState),
      timeSeconds: gameState.elapsedSeconds,
    });
  }, [gameState, level, onCompleteLevel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getDirectionFromKey(event.key);

      if (!direction || isPaused) {
        return;
      }

      event.preventDefault();
      setGameState((currentState) => {
        const nextState = movePlayer(level, currentState, direction);

        if (nextState.isFailed) {
          setHistory([]);
          setHazardFlashCount((currentCount) => currentCount + 1);
          savedCompletionRef.current = false;

          return createInitialGameState(level);
        }

        if (nextState === currentState || nextState.moves === currentState.moves) {
          return nextState;
        }

        setHistory((currentHistory) => [...currentHistory, currentState]);

        return nextState;
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, level]);

  const resetLevel = () => {
    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setIsPaused(false);
    savedCompletionRef.current = false;
  };

  const undoMove = () => {
    setHistory((currentHistory) => {
      const previousState = currentHistory[currentHistory.length - 1];

      if (!previousState) {
        return currentHistory;
      }

      setGameState(previousState);

      return currentHistory.slice(0, -1);
    });
  };

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
        elapsedSeconds={gameState.elapsedSeconds}
        gameState={gameState}
        hazardFlash={hazardFlashCount > 0 && !reducedMotion}
        level={level}
        moves={gameState.moves}
        onLevelSelect={onLevelSelect}
        onPause={() => setIsPaused(true)}
        onReset={resetLevel}
        onUndo={undoMove}
        playerPosition={gameState.playerPosition}
      />

      {isPaused ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <header className="dialog-header">
              <div className="dialog-title">
                <Play aria-hidden="true" />
                <h2 id="pause-title">Paused</h2>
              </div>
            </header>

            <div className="pause-actions">
              <button type="button" className="menu-button primary" onClick={() => setIsPaused(false)}>
                <Play aria-hidden="true" />
                <span>Resume</span>
              </button>
              <button type="button" className="menu-button" onClick={resetLevel}>
                <RotateCcw aria-hidden="true" />
                <span>Restart Level</span>
              </button>
              <button type="button" className="menu-button" onClick={onLevelSelect}>
                <ListOrdered aria-hidden="true" />
                <span>Level Select</span>
              </button>
              <button type="button" className="menu-button" onClick={onSettings}>
                <Settings aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {gameState.isComplete ? (
        <section className="completion-panel" role="status" aria-live="polite">
          <CircleCheck aria-hidden="true" />
          <div>
            <p className="eyebrow">level complete</p>
            <h2>Drift Cleared</h2>
            <p>
              Finished in {gameState.moves} moves. Level {Math.min(level.id + 1, LEVELS.length)} is
              now unlocked.
            </p>
          </div>
        </section>
      ) : null}

      <button type="button" className="menu-button compact" onClick={onMarkActive}>
        <Sparkles aria-hidden="true" />
        <span>Placeholder Game Screen</span>
      </button>

      <button
        type="button"
        className="menu-button compact primary"
        onClick={() =>
          onCompleteLevel({
            moves: gameState.moves,
            stars: calculateStars(level, gameState),
            timeSeconds: gameState.elapsedSeconds,
          })
        }
      >
        <CircleCheck aria-hidden="true" />
        <span>Complete Level</span>
      </button>
    </section>
  );
}
