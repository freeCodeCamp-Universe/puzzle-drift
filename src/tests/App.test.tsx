import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { completeLevel, createInitialSaveData } from '../utils/progressStorage';
import { resetAppStorage } from './testStorage';

function unlockThroughLevel(levelId: number) {
  let progress = createInitialSaveData();

  for (let currentLevel = 1; currentLevel < levelId; currentLevel += 1) {
    progress = completeLevel(progress, currentLevel, {
      moves: 1,
      stars: 3,
      timeSeconds: 1,
    });
  }

  window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
}

async function openLevel3() {
  const user = userEvent.setup();
  unlockThroughLevel(3);
  render(<App />);

  await user.click(screen.getByRole('button', { name: /level select/i }));
  await user.click(screen.getByRole('button', { name: 'Level 3: Keyline' }));

  return user;
}

async function openLevel6() {
  const user = userEvent.setup();
  unlockThroughLevel(6);
  render(<App />);

  await user.click(screen.getByRole('button', { name: /level select/i }));
  await user.click(screen.getByRole('button', { name: 'Level 6: Spike Lane' }));

  return user;
}

describe('App', () => {
  beforeEach(() => {
    resetAppStorage();
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the app', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /puzzle drift/i })).toBeInTheDocument();
  });

  it('renders the start screen buttons', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('shows all level cards after clicking Level Select', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /level \d+/i })).toHaveLength(30);
  });

  it('opens the settings screen after clicking Settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sound effects/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/music/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reduced motion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
  });

  it('toggling sound saves the setting', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/sound effects/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.soundEnabled).toBe(false);
    });
  });

  it('toggling music saves the setting', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/music/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.musicEnabled).toBe(false);
    });
  });

  it('reduced motion setting applies a global class', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/reduced motion/i));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('reduced-motion');
    });
  });

  it('changing theme applies a global class', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.selectOptions(screen.getByLabelText(/theme/i), 'crystal-blue');

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('theme-crystal-blue');
      expect(document.documentElement).not.toHaveClass('theme-rift-dark');
    });
  });

  it('reset progress clears LocalStorage progress without clearing settings', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        musicEnabled: false,
        reducedMotion: true,
        soundEnabled: false,
        theme: 'forest-circuit',
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(screen.getByRole('alertdialog', { name: /reset progress/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm reset/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('puzzle-drift:save')).toBeNull();
    });

    expect(JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}')).toMatchObject({
      musicEnabled: false,
      reducedMotion: true,
      soundEnabled: false,
      theme: 'forest-circuit',
    });
  });

  it('unlocks the first level by default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).toBeDisabled();
  });

  it('does not open locked levels', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' }));

    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
  });

  it('opens unlocked levels', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 1: First Drift' }));

    expect(screen.getByRole('heading', { name: /level 1/i })).toBeInTheDocument();
  });

  it('completing level 1 unlocks level 2', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /complete level/i }));
    await user.click(screen.getByRole('button', { name: /back to start/i }));
    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal' })).toBeEnabled();
  });

  it('completing a level by reaching the exit saves progress', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByText(/drift cleared/i)).toBeInTheDocument();

    await waitFor(() => {
      const savedProgress = JSON.parse(window.localStorage.getItem('puzzle-drift:save') ?? '{}');

      expect(savedProgress.completedLevels).toContain(1);
      expect(savedProgress.unlockedLevels).toContain(2);
    });
  });

  it('shows completion scoring and actions after clearing a level', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    const completion = screen.getByRole('status');

    expect(within(completion).getByText(/level completed/i)).toBeInTheDocument();
    expect(within(completion).getByText('Time')).toBeInTheDocument();
    expect(within(completion).getByText('Moves')).toBeInTheDocument();
    expect(within(completion).getByText('Stars Earned')).toBeInTheDocument();
    expect(within(completion).getByText('Best Moves')).toBeInTheDocument();
    expect(within(completion).getByText('Best Time')).toBeInTheDocument();
    expect(within(completion).getByRole('button', { name: /next level/i })).toBeInTheDocument();
    expect(within(completion).getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(within(completion).getByRole('button', { name: /level select/i })).toBeInTheDocument();
  });

  it('reset restores player to the starting position and clears move count', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset level/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('undo restores previous player position and decrements move count', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 3, 1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('pause stops timer updates', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('0:02')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pause game/i }));
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('0:02')).toBeInTheDocument();
  });

  it('collecting a key increases key count and removes the key tile', async () => {
    await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('1 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Floor at 3, 1')).toBeInTheDocument();
  });

  it('a door blocks player without a key', async () => {
    await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 4, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Door at 5, 3')).toBeInTheDocument();
  });

  it('opens a door with a key, consumes the key, and undo restores the door state', async () => {
    const user = await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(screen.getByLabelText('Player at 5, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('0 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Floor at 5, 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 6, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Door at 5, 3')).toBeInTheDocument();
  });

  it('reset restores the original key and door layout', async () => {
    const user = await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    await user.click(screen.getByRole('button', { name: /reset level/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Key at 3, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Door at 5, 3')).toBeInTheDocument();
  });

  it('stepping on a spike resets player position and move count', async () => {
    await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('stepping on a spike does not complete the level', async () => {
    await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.queryByText(/drift cleared/i)).not.toBeInTheDocument();
  });

  it('undo history clears after spike reset', async () => {
    const user = await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('shows hazard animation after spike unless reduced motion is enabled', async () => {
    await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByTestId('game-board-shell')).toHaveClass('hazard-flash');
  });

  it('reduced motion disables hazard animation class', async () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        reducedMotion: true,
        soundEnabled: true,
      }),
    );

    await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('hazard-flash');
  });
});
