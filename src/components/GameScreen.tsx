import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleCheck,
  Footprints,
  ListOrdered,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Star,
  Timer,
} from 'lucide-react';
import { LEVELS } from '../data/levels';
import { calculateStars, createInitialGameState, getDirectionFromKey, movePlayer } from '../logic/movement';
import type { Direction, GameState, SaveData } from '../types/game';
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
  onNextLevel: () => void;
  onSettings: () => void;
  progress: SaveData;
  reducedMotion: boolean;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getUnlockedHintCount(level: (typeof LEVELS)[number], elapsedSeconds: number, failedResetCount: number) {
  return level.hints.filter((hint, hintIndex) => {
    if (hintIndex === 0) {
      return true;
    }

    const unlockedByReset =
      hint.unlockAfterFailedResets !== undefined && failedResetCount >= hint.unlockAfterFailedResets;
    const unlockedByTime = hint.unlockAfterSeconds !== undefined && elapsedSeconds >= hint.unlockAfterSeconds;

    return unlockedByReset || unlockedByTime;
  }).length;
}

function CompletionStars({
  count,
  reducedMotion,
}: {
  count: number;
  reducedMotion: boolean;
}) {
  return (
    <div
      className={`completion-stars${reducedMotion ? '' : ' star-reveal'}`}
      aria-label={`${count} stars earned`}
    >
      {[1, 2, 3].map((starNumber) => (
        <Star
          key={starNumber}
          aria-hidden="true"
          className={starNumber <= count ? 'star-earned' : 'star-empty'}
          style={{ animationDelay: `${(starNumber - 1) * 140}ms` }}
        />
      ))}
    </div>
  );
}

