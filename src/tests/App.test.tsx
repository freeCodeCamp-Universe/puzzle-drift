import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { LEVELS } from '../data/levels';
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

async function openSpikeLane() {
  const user = userEvent.setup();
  unlockThroughLevel(11);
  render(<App />);

  await user.click(screen.getByRole('button', { name: /level select/i }));
  await user.click(screen.getByRole('button', { name: 'Level 11: Spike Lane' }));

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

    expect(screen.queryByText(/neon logic arcade/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how to play/i })).toBeInTheDocument();
  });

  it('opens the how to play dialog from the start screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /how to play/i }));

    expect(screen.getByRole('dialog', { name: /how to play/i })).toBeInTheDocument();
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
    expect(screen.queryByLabelText(/theme/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^theme$/i)).not.toBeInTheDocument();
  });

  it('renders the settings modal without a header gear icon', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    const settingsDialog = screen.getByRole('dialog', { name: /settings/i });
    expect(container.querySelector('.settings-dialog .lucide-settings')).not.toBeInTheDocument();
    expect(within(settingsDialog).getByRole('heading', { name: /settings/i })).toBeInTheDocument();
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

  it('removes legacy theme settings from persisted settings', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        musicEnabled: true,
        reducedMotion: false,
        soundEnabled: true,
        theme: 'crystal-blue',
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/sound effects/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.theme).toBeUndefined();
      expect(document.documentElement.className).not.toMatch(/theme-/);
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
    });
  });

  it('unlocks the first level by default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).toBeDisabled();
  });

  it('level card status renders correctly', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(within(screen.getByRole('button', { name: 'Level 1: First Drift' })).getByText('Unlocked')).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).getByText('Locked'),
    ).toBeInTheDocument();
  });

  it('completed levels show stars', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(within(levelCard).getByText('Completed')).toBeInTheDocument();
    expect(within(levelCard).getByLabelText('3 stars')).toBeInTheDocument();
    expect(within(levelCard).getAllByTestId('level-stars')[0].querySelectorAll('.star-filled')).toHaveLength(3);
  });

  it('locked levels show a lock icon', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(
      within(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).getByLabelText('Locked'),
    ).toBeInTheDocument();
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

  it('clicking directional buttons moves the player', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /move right/i }));

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('1 moves')).toBeInTheDocument();
  });

  it('HUD remains visible during gameplay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /move right/i }));

    expect(screen.getByLabelText('Game heads-up display')).toBeInTheDocument();
    expect(screen.getByLabelText('Game status')).toBeInTheDocument();
    expect(screen.getByLabelText('Game controls')).toBeInTheDocument();
  });

  it('renders a hint button in the HUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));

    expect(screen.getByRole('button', { name: /show hints/i })).toBeInTheDocument();
  });

  it('displays the first hint for free', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /show hints/i }));

    expect(screen.getByRole('region', { name: /level hints/i })).toBeInTheDocument();
    expect(screen.getByText(LEVELS[0].hints[0].text)).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[1].text)).not.toBeInTheDocument();
  });

  it('unlocks later hints after failed resets and time thresholds', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /show hints/i }));
    expect(screen.queryByText(LEVELS[0].hints[1].text)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: /reset level/i }));
    expect(screen.getByText(LEVELS[0].hints[1].text)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.getByText(LEVELS[0].hints[2].text)).toBeInTheDocument();
  });

  it('shows level-specific hints', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Level 2: Corner Signal' }));
    await user.click(screen.getByRole('button', { name: /show hints/i }));

    expect(screen.getByText(LEVELS[1].hints[0].text)).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[0].text)).not.toBeInTheDocument();
  });

  it('completing level 1 unlocks level 2', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
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

    expect(screen.getByRole('heading', { name: /level complete/i })).toBeInTheDocument();

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

    const completion = screen.getByRole('status', { name: /level completed/i });

    expect(within(completion).getByRole('heading', { name: /level complete/i })).toBeInTheDocument();
    expect(within(completion).getByText('Time')).toBeInTheDocument();
    expect(within(completion).getByText('Moves')).toBeInTheDocument();
    expect(within(completion).getByText('Stars Earned')).toBeInTheDocument();
    expect(within(completion).queryByText('Best Moves')).not.toBeInTheDocument();
    expect(within(completion).queryByText('Best Time')).not.toBeInTheDocument();
    expect(within(completion).getAllByText('New Record').length).toBeGreaterThan(0);
    expect(within(completion).getByRole('button', { name: /next level/i })).toBeInTheDocument();
    expect(within(completion).getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(within(completion).getByRole('button', { name: /level select/i })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /first drift board/i })).toBeInTheDocument();
  });

  it('completion message is accessible', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByRole('status', { name: /level completed.*stars earned/i })).toBeInTheDocument();
    expect(screen.getByText(/level completed with .* stars/i)).toBeInTheDocument();
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

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('1 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Floor at 3, 1')).toBeInTheDocument();
  });

  it('a door blocks player without a key', async () => {
    await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 2, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /locked\. find a key/i })).toBeInTheDocument();
  });

  it('opens a door with a key, consumes the key, and undo restores the door state', async () => {
    const user = await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 3, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('0 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Opened door at 3, 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 2, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('1 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
  });

  it('reset restores the original key and door layout', async () => {
    const user = await openLevel3();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await user.click(screen.getByRole('button', { name: /reset level/i }));

    expect(screen.getByLabelText('Player at 1, 3')).toBeInTheDocument();
    expect(screen.getByLabelText('0 keys')).toBeInTheDocument();
    expect(screen.getByLabelText('Collectible key at 3, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 3, 3')).toBeInTheDocument();
  });

  it('stepping on a spike shows a failed attempt overlay until retry', async () => {
    const user = await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByRole('alertdialog', { name: /hazard hit/i })).toBeInTheDocument();
    expect(screen.getByText(/you hit the spikes/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Player at 3, 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry the level/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('stepping on a spike does not complete the level', async () => {
    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.queryByRole('heading', { name: /level complete/i })).not.toBeInTheDocument();
  });

  it('spike failure does not save progress or unlock the next level', async () => {
    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    const savedProgress = JSON.parse(window.localStorage.getItem('puzzle-drift:save') ?? '{}');

    expect(savedProgress.completedLevels).not.toContain(11);
    expect(savedProgress.unlockedLevels).not.toContain(12);
  });

  it('undo history clears after retrying a spike failure', async () => {
    const user = await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await user.click(screen.getByRole('button', { name: /retry the level/i }));

    await user.click(screen.getByRole('button', { name: /undo move/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('shows hazard animation after spike unless reduced motion is enabled', async () => {
    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByTestId('game-board-shell')).toHaveClass('hazard-flash');
  });

  it('reduced motion disables hazard animation class', async () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        musicEnabled: true,
        reducedMotion: true,
        soundEnabled: true,
      }),
    );

    await openSpikeLane();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('hazard-flash');
    expect(screen.getByRole('alertdialog', { name: /hazard hit/i })).toBeInTheDocument();
    expect(screen.getByRole('alertdialog', { name: /hazard hit/i })).not.toHaveClass('hazard-failure-pop');
  });

  it('reduced motion disables completion animation classes', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        musicEnabled: true,
        reducedMotion: true,
        soundEnabled: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByLabelText('3 stars earned', { exact: true })).not.toHaveClass('star-reveal');
  });

  it('reduced motion prevents movement animation classes', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: false,
        musicEnabled: true,
        reducedMotion: true,
        soundEnabled: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /move right/i }));

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('player-move');
    expect(screen.getByTestId('player-avatar')).not.toHaveClass('player-moving');
  });
});
