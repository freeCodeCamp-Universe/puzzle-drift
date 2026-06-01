import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { LEVELS } from '../data/levels';
import { getChapterCompletionMilestone } from '../utils/chapterMilestones';
import { completeLevel, createInitialSaveData, unlockHintTier } from '../utils/progressStorage';
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
  await user.click(screen.getByRole('button', { name: 'Level 6: Switch Primer' }));

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

function solveFirstDrift() {
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowDown' });
  fireEvent.keyDown(window, { key: 'ArrowDown' });
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

  it('renders board previews with landmark tile art', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const portalLevel = screen.getByRole('button', { name: 'Level 17: Portal Lock locked' });
    const spikeLevel = screen.getByRole('button', { name: 'Level 11: Spike Lane locked' });

    expect(within(portalLevel).getByLabelText(/portal lock board preview/i)).toBeInTheDocument();
    expect(portalLevel.querySelector('.preview-wall')).toBeInTheDocument();
    expect(portalLevel.querySelector('.preview-door')).toBeInTheDocument();
    expect(portalLevel.querySelector('.preview-portal')).toBeInTheDocument();
    expect(within(spikeLevel).getByLabelText(/spike lane board preview/i)).toBeInTheDocument();
    expect(spikeLevel.querySelector('.preview-spike')).toBeInTheDocument();
  });

  it('groups level select cards by campaign chapter progress', async () => {
    const user = userEvent.setup();
    let progress = createInitialSaveData();

    for (let levelId = 1; levelId <= 10; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 3,
        timeSeconds: levelId,
      });
    }

    for (let levelId = 11; levelId <= 16; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 2,
        timeSeconds: levelId,
      });
    }

    for (let levelId = 21; levelId <= 22; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 1,
        timeSeconds: levelId,
      });
    }

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /training grid/i })).toBeInTheDocument();
    expect(screen.getByText('10/10 Complete')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /crystal labyrinth/i })).toBeInTheDocument();
    expect(screen.getByText('6/10 Complete')).toBeInTheDocument();
    expect(screen.getByText('Chapter 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rift core/i })).toBeInTheDocument();
    expect(screen.getByText('2/10 Complete')).toBeInTheDocument();
  });

  it('shows a campaign summary calculated from saved progress', async () => {
    const user = userEvent.setup();
    let progress = createInitialSaveData();

    progress = completeLevel(progress, 1, {
      moves: 10,
      stars: 3,
      timeSeconds: 10,
    });
    progress = completeLevel(progress, 2, {
      moves: 12,
      stars: 2,
      timeSeconds: 20,
    });
    progress = completeLevel(progress, 3, {
      moves: 14,
      stars: 1,
      timeSeconds: 30,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const summary = screen.getByRole('region', { name: /campaign summary/i });

    expect(within(summary).getByText('Levels Completed')).toBeInTheDocument();
    expect(within(summary).getByText('3 / 30')).toBeInTheDocument();
    expect(within(summary).getByText('Stars Earned')).toBeInTheDocument();
    expect(within(summary).getByText('6 / 90')).toBeInTheDocument();
    expect(within(summary).getByText('Best Completion Rate')).toBeInTheDocument();
    expect(within(summary).getByText('10%')).toBeInTheDocument();
    expect(within(summary).getByText('Total Moves')).toBeInTheDocument();
    expect(within(summary).getByText('36')).toBeInTheDocument();
    expect(within(summary).getByText('Total Play Time')).toBeInTheDocument();
    expect(within(summary).getByText('1:00')).toBeInTheDocument();
    expect(within(summary).getByText('Current Chapter')).toBeInTheDocument();
    expect(within(summary).getByText('Training Grid')).toBeInTheDocument();
  });

  it('shows puzzle journal history from saved progress', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      doorsOpened: 2,
      hintsUsed: 1,
      keysCollected: 1,
      moves: 10,
      portalsUsed: 0,
      stars: 3,
      timeSeconds: 25,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const journal = screen.getByRole('region', { name: /puzzle journal/i });
    const journalToggle = within(journal).getByRole('button', { name: /puzzle journal/i });

    expect(journalToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(journal).queryByLabelText(/first drift journal entry/i)).not.toBeInTheDocument();

    await user.click(journalToggle);

    const firstDriftEntry = within(journal).getByLabelText(/first drift journal entry/i);

    expect(journalToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(journal).getByText('Puzzle Journal')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('First Drift')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Completion date')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('10')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('0:25')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('3 / 3')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Keys 1')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Doors 2')).toBeInTheDocument();
    expect(within(firstDriftEntry).getByText('Portals 0')).toBeInTheDocument();
  });

  it('filters level select by mechanic', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Portals' }));

    expect(screen.getByRole('button', { name: 'Level 17: Portal Lock locked' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level 1: First Drift' })).not.toBeInTheDocument();
  });

  it('combines progress and mechanic filters', async () => {
    const user = userEvent.setup();

    unlockThroughLevel(11);
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Incomplete' }));
    await user.click(screen.getByRole('button', { name: 'Spikes' }));

    expect(screen.getByRole('button', { name: 'Level 11: Spike Lane' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level 24: Spike Switch locked' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level 1: First Drift' })).not.toBeInTheDocument();
  });

  it('persists level select filters during the browser session', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));
    await user.click(screen.getByRole('button', { name: 'Portals' }));
    await user.click(screen.getByRole('button', { name: /back to start/i }));
    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Portals' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Level 17: Portal Lock locked' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Level 1: First Drift' })).not.toBeInTheDocument();
  });

  it('highlights the highest unlocked incomplete level as the current objective', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 6,
      stars: 3,
      timeSeconds: 12,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 2: Corner Signal' });

    expect(levelCard).toHaveAttribute('aria-current', 'step');
    expect(levelCard).toHaveClass('current-objective');
    expect(within(levelCard).getByText(/continue adventure/i)).toBeInTheDocument();
  });

  it('highlights the most recently played incomplete level when continuing a run', async () => {
    const user = userEvent.setup();
    let progress = createInitialSaveData();

    for (let levelId = 1; levelId <= 16; levelId += 1) {
      progress = completeLevel(progress, levelId, {
        moves: levelId,
        stars: 3,
        timeSeconds: levelId,
      });
    }

    progress = {
      ...progress,
      currentLevel: 17,
      hasActiveRun: true,
    };

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 17: Portal Lock' });

    expect(levelCard).toHaveAttribute('aria-current', 'step');
    expect(levelCard).toHaveClass('current-objective');
    expect(within(levelCard).getByText(/continue adventure/i)).toBeInTheDocument();
  });

  it('opens the settings screen after clicking Settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/sound effects/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/music/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/reduced motion/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high contrast/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hint nudges/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm restart/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
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

  it('reduced motion setting applies a global class', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/reduced motion/i));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('reduced-motion');
    });
  });

  it('high contrast setting applies a global class and persists', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/high contrast/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(document.documentElement).toHaveClass('high-contrast');
      expect(savedSettings.highContrast).toBe(true);
    });
  });

  it('hint nudges and confirm restart settings persist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/hint nudges/i));
    await user.click(screen.getByLabelText(/confirm restart/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.hintNudgesEnabled).toBe(false);
      expect(savedSettings.confirmRestart).toBe(false);
    });
  });

  it('renders the keyboard shortcuts section', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /keyboard shortcuts/i }));

    expect(screen.getByText('Arrow Keys / WASD')).toBeInTheDocument();
    expect(screen.getByText('U / Backspace')).toBeInTheDocument();
    expect(screen.getByText('Spacebar / Enter')).toBeInTheDocument();
  });

  it('Escape closes settings and returns focus', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await user.click(settingsButton);

    const settingsDialog = screen.getByRole('dialog', { name: /settings/i });
    expect(settingsDialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument());
    await waitFor(() => expect(settingsButton).toHaveFocus());
  });

  it('removes legacy theme and audio settings from persisted settings', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: false,
        highContrast: false,
        hintNudgesEnabled: false,
        musicEnabled: true,
        reducedMotion: false,
        soundEnabled: true,
        theme: 'crystal-blue',
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByLabelText(/reduced motion/i));

    await waitFor(() => {
      const savedSettings = JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}');

      expect(savedSettings.confirmRestart).toBe(false);
      expect(savedSettings.hintNudgesEnabled).toBe(false);
      expect(savedSettings.musicEnabled).toBeUndefined();
      expect(savedSettings.soundEnabled).toBeUndefined();
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
        confirmRestart: false,
        highContrast: false,
        hintNudgesEnabled: false,
        reducedMotion: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /settings/i }));
    await user.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(screen.getByRole('alertdialog', { name: /reset all progress/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm reset/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('puzzle-drift:save')).toBeNull();
    });

    expect(JSON.parse(window.localStorage.getItem('puzzle-drift:settings') ?? '{}')).toMatchObject({
      confirmRestart: false,
      hintNudgesEnabled: false,
      reducedMotion: true,
    });
  });

  it('unlocks the first level by default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(screen.getByRole('button', { name: 'Level 1: First Drift' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).toHaveAttribute('aria-disabled', 'true');
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

  it('completed levels show earned achievement badges with tooltips', async () => {
    const user = userEvent.setup();
    const progress = completeLevel(createInitialSaveData(), 1, {
      firstTryClear: true,
      moves: 10,
      stars: 3,
      timeSeconds: 25,
    });

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify(progress));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const levelCard = screen.getByRole('button', { name: 'Level 1: First Drift' });

    expect(within(levelCard).getByText('Perfect Route')).toBeInTheDocument();
    expect(within(levelCard).getByText('Speed Solver')).toBeInTheDocument();
    expect(within(levelCard).getByText('Three Star Clear')).toBeInTheDocument();
    expect(within(levelCard).getByText('First Try Clear')).toBeInTheDocument();

    await user.hover(within(levelCard).getByText('Perfect Route'));

    expect(screen.getByRole('tooltip', { name: /completed at or under the par move target/i })).toBeInTheDocument();
  });

  it('locked levels show a lock icon', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    expect(
      within(screen.getByRole('button', { name: 'Level 2: Corner Signal locked' })).getByLabelText('Locked'),
    ).toBeInTheDocument();
  });

  it('locked levels remain focusable and show unlock context without solution stats', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /level select/i }));

    const lockedLevel = screen.getByRole('button', { name: 'Level 15: Needle Ice locked' });

    lockedLevel.focus();

    expect(lockedLevel).toHaveFocus();
    expect(lockedLevel).toHaveAttribute('aria-disabled', 'true');
    expect(within(lockedLevel).getByText('Complete Level 14 to unlock')).toBeInTheDocument();
    expect(within(lockedLevel).getByText('Crystal Labyrinth')).toBeInTheDocument();
    expect(within(lockedLevel).getByText('Ice')).toBeInTheDocument();
    expect(within(lockedLevel).queryByLabelText(/stars/i)).not.toBeInTheDocument();
    expect(lockedLevel.querySelector('.level-card-stats')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /move right/i, hidden: true }));

    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('1 moves')).toBeInTheDocument();
  });

  it('supports arrow and WASD keyboard movement during gameplay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'd' });
    expect(screen.getByLabelText('Player at 3, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();
  });

  it('supports gameplay shortcuts for restart, undo, pause, and hints', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'u' });
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('alertdialog', { name: /restart level/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.queryByRole('region', { name: /puzzle assist/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();
  });

  it('uses Escape as gameplay pause and pause resume', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
  });

  it('HUD remains visible during gameplay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /move right/i, hidden: true }));

    expect(screen.getByLabelText('Game heads-up display')).toBeInTheDocument();
    expect(screen.getByLabelText('Game status')).toBeInTheDocument();
    expect(screen.getByLabelText('Game controls')).toBeInTheDocument();
  });

  it('renders a hint button in the HUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));

    expect(screen.getByRole('button', { name: /open puzzle assist/i })).toBeInTheDocument();
  });

  it('opens a hint journal from the HUD with saved unlocked hints', async () => {
    const user = userEvent.setup();
    const progress = unlockHintTier(createInitialSaveData(), 1, 1);

    window.localStorage.setItem('puzzle-drift:save', JSON.stringify({ ...progress, hasActiveRun: true }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /open hint journal/i }));

    const journal = screen.getByRole('region', { name: /hint journal/i });

    expect(within(journal).getByRole('heading', { name: LEVELS[0].name })).toBeInTheDocument();
    expect(within(journal).getByText(LEVELS[0].hints[0].text)).toBeInTheDocument();
    expect(within(journal).getAllByText(/keep exploring to unlock this hint/i)).toHaveLength(2);
  });

  it('opens the hint journal from the pause menu and completion screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /pause game/i }));
    await user.click(within(screen.getByRole('dialog', { name: /paused/i })).getByRole('button', { name: /hint journal/i }));

    expect(within(screen.getByRole('dialog', { name: /paused/i })).getByRole('region', { name: /hint journal/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /resume/i }));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    await user.click(within(screen.getByRole('status', { name: /level completed/i })).getByRole('button', { name: /^hint journal$/i }));

    expect(within(screen.getByRole('status', { name: /level completed/i })).getByRole('region', { name: /hint journal/i })).toBeInTheDocument();
  });

  it('records local hint analytics and shows the debug report', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));
    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    const analytics = JSON.parse(window.localStorage.getItem('puzzle-drift:hint-analytics') ?? '{}');

    expect(analytics.levels['1']).toMatchObject({
      attempts: 1,
      attemptsWithHint: 1,
      completionsAfterHint: 1,
      hintOpens: 1,
      tierUses: { 1: 1 },
    });

    await user.click(within(screen.getByRole('status', { name: /level completed/i })).getByRole('button', { name: /hint analytics/i }));

    const report = within(screen.getByRole('status', { name: /level completed/i })).getByRole('region', {
      name: /hint analytics report/i,
    });

    expect(within(report).getByText(`Level 1: ${LEVELS[0].name}`)).toBeInTheDocument();
    expect(within(report).getAllByText('100%')).toHaveLength(2);
  });

  it('lets players choose a hint tier before showing help text', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));

    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 1 direction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[0].text)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

    expect(screen.getByText(LEVELS[0].hints[0].text)).toBeInTheDocument();
  });

  it('proactively shows a contextual assist nudge when the player appears stuck', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/need a hint/i)).toBeInTheDocument();
    expect(screen.getByText(/read the board/i)).toBeInTheDocument();
    expect(screen.queryByText(LEVELS[0].hints[0].text)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more help/i }));

    expect(screen.getByRole('region', { name: /puzzle assist/i })).toBeInTheDocument();
  });

  it('does not show contextual assist nudges when disabled', async () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: true,
        highContrast: false,
        hintNudgesEnabled: false,
        reducedMotion: false,
      }),
    );
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    act(() => {
      vi.advanceTimersByTime(35000);
    });

    expect(screen.queryByRole('complementary', { name: /puzzle assist nudge/i })).not.toBeInTheDocument();
  });

  it('detects repeated movement loops before offering puzzle assist', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/circling the same few tiles/i)).toBeInTheDocument();
  });

  it('detects repeated spike deaths before offering puzzle assist', async () => {
    const user = await openSpikeLane();

    for (let deathCount = 0; deathCount < 3; deathCount += 1) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await user.click(screen.getByRole('button', { name: /retry the level/i }));
    }

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/running into hazards/i)).toBeInTheDocument();
  });

  it('detects an unused portal on portal lessons before offering puzzle assist', async () => {
    let progress = createInitialSaveData();

    for (let currentLevel = 1; currentLevel < 16; currentLevel += 1) {
      progress = completeLevel(progress, currentLevel, {
        moves: 1,
        stars: 3,
        timeSeconds: 1,
      });
    }

    window.localStorage.setItem(
      'puzzle-drift:save',
      JSON.stringify({
        ...progress,
        currentLevel: 16,
        hasActiveRun: true,
      }),
    );
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    act(() => {
      vi.advanceTimersByTime(90000);
    });

    expect(screen.getByRole('complementary', { name: /puzzle assist nudge/i })).toBeInTheDocument();
    expect(screen.getByText(/portal may be more important/i)).toBeInTheDocument();
  });

  it('reveals mechanic and route tiers on demand', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /open puzzle assist/i }));

    expect(screen.getByRole('button', { name: /tier 2 mechanic/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    fireEvent.click(screen.getByRole('button', { name: /tier 2 mechanic/i }));
    expect(screen.getByText(LEVELS[0].hints[1].text)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /tier 3 route/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    fireEvent.click(screen.getByRole('button', { name: /tier 3 route/i }));
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
    await user.click(screen.getByRole('button', { name: /open puzzle assist/i }));
    await user.click(screen.getByRole('button', { name: /tier 1 direction/i }));

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
    solveFirstDrift();

    const completion = screen.getByRole('status', { name: /level completed/i });

    expect(within(completion).getByRole('heading', { name: /level complete/i })).toBeInTheDocument();
    expect(within(completion).getByText('Time')).toBeInTheDocument();
    expect(within(completion).getByText('Moves')).toBeInTheDocument();
    expect(within(completion).getByText('Stars Earned')).toBeInTheDocument();
    expect(within(completion).queryByText('Best Moves')).not.toBeInTheDocument();
    expect(within(completion).queryByText('Best Time')).not.toBeInTheDocument();
    expect(within(completion).getAllByText('New Record').length).toBeGreaterThan(0);
    const nextButton = within(completion).getByRole('button', { name: /next level.*spacebar/i });
    const retryButton = within(completion).getByRole('button', { name: /retry.*r/i });
    const levelSelectButton = within(completion).getByRole('button', { name: /level select.*l/i });

    expect(nextButton).toHaveFocus();
    expect(nextButton).toHaveClass('completion-action');
    expect(nextButton.querySelector('.action-label')).toHaveTextContent('Next Level');
    expect(nextButton.querySelector('.action-shortcut')).toHaveTextContent('Spacebar');
    expect(within(nextButton).queryByText('Space')).not.toBeInTheDocument();
    expect(retryButton).toHaveClass('completion-action');
    expect(retryButton.querySelector('.action-label')).toHaveTextContent('Retry');
    expect(retryButton.querySelector('.action-shortcut')).toHaveTextContent('R');
    expect(levelSelectButton).toHaveClass('completion-action');
    expect(levelSelectButton.querySelector('.action-label')).toHaveTextContent('Level Select');
    expect(levelSelectButton.querySelector('.action-shortcut')).toHaveTextContent('L');
    expect(screen.getByRole('grid', { name: /first drift board/i })).toBeInTheDocument();
  });

  it('defines chapter completion milestones for campaign gates', () => {
    expect(getChapterCompletionMilestone(10)).toEqual({
      chapterTitle: 'Training Grid',
      nextMessage: 'Crystal Labyrinth unlocked.',
    });
    expect(getChapterCompletionMilestone(20)).toEqual({
      chapterTitle: 'Crystal Labyrinth',
      nextMessage: 'Rift Core unlocked.',
    });
    expect(getChapterCompletionMilestone(30)).toEqual({
      chapterTitle: 'Rift Core',
      nextMessage: 'Campaign complete.',
    });
    expect(getChapterCompletionMilestone(9)).toBeNull();
  });

  it('completion overlay shortcuts advance, retry, and open level select', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByRole('heading', { name: /level 2/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to start/i }));
    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.queryByRole('heading', { name: /level complete/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    solveFirstDrift();
    fireEvent.keyDown(window, { key: 'l' });
    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
  });

  it('Enter advances from the completion overlay', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByRole('heading', { name: /level 2/i })).toBeInTheDocument();
  });

  it('completion message is accessible', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    solveFirstDrift();

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
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));

    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('0 moves')).toBeInTheDocument();
  });

  it('restarts immediately when confirm restart is disabled', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        confirmRestart: false,
        highContrast: false,
        hintNudgesEnabled: true,
        reducedMotion: false,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await user.click(screen.getByRole('button', { name: /reset level/i }));

    expect(screen.queryByRole('alertdialog', { name: /restart level/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();
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

  it('pause modal blocks gameplay and restores focus when closed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    const pauseButton = screen.getByRole('button', { name: /pause game/i });

    await user.click(pauseButton);

    const pauseDialog = screen.getByRole('dialog', { name: /paused/i });
    const backdrop = pauseDialog.closest('.dialog-backdrop');

    expect(pauseDialog).toHaveAttribute('aria-modal', 'true');
    expect(backdrop).toHaveClass('pause-backdrop');
    expect(screen.getByRole('grid', { name: /first drift board/i })).toBeInTheDocument();
    expect(document.querySelector('.game-screen')).toHaveClass('paused');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /move right/i }));
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    await user.hover(pauseButton);
    expect(screen.queryByRole('tooltip', { name: /pause game/i })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
    });
    await waitFor(() => expect(pauseButton).toHaveFocus());
  });

  it('pause modal shortcuts resume, restart, and open level select', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'p' });

    expect(screen.getByRole('button', { name: /resume.*spacebar/i })).toHaveFocus();
    expect(screen.getByText('Arrow Keys / WASD')).toBeInTheDocument();
    expect(screen.getByText('Undo: U or Backspace')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('alertdialog', { name: /restart level/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player at 1, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    fireEvent.keyDown(window, { key: 'l' });
    expect(screen.getByRole('heading', { name: /level select/i })).toBeInTheDocument();
  });

  it('Spacebar and Enter resume from the pause modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'p' });
    const resumeButton = screen.getByRole('button', { name: /resume.*spacebar/i });
    const restartButton = screen.getByRole('button', { name: /restart level.*r/i });
    const levelSelectButton = screen.getByRole('button', { name: /level select.*l/i });

    expect(resumeButton).toHaveClass('shortcut-action');
    expect(resumeButton.querySelector('.action-label')).toHaveTextContent('Resume');
    expect(resumeButton.querySelector('.action-shortcut')).toHaveTextContent('Spacebar');
    expect(restartButton).toHaveClass('shortcut-action');
    expect(levelSelectButton).toHaveClass('shortcut-action');

    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.queryByRole('dialog', { name: /paused/i })).not.toBeInTheDocument();
  });

  it('does not run gameplay shortcuts from focused buttons or open settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    const resetButton = screen.getByRole('button', { name: /reset level/i });
    act(() => {
      resetButton.focus();
      fireEvent.keyDown(resetButton, { key: 'r' });
    });
    expect(screen.getByLabelText('Player at 2, 1')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'p' });
    await user.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.keyDown(window, { key: 'r' });

    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /paused/i })).toBeInTheDocument();
  });

  it('prevents page scroll when Spacebar is used as a shortcut', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.keyDown(window, { key: 'p' });

    const spaceEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: ' ',
    });
    const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');

    act(() => {
      window.dispatchEvent(spaceEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
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

  it('a linked door shows switch guidance before it is opened', async () => {
    await openLevel6();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Player at 5, 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Locked door at 6, 1')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /door closed\. use the switch/i })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /confirm restart/i }));

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
        reducedMotion: true,
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
        reducedMotion: true,
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
        reducedMotion: true,
      }),
    );
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new game/i }));
    await user.click(screen.getByRole('button', { name: /move right/i }));

    expect(screen.getByTestId('game-board-shell')).not.toHaveClass('player-move');
    expect(screen.getByTestId('player-avatar')).not.toHaveClass('player-moving');
  });
});