export function GameScreen({
  currentLevel,
  onBack,
  onCompleteLevel,
  onLevelSelect,
  onMarkActive,
  onNextLevel,
  onSettings,
  progress,
  reducedMotion,
}: GameScreenProps) {
  const level = LEVELS.find((candidate) => candidate.id === currentLevel) ?? LEVELS[0];
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(level));
  const [, setHistory] = useState<GameState[]>([]);
  const [hazardFlashCount, setHazardFlashCount] = useState(0);
  const [boardAnimationClass, setBoardAnimationClass] = useState('');
  const [failedResetCount, setFailedResetCount] = useState(0);
  const [isHintPanelOpen, setIsHintPanelOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const savedCompletionRef = useRef(false);

  const triggerBoardAnimation = useCallback(
    (animationClass: string) => {
      if (reducedMotion) {
        setBoardAnimationClass('');

        return;
      }

      setBoardAnimationClass(animationClass);
    },
    [reducedMotion],
  );

  const moveInDirection = useCallback(
    (direction: Direction) => {
      if (isPaused) {
        return;
      }

      setGameState((currentState) => {
        const nextState = movePlayer(level, currentState, direction);

        if (nextState.isFailed) {
          setHistory([]);
          setHazardFlashCount((currentCount) => currentCount + 1);
          setFailedResetCount((currentCount) => currentCount + 1);
          savedCompletionRef.current = false;

          return createInitialGameState(level);
        }

        if (nextState === currentState || nextState.moves === currentState.moves) {
          return nextState;
        }

        const collectedKey = nextState.collectedKeyPositions.length > currentState.collectedKeyPositions.length;
        const teleported =
          Math.abs(nextState.playerPosition.x - currentState.playerPosition.x) +
            Math.abs(nextState.playerPosition.y - currentState.playerPosition.y) >
          1;
        const animationClass = collectedKey
          ? 'key-collect'
          : teleported
            ? 'portal-teleport'
            : 'player-move';

        triggerBoardAnimation(animationClass);
        setHistory((currentHistory) => [...currentHistory, currentState]);

        return nextState;
      });
    },
    [isPaused, level, triggerBoardAnimation],
  );

  useEffect(() => {
    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setBoardAnimationClass('');
    setFailedResetCount(0);
    setIsHintPanelOpen(false);
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
      moveInDirection(direction);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, moveInDirection]);

  const resetLevel = () => {
    if (!gameState.isComplete && (gameState.moves > 0 || gameState.elapsedSeconds > 0)) {
      setFailedResetCount((currentCount) => currentCount + 1);
    }

    setGameState(createInitialGameState(level));
    setHistory([]);
    setHazardFlashCount(0);
    setBoardAnimationClass('');
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
  const starsEarned = calculateStars(level, gameState);
  const bestMoves = progress.bestMoves[level.id] ?? gameState.moves;
  const bestTimeSeconds = progress.bestTimeSeconds[level.id] ?? gameState.elapsedSeconds;
  const unlockedHintCount = getUnlockedHintCount(level, gameState.elapsedSeconds, failedResetCount);

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
        animationClass={boardAnimationClass}
        gameState={gameState}
        hazardFlash={hazardFlashCount > 0 && !reducedMotion}
        isHintPanelOpen={isHintPanelOpen}
        level={level}
        moves={gameState.moves}
        onLevelSelect={onLevelSelect}
        onMove={moveInDirection}
        onPause={() => setIsPaused(true)}
        onReset={resetLevel}
        onToggleHints={() => setIsHintPanelOpen((currentValue) => !currentValue)}
        onUndo={undoMove}
        playerPosition={gameState.playerPosition}
        unlockedHintCount={unlockedHintCount}
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
        <section
          className={`completion-panel${reducedMotion ? '' : ' level-complete-pop'}`}
          role="status"
          aria-label={`Level completed. ${starsEarned} stars earned in ${gameState.moves} moves and ${formatTime(
            gameState.elapsedSeconds,
          )}.`}
          aria-live="polite"
        >
          <p className="sr-only">
            Level completed with {starsEarned} stars, {gameState.moves} moves, and a time of{' '}
            {formatTime(gameState.elapsedSeconds)}.
          </p>
          <header className="completion-header">
            <CircleCheck aria-hidden="true" />
            <div>
              <p className="eyebrow">level completed</p>
              <h2>Drift Cleared</h2>
              <p>Level {Math.min(level.id + 1, LEVELS.length)} is now unlocked.</p>
            </div>
          </header>

          <CompletionStars count={starsEarned} reducedMotion={reducedMotion} />

          <div className="completion-stats">
            <div className="stat-card">
              <Timer aria-hidden="true" />
              <span>Time</span>
              <strong>{formatTime(gameState.elapsedSeconds)}</strong>
            </div>
            <div className="stat-card">
              <Footprints aria-hidden="true" />
              <span>Moves</span>
              <strong>{gameState.moves}</strong>
            </div>
            <div className="stat-card">
              <Star aria-hidden="true" />
              <span>Stars Earned</span>
              <strong>{starsEarned}</strong>
            </div>
            <div className="stat-card">
              <Footprints aria-hidden="true" />
              <span>Best Moves</span>
              <strong>{bestMoves}</strong>
            </div>
            <div className="stat-card">
              <Timer aria-hidden="true" />
              <span>Best Time</span>
              <strong>{formatTime(bestTimeSeconds)}</strong>
            </div>
          </div>

          <div className="completion-actions">
            <button type="button" className="menu-button primary" onClick={onNextLevel}>
              <Play aria-hidden="true" />
              <span>Next Level</span>
            </button>
            <button type="button" className="menu-button" onClick={resetLevel}>
              <RotateCcw aria-hidden="true" />
              <span>Retry</span>
            </button>
            <button type="button" className="menu-button" onClick={onLevelSelect}>
              <ListOrdered aria-hidden="true" />
              <span>Level Select</span>
            </button>
          </div>

          <div className="completion-note">
            <p className="eyebrow">level complete</p>
            <p>
              Targets: {level.targetMoves} moves and {formatTime(level.targetTimeSeconds)}.
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
